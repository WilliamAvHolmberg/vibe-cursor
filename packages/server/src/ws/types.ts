export type ServerEvent =
  | {
      type: "orchestration.updated";
      payload: {
        orchestrationId: string;
        status: string;
        planAccepted: boolean;
      };
    }
  | {
      type: "orchestration.question";
      payload: {
        orchestrationId: string;
        agentRunId: string | null;
        question: string;
      };
    }
  | {
      type: "orchestration.plan_ready";
      payload: {
        orchestrationId: string;
        agentRunId: string;
        plan: unknown;
      };
    }
  | {
      type: "agent.status";
      payload: {
        orchestrationId: string;
        agentRunId: string;
        status: string;
      };
    }
  | {
      type: "agent.message";
      payload: {
        orchestrationId: string;
        agentRunId: string;
        role: string;
        content: string;
      };
    };

export interface ClientHello {
  type: "hello";
  payload: {
    userId: string;
  };
}

export type ClientMessage = ClientHello;
