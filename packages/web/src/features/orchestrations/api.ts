import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/use-api-client";
import type { Orchestration, OrchestrationDetail } from "./types";

interface ListResponse {
  orchestrations: Array<Pick<Orchestration, "id" | "title" | "status" | "planAccepted" | "createdAt" | "updatedAt">>;
}

interface CreatePayload {
  repositoryId: string;
  title: string;
  description: string;
  branch?: string;
}

interface CreateResponse {
  orchestration: Orchestration;
}

interface DetailResponse {
  orchestration: OrchestrationDetail;
}

interface AnswerPayload {
  orchestrationId: string;
  answers: { questionId: string; answer: string }[];
}

export const orchestrationsKey = ["orchestrations"] as const;
export const orchestrationDetailKey = (id: string) => ["orchestrations", id] as const;

export const useOrchestrationsListQuery = () => {
  const client = useApiClient();
  return useQuery({
    queryKey: orchestrationsKey,
    queryFn: async () => {
      const response = await client.get<ListResponse>("/api/orchestrations");
      return response.orchestrations;
    },
  });
};

export const useOrchestrationDetailQuery = (id: string | null) => {
  const client = useApiClient();
  return useQuery({
    queryKey: id ? orchestrationDetailKey(id) : ["orchestrations", "empty"],
    enabled: Boolean(id),
    queryFn: async () => {
      const response = await client.get<DetailResponse>(`/api/orchestrations/${id}`);
      return response.orchestration;
    },
  });
};

export const useCreateOrchestrationMutation = () => {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreatePayload) => {
      const response = await client.post<CreateResponse, CreatePayload>("/api/orchestrations", payload);
      return response.orchestration;
    },
    onSuccess: (orchestration) => {
      queryClient.setQueryData(orchestrationsKey, (previous: ListResponse["orchestrations"] | undefined) =>
        previous ? [orchestration, ...previous] : [orchestration],
      );
      queryClient.setQueryData(orchestrationDetailKey(orchestration.id), orchestration as OrchestrationDetail);
    },
  });
};

export const useAnswerQuestionsMutation = () => {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orchestrationId, answers }: AnswerPayload) => {
      await client.post<void, { answers: AnswerPayload["answers"] }>(
        `/api/orchestrations/${orchestrationId}/answers`,
        { answers },
      );
      return orchestrationId;
    },
    onSuccess: (orchestrationId) => {
      queryClient.invalidateQueries({ queryKey: orchestrationDetailKey(orchestrationId) });
    },
  });
};

export const useAcceptPlanMutation = () => {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orchestrationId: string) => {
      const response = await client.post<DetailResponse, Record<string, never>>(
        `/api/orchestrations/${orchestrationId}/accept-plan`,
        {},
      );
      return response.orchestration;
    },
    onSuccess: (orchestration) => {
      queryClient.setQueryData(orchestrationDetailKey(orchestration.id), orchestration);
      queryClient.invalidateQueries({ queryKey: orchestrationsKey });
    },
  });
};
