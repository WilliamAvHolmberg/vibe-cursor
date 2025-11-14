import { X, CheckCircle2, Clock, ExternalLink, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface Agent {
  id: string;
  name: string;
  status: string;
  prompt?: string;
  dependsOnAgentIds?: string[];
  pullRequestUrl?: string;
  cursorAgentId?: string;
  createdAt?: string;
  updatedAt?: string;
  description?: string;
  tasks?: string[];
  branchName?: string;
}

interface AgentDetailModalProps {
  agent: Agent;
  onClose: () => void;
}

export function AgentDetailModal({ agent, onClose }: AgentDetailModalProps) {
  let parsedMetadata: any = {};
  if (agent.prompt && !agent.tasks) {
    try {
      const metadata = typeof agent === 'object' && 'metadata' in agent ? (agent as any).metadata : null;
      if (metadata) {
        parsedMetadata = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
      }
    } catch (e) {
      console.error('Failed to parse agent metadata', e);
    }
  }

  const displayTasks = agent.tasks || parsedMetadata.tasks || [];
  const displayDescription = agent.description || parsedMetadata.description;

  const getStatusBadge = () => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      PENDING: { label: 'Pending', className: 'bg-gray-500/10 text-gray-400 border-gray-500/30' },
      CREATING: { label: 'Creating', className: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
      RUNNING: { label: 'Running', className: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
      COMPLETED: { label: 'Completed', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
      FAILED: { label: 'Failed', className: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
      CANCELLED: { label: 'Cancelled', className: 'bg-gray-500/10 text-gray-400 border-gray-500/30' },
    };

    const config = statusConfig[agent.status] || statusConfig.PENDING;
    return <Badge className={`${config.className} border px-2.5 py-1`}>{config.label}</Badge>;
  };

  return (
    <div 
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-[#161616] border border-[#2a2a2a] rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-[#2a2a2a] flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-semibold text-gray-100">{agent.name}</h2>
              {getStatusBadge()}
            </div>
            {displayDescription && (
              <p className="text-sm text-gray-500">{displayDescription}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="hover:bg-[#1f1f1f] text-gray-500 hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {agent.prompt && (
            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-purple-400" />
                Agent Prompt
              </h3>
              <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg p-4 text-sm text-gray-400 whitespace-pre-wrap leading-relaxed">
                {agent.prompt}
              </div>
            </div>
          )}

          {displayTasks && displayTasks.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Tasks ({displayTasks.length})
              </h3>
              <div className="space-y-2">
                {displayTasks.map((task: any, idx: number) => (
                  <div key={idx} className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg p-3 hover:bg-[#1a1a1a] transition-colors">
                    <div className="flex items-start gap-3">
                      <span className="text-xs text-gray-600 font-mono mt-0.5">#{idx + 1}</span>
                      <span className="text-sm text-gray-300 flex-1 leading-relaxed">{typeof task === 'string' ? task : task.description || task.id}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-400" />
              Details
            </h3>
            <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg p-4 space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">ID:</span>
                <span className="text-gray-400 font-mono text-xs">{agent.id}</span>
              </div>
              {agent.branchName && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Branch:</span>
                  <span className="text-gray-400 font-mono text-xs">{agent.branchName}</span>
                </div>
              )}
              {agent.cursorAgentId && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Cursor Agent ID:</span>
                  <span className="text-gray-400 font-mono text-xs">{agent.cursorAgentId}</span>
                </div>
              )}
              {agent.dependsOnAgentIds && agent.dependsOnAgentIds.length > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Dependencies:</span>
                  <span className="text-gray-400 text-xs">{agent.dependsOnAgentIds.length} agent(s)</span>
                </div>
              )}
              {agent.createdAt && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Created:</span>
                  <span className="text-gray-400 text-xs">
                    {new Date(agent.createdAt).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {agent.pullRequestUrl && (
            <div>
              <a
                href={agent.pullRequestUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-purple-600 hover:bg-purple-700 text-white rounded-lg py-3 transition-colors shadow-lg shadow-purple-500/20 font-medium"
              >
                <ExternalLink className="h-4 w-4" />
                View Pull Request
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
