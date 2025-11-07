import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useWebSocket } from '@/lib/use-websocket';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  GitBranch,
  Clock,
  Users,
  MessageCircle,
} from 'lucide-react';

export function OrchestrationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const { data: orchestration, refetch } = useQuery({
    queryKey: ['orchestration', id],
    queryFn: async () => {
      const response = await api.orchestration.get(id!);
      return response.data;
    },
    enabled: !!id,
    refetchInterval: 10000,
  });

  const { lastMessage } = useWebSocket(id);

  useEffect(() => {
    if (lastMessage) {
      console.log('WebSocket message:', lastMessage);
      refetch();
      
      if (lastMessage.type === 'questions_asked') {
        toast({
          title: 'Follow-up Questions',
          description: 'The agent has some questions for you',
        });
      } else if (lastMessage.type === 'plan_ready') {
        toast({
          title: 'Plan Ready',
          description: 'Review the execution plan',
        });
      } else if (lastMessage.type === 'orchestration_completed') {
        toast({
          title: 'Orchestration Complete',
          description: `Status: ${lastMessage.status}`,
          variant: lastMessage.status === 'COMPLETED' ? 'default' : 'destructive',
        });
      }
    }
  }, [lastMessage]);

  const handleAnswerQuestions = async () => {
    if (!id) return;

    const questions = orchestration?.planningOutput?.content?.questions || [];
    const missingAnswers = questions.filter((q: any) => !answers[q.id]?.trim());
    
    if (missingAnswers.length > 0) {
      toast({
        title: 'Missing Answers',
        description: 'Please answer all questions',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      await api.orchestration.answer(id, answers);
      toast({
        title: 'Answers Submitted',
        description: 'Agent is re-planning with your responses',
      });
      setAnswers({});
      refetch();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to submit answers',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprovePlan = async () => {
    if (!id) return;

    setSubmitting(true);
    try {
      await api.orchestration.approve(id);
      toast({
        title: 'Plan Approved',
        description: 'Agent execution started',
      });
      refetch();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to approve plan',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!id) return;

    try {
      await api.orchestration.cancel(id);
      toast({
        title: 'Orchestration Cancelled',
        description: 'All running agents have been cancelled',
      });
      refetch();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to cancel',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { icon: any; color: string; text: string }> = {
      PLANNING: { icon: Loader2, color: 'text-blue-500', text: 'Planning' },
      AWAITING_FOLLOWUP: { icon: MessageCircle, color: 'text-yellow-500', text: 'Awaiting Answers' },
      AWAITING_APPROVAL: { icon: AlertCircle, color: 'text-yellow-500', text: 'Awaiting Approval' },
      EXECUTING: { icon: Loader2, color: 'text-blue-500', text: 'Executing' },
      COMPLETED: { icon: CheckCircle2, color: 'text-green-500', text: 'Completed' },
      FAILED: { icon: XCircle, color: 'text-red-500', text: 'Failed' },
      CANCELLED: { icon: XCircle, color: 'text-gray-500', text: 'Cancelled' },
    };

    const badge = badges[status] || badges.PLANNING;
    const Icon = badge.icon;
    const animate = ['PLANNING', 'EXECUTING'].includes(status);

    return (
      <div className="flex items-center gap-2">
        <Icon className={`h-5 w-5 ${badge.color} ${animate ? 'animate-spin' : ''}`} />
        <span className="font-semibold">{badge.text}</span>
      </div>
    );
  };

  if (!orchestration) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const questions = orchestration.planningOutput?.content?.questions || [];
  const plan = orchestration.planningOutput?.content;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Orchestration Details</h1>
              {getStatusBadge(orchestration.status)}
            </div>
          </div>
          {['PLANNING', 'EXECUTING', 'AWAITING_FOLLOWUP', 'AWAITING_APPROVAL'].includes(
            orchestration.status
          ) && (
            <Button variant="destructive" onClick={handleCancel}>
              Cancel Orchestration
            </Button>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Task Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{orchestration.initialPrompt}</p>
            <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <GitBranch className="h-4 w-4" />
                {orchestration.repository}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Created {new Date(orchestration.createdAt).toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>

        {orchestration.status === 'AWAITING_FOLLOWUP' && questions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Follow-up Questions</CardTitle>
              <CardDescription>
                The agent needs more information to create an accurate plan
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {questions.map((q: any) => (
                <div key={q.id} className="space-y-2">
                  <Label htmlFor={q.id}>{q.question}</Label>
                  {q.context && <p className="text-sm text-muted-foreground">{q.context}</p>}
                  <Input
                    id={q.id}
                    value={answers[q.id] || ''}
                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                    placeholder="Your answer..."
                    disabled={submitting}
                  />
                </div>
              ))}
              <Button onClick={handleAnswerQuestions} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Answers
              </Button>
            </CardContent>
          </Card>
        )}

        {orchestration.status === 'AWAITING_APPROVAL' && plan && (
          <Card>
            <CardHeader>
              <CardTitle>Execution Plan</CardTitle>
              <CardDescription>{plan.summary}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Tasks:</h3>
                <div className="space-y-2">
                  {plan.tasks?.map((task: any, idx: number) => (
                    <div key={task.id} className="border rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <span className="font-mono text-sm text-muted-foreground">#{idx + 1}</span>
                        <div className="flex-1">
                          <p className="font-medium">{task.description}</p>
                          <p className="text-sm text-muted-foreground mt-1">{task.reasoning}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span
                              className={`text-xs px-2 py-1 rounded ${
                                task.estimatedComplexity === 'high'
                                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                  : task.estimatedComplexity === 'medium'
                                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                  : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              }`}
                            >
                              {task.estimatedComplexity}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {plan.requiresSubAgents && plan.subAgents && (
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Sub-Agents ({plan.subAgents.length}):
                  </h3>
                  <div className="space-y-2">
                    {plan.subAgents.map((agent: any) => (
                      <div key={agent.id} className="border rounded-lg p-3">
                        <h4 className="font-medium">{agent.name}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{agent.description}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Tasks: {agent.tasks?.length || 0}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={handleApprovePlan} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Approve & Start Execution
              </Button>
            </CardContent>
          </Card>
        )}

        {orchestration.agents && orchestration.agents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Agents</CardTitle>
              <CardDescription>Active and completed agents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {orchestration.agents.map((agent: any) => (
                  <div key={agent.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{agent.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          {agent.status === 'RUNNING' && (
                            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                          )}
                          {agent.status === 'COMPLETED' && (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )}
                          {agent.status === 'FAILED' && <XCircle className="h-4 w-4 text-red-500" />}
                          <span className="text-sm text-muted-foreground">{agent.status}</span>
                        </div>
                        {agent.pullRequestUrl && (
                          <a
                            href={agent.pullRequestUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline mt-2 inline-block"
                          >
                            View Pull Request →
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
