import { z } from "zod";
import { env } from "../../config/env";
import { createCursorClient } from "../../lib/cursorClient";
import { logger } from "../../lib/logger";
import { prisma } from "../../lib/prisma";
import { getWebSocketHub } from "../../ws/hub";
import type { ServerEvent } from "../../ws/types";
import type { CursorWebhookEvent } from "../../types/cursor";
import { getDecryptedCursorKey } from "../auth/auth.service";
import type { Prisma } from "../../generated/prisma/client";
import {
  type OrchestratorPlan,
  type OrchestratorResponse,
  type OrchestratorQuestion,
  type PlanSubAgent,
  type PlanSubAgentTask,
} from "./orchestration.types";

const orchestratorQuestionSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  context: z.string().optional(),
  required: z.boolean(),
});

const planTaskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  details: z.string().min(1),
  acceptanceCriteria: z.array(z.string().min(1)).min(1),
});

const planSubAgentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  scope: z.string().min(1),
  instructions: z.string().min(1),
  tasks: z.array(planTaskSchema).min(1),
});

const planStepSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  deliverables: z.array(z.string().min(1)).min(1),
});

const orchestratorPlanSchema = z.object({
  primaryObjective: z.string().min(1),
  summary: z.string().min(1),
  steps: z.array(planStepSchema).min(1),
  subAgents: z.array(planSubAgentSchema),
});

const orchestratorResponseSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("follow_up_questions"),
    questions: z.array(orchestratorQuestionSchema).min(1),
  }),
  z.object({
    type: z.literal("plan"),
    plan: orchestratorPlanSchema,
  }),
]);

interface CreateOrchestrationInput {
  userId: string;
  repositoryId: string;
  title: string;
  description: string;
  branch?: string;
}

export const createOrchestration = async ({
  userId,
  repositoryId,
  title,
  description,
  branch,
}: CreateOrchestrationInput) => {
  const [repositoryLink, apiKey] = await Promise.all([
    prisma.userRepository.findFirst({
      where: {
        userId,
        repositoryId,
      },
      include: { repository: true },
    }),
    getDecryptedCursorKey(userId),
  ]);

  if (!repositoryLink) {
    throw new Error("Repository not linked to user");
  }

  if (!apiKey) {
    throw new Error("User has not configured a Cursor API key");
  }

  const repository = repositoryLink.repository;
  const targetBranch = branch ?? repository.defaultBranch ?? "main";

  const client = createCursorClient(apiKey);
  const prompt = buildOrchestratorPrompt({
    title,
    description,
    repository,
    targetBranch,
  });

  const response = await client.createAgent({
    name: `Orchestrator for ${title}`,
    prompt: { text: prompt },
    source: {
      repository: repository.fullName,
      ref: targetBranch,
    },
    webhook: {
      url: `${env.APP_BASE_URL}/api/webhooks/cursor`,
      secret: env.CURSOR_WEBHOOK_SECRET,
    },
    metadata: {
      role: "orchestrator",
    },
  });

  const orchestration = await prisma.orchestration.create({
    data: {
      userId,
      repositoryId,
      title,
      description,
      status: "COLLECTING_REQUIREMENTS",
      agentRuns: {
        create: {
          cursorAgentId: response.id,
          agentType: "ORCHESTRATOR",
          status: "CREATING",
          name: response.name ?? title,
        },
      },
      conversations: {
        create: {
          role: "USER",
          content: description,
        },
      },
    },
    include: {
      agentRuns: true,
    },
  });

  publishEvent(orchestration.userId, {
    type: "orchestration.updated",
    payload: {
      orchestrationId: orchestration.id,
      status: orchestration.status,
      planAccepted: orchestration.planAccepted,
    },
  });

  return orchestration;
};

interface FollowUpAnswer {
  questionId: string;
  answer: string;
}

