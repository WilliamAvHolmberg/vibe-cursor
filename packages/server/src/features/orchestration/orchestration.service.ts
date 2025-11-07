import { prisma } from '../../lib/prisma.js';
import { CursorApiClient } from '../../lib/cursor-api.js';
import { broadcastToOrchestration } from '../websocket/websocket.service.js';
import { 
  PlanningAgentOutputSchema, 
  PLANNING_AGENT_SYSTEM_PROMPT,
  buildPlanningAgentPrompt,
  type PlanningAgentOutput 
} from './orchestration.prompts.js';
import { ApiError } from '../../lib/validation.js';

export class OrchestrationService {
  private cursorClient: CursorApiClient;

  constructor(cursorApiKey: string) {
    this.cursorClient = new CursorApiClient(cursorApiKey);
  }

  async createOrchestration(params: {
    userId: string;
    repository: string;
    ref?: string;
    initialPrompt: string;
  }) {
    const orchestration = await prisma.orchestration.create({
      data: {
        userId: params.userId,
        repository: params.repository,
        ref: params.ref || 'main',
        initialPrompt: params.initialPrompt,
        status: 'PLANNING'
      }
    });

    await this.createEvent(orchestration.id, 'orchestration_created', {
      repository: params.repository,
      prompt: params.initialPrompt
    });

    this.startPlanningPhase(orchestration.id).catch(err => {
      console.error('Error in planning phase:', err);
      this.handleOrchestrationError(orchestration.id, err);
    });

    return orchestration;
  }

  private async startPlanningPhase(orchestrationId: string) {
    const orchestration = await prisma.orchestration.findUnique({
      where: { id: orchestrationId },
      include: { user: true, followUpMessages: true }
    });

    if (!orchestration) {
      throw new ApiError(404, 'Orchestration not found');
    }

    const previousQA = orchestration.followUpMessages
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .reduce((acc, msg, idx, arr) => {
        if (msg.role === 'agent' && arr[idx + 1]?.role === 'user') {
          acc.push({
            question: msg.content,
            answer: arr[idx + 1].content
          });
        }
        return acc;
      }, [] as Array<{ question: string; answer: string }>);

    const prompt = buildPlanningAgentPrompt(
      orchestration.initialPrompt,
      orchestration.repository,
      previousQA.length > 0 ? previousQA : undefined
    );

    const fullPrompt = `${PLANNING_AGENT_SYSTEM_PROMPT}\n\n${prompt}`;

    const cursorAgent = await this.cursorClient.createAgent({
      prompt: { text: fullPrompt },
      source: {
        repository: orchestration.repository,
        ref: orchestration.ref
      },
      target: {
        branchName: `planning/${orchestrationId}`,
        autoCreatePr: false
      }
    });

    await this.createEvent(orchestrationId, 'planning_agent_created', {
      cursorAgentId: cursorAgent.id
    });

    this.pollPlanningAgent(orchestrationId, cursorAgent.id).catch(err => {
      console.error('Error polling planning agent:', err);
      this.handleOrchestrationError(orchestrationId, err);
    });
  }

  private async pollPlanningAgent(orchestrationId: string, cursorAgentId: string) {
    let attempts = 0;
    const maxAttempts = 120;
    const pollInterval = 5000;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      attempts++;

      try {
        const agent = await this.cursorClient.getAgent(cursorAgentId);
        
        if (agent.status === 'COMPLETED' || agent.status === 'completed') {
          const conversation = await this.cursorClient.getAgentConversation(cursorAgentId);
          await this.processPlanningOutput(orchestrationId, conversation);
          break;
        } else if (agent.status === 'FAILED' || agent.status === 'failed') {
          throw new Error('Planning agent failed');
        }
      } catch (error) {
        console.error('Error polling agent:', error);
        throw error;
      }
    }

