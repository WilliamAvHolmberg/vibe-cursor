import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useWebSocket } from '@/lib/use-websocket';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { EnhancedAgentTree } from '@/components/EnhancedAgentTree';
import { AgentDetailModal } from '@/components/AgentDetailModal';
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
  Trash2,
  StopCircle,
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
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
      const totalAgents = orchestration.agents?.length || 0;
      const completedAgents = orchestration.agents?.filter((a: any) => a.status === 'COMPLETED').length || 0;
      const runningAgents = orchestration.agents?.filter((a: any) => a.status === 'RUNNING' || a.status === 'CREATING').length || 0;
      const pendingAgents = orchestration.agents?.filter((a: any) => a.status === 'PENDING').length || 0;

      messages.push({
        id: 'system-executing',
        type: 'system',
        text: `Execution in progress: ${completedAgents}/${totalAgents} completed, ${runningAgents} running, ${pendingAgents} pending. Click agents in the tree to view details.`,
        timestamp: new Date(),
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

  const handleCancelOrchestration = async () => {
    if (!id) return;
    
    try {
      await api.orchestration.cancel(id);
      toast({
        title: 'Orchestration Cancelled',
        description: 'The orchestration has been cancelled',
      });
      navigate('/');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to cancel orchestration',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteOrchestration = async () => {
    if (!id) return;
    
    try {
      await api.orchestration.delete(id);
      toast({
        title: 'Orchestration Deleted',
        description: 'The orchestration has been deleted',
      });
      navigate('/');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to delete orchestration',
        variant: 'destructive',
      });
    } finally {
      setShowDeleteConfirm(false);
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
        className: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
        animate: true,
      },
      AWAITING_FOLLOWUP: {
        label: 'Awaiting Response',
        icon: AlertCircle,
        className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
      },
      AWAITING_APPROVAL: {
        label: 'Awaiting Approval',
        icon: AlertCircle,
        className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
      },
      EXECUTING: {
        label: 'Executing',
        icon: Loader2,
        className: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
        animate: true,
      },
      COMPLETED: {
        label: 'Completed',
        icon: CheckCircle2,
        className: 'bg-green-500/10 text-green-400 border-green-500/30',
      },
      FAILED: {
        label: 'Failed',
        icon: XCircle,
        className: 'bg-red-500/10 text-red-400 border-red-500/30',
      },
      CANCELLED: {
        label: 'Cancelled',
        icon: XCircle,
        className: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
      },
    };

    const config = statusConfig[orchestration.status] || statusConfig.PLANNING;
    const Icon = config.icon;

    return (
      <Badge className={`${config.className} border px-2.5 py-1`}>
        <Icon className={`h-3 w-3 mr-1.5 ${config.animate ? 'animate-spin' : ''}`} />
        {config.label}
      </Badge>
    );
  };

  if (!orchestration) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0d0d]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
      </div>
    );
  }

  const messages = buildConversationMessages();
  const hasAgents = orchestration.agents && orchestration.agents.length > 0;
  
  const planAgents = orchestration.status === 'AWAITING_APPROVAL' && orchestration.planningOutput?.content?.subAgents 
    ? orchestration.planningOutput.content.subAgents.map((agent: any) => ({
        id: agent.id,
        name: agent.name,
        status: 'PENDING',
        dependsOnAgentIds: agent.dependsOn || [],
      }))
    : [];
  
  const showTree = (orchestration.status === 'AWAITING_APPROVAL' && planAgents.length > 0) ||
                   (orchestration.status === 'EXECUTING' || orchestration.status === 'COMPLETED' || orchestration.status === 'FAILED') && hasAgents;
  
  const treeAgents = orchestration.status === 'AWAITING_APPROVAL' ? planAgents : (orchestration.agents || []);

  return (
    <div className="min-h-screen bg-[#0d0d0d] flex flex-col">
      {/* Header */}
      <div className="border-b border-[#2a2a2a] bg-[#0d0d0d]">
        <div className="max-w-full mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="hover:bg-[#1f1f1f] text-gray-400 hover:text-gray-200"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-gray-100 text-lg">Orchestrator</span>
                {getStatusBadge()}
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {(orchestration.status === 'PLANNING' || orchestration.status === 'EXECUTING' || orchestration.status === 'AWAITING_APPROVAL') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelOrchestration}
                className="text-gray-400 hover:text-gray-200 hover:bg-[#1f1f1f] gap-2"
              >
                <StopCircle className="h-4 w-4" />
                Cancel
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Chat on Left - 30% */}
        <div className={`${showTree ? 'w-[30%]' : 'w-full'} flex-shrink-0 flex flex-col h-full overflow-hidden border-r border-[#2a2a2a]`}>
          <div className="flex-1 overflow-y-auto bg-[#0d0d0d]">
            <div className="px-5 py-6 space-y-5">
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
            </div>
          </div>
        </div>
        
        {/* Tree on Right - 70% */}
        {showTree && (
          <div className="flex-1 h-full bg-[#161616] flex flex-col">
            <div className="px-8 py-6 border-b border-[#2a2a2a] flex-shrink-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-1 h-8 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full" />
                <h3 className="text-xl font-semibold text-gray-100">Execution Flow</h3>
              </div>
              <p className="text-sm text-gray-500 ml-7">
                {orchestration.status === 'AWAITING_APPROVAL' 
                  ? 'Preview the execution flow. Approve to create agents.'
                  : 'Click agents to view details and start when dependencies are complete.'}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto px-8 py-6">
              <EnhancedAgentTree 
                agents={treeAgents}
                onStartAgent={orchestration.status === 'AWAITING_APPROVAL' ? async () => {} : handleStartAgent}
                previewMode={orchestration.status === 'AWAITING_APPROVAL'}
                onAgentClick={setSelectedAgent}
              />
            </div>
          </div>
        )}
      </div>
      
      {selectedAgent && (
        <AgentDetailModal 
          agent={selectedAgent}
          onClose={() => setSelectedAgent(null)}
        />
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div 
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div 
            className="bg-[#161616] border border-[#2a2a2a] rounded-xl max-w-md w-full p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center flex-shrink-0">
                <Trash2 className="h-5 w-5 text-rose-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-100 mb-1">Delete Orchestration</h3>
                <p className="text-sm text-gray-400">
                  Are you sure you want to delete this orchestration? This action cannot be undone.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 justify-end">
              <Button
                variant="ghost"
                onClick={() => setShowDeleteConfirm(false)}
                className="text-gray-400 hover:text-gray-200 hover:bg-[#1f1f1f]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteOrchestration}
                className="bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-500/20"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
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
      <div className="flex gap-3 items-start">
        <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
          <User className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1 space-y-1">
          <div className="text-xs text-gray-500 font-medium">You</div>
          <div className="text-sm text-gray-200 leading-relaxed">{message.text}</div>
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
      <div className="flex gap-3 items-start">
        <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <Bot className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="text-xs text-gray-500 font-medium">Planning Agent</div>
          
          {isJsonMessage ? (
            <div className="space-y-2">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-2 text-gray-400 hover:text-gray-200 transition-colors text-sm"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <span className="italic">{summary}</span>
              </button>
              
              {isExpanded && (
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 overflow-x-auto">
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.text || ''}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none text-gray-300">
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
      <div className="flex gap-3 items-start">
        <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center">
          <Loader2 className="h-4 w-4 text-gray-500 animate-spin" />
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
      <div className="flex gap-3 items-start">
        <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <Bot className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1 space-y-3">
          <div className="text-xs text-gray-500 font-medium">Planning Agent</div>
          <div className="text-sm text-gray-200">I need some clarification to create an accurate plan:</div>
          <div className="space-y-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
            {questions.map((q: any, idx: number) => (
              <div key={q.id} className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  {idx + 1}. {q.question}
                </label>
                {q.context && <p className="text-xs text-gray-500">{q.context}</p>}
                <Input
                  value={answers[q.id] || ''}
                  onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                  placeholder="Your answer..."
                  disabled={submitting}
                  className="bg-[#0d0d0d] border-[#2a2a2a] text-gray-200 placeholder:text-gray-600 focus:border-purple-500"
                />
              </div>
            ))}
            <Button
              onClick={onSubmitAnswers}
              disabled={submitting}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20"
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

    const agentCount = plan.subAgents ? plan.subAgents.length : 0;
    const taskCount = plan.subAgents 
      ? plan.subAgents.reduce((sum: number, agent: any) => sum + (agent.tasks?.length || 0), 0)
      : 0;

    return (
      <div className="flex gap-3 items-start">
        <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <Bot className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1 space-y-3">
          <div className="text-xs text-gray-500 font-medium">Planning Agent</div>
          <div className="text-sm text-gray-200">I've created an execution plan</div>
          <div className="space-y-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
            {plan.summary && (
              <div className="text-sm text-gray-300 leading-relaxed">
                {plan.summary}
              </div>
            )}
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                <span className="text-gray-400">{agentCount} agent{agentCount !== 1 ? 's' : ''}</span>
              </div>
              {taskCount > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                  <span className="text-gray-400">{taskCount} task{taskCount !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-purple-400 bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
              <ChevronRight className="h-4 w-4" />
              <span>View the execution flow on the right to see all agents and their relationships</span>
            </div>
            <Button
              onClick={onApprovePlan}
              disabled={submitting}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20"
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Approve Plan (Manual Start)
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (message.type === 'agent_update') {
    return null;
  }

  return null;
}