export const answerFollowUpQuestions = async (
  orchestrationId: string,
  userId: string,
  answers: FollowUpAnswer[],
) => {
  if (answers.length === 0) {
    throw new Error("No answers provided");
  }

  const orchestration = await prisma.orchestration.findFirst({
    where: { id: orchestrationId, userId },
    include: {
      agentRuns: {
        where: { agentType: "ORCHESTRATOR" },
      },
    },
  });

  if (!orchestration) {
    throw new Error("Orchestration not found");
  }

  const orchestratorRun = orchestration.agentRuns[0];
  if (!orchestratorRun) {
    throw new Error("Orchestrator run missing");
  }

  const apiKey = await getDecryptedCursorKey(userId);
  if (!apiKey) {
    throw new Error("User has not configured a Cursor API key");
  }

  const client = createCursorClient(apiKey);

  const formatted = answers
    .map(
      (answer, index) =>
        `- Answer ${index + 1} (question ${answer.questionId}): ${answer.answer.toString().trim()}`,
    )
    .join("\n");

  await client.sendFollowup(orchestratorRun.cursorAgentId, {
    text: `Here are my answers to your questions:\n${formatted}`,
  });

  await prisma.orchestration.update({
    where: { id: orchestration.id },
    data: {
      status: "PLANNING",
      conversations: {
        create: {
          role: "USER",
          content: formatted,
        },
      },
    },
  });
};

export const acceptPlan = async (orchestrationId: string, userId: string) => {
  const orchestration = await prisma.orchestration.findFirst({
    where: { id: orchestrationId, userId },
    include: {
      agentRuns: true,
      repository: true,
    },
  });

  if (!orchestration) {
    throw new Error("Orchestration not found");
  }

  if (!orchestration.planPayload) {
    throw new Error("Plan is not ready");
  }

  if (orchestration.planAccepted) {
    return orchestration;
  }

  const plan = orchestratorPlanSchema.parse(orchestration.planPayload);
  const orchestratorRun = orchestration.agentRuns.find(
    (agentRun) => agentRun.agentType === "ORCHESTRATOR",
  );
  if (!orchestratorRun) {
    throw new Error("Orchestrator run not found");
  }

  const apiKey = await getDecryptedCursorKey(userId);
  if (!apiKey) {
    throw new Error("User has not configured a Cursor API key");
  }

  const client = createCursorClient(apiKey);
  const repository = orchestration.repository;
  const targetBranch = repository.defaultBranch ?? "main";

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.orchestration.update({
      where: { id: orchestrationId },
      data: { planAccepted: true, status: "EXECUTING" },
    });

    if (plan.subAgents.length === 0) {
      const agentPrompt = buildSubAgentPrompt({
        plan,
        repository,
        orchestrationTitle: orchestration.title,
      });
      const agent = await client.createAgent({
        name: `${orchestration.title} executor`,
        prompt: { text: agentPrompt },
        source: {
          repository: repository.fullName,
          ref: targetBranch,
        },
        target: {
          branchName: `feat/${slugify(orchestration.title)}-${orchestration.id.slice(0, 6)}`,
          autoCreatePr: false,
        },
        webhook: {
          url: `${env.APP_BASE_URL}/api/webhooks/cursor`,
          secret: env.CURSOR_WEBHOOK_SECRET,
        },
        metadata: {
          role: "sub_agent",
          orchestrationId,
        },
      });

      await tx.agentRun.create({
        data: {
          orchestrationId,
          parentRunId: orchestratorRun.id,
          cursorAgentId: agent.id,
          agentType: "SUB_AGENT",
          status: "CREATING",
          name: agent.name ?? orchestration.title,
          planPayload: plan,
        },
      });
      return;
    }

    for (const subAgent of plan.subAgents) {
      const agentPrompt = buildSubAgentPrompt({
        plan,
        repository,
        orchestrationTitle: orchestration.title,
        focusSubAgent: subAgent,
      });

      const agent = await client.createAgent({
        name: `${subAgent.name}`,
        prompt: { text: agentPrompt },
        source: {
          repository: repository.fullName,
          ref: targetBranch,
        },
        target: {
          branchName: `feat/${slugify(subAgent.name)}-${subAgent.id}`,
          autoCreatePr: false,
        },
        webhook: {
          url: `${env.APP_BASE_URL}/api/webhooks/cursor`,
          secret: env.CURSOR_WEBHOOK_SECRET,
        },
        metadata: {
          role: "sub_agent",
          orchestrationId,
          subAgentId: subAgent.id,
        },
      });

      await tx.agentRun.create({
        data: {
          orchestrationId,
          parentRunId: orchestratorRun.id,
          cursorAgentId: agent.id,
          agentType: "SUB_AGENT",
          status: "CREATING",
          name: agent.name ?? subAgent.name,
          planPayload: subAgent,
        },
      });
    }
  });

  publishEvent(userId, {
    type: "orchestration.updated",
    payload: {
      orchestrationId,
      status: "EXECUTING",
      planAccepted: true,
    },
  });

  return prisma.orchestration.findUnique({
    where: { id: orchestrationId },
    include: {
      agentRuns: true,
    },
  });
};