    if (attempts >= maxAttempts) {
      throw new Error('Planning agent timeout');
    }
  }

  private async processPlanningOutput(orchestrationId: string, conversation: any) {
    const lastMessage = conversation.messages
      .filter((m: any) => m.type === 'assistant_message')
      .pop();

    if (!lastMessage) {
      throw new Error('No output from planning agent');
    }

    let output: PlanningAgentOutput;
    try {
      const jsonMatch = lastMessage.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in agent output');
      }
      const parsed = JSON.parse(jsonMatch[0]);
      output = PlanningAgentOutputSchema.parse(parsed);
    } catch (error) {
      console.error('Failed to parse planning output:', error);
      console.error('Agent output:', lastMessage.text);
      throw new Error('Invalid planning agent output format');
    }

    if (output.type === 'questions') {
      await prisma.orchestration.update({
        where: { id: orchestrationId },
        data: { 
          status: 'AWAITING_FOLLOWUP',
          planningOutput: output as any
        }
      });

      const questions = 'questions' in output.content ? output.content.questions : [];
      for (const q of questions) {
        await prisma.followUpMessage.create({
          data: {
            orchestrationId,
            role: 'agent',
            content: q.question
          }
        });
      }

      await this.createEvent(orchestrationId, 'questions_asked', {
        questions
      });

      broadcastToOrchestration(orchestrationId, {
        type: 'questions_asked',
        questions
      });
    } else {
      await prisma.orchestration.update({
        where: { id: orchestrationId },
        data: { 
          status: 'AWAITING_APPROVAL',
          planningOutput: output as any
        }
      });

      await this.createEvent(orchestrationId, 'plan_ready', {
        plan: output.content
      });

      broadcastToOrchestration(orchestrationId, {
        type: 'plan_ready',
        plan: output.content
      });
    }
  }

  async answerFollowUpQuestions(
    orchestrationId: string,
    answers: Record<string, string>
  ) {
    const orchestration = await prisma.orchestration.findUnique({
      where: { id: orchestrationId }
    });

    if (!orchestration || orchestration.status !== 'AWAITING_FOLLOWUP') {
      throw new ApiError(400, 'Invalid orchestration state');
    }

    for (const [questionId, answer] of Object.entries(answers)) {
      await prisma.followUpMessage.create({
        data: {
          orchestrationId,
          role: 'user',
          content: answer
        }
      });
    }

    await prisma.orchestration.update({
      where: { id: orchestrationId },
      data: { status: 'PLANNING' }
    });

    await this.createEvent(orchestrationId, 'followup_answered', { answers });

    this.startPlanningPhase(orchestrationId).catch(err => {
      console.error('Error restarting planning:', err);
      this.handleOrchestrationError(orchestrationId, err);
    });
  }

  async approvePlan(orchestrationId: string) {
    const orchestration = await prisma.orchestration.findUnique({
      where: { id: orchestrationId },
      include: { user: true }
    });

    if (!orchestration || orchestration.status !== 'AWAITING_APPROVAL') {
      throw new ApiError(400, 'Invalid orchestration state');
    }

    const plan = orchestration.planningOutput as any;

    await prisma.orchestration.update({
      where: { id: orchestrationId },
      data: { 
        status: 'EXECUTING',
        approvedPlan: plan
      }
    });

    await this.createEvent(orchestrationId, 'plan_approved', {});

    this.executePlan(orchestrationId, orchestration.user.cursorApiKey, plan.content).catch(err => {
      console.error('Error executing plan:', err);
      this.handleOrchestrationError(orchestrationId, err);
    });
  }

  private async executePlan(
    orchestrationId: string,
    cursorApiKey: string,
    plan: any
  ) {
    if (plan.requiresSubAgents && plan.subAgents) {
      for (const subAgentSpec of plan.subAgents) {
        await this.createSubAgent(orchestrationId, cursorApiKey, subAgentSpec);
      }
    } else {
      await this.createMainExecutionAgent(orchestrationId, cursorApiKey, plan);
    }

    this.monitorExecution(orchestrationId).catch(err => {
      console.error('Error monitoring execution:', err);
    });
  }

  private async createSubAgent(
    orchestrationId: string,
    cursorApiKey: string,
    spec: any
  ) {
    const orchestration = await prisma.orchestration.findUnique({
      where: { id: orchestrationId }
    });

    if (!orchestration) return;

    const client = new CursorApiClient(cursorApiKey);

    const cursorAgent = await client.createAgent({
      prompt: { text: spec.prompt },
      source: {
        repository: orchestration.repository,
        ref: orchestration.ref
      },
      target: {
        branchName: spec.branchName || `feature/${spec.id}`,
        autoCreatePr: true
      }
    });

    await prisma.agent.create({
      data: {
        orchestrationId,
        cursorAgentId: cursorAgent.id,
        name: spec.name,
        prompt: spec.prompt,
        status: 'CREATING',
        branchName: spec.branchName,
        metadata: { tasks: spec.tasks }
      }
    });

    await this.createEvent(orchestrationId, 'agent_spawned', {
      agentId: cursorAgent.id,
      name: spec.name
    });

    broadcastToOrchestration(orchestrationId, {
      type: 'agent_spawned',
      agent: {
        id: cursorAgent.id,
        name: spec.name,
        status: 'CREATING'
      }
    });
  }

  private async createMainExecutionAgent(
    orchestrationId: string,
    cursorApiKey: string,
    plan: any
  ) {
    const orchestration = await prisma.orchestration.findUnique({
      where: { id: orchestrationId }
    });

    if (!orchestration) return;

    const client = new CursorApiClient(cursorApiKey);

    const prompt = `${orchestration.initialPrompt}\n\nExecution Plan:\n${JSON.stringify(plan.tasks, null, 2)}`;

    const cursorAgent = await client.createAgent({
      prompt: { text: prompt },
      source: {
        repository: orchestration.repository,
        ref: orchestration.ref
      },
      target: {
        branchName: `feature/${orchestrationId}`,
        autoCreatePr: true
      }
    });

    await prisma.agent.create({
      data: {
        orchestrationId,
        cursorAgentId: cursorAgent.id,
        name: 'Main Execution Agent',
        prompt,
        status: 'CREATING',
        branchName: `feature/${orchestrationId}`,
        metadata: { tasks: plan.tasks }
      }
    });

    await this.createEvent(orchestrationId, 'agent_spawned', {
      agentId: cursorAgent.id,
      name: 'Main Execution Agent'
    });
  }

  private async monitorExecution(orchestrationId: string) {
    const pollInterval = 10000;
    
    while (true) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));

      const agents = await prisma.agent.findMany({
        where: { orchestrationId }
      });

      if (agents.length === 0) break;

      let allCompleted = true;
      let anyFailed = false;

      for (const agent of agents) {
        if (!agent.cursorAgentId) continue;

        try {
          const cursorAgent = await this.cursorClient.getAgent(agent.cursorAgentId);
          
          const newStatus = this.mapCursorStatus(cursorAgent.status);
          
          if (agent.status !== newStatus) {
            await prisma.agent.update({
              where: { id: agent.id },
              data: { 
                status: newStatus,
                pullRequestUrl: cursorAgent.target?.url
              }
            });

            await prisma.agentStatusUpdate.create({
              data: {
                agentId: agent.id,
                status: newStatus,
                message: `Status changed to ${newStatus}`
              }
            });

            broadcastToOrchestration(orchestrationId, {
              type: 'agent_status_update',
              agent: {
                id: agent.id,
                cursorAgentId: agent.cursorAgentId,
                name: agent.name,
                status: newStatus,
                pullRequestUrl: cursorAgent.target?.url
              }
            });
          }

          if (newStatus !== 'COMPLETED') allCompleted = false;
          if (newStatus === 'FAILED') anyFailed = true;
        } catch (error) {
          console.error(`Error checking agent ${agent.id}:`, error);
        }
      }

      if (allCompleted || anyFailed) {
        const finalStatus = anyFailed ? 'FAILED' : 'COMPLETED';
        await prisma.orchestration.update({
          where: { id: orchestrationId },
          data: { 
            status: finalStatus,
            completedAt: new Date()
          }
        });

        await this.createEvent(orchestrationId, 'orchestration_completed', {
          status: finalStatus
        });

        broadcastToOrchestration(orchestrationId, {
          type: 'orchestration_completed',
          status: finalStatus
        });

        break;
      }
    }
  }

  private mapCursorStatus(status: string): any {
    const statusMap: Record<string, string> = {
      'CREATING': 'CREATING',
      'RUNNING': 'RUNNING',
      'COMPLETED': 'COMPLETED',
      'completed': 'COMPLETED',
      'FAILED': 'FAILED',
      'failed': 'FAILED',
      'CANCELLED': 'CANCELLED',
      'cancelled': 'CANCELLED'
    };
    return statusMap[status] || 'RUNNING';
  }

  private async createEvent(orchestrationId: string, type: string, data: any) {
    await prisma.orchestrationEvent.create({
      data: {
        orchestrationId,
        type,
        data
      }
    });
  }

  private async handleOrchestrationError(orchestrationId: string, error: any) {
    await prisma.orchestration.update({
      where: { id: orchestrationId },
      data: { status: 'FAILED' }
    });

    await this.createEvent(orchestrationId, 'error', {
      message: error.message,
      stack: error.stack
    });

    broadcastToOrchestration(orchestrationId, {
      type: 'error',
      message: error.message
    });
  }
}
