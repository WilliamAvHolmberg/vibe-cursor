import { ApiError } from '../lib/validation.js';

export interface CursorAgentCreateRequest {
  prompt: {
    text: string;
    images?: Array<{
      data: string;
      dimension?: { width: number; height: number };
    }>;
  };
  source: {
    repository: string;
    ref?: string;
  };
  target?: {
    autoCreatePr?: boolean;
    openAsCursorGithubApp?: boolean;
    skipReviewerRequest?: boolean;
    branchName?: string;
  };
  webhook?: {
    url: string;
    secret?: string;
  };
}

export interface CursorAgent {
  id: string;
  name?: string;
  status: string;
  source: {
    repository: string;
    ref: string;
  };
  target?: {
    branchName?: string;
    url?: string;
    autoCreatePr?: boolean;
    openAsCursorGithubApp?: boolean;
    skipReviewerRequest?: boolean;
  };
  createdAt: string;
}

export interface CursorAgentConversation {
  id: string;
  messages: Array<{
    id: string;
    type: string;
    text: string;
  }>;
}

export class CursorApiClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(apiKey: string, baseUrl = 'https://api.cursor.com/v0') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new ApiError(
        response.status,
        `Cursor API error: ${response.statusText}. ${error}`
      );
    }

    return response.json() as Promise<T>;
  }

  async createAgent(request: CursorAgentCreateRequest): Promise<CursorAgent> {
    return this.request<CursorAgent>('/agents', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getAgent(agentId: string): Promise<CursorAgent> {
    return this.request<CursorAgent>(`/agents/${agentId}`, {
      method: 'GET',
    });
  }

  async listAgents(): Promise<{ agents: CursorAgent[] }> {
    return this.request<{ agents: CursorAgent[] }>('/agents', {
      method: 'GET',
    });
  }

  async getAgentConversation(agentId: string): Promise<CursorAgentConversation> {
    return this.request<CursorAgentConversation>(`/agents/${agentId}/conversation`, {
      method: 'GET',
    });
  }

  async cancelAgent(agentId: string): Promise<{ id: string }> {
    return this.request<{ id: string }>(`/agents/${agentId}/cancel`, {
      method: 'POST',
    });
  }
}