export const getOrchestrationDetail = async (orchestrationId: string, userId: string) => {
  return prisma.orchestration.findFirst({
    where: { id: orchestrationId, userId },
    include: {
      repository: true,
      agentRuns: true,
      conversations: {
        orderBy: { createdAt: "asc" },
      },
    },
  });
};

export const handleCursorWebhook = async (event: CursorWebhookEvent) => {
  const agentRun = await prisma.agentRun.findUnique({
    where: { cursorAgentId: event.agent.id },
    include: {
      orchestration: true,
    },
  });
  if (!agentRun) {
    logger.warn("Received webhook for unknown agent", { agentId: event.agent.id });
    return;
  }

  await prisma.agentRun.update({
    where: { id: agentRun.id },
    data: {
      status: translateStatus(event.agent.status),
      lastWebhookEvent: event as unknown as Prisma.InputJsonValue,
    },
  });

  if (event.type === "agent.message.created") {
    if (typeof event.data === "string") {
      await processAgentMessage(agentRun.id, agentRun.orchestrationId, event.data as string);
    }
  }

  if (event.type === "agent.plan.ready") {
    await markPlanReady(agentRun.id, agentRun.orchestrationId, event.data);
  }

  if (event.type === "agent.completed") {
    await prisma.orchestration.update({
      where: { id: agentRun.orchestrationId },
      data: { status: "COMPLETED" },
    });
  }

  publishEvent(agentRun.orchestration.userId, {
    type: "agent.status",
    payload: {
      orchestrationId: agentRun.orchestrationId,
      agentRunId: agentRun.id,
      status: event.agent.status,
    },
  });
};

const processAgentMessage = async (agentRunId: string, orchestrationId: string, message: string) => {
  await prisma.agentMessage.create({
    data: {
      agentRunId,
      orchestrationId,
      role: "ASSISTANT",
      content: message,
    },
  });

  try {
    const parsed = orchestratorResponseSchema.parse(JSON.parse(message));
    if (parsed.type === "follow_up_questions") {
      await prisma.orchestration.update({
        where: { id: orchestrationId },
        data: {
          status: "AWAITING_USER",
          planPayload: parsed,
        },
      });

      publishEventForQuestions(orchestrationId, parsed.questions);
    } else if (parsed.type === "plan") {
      await prisma.agentRun.update({
        where: { id: agentRunId },
        data: { planPayload: parsed.plan },
      });
      await prisma.orchestration.update({
        where: { id: orchestrationId },
        data: {
          status: "AWAITING_APPROVAL",
          planPayload: parsed.plan,
        },
      });

      publishEventForPlan(orchestrationId, agentRunId, parsed.plan);
    }
  } catch (error) {
    logger.warn("Failed to parse orchestrator response", { error });
  }
};

const markPlanReady = async (agentRunId: string, orchestrationId: string, data: unknown) => {
  try {
    if (!data || typeof data !== "string") {
      return;
    }
    const parsed = orchestratorResponseSchema.parse(JSON.parse(data));
    if (parsed.type !== "plan") {
      return;
    }

    await prisma.agentRun.update({
      where: { id: agentRunId },
      data: { planPayload: parsed.plan },
    });
    await prisma.orchestration.update({
      where: { id: orchestrationId },
      data: {
        status: "AWAITING_APPROVAL",
        planPayload: parsed.plan,
      },
    });

    publishEventForPlan(orchestrationId, agentRunId, parsed.plan);
  } catch (error) {
    logger.warn("Failed to handle plan payload", { error });
  }
};

const translateStatus = (status: string) => {
  switch (status) {
    case "CREATING":
      return "CREATING";
    case "RUNNING":
    case "QUEUED":
      return "RUNNING";
    case "WAITING_FOR_USER":
      return "WAITING_FOR_USER";
    case "COMPLETED":
      return "COMPLETED";
    case "FAILED":
      return "FAILED";
    default:
      return "RUNNING";
  }
};

