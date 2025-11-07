export type OrchestrationStatus =
  | "PENDING"
  | "COLLECTING_REQUIREMENTS"
  | "AWAITING_USER"
  | "PLANNING"
  | "AWAITING_APPROVAL"
  | "APPROVED"
  | "EXECUTING"
  | "COMPLETED"
  | "FAILED";

export type AgentRunType = "ORCHESTRATOR" | "SUB_AGENT";
export type AgentRunStatus = "CREATING" | "RUNNING" | "WAITING_FOR_USER" | "COMPLETED" | "FAILED";

export interface AgentMessage {
  id: string;
  orchestrationId: string;
  agentRunId?: string | null;
  role: "SYSTEM" | "USER" | "ASSISTANT" | "TOOL";
  content: string;
  createdAt: string;
}

export interface PlanStep {
  id: string;
  title: string;
  description: string;
  deliverables: string[];
}

export interface PlanSubAgentTask {
  id: string;
  title: string;
  details: string;
  acceptanceCriteria: string[];
}

export interface PlanSubAgent {
  id: string;
  name: string;
  scope: string;
  instructions: string;
  tasks: PlanSubAgentTask[];
}

export interface OrchestratorPlan {
  primaryObjective: string;
  summary: string;
  steps: PlanStep[];
  subAgents: PlanSubAgent[];
}

export interface OrchestratorQuestion {
  id: string;
  question: string;
  context?: string;
  required: boolean;
}

export type OrchestratorResponse =
  | {
      type: "follow_up_questions";
      questions: OrchestratorQuestion[];
    }
  | {
      type: "plan";
      plan: OrchestratorPlan;
    };

export interface AgentRun {
  id: string;
  orchestrationId: string;
  parentRunId?: string | null;
  cursorAgentId: string;
  agentType: AgentRunType;
  status: AgentRunStatus;
  name?: string | null;
  planPayload?: OrchestratorPlan | PlanSubAgent | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface Orchestration {
  id: string;
  repositoryId: string;
  title: string;
  description: string;
  status: OrchestrationStatus;
  planAccepted: boolean;
  planPayload?: OrchestratorPlan | OrchestratorResponse | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrchestrationDetail extends Orchestration {
  repository: {
    id: string;
    provider: string;
    name: string;
    fullName: string;
    defaultBranch?: string | null;
  };
  agentRuns: AgentRun[];
  conversations: AgentMessage[];
}
