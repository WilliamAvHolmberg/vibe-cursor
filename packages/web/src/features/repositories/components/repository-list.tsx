import { GitBranch } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { RepositorySummary } from "../types";

interface RepositoryListProps {
  repositories?: RepositorySummary[];
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export const RepositoryList = ({ repositories, isLoading, selectedId, onSelect }: RepositoryListProps) => {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (!repositories || repositories.length === 0) {
    return (
      <div className="flex h-full min-h-[120px] items-center justify-center rounded-md border border-dashed p-6 text-sm text-muted-foreground">
        Link a repository to get started.
      </div>
    );
  }

  return (
    <ScrollArea className="h-[280px] rounded-md border">
      <ul className="divide-y">
        {repositories.map((repository) => {
          const isActive = repository.id === selectedId;
          return (
            <li key={repository.id}>
              <button
                type="button"
                onClick={() => onSelect(repository.id)}
                className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-muted/60 ${
                  isActive ? "bg-primary/10" : ""
                }`}
              >
                <GitBranch className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div className="grow">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{repository.fullName}</p>
                    {repository.alias ? (
                      <Badge variant="secondary">{repository.alias}</Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Provider: {repository.provider} · Default branch: {repository.defaultBranch ?? "main"}
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </ScrollArea>
  );
};
