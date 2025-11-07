import { useCallback } from "react";
import { useSession } from "@/features/auth/session-context";
import { request } from "@/lib/api-client";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface MutationOptions<TBody> {
  body?: TBody;
  auth?: boolean;
}

export const useApiClient = () => {
  const { session } = useSession();

  const call = useCallback(
    async <TResponse, TBody = unknown>(
      method: HttpMethod,
      path: string,
      options: MutationOptions<TBody> = {},
    ): Promise<TResponse> => {
      const { body, auth = true } = options;
      return request<TResponse>(
        path,
        {
          method,
          auth,
          body: body ? JSON.stringify(body) : undefined,
        },
        session ?? null,
      );
    },
    [session],
  );

  return {
    get: <T>(path: string, auth = true) => call<T>("GET", path, { auth }),
    post: <T, TBody>(path: string, body: TBody, auth = true) => call<T, TBody>("POST", path, { body, auth }),
    put: <T, TBody>(path: string, body: TBody, auth = true) => call<T, TBody>("PUT", path, { body, auth }),
    patch: <T, TBody>(path: string, body: TBody, auth = true) => call<T, TBody>("PATCH", path, { body, auth }),
    delete: <T>(path: string, auth = true) => call<T>("DELETE", path, { auth }),
  };
};
