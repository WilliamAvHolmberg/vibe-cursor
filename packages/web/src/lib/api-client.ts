import type { Session } from "@/features/auth/session-context";
import { API_BASE_URL } from "./config";

interface RequestOptions extends RequestInit {
  auth?: boolean;
}

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const request = async <T>(
  path: string,
  { auth = true, headers, ...init }: RequestOptions,
  session: Session | null,
): Promise<T> => {
  const url = `${API_BASE_URL}${path}`;

  const finalHeaders = new Headers({
    "Content-Type": "application/json",
    ...(headers ?? {}),
  });

  if (auth) {
    if (!session) {
      throw new ApiError("Authentication required", 401);
    }
    finalHeaders.set("x-user-id", session.userId);
  }

  const response = await fetch(url, {
    ...init,
    headers: finalHeaders,
  });

  if (!response.ok) {
    let details: unknown;
    try {
      details = await response.json();
    } catch {
      details = await response.text();
    }
    throw new ApiError(`Request failed for ${path}`, response.status, details);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return (await response.json()) as T;
  }

  return (await response.text()) as T;
};
