import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { ApiError } from "@/lib/api-client";
import { useApiClient } from "@/hooks/use-api-client";
import { useSession } from "@/features/auth/session-context";

interface CreateSessionResponse {
  userId: string;
  displayName: string;
  email?: string | null;
}

export const LoginForm = () => {
  const client = useApiClient();
  const { setSession } = useSession();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        displayName,
        email: email || undefined,
        cursorApiKey: apiKey,
      };
      const response = await client.post<CreateSessionResponse, typeof payload>(
        "/api/auth/session",
        payload,
        false,
      );
      return response;
    },
    onSuccess: (data) => {
      setSession({
        userId: data.userId,
        displayName: data.displayName,
        email: data.email,
      });
      setApiKey("");
      setError(null);
    },
    onError: (err) => {
      const message =
        err instanceof ApiError
          ? typeof err.details === "object" && err.details && "error" in (err.details as Record<string, unknown>)
            ? String((err.details as Record<string, unknown>).error)
            : err.message
          : "Unable to authenticate. Ensure your API key is correct.";
      setError(message);
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    mutation.mutate();
  };

  const canSubmit = displayName.trim().length > 0 && apiKey.trim().length > 0 && !mutation.isPending;

  return (
    <div className="mx-auto w-full max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Authenticate with Cursor</CardTitle>
          <CardDescription>
            Provide your Cursor Cloud API key. It is stored locally and used only to talk to your orchestrator API.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="displayName">Display name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Your name"
                autoComplete="name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email (optional)</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiKey">Cursor API key</Label>
              <div className="relative">
                <Input
                  id="apiKey"
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  placeholder="sk-live-..."
                  autoComplete="off"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1 h-7 w-7 text-muted-foreground"
                  onClick={() => setShowKey((prev) => !prev)}
                  aria-label={showKey ? "Hide API key" : "Show API key"}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            {error ? (
              <Alert variant="destructive" className="text-sm">
                {error}
              </Alert>
            ) : null}
            <Button type="submit" className="w-full" disabled={!canSubmit}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Authenticating…
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
