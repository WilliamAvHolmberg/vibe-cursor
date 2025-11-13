import { CheckCircle2, Loader2, XCircle, Circle, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface Agent {
  id: string;
  name: string;
  status: string;
  dependsOnAgentIds: string[];
  pullRequestUrl?: string;
}

interface AgentTreeProps {
  agents: Agent[];
  onStartAgent: (agentId: string) => Promise<void>;
  previewMode?: boolean;
  onAgentClick?: (agent: Agent) => void;
}

export function AgentDependencyTree({ agents, onStartAgent, previewMode = false, onAgentClick }: AgentTreeProps) {
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
      return <CheckCircle2 className="h-4 w-4 text-green-400" />;
    } else if (agent.status === 'FAILED') {
      return <XCircle className="h-4 w-4 text-red-400" />;
    } else if (agent.status === 'RUNNING' || agent.status === 'CREATING') {
      return <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />;
    } else if (agent.status === 'PENDING') {
      return <Circle className="h-4 w-4 text-gray-500" />;
    } else {
      return <Circle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (agent: Agent) => {
    if (agent.status === 'COMPLETED') return 'border-green-500/30 bg-green-500/5';
    if (agent.status === 'FAILED') return 'border-red-500/30 bg-red-500/5';
    if (agent.status === 'RUNNING' || agent.status === 'CREATING') return 'border-blue-500/30 bg-blue-500/5';
    if (agent.status === 'PENDING') return 'border-gray-700 bg-gray-800/30';
    return 'border-gray-700 bg-gray-800/30';
  };

  const renderAgent = (agent: Agent, level: number = 0, isLast: boolean = false) => {
    const children = childrenMap.get(agent.id) || [];
    const isStartable = canStart(agent);
    const isStarting = starting === agent.id;

    return (
      <div key={agent.id} className="relative">
        <div 
          className={`flex items-center gap-3 p-3 rounded-lg border ${getStatusColor(agent)} ${onAgentClick ? 'cursor-pointer hover:bg-gray-700/30 transition-colors' : ''}`}
          onClick={() => onAgentClick?.(agent)}
        >
          {getStatusIcon(agent)}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-200 truncate">{agent.name}</div>
            <div className="text-xs text-gray-500">{agent.status}</div>
          </div>
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
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'bg-gray-700 cursor-not-allowed'
              } text-white text-xs px-2 py-1 h-7`}
            >
              {isStarting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <Play className="h-3 w-3 mr-1" />
                  Start
                </>
              )}
            </Button>
          )}
          {agent.pullRequestUrl && (
            <a
              href={agent.pullRequestUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 underline"
            >
              PR
            </a>
          )}
        </div>
        
        {children.length > 0 && (
          <div className="ml-6 mt-2 space-y-2 border-l-2 border-gray-700 pl-4">
            {children.map((child, idx) => 
              renderAgent(child, level + 1, idx === children.length - 1)
            )}
          </div>
        )}
      </div>
    );
  };

  if (agents.length === 0) {
    return (
      <div className="text-center text-gray-500 text-sm py-8">
        No agents in this orchestration yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {roots.map((root) => renderAgent(root))}
    </div>
  );
}
