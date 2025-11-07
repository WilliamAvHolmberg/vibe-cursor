import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { useCreateOrchestrationMutation } from "../api";

interface FeatureRequestFormProps {
  repositoryId: string;
  defaultBranch?: string | null;
  onCreated: (orchestrationId: string) => void;
}

export const FeatureRequestForm = ({ repositoryId, defaultBranch, onCreated }: FeatureRequestFormProps) => {
  const createMutation = useCreateOrchestrationMutation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [branch, setBranch] = useState(defaultBranch ?? "main");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!repositoryId) {
      setError("Select a repository first.");
      return;
    }
    createMutation.mutate(
      {
        repositoryId,
        title,
        description,
        branch: branch || undefined,
      },
      {
        onSuccess: (orchestration) => {
          onCreated(orchestration.id);
          setTitle("");
          setDescription("");
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : "Failed to create orchestration");
        },
      },
    );
  };

  const canSubmit =
    title.trim().length > 3 && description.trim().length > 10 && !createMutation.isPending && repositoryId;

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="featureTitle">Feature title</Label>
        <Input
          id="featureTitle"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Implement orchestrator plan for dashboard"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="featureDescription">Details for the orchestrator</Label>
        <Textarea
          id="featureDescription"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Describe the request, constraints, and acceptance criteria..."
          rows={6}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="featureBranch">Target branch</Label>
        <Input
          id="featureBranch"
          value={branch}
          onChange={(event) => setBranch(event.target.value)}
          placeholder={defaultBranch ?? "main"}
        />
      </div>
      {error ? (
        <Alert variant="destructive" className="text-sm">
          {error}
        </Alert>
      ) : null}
      <Button type="submit" disabled={!canSubmit} className="w-full md:w-auto">
        {createMutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Starting orchestrator…
          </>
        ) : (
          "Create plan"
        )}
      </Button>
    </form>
  );
};
