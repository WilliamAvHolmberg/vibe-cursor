import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { WS_BASE_URL } from "@/lib/config";
import { useSession } from "@/features/auth/session-context";
import { orchestrationsKey, orchestrationDetailKey } from "@/features/orchestrations/api";

type ServerEvent =
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

export const useOrchestrationEvents = () => {
  const { session } = useSession();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!session) {
      return;
    }

    const socket = new WebSocket(WS_BASE_URL);

    socket.addEventListener("open", () => {
      socket.send(
        JSON.stringify({
          type: "hello",
          payload: { userId: session.userId },
        }),
      );
    });

    socket.addEventListener("message", (event) => {
      try {
        const parsed = JSON.parse(event.data) as ServerEvent;
        if (!parsed?.type) {
          return;
        }

        switch (parsed.type) {
          case "orchestration.updated": {
            queryClient.invalidateQueries({ queryKey: orchestrationsKey });
            queryClient.invalidateQueries({ queryKey: orchestrationDetailKey(parsed.payload.orchestrationId) });
            break;
          }
          case "orchestration.question": {
            queryClient.invalidateQueries({ queryKey: orchestrationDetailKey(parsed.payload.orchestrationId) });
            break;
          }
          case "orchestration.plan_ready": {
            queryClient.invalidateQueries({ queryKey: orchestrationDetailKey(parsed.payload.orchestrationId) });
            break;
          }
          case "agent.status":
          case "agent.message": {
            queryClient.invalidateQueries({ queryKey: orchestrationDetailKey(parsed.payload.orchestrationId) });
            break;
          }
          default:
            break;
        }
      } catch (error) {
        console.warn("Failed to handle websocket event", error);
      }
    });

    return () => {
      socket.close();
    };
  }, [queryClient, session]);
};
