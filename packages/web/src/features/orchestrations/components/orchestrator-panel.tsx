import { useEffect, useMemo, useState } from "react";
import { Loader2, MessageCircle, MessageSquare, CheckCircle, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAnswerQuestionsMutation,
  useAcceptPlanMutation,
  useOrchestrationDetailQuery,
} from "../api";
import type {
  AgentMessage,
  AgentRun,
  OrchestratorPlan,
  OrchestratorQuestion,
  OrchestrationStatus,
} from "../types";

interface OrchestratorPanelProps {
  orchestrationId: string | null;
}

interface FollowUpState {
  [questionId: string]: string;
}

const isPlan = (payload: unknown): payload is OrchestratorPlan => {
  if (!payload || typeof payload !== "object") {
    return false;
  }
  return (
    "summary" in payload &&
    Array.isArray((payload as OrchestratorPlan).steps) &&
    Array.isArray((payload as OrchestratorPlan).subAgents)
  );
};

const extractQuestions = (payload: unknown): OrchestratorQuestion[] | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  if ("type" in payload && (payload as { type: string }).type === "follow_up_questions") {
    const questions = (payload as { questions?: OrchestratorQuestion[] }).questions;
    if (Array.isArray(questions)) {
      return questions;
    }
  }
  return null;
};

const statusLabelMap: Record<OrchestrationStatus, string> = {
  PENDING: "Pending",
  COLLECTING_REQUIREMENTS: "Collecting requirements",
  AWAITING_USER: "Awaiting user input",
  PLANNING: "Planning",
  AWAITING_APPROVAL: "Awaiting approval",
  APPROVED: "Approved",
  EXECUTING: "Executing",
  COMPLETED: "Completed",
  FAILED: "Failed",
};

const agentStatusBadge: Record<string, "secondary" | "default" | "outline" | "destructive"> = {
  COMPLETED: "secondary",
  FAILED: "destructive",
  RUNNING: "default",
  WAITING_FOR_USER: "outline",
};