const buildOrchestratorPrompt = ({
  title,
  description,
  repository,
  targetBranch,
}: {
  title: string;
  description: string;
  repository: { fullName: string; provider: string; defaultBranch: string | null };
  targetBranch: string;
}) => {
  return [
    "You are the Cursor Orchestrator Agent.",
    "You operate as the first point of contact for an engineer requesting a new feature or refactor.",
    "Follow this protocol strictly:",
    "",
    "1. Collect missing information. If anything is unclear, respond ONLY with JSON following the `follow_up_questions` schema. Ask concise questions.",
    "2. Once there is enough information, respond ONLY with JSON following the `plan` schema.",
    "3. Plans must split work into sub agents when doing so accelerates delivery or parallelises non-overlapping tasks.",
    "4. Never include explanatory text outside the JSON payload.",
    "",
    "Repository context:",
    `- Provider: ${repository.provider}`,
    `- Identifier: ${repository.fullName}`,
    `- Working branch: ${targetBranch}`,
    "",
    "User request summary:",
    `\"\"\"${title}\n${description}\"\"\"`,
    "",
    "JSON schemas:",
    "follow_up_questions:",
    JSON.stringify(
      {
        type: "follow_up_questions",
        questions: [
          {
            id: "q1",
            question: "string describing the question for the user",
            context: "optional extra context to help the user answer",
            required: true,
          },
        ],
      },
      null,
      2,
    ),
    "",
    "plan:",
    JSON.stringify(
      {
        type: "plan",
        plan: {
          primaryObjective: "single sentence goal",
          summary: "short paragraph describing the approach",
          steps: [
            {
              id: "step-1",
              title: "descriptive title",
              description: "explain what will be done",
              deliverables: ["list of tangible deliverables"],
            },
          ],
          subAgents: [
            {
              id: "agent-frontend",
              name: "Frontend overhaul agent",
              scope: "Scope summary",
              instructions: "Detailed instructions for this agent",
              tasks: [
                {
                  id: "task-1",
                  title: "Implement new layout",
                  details: "Detailed work description",
                  acceptanceCriteria: ["criteria 1", "criteria 2"],
                },
              ],
            },
          ],
        },
      },
      null,
      2,
    ),
    "",
    "Remember: respond with JSON only. No explanations, markdown, or code fences.",
  ].join("\n");
};

const buildSubAgentPrompt = ({
  plan,
  repository,
  orchestrationTitle,
  focusSubAgent,
}: {
  plan: OrchestratorPlan;
  repository: { fullName: string; provider: string; defaultBranch: string | null };
  orchestrationTitle: string;
  focusSubAgent?: PlanSubAgent;
}) => {
  const base = [
    `You are a Cursor implementation agent working on "${orchestrationTitle}".`,
    `Repository: ${repository.fullName}`,
    `Base branch: ${repository.defaultBranch ?? "main"}`,
    "",
    "Overall plan summary:",
    `Objective: ${plan.primaryObjective}`,
    `Summary: ${plan.summary}`,
    "",
  ];

  const tasks: PlanSubAgentTask[] = focusSubAgent
    ? focusSubAgent.tasks
    : plan.subAgents.flatMap((agent: PlanSubAgent) => agent.tasks);

  const instructions = focusSubAgent
    ? [
        `Focus scope: ${focusSubAgent.scope}`,
        `Instructions: ${focusSubAgent.instructions}`,
        "",
        "Tasks:",
      ]
    : ["Tasks:", ""];

  const tasksText = tasks
    .map((task: PlanSubAgentTask, index: number) => {
      const criteria = task.acceptanceCriteria.map((criterion: string) => `    - ${criterion}`).join("\n");
      return [
        `${index + 1}. ${task.title}`,
        `   Details: ${task.details}`,
        `   Acceptance criteria:\n${criteria}`,
      ].join("\n");
    })
    .join("\n\n");

  return [...base, ...instructions, tasksText, "", "Deliver high-quality commits and summary when done."].join("\n");
};

const publishEvent = (userId: string, event: ServerEvent) => {
  try {
    getWebSocketHub().broadcastToUser(userId, event);
  } catch (error) {
    logger.warn("Unable to publish websocket event", { error });
  }
};

const publishEventForQuestions = (orchestrationId: string, questions: OrchestratorQuestion[]) => {
  const hub = getWebSocketHub();
  const payload = {
    type: "orchestration.question",
    payload: {
      orchestrationId,
      agentRunId: null,
      question: JSON.stringify(questions),
    },
  } as ServerEvent;
  hub.broadcastAll(payload);
};

const publishEventForPlan = (orchestrationId: string, agentRunId: string, plan: OrchestratorPlan) => {
  const hub = getWebSocketHub();
  const payload: ServerEvent = {
    type: "orchestration.plan_ready",
    payload: {
      orchestrationId,
      agentRunId,
      plan,
    },
  };
  hub.broadcastAll(payload);
};

const slugify = (input: string) =>
  input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
