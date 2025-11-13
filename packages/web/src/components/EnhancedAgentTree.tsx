import { CheckCircle2, Loader2, XCircle, Circle, Play, Clock, GitBranch, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { useState } from 'react';

interface Agent {
  id: string;
  name: string;
  status: string;
  dependsOnAgentIds: string[];
  pullRequestUrl?: string;
  description?: string;
}

interface EnhancedAgentTreeProps {
  agents: Agent[];
  onStartAgent: (agentId: string) => Promise<void>;
  previewMode?: boolean;
  onAgentClick?: (agent: Agent) => void;
}

export function EnhancedAgentTree({ agents, onStartAgent, previewMode = false, onAgentClick }: EnhancedAgentTreeProps) {
  const [starting, setStarting] = useState<string | null>(null);

  const buildTree = () => {
    const agentMap = new Map(agents.map(a => [a.id, a]));
    const roots: Agent[] = [];
    const childrenMap = new Map<string, Agent[]>();

    agents.forEach(agent => {
      if (agent.dependsOnAgentIds.length === 0) {
        roots.push(agent);
      }
      
      agent.dependsOnAgentIds.forEach(depId => {
        if (!childrenMap.has(depId)) {
          childrenMap.set(depId, []);
        }
        childrenMap.get(depId)!.push(agent);
      });
    });

    return { roots, childrenMap, agentMap };
  };

  const { roots, childrenMap, agentMap } = buildTree();

  const canStart = (agent: Agent): boolean => {
    if (agent.status !== 'PENDING') return false;
    
    return agent.dependsOnAgentIds.every(depId => {
      const dep = agentMap.get(depId);
      return dep && dep.status === 'COMPLETED';
    });
  };

  const handleStartAgent = async (agentId: string) => {
    setStarting(agentId);
    try {
      await onStartAgent(agentId);
    } finally {
      setStarting(null);
    }
  };

  const getStatusIcon = (agent: Agent) => {
    if (agent.status === 'COMPLETED') {
      return <CheckCircle2 className="h-5 w-5 text-emerald-400" />;
    } else if (agent.status === 'FAILED') {
      return <XCircle className="h-5 w-5 text-rose-400" />;
    } else if (agent.status === 'RUNNING' || agent.status === 'CREATING') {
      return <Loader2 className="h-5 w-5 text-purple-400 animate-spin" />;
    } else if (agent.status === 'PENDING') {
      return <Circle className="h-5 w-5 text-gray-600" />;
    } else {
      return <Circle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (agent: Agent) => {
    if (agent.status === 'COMPLETED') return 'border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10';
    if (agent.status === 'FAILED') return 'border-rose-500/40 bg-rose-500/5 hover:bg-rose-500/10';
    if (agent.status === 'RUNNING' || agent.status === 'CREATING') return 'border-purple-500/40 bg-purple-500/5 hover:bg-purple-500/10';
    if (agent.status === 'PENDING') return 'border-[#2a2a2a] bg-[#1a1a1a] hover:bg-[#1f1f1f]';
    return 'border-[#2a2a2a] bg-[#1a1a1a] hover:bg-[#1f1f1f]';
  };

  const getStatusText = (agent: Agent) => {
    const statusMap: Record<string, { text: string; color: string }> = {
      PENDING: { text: 'Waiting to start', color: 'text-gray-500' },
      CREATING: { text: 'Creating agent...', color: 'text-purple-400' },
      RUNNING: { text: 'Running', color: 'text-purple-400' },
      COMPLETED: { text: 'Completed', color: 'text-emerald-400' },
      FAILED: { text: 'Failed', color: 'text-rose-400' },
      CANCELLED: { text: 'Cancelled', color: 'text-gray-500' },
    };
    return statusMap[agent.status] || statusMap.PENDING;
  };

  const getDuration = (agent: Agent) => {
    if (agent.status === 'RUNNING' || agent.status === 'CREATING') {
      return <Clock className="h-3 w-3 text-gray-500" />;
    }
    return null;
  };

  const renderAgent = (agent: Agent, level: number = 0, isLast: boolean = false, parentPath: string = '') => {
    const children = childrenMap.get(agent.id) || [];
    const isStartable = canStart(agent);
    const isStarting = starting === agent.id;
    const statusInfo = getStatusText(agent);
    const path = parentPath ? `${parentPath} → ${agent.name}` : agent.name;

    return (
      <div key={agent.id} className="relative">
        {/* Agent Card */}
        <div 
          className={`
            group relative flex items-center gap-4 p-5 rounded-xl border-2 transition-all duration-200
            ${getStatusColor(agent)} 
            ${onAgentClick ? 'cursor-pointer' : ''}
            shadow-lg hover:shadow-xl
          `}
          onClick={() => onAgentClick?.(agent)}
        >
          {/* Status Icon */}
          <div className="flex-shrink-0">
            {getStatusIcon(agent)}
          </div>

          {/* Agent Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-base font-semibold text-gray-100 truncate">{agent.name}</h4>
              {getDuration(agent)}
            </div>
            <div className={`text-sm ${statusInfo.color} flex items-center gap-2`}>
              {statusInfo.text}
              {agent.dependsOnAgentIds.length > 0 && (
                <>
                  <span className="text-gray-700">•</span>
                  <span className="text-gray-600 text-xs flex items-center gap-1">
                    <GitBranch className="h-3 w-3" />
                    {agent.dependsOnAgentIds.length} {agent.dependsOnAgentIds.length === 1 ? 'dependency' : 'dependencies'}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {!previewMode && agent.status === 'PENDING' && (
              <Button
                size="sm"
                disabled={!isStartable || isStarting}
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartAgent(agent.id);
                }}
                className={`${
                  isStartable 
                    ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20' 
                    : 'bg-[#2a2a2a] text-gray-500 cursor-not-allowed'
                } px-4 py-2 text-sm font-medium transition-all rounded-lg`}
              >
                {isStarting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-1.5" />
                    Start
                  </>
                )}
              </Button>
            )}
            {onAgentClick && (
              <ChevronRight className="h-5 w-5 text-gray-600 group-hover:text-gray-400 transition-colors" />
            )}
          </div>
        </div>

        {/* Children with connecting lines */}
        {children.length > 0 && (
          <div className="relative ml-8 mt-4 space-y-4">
            {/* Vertical line connector */}
            <div className="absolute left-0 top-0 bottom-4 w-px bg-gradient-to-b from-[#3a3a3a] to-transparent" />
            
            {children.map((child, idx) => (
              <div key={child.id} className="relative pl-8">
                {/* Horizontal line connector */}
                <div className="absolute left-0 top-1/2 w-8 h-px bg-[#3a3a3a]" />
                
                {renderAgent(child, level + 1, idx === children.length - 1, path)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (agents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center mb-4">
          <GitBranch className="h-8 w-8 text-gray-600" />
        </div>
        <p className="text-gray-500 text-sm">No agents in this orchestration yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {roots.map((root, idx) => (
        <div key={root.id}>
          {renderAgent(root)}
          {idx < roots.length - 1 && <div className="h-6" />}
        </div>
      ))}
    </div>
  );
}
