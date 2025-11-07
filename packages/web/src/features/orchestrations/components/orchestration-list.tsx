import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { Orchestration } from "../types";

interface OrchestrationListProps {
  orchestrations?: Array<Pick<Orchestration, "id" | "title" | "status" | "planAccepted" | "createdAt">>;
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const statusVariantMap: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  COMPLETED: "secondary",
  FAILED: "destructive",
  EXECUTING: "default",
};

export const OrchestrationList = ({
  orchestrations,
  isLoading,
  selectedId,
  onSelect,
}: OrchestrationListProps) => {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (!orchestrations || orchestrations.length === 0) {
    return (
      <div className="flex h-full min-h-[120px] items-center justify-center rounded-md border border-dashed p-6 text-sm text-muted-foreground">
        No orchestrations yet. Create a new plan to get started.
      </div>
    );
  }

  return (
    <ScrollArea className="h-[280px] rounded-md border">
      <ul className="divide-y">
        {orchestrations.map((item) => {
          const isActive = item.id === selectedId;
          const badgeVariant = statusVariantMap[item.status] ?? "outline";
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                className={`flex w-full flex-col items-start gap-2 px-4 py-3 text-left transition hover:bg-muted/60 ${
                  isActive ? "bg-primary/10" : ""
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <p className="font-medium">{item.title}</p>
                  <Badge variant={badgeVariant}>{item.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Created {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </ScrollArea>
  );
};