export const OrchestratorPanel = ({ orchestrationId }: OrchestratorPanelProps) => {
  const { data, isLoading, isFetching } = useOrchestrationDetailQuery(orchestrationId);
  const answerMutation = useAnswerQuestionsMutation();
  const acceptMutation = useAcceptPlanMutation();
  const [answers, setAnswers] = useState<FollowUpState>({});
  const [error, setError] = useState<string | null>(null);

  const plan = useMemo(() => {
    if (data?.planPayload && isPlan(data.planPayload)) {
      return data.planPayload;
    }
    const orchestratorRunPlan = data?.agentRuns.find(
      (run) => run.agentType === "ORCHESTRATOR" && run.planPayload && isPlan(run.planPayload),
    );
    return orchestratorRunPlan?.planPayload && isPlan(orchestratorRunPlan.planPayload)
      ? orchestratorRunPlan.planPayload
      : null;
  }, [data]);

  const questions = useMemo(() => {
    if (!data?.planPayload) {
      return null;
    }
    return extractQuestions(data.planPayload);
  }, [data]);

  useEffect(() => {
    if (questions) {
      const nextState: FollowUpState = {};
      questions.forEach((question) => {
        nextState[question.id] = answers[question.id] ?? "";
      });
      setAnswers(nextState);
    }
  }, [questions]);

  useEffect(() => {
    if (!questions) {
      setAnswers({});
    }
  }, [questions?.length]);

  const handleAnswerSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!data) {
      return;
    }
    const payload = Object.entries(answers)
      .filter(([, value]) => value.trim().length > 0)
      .map(([questionId, answer]) => ({ questionId, answer }));
    if (payload.length === 0) {
      setError("Provide answers before submitting.");
      return;
    }
    setError(null);
    answerMutation.mutate(
      {
        orchestrationId: data.id,
        answers: payload,
      },
      {
        onSuccess: () => setAnswers({}),
        onError: (err) => setError(err instanceof Error ? err.message : "Failed to send answers"),
      },
    );
  };

  const handleAcceptPlan = () => {
    if (!data) {
      return;
    }
    acceptMutation.mutate(data.id);
  };

  if (!orchestrationId) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-dashed p-8 text-muted-foreground">
        Select an orchestration to view its progress.
      </div>
    );
  }

  if (isLoading && !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-dashed p-8 text-muted-foreground">
        Unable to load orchestration. It might have been removed.
      </div>
    );
  }

  const orchestratorRun = data.agentRuns.find((run) => run.agentType === "ORCHESTRATOR");
  const subAgentRuns = data.agentRuns.filter((run) => run.agentType === "SUB_AGENT");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{data.title}</CardTitle>
            <CardDescription>{data.description}</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{statusLabelMap[data.status]}</Badge>
            <Badge variant="secondary">{data.repository.fullName}</Badge>
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold">Conversation</h4>
              <div className="mt-3 space-y-3 rounded-md border p-4">
                {data.conversations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No conversation yet.</p>
                ) : (
                  data.conversations.map((message) => <MessageBubble key={message.id} message={message} />)
                )}
              </div>
            </div>

            {questions && questions.length > 0 ? (
              <div className="rounded-md border p-4">
                <form className="space-y-4" onSubmit={handleAnswerSubmit}>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-semibold">Agent questions</h4>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Provide answers to continue planning. You can submit partial responses; unanswered questions remain.
                  </p>
                  <Separator />
                  <div className="space-y-3">
                    {questions.map((question) => (
                      <div key={question.id} className="space-y-2">
                        <Label htmlFor={`answer-${question.id}`} className="font-medium">
                          {question.question}
                        </Label>
                        {question.context ? (
                          <p className="text-xs text-muted-foreground">{question.context}</p>
                        ) : null}
                        <Textarea
                          id={`answer-${question.id}`}
                          value={answers[question.id] ?? ""}
                          onChange={(event) =>
                            setAnswers((prev) => ({
                              ...prev,
                              [question.id]: event.target.value,
                            }))
                          }
                          placeholder="Type your answer"
                          rows={3}
                        />
                      </div>
                    ))}
                  </div>
                  {error ? (
                    <Alert variant="destructive" className="text-sm">
                      {error}
                    </Alert>
                  ) : null}
                  <Button type="submit" disabled={answerMutation.isPending}>
                    {answerMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending answers…
                      </>
                    ) : (
                      "Send answers"
                    )}
                  </Button>
                </form>
              </div>
            ) : null}

            {plan ? (
              <div className="space-y-4 rounded-md border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    <h4 className="text-sm font-semibold">Proposed implementation plan</h4>
                  </div>
                  {!data.planAccepted && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAcceptPlan}
                      disabled={acceptMutation.isPending}
                    >
                      {acceptMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Accepting…
                        </>
                      ) : (
                        "Accept plan"
                      )}
                    </Button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{plan.summary}</p>
                <div>
                  <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Steps
                  </h5>
                  <ul className="mt-2 space-y-3">
                    {plan.steps.map((step) => (
                      <li key={step.id} className="rounded-md border p-3">
                        <p className="text-sm font-semibold">{step.title}</p>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                        <div className="mt-2 text-xs text-muted-foreground">
                          Deliverables:
                          <ul className="ml-4 list-disc">
                            {step.deliverables.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
                {plan.subAgents.length > 0 ? (
                  <div>
                    <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Sub agents
                    </h5>
                    <ul className="mt-2 space-y-3">
                      {plan.subAgents.map((subAgent) => (
                        <li key={subAgent.id} className="rounded-md border p-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold">{subAgent.name}</p>
                            <Badge variant="outline">{subAgent.tasks.length} tasks</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{subAgent.scope}</p>
                          <p className="mt-2 text-xs text-muted-foreground">{subAgent.instructions}</p>
                          <div className="mt-2 space-y-2">
                            {subAgent.tasks.map((task) => (
                              <div key={task.id} className="rounded bg-muted/50 p-2">
                                <p className="text-sm font-medium">{task.title}</p>
                                <p className="text-sm text-muted-foreground">{task.details}</p>
                                <ul className="mt-1 ml-4 list-disc text-xs text-muted-foreground">
                                  {task.acceptanceCriteria.map((criterion) => (
                                    <li key={criterion}>{criterion}</li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="rounded-md border p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold">Agent runs</h4>
              </div>
              <div className="mt-3 space-y-3">
                {orchestratorRun ? (
                  <AgentRunRow run={orchestratorRun} label="Orchestrator agent" />
                ) : null}
                {subAgentRuns.length > 0 ? (
                  subAgentRuns.map((run) => <AgentRunRow key={run.id} run={run} />)
                ) : (
                  <p className="text-xs text-muted-foreground">No sub agents yet.</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const MessageBubble = ({ message }: { message: AgentMessage }) => {
  const isAssistant = message.role === "ASSISTANT";
  return (
    <div
      className={`flex gap-3 rounded-md border p-3 ${
        isAssistant ? "bg-muted/40 border-muted" : "bg-background"
      }`}
    >
      <MessageCircle className="mt-0.5 h-4 w-4 text-muted-foreground" />
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {message.role.toLowerCase()}
        </p>
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
};

const AgentRunRow = ({ run, label }: { run: AgentRun; label?: string }) => {
  const variant = agentStatusBadge[run.status] ?? "outline";
  return (
    <div className="flex items-start justify-between rounded-md border p-3">
      <div>
        <p className="text-sm font-semibold">{label ?? run.name ?? "Sub agent"}</p>
        <p className="text-xs text-muted-foreground">Cursor agent: {run.cursorAgentId}</p>
      </div>
      <Badge variant={variant}>{run.status}</Badge>
    </div>
  );
};
