import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/use-api-client";
import type { RepositorySummary } from "./types";

interface ListRepositoriesResponse {
  repositories: RepositorySummary[];
}

interface CreateRepositoryPayload {
  provider: string;
  name: string;
  fullName: string;
  defaultBranch?: string;
  cloneUrl?: string;
  alias?: string;
}

interface CreateRepositoryResponse {
  repository: RepositorySummary;
}

export const repositoriesKey = ["repositories"];

export const useRepositoriesQuery = () => {
  const client = useApiClient();
  return useQuery({
    queryKey: repositoriesKey,
    queryFn: async () => {
      const response = await client.get<ListRepositoriesResponse>("/api/repositories");
      return response.repositories;
    },
  });
};

export const useCreateRepositoryMutation = () => {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateRepositoryPayload) => {
      const response = await client.post<CreateRepositoryResponse, CreateRepositoryPayload>(
        "/api/repositories",
        payload,
      );
      return response.repository;
    },
    onSuccess: (repository) => {
      queryClient.setQueryData<RepositorySummary[]>(repositoriesKey, (current) =>
        current ? [repository, ...current] : [repository],
      );
    },
  });
};
