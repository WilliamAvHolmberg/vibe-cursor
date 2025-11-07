export type CursorAgentStatus = "CREATING" | "QUEUED" | "RUNNING" | "WAITING_FOR_USER" | "COMPLETED" | "FAILED";

export interface CursorAgent {
  id: string;
  name?: string;
  status: CursorAgentStatus;
  createdAt: string;
  updatedAt?: string;
  source?: {
    repository: string;
    ref?: string;
  };
  target?: {
    branchName?: string;
    url?: string;
    autoCreatePr?: boolean;
    openAsCursorGithubApp?: boolean;
    skipReviewerRequest?: boolean;
  };
  plan?: unknown;
}

export type CursorAgentMessageRole = "user_message" | "assistant_message" | "system_message";

export interface CursorConversationMessage {
  id: string;
  type: CursorAgentMessageRole;
  text: string;
  createdAt?: string;
}

export interface CursorCreateAgentRequest {
  name?: string;
  prompt: {
    text: string;
    images?: Array<{
      data: string;
      dimension: { width: number; height: number };
    }>;
  };
  source: {
    repository: string;
    ref?: string;
  };
  target?: {
    autoCreatePr?: boolean;
    branchName?: string;
    openAsCursorGithubApp?: boolean;
    skipReviewerRequest?: boolean;
  };
  webhook?: {
    url: string;
    secret?: string;
  };
  metadata?: Record<string, unknown>;
}

export interface CursorFollowupRequest {
  text: string;
  clearPrevious?: boolean;
}

export type CursorWebhookEventType =
  | "agent.status.updated"
  | "agent.message.created"
  | "agent.plan.ready"
  | "agent.plan.rejected"
  | "agent.completed"
  | "agent.failed";

export interface CursorWebhookEvent {
  id: string;
  type: CursorWebhookEventType;
  createdAt: string;
  agent: {
    id: string;
    status: CursorAgentStatus;
  };
  data?: unknown;
}
