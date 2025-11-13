import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useWebSocket } from '@/lib/use-websocket';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { AgentDependencyTree } from '@/components/AgentDependencyTree';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  User,
  Bot,
  Clock,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

interface ConversationMessage {
  id: string;
  type: 'user_message' | 'assistant_message' | 'system' | 'questions' | 'plan' | 'agent_update';
  text?: string;
  timestamp: Date;
  metadata?: any;
}

export function OrchestrationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: orchestration, refetch } = useQuery({
    queryKey: ['orchestration', id],
    queryFn: async () => {
      const response = await api.orchestration.get(id!);
      return response.data;
    },
    enabled: !!id,
    refetchInterval: 5000,
  });

  const { data: conversationData } = useQuery({
    queryKey: ['conversation', id],
    queryFn: async () => {
      const response = await api.orchestration.getConversation(id!);
      return response.data;
    },
    enabled: !!id && !!orchestration?.planningAgentId,
    refetchInterval: 5000,
  });

  const { lastMessage } = useWebSocket(id);

  useEffect(() => {
    if (lastMessage) {
      refetch();
    }
  }, [lastMessage, refetch]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationData, orchestration]);

  const buildConversationMessages = (): ConversationMessage[] => {
    const messages: ConversationMessage[] = [];

    if (!orchestration) return messages;

    messages.push({
      id: 'user-initial',
      type: 'user_message',
      text: orchestration.initialPrompt,
      timestamp: new Date(orchestration.createdAt),
    });

    if (conversationData?.messages) {
      conversationData.messages.forEach((msg: any, idx: number) => {
        if (msg.type === 'user_message') {
          return;
        }
        
        messages.push({
          id: `conv-${idx}`,
          type: msg.type === 'user_message' ? 'user_message' : 'assistant_message',
          text: msg.text,
          timestamp: new Date(),
        });
      });
    }

    if (orchestration.status === 'AWAITING_FOLLOWUP') {
      const questions = orchestration.planningOutput?.content?.questions || [];
      if (questions.length > 0) {
        messages.push({
          id: 'questions',
          type: 'questions',
          timestamp: new Date(),
          metadata: { questions },
        });
      }
    }

    if (orchestration.followUpMessages && orchestration.followUpMessages.length > 0) {
      const userAnswers = orchestration.followUpMessages.filter((msg: any) => msg.role === 'user');
      const questions = orchestration.planningOutput?.content?.questions || [];
      
      if (userAnswers.length > 0) {
        let answersText = '';
        
        if (questions.length === userAnswers.length) {
          answersText = questions.map((q: any, idx: number) => 
            `**Q${idx + 1}:** ${q.question}\n**A:** ${userAnswers[idx]?.content || ''}`
          ).join('\n\n');
        } else {
          answersText = userAnswers.map((msg: any, idx: number) => 
            `**Answer ${idx + 1}:** ${msg.content}`
          ).join('\n\n');
        }
        
        messages.push({
          id: 'user-answers',
          type: 'user_message',
          text: answersText,
          timestamp: new Date(userAnswers[userAnswers.length - 1].createdAt),
        });
      }
    }

    if (orchestration.status === 'PLANNING') {
      messages.push({
        id: 'system-planning',
        type: 'system',
        text: 'Planning agent is analyzing your request...',
        timestamp: new Date(),
      });
    }

    if (orchestration.status === 'AWAITING_APPROVAL') {
      messages.push({
        id: 'plan',
        type: 'plan',
        timestamp: new Date(),
        metadata: { plan: orchestration.planningOutput?.content },
      });
    }

    if (orchestration.status === 'EXECUTING') {
      messages.push({
        id: 'system-executing',
        type: 'system',
        text: `Executing plan with ${orchestration.agents?.length || 0} agent(s)...`,
        timestamp: new Date(),
      });

      orchestration.agents?.forEach((agent: any, idx: number) => {
        messages.push({
          id: `agent-${idx}`,
          type: 'agent_update',
          timestamp: new Date(agent.createdAt),
          metadata: { agent },
        });
      });
    }

    if (orchestration.status === 'COMPLETED') {
      messages.push({
        id: 'system-completed',
        type: 'system',
        text: '✓ Orchestration completed successfully!',
        timestamp: new Date(orchestration.completedAt || new Date()),
      });
    }

    if (orchestration.status === 'FAILED') {
      messages.push({
        id: 'system-failed',
        type: 'system',
        text: '✗ Orchestration failed.',
        timestamp: new Date(),
      });
    }

    return messages;
  };

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

  const handleStartAgent = async (agentId: string) => {
    try {
      await api.orchestration.startAgent(agentId);
      await refetch();
      toast({
        title: 'Agent Started',
        description: 'The agent has been started successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to start agent',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = () => {
    if (!orchestration) return null;

    const statusConfig: Record<
      string,
      { label: string; icon: any; className: string; animate?: boolean }
    > = {
      PLANNING: {
        label: 'Planning',
        icon: Loader2,
        className: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        animate: true,
      },
      AWAITING_FOLLOWUP: {
        label: 'Awaiting Response',
        icon: AlertCircle,
        className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      },
      AWAITING_APPROVAL: {
        label: 'Awaiting Approval',
        icon: AlertCircle,
        className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      },
      EXECUTING: {
        label: 'Executing',
        icon: Loader2,
        className: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        animate: true,
      },
      COMPLETED: {
        label: 'Completed',
        icon: CheckCircle2,
        className: 'bg-green-500/10 text-green-400 border-green-500/20',
      },
      FAILED: {
        label: 'Failed',
        icon: XCircle,
        className: 'bg-red-500/10 text-red-400 border-red-500/20',
      },
      CANCELLED: {
        label: 'Cancelled',
        icon: XCircle,
        className: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
      },
    };

    const config = statusConfig[orchestration.status] || statusConfig.PLANNING;
    const Icon = config.icon;

    return (
      <Badge className={`${config.className} border`}>
        <Icon className={`h-3 w-3 mr-1 ${config.animate ? 'animate-spin' : ''}`} />
        {config.label}
      </Badge>
    );
  };

  if (!orchestration) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1c1c1c]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const messages = buildConversationMessages();
  const hasAgents = orchestration.agents && orchestration.agents.length > 0;
  const showTree = orchestration.status === 'EXECUTING' || orchestration.status === 'COMPLETED' || orchestration.status === 'FAILED';

  return (
    <div className="min-h-screen bg-[#1c1c1c] flex flex-col">
      <div className="border-b border-gray-800 bg-[#252525]">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="hover:bg-gray-700"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-purple-400" />
              <span className="font-semibold text-gray-100">Orchestrator Agent</span>
              {getStatusBadge()}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className={`h-full ${showTree && hasAgents ? 'grid grid-cols-[30%_70%]' : 'flex'}`}>
          {showTree && hasAgents && (
            <div className="border-r border-gray-800 bg-[#252525] overflow-y-auto p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-100 mb-2">Agent Dependencies</h3>
                <p className="text-xs text-gray-500">
                  Start agents manually when their dependencies are complete
                </p>
              </div>
              <AgentDependencyTree 
                agents={orchestration.agents}
                onStartAgent={handleStartAgent}
              />
            </div>
          )}
          
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  answers={answers}
                  setAnswers={setAnswers}
                  onSubmitAnswers={handleAnswerQuestions}
                  onApprovePlan={handleApprovePlan}
                  submitting={submitting}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: ConversationMessage;
  answers: Record<string, string>;
  setAnswers: (answers: Record<string, string>) => void;
  onSubmitAnswers: () => void;
  onApprovePlan: () => void;
  submitting: boolean;
}

function MessageBubble({
  message,
  answers,
  setAnswers,
  onSubmitAnswers,
  onApprovePlan,
  submitting,
}: MessageBubbleProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (message.type === 'user_message') {
    return (
      <div className="flex gap-4 items-start">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
          <User className="h-4 w-4 text-blue-400" />
        </div>
        <div className="flex-1 space-y-1">
          <div className="text-sm text-gray-400">You</div>
          <div className="text-gray-100 whitespace-pre-wrap">{message.text}</div>
        </div>
      </div>
    );
  }

  if (message.type === 'assistant_message') {
    const isJsonMessage = message.text?.trim().startsWith('{') || message.text?.trim().startsWith('```json');
    
    let summary = message.text && message.text.length > 100 
      ? message.text.substring(0, 100) + '...'
      : message.text;
    
    if (isJsonMessage) {
      try {
        let jsonText = message.text?.trim() || '';
        if (jsonText.startsWith('```json')) {
          jsonText = jsonText.replace(/```json\n?/g, '').replace(/```$/g, '').trim();
        }
        const parsed = JSON.parse(jsonText);
        
        if (parsed.type === 'questions') {
          summary = 'Asked clarifying questions';
        } else if (parsed.type === 'plan') {
          summary = 'Created execution plan';
        }
      } catch (e) {
        summary = 'Sent structured response';
      }
    }

    return (
      <div className="flex gap-4 items-start">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
          <Bot className="h-4 w-4 text-purple-400" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="text-sm text-gray-400">Planning Agent</div>
          
          {isJsonMessage ? (
            <div className="space-y-2">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-2 text-gray-300 hover:text-gray-100 transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <span className="text-sm italic">{summary}</span>
              </button>
              
              {isExpanded && (
                <div className="bg-[#252525] border border-gray-800 rounded-lg p-4 overflow-x-auto">
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.text || ''}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.text || ''}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (message.type === 'system') {
    return (
      <div className="flex gap-4 items-start">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
          <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
        </div>
        <div className="flex-1 space-y-1">
          <div className="text-sm text-gray-500 italic">{message.text}</div>
        </div>
      </div>
    );
  }

  if (message.type === 'questions') {
    const questions = message.metadata?.questions || [];
    return (
      <div className="flex gap-4 items-start">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
          <Bot className="h-4 w-4 text-purple-400" />
        </div>
        <div className="flex-1 space-y-3">
          <div className="text-sm text-gray-400">Planning Agent</div>
          <div className="text-gray-100">I need some clarification to create an accurate plan:</div>
          <div className="space-y-4 bg-[#252525] border border-gray-800 rounded-lg p-4">
            {questions.map((q: any, idx: number) => (
              <div key={q.id} className="space-y-2">
                <label className="text-sm font-medium text-gray-200">
                  {idx + 1}. {q.question}
                </label>
                {q.context && <p className="text-xs text-gray-400">{q.context}</p>}
                <Input
                  value={answers[q.id] || ''}
                  onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                  placeholder="Your answer..."
                  disabled={submitting}
                  className="bg-[#1c1c1c] border-gray-700 text-gray-100 placeholder:text-gray-500"
                />
              </div>
            ))}
            <Button
              onClick={onSubmitAnswers}
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Answers
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (message.type === 'plan') {
    const plan = message.metadata?.plan;
    if (!plan) return null;

    return (
      <div className="flex gap-4 items-start">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
          <Bot className="h-4 w-4 text-purple-400" />
        </div>
        <div className="flex-1 space-y-3">
          <div className="text-sm text-gray-400">Planning Agent</div>
          <div className="text-gray-100">I've created an execution plan:</div>
          <div className="space-y-4 bg-[#252525] border border-gray-800 rounded-lg p-4">
            {plan.summary && (
              <div className="text-sm text-gray-300 pb-3 border-b border-gray-800">
                {plan.summary}
              </div>
            )}
            {plan.tasks && plan.tasks.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-semibold text-gray-200">Tasks:</div>
                {plan.tasks.map((task: any, idx: number) => (
                  <div key={task.id} className="bg-[#1c1c1c] border border-gray-700 rounded p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="text-xs text-gray-500 font-mono">#{idx + 1}</span>
                      <div className="flex-1">
                        <div className="text-sm text-gray-200">{task.description}</div>
                        {task.reasoning && (
                          <div className="text-xs text-gray-400 mt-1">{task.reasoning}</div>
                        )}
                        {task.estimatedComplexity && (
                          <Badge
                            className={`mt-2 text-xs ${
                              task.estimatedComplexity === 'high'
                                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                : task.estimatedComplexity === 'medium'
                                ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                : 'bg-green-500/10 text-green-400 border-green-500/20'
                            }`}
                          >
                            {task.estimatedComplexity}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {plan.requiresSubAgents && plan.subAgents && plan.subAgents.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-gray-800">
                <div className="text-sm font-semibold text-gray-200">
                  Sub-Agents ({plan.subAgents.length}):
                </div>
                {plan.subAgents.map((agent: any) => (
                  <div
                    key={agent.id}
                    className="bg-[#1c1c1c] border border-gray-700 rounded p-3 space-y-1"
                  >
                    <div className="text-sm font-medium text-gray-200">{agent.name}</div>
                    <div className="text-xs text-gray-400">{agent.description}</div>
                    <div className="text-xs text-gray-500">Tasks: {agent.tasks?.length || 0}</div>
                  </div>
                ))}
              </div>
            )}
            <Button
              onClick={onApprovePlan}
              disabled={submitting}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Approve & Start Execution
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (message.type === 'agent_update') {
    const agent = message.metadata?.agent;
    if (!agent) return null;

    const statusIcon =
      agent.status === 'COMPLETED' ? (
        <CheckCircle2 className="h-4 w-4 text-green-400" />
      ) : agent.status === 'FAILED' ? (
        <XCircle className="h-4 w-4 text-red-400" />
      ) : (
        <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
      );

    return (
      <div className="flex gap-4 items-start">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
          <Clock className="h-4 w-4 text-gray-400" />
        </div>
        <div className="flex-1">
          <div className="bg-[#252525] border border-gray-800 rounded-lg p-3 flex items-center gap-3">
            {statusIcon}
            <div className="flex-1">
              <div className="text-sm text-gray-200">{agent.name}</div>
              <div className="text-xs text-gray-400">{agent.status}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
