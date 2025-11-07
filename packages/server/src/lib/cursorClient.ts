import { logger } from "./logger";
import type {
  CursorAgent,
  CursorConversationMessage,
  CursorCreateAgentRequest,
  CursorFollowupRequest,
} from "../types/cursor";

const BASE_URL = "https://api.cursor.com/v0";

class CursorApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = "CursorApiError";
  }
}

const toBasicAuth = (apiKey: string) => {
  const encoded = Buffer.from(`${apiKey}:`).toString("base64");
  return `Basic ${encoded}`;
};

const request = async <T>(apiKey: string, path: string, init: RequestInit): Promise<T> => {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: toBasicAuth(apiKey),
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    let details: unknown;
    try {
      details = await response.json();
    } catch {
      details = await response.text();
    }
    logger.error("Cursor API request failed", { path, status: response.status, details });
    throw new CursorApiError(`Cursor API request to ${path} failed`, response.status, details);
  }

  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return (await response.json()) as T;
  }
  return (await response.text()) as T;
};

export const createCursorClient = (apiKey: string) => {
  const assertApiKey = () => {
    if (!apiKey) {
      throw new Error("Cursor API key is not configured for this user");
    }
  };

  return {
    createAgent: async (payload: CursorCreateAgentRequest): Promise<CursorAgent> => {
      assertApiKey();
      return request<CursorAgent>(apiKey, "/agents", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    getAgent: async (agentId: string): Promise<CursorAgent> => {
      assertApiKey();
      return request<CursorAgent>(apiKey, `/agents/${agentId}`, {
        method: "GET",
      });
    },
    getConversation: async (agentId: string): Promise<{ messages: CursorConversationMessage[] }> => {
      assertApiKey();
      return request<{ messages: CursorConversationMessage[] }>(apiKey, `/agents/${agentId}/conversation`, {
        method: "GET",
      });
    },
    sendFollowup: async (agentId: string, payload: CursorFollowupRequest): Promise<void> => {
      assertApiKey();
      await request(apiKey, `/agents/${agentId}/followup`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
  };
};

export type CursorClient = ReturnType<typeof createCursorClient>;
