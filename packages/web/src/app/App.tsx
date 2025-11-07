import { useEffect, useMemo, useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LoginForm } from "@/features/auth/components/login-form";
import { useSession } from "@/features/auth/session-context";
import { useOrchestrationEvents } from "@/hooks/use-orchestration-events";
import { useRepositoriesQuery } from "@/features/repositories/api";
import { RepositoryList } from "@/features/repositories/components/repository-list";
import { RepositoryForm } from "@/features/repositories/components/repository-form";
import { useOrchestrationsListQuery } from "@/features/orchestrations/api";
import { OrchestrationList } from "@/features/orchestrations/components/orchestration-list";
import { FeatureRequestForm } from "@/features/orchestrations/components/feature-request-form";
import { OrchestratorPanel } from "@/features/orchestrations/components/orchestrator-panel";

export const App = () => {
  const { isAuthenticated, session, clearSession } = useSession();
  useOrchestrationEvents();

  const [selectedRepositoryId, setSelectedRepositoryId] = useState<string | null>(null);
  const [selectedOrchestrationId, setSelectedOrchestrationId] = useState<string | null>(null);

  const repositoriesQuery = useRepositoriesQuery();
  const orchestrationsQuery = useOrchestrationsListQuery();

  useEffect(() => {
    if (!selectedRepositoryId && repositoriesQuery.data && repositoriesQuery.data.length > 0) {
      setSelectedRepositoryId(repositoriesQuery.data[0].id);
    }
  }, [repositoriesQuery.data, selectedRepositoryId]);

  useEffect(() => {
    if (!selectedOrchestrationId && orchestrationsQuery.data && orchestrationsQuery.data.length > 0) {
      setSelectedOrchestrationId(orchestrationsQuery.data[0].id);
    }
  }, [orchestrationsQuery.data, selectedOrchestrationId]);

  const selectedRepository = useMemo(() => {
    if (!selectedRepositoryId || !repositoriesQuery.data) {
      return null;
    }
    return repositoriesQuery.data.find((repo) => repo.id === selectedRepositoryId) ?? null;
  }, [repositoriesQuery.data, selectedRepositoryId]);

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <LoginForm />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8">
        <header className="flex flex-col gap-4 rounded-xl border bg-card/80 p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Cursor Orchestrator Control</h1>
            <p className="text-sm text-muted-foreground">
              Authenticate, link repositories, and guide orchestrated agent workflows with follow-up, planning, and execution visibility.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium">{session?.displayName}</p>
              <p className="text-xs text-muted-foreground">{session?.email ?? "API key authenticated"}</p>
            </div>
            <Separator orientation="vertical" className="h-10" />
            <Button variant="ghost" onClick={clearSession}>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </Button>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[340px,1fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Linked repositories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <RepositoryForm />
                <RepositoryList
                  repositories={repositoriesQuery.data}
                  isLoading={repositoriesQuery.isLoading}
                  selectedId={selectedRepositoryId}
                  onSelect={(id) => {
                    setSelectedRepositoryId(id);
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Feature requests</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedRepository ? (
                  <FeatureRequestForm
                    repositoryId={selectedRepository.id}
                    defaultBranch={selectedRepository.defaultBranch}
                    onCreated={(id) => {
                      setSelectedOrchestrationId(id);
                    }}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Link and select a repository to create a new orchestrator request.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Orchestrations</CardTitle>
              </CardHeader>
              <CardContent>
                <OrchestrationList
                  orchestrations={orchestrationsQuery.data}
                  isLoading={orchestrationsQuery.isLoading}
                  selectedId={selectedOrchestrationId}
                  onSelect={setSelectedOrchestrationId}
                />
              </CardContent>
            </Card>
          </div>

          <OrchestratorPanel orchestrationId={selectedOrchestrationId} />
        </div>
      </div>
    </div>
  );
};
