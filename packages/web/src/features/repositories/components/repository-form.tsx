import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { useCreateRepositoryMutation } from "../api";

const PROVIDER_OPTIONS = ["github", "gitlab", "bitbucket", "other"];

export const RepositoryForm = () => {
  const createMutation = useCreateRepositoryMutation();
  const [provider, setProvider] = useState("github");
  const [fullName, setFullName] = useState("");
  const [defaultBranch, setDefaultBranch] = useState("main");
  const [cloneUrl, setCloneUrl] = useState("");
  const [alias, setAlias] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const [owner, name] = fullName.split("/");
    if (!owner || !name) {
      setError("Use the format owner/repository when specifying the repository full name.");
      return;
    }
    createMutation.mutate(
      {
        provider,
        fullName,
        name,
        defaultBranch: defaultBranch || undefined,
        cloneUrl: cloneUrl || undefined,
        alias: alias || undefined,
      },
      {
        onSuccess: () => {
          setAlias("");
          setCloneUrl("");
          setFullName("");
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : "Unable to link repository");
        },
      },
    );
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="provider">Provider</Label>
          <select
            id="provider"
            value={provider}
            onChange={(event) => setProvider(event.target.value)}
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {PROVIDER_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="alias">Alias (optional)</Label>
          <Input
            id="alias"
            value={alias}
            onChange={(event) => setAlias(event.target.value)}
            placeholder="Frontend service"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="fullName">Repository (owner/name)</Label>
        <Input
          id="fullName"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder="acme/cursor-orchestrator"
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="defaultBranch">Default branch</Label>
          <Input
            id="defaultBranch"
            value={defaultBranch}
            onChange={(event) => setDefaultBranch(event.target.value)}
            placeholder="main"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cloneUrl">Clone URL (optional)</Label>
          <Input
            id="cloneUrl"
            value={cloneUrl}
            onChange={(event) => setCloneUrl(event.target.value)}
            placeholder="https://github.com/acme/cursor-orchestrator.git"
          />
        </div>
      </div>

      {error ? (
        <Alert variant="destructive" className="text-sm">
          {error}
        </Alert>
      ) : null}

      <Button type="submit" className="w-full md:w-auto" disabled={createMutation.isPending}>
        {createMutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Linking…
          </>
        ) : (
          "Link repository"
        )}
      </Button>
    </form>
  );
};
