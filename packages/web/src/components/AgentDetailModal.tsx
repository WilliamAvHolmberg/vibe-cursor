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
      PENDING: { label: 'Pending', className: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
      CREATING: { label: 'Creating', className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
      RUNNING: { label: 'Running', className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
      COMPLETED: { label: 'Completed', className: 'bg-green-500/10 text-green-400 border-green-500/20' },
      FAILED: { label: 'Failed', className: 'bg-red-500/10 text-red-400 border-red-500/20' },
      CANCELLED: { label: 'Cancelled', className: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
    };

    const config = statusConfig[agent.status] || statusConfig.PENDING;
    return <Badge className={`${config.className} border`}>{config.label}</Badge>;
  };

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-[#252525] border border-gray-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-800 flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-semibold text-gray-100">{agent.name}</h2>
              {getStatusBadge()}
            </div>
            {displayDescription && (
              <p className="text-sm text-gray-400">{displayDescription}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="hover:bg-gray-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {agent.prompt && (
            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Agent Prompt
              </h3>
              <div className="bg-[#1c1c1c] border border-gray-700 rounded-lg p-4 text-sm text-gray-300 whitespace-pre-wrap">
                {agent.prompt}
              </div>
            </div>
          )}

          {displayTasks && displayTasks.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Tasks ({displayTasks.length})
              </h3>
              <div className="space-y-2">
                {displayTasks.map((task: any, idx: number) => (
                  <div key={idx} className="bg-[#1c1c1c] border border-gray-700 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <span className="text-xs text-gray-500 font-mono">#{idx + 1}</span>
                      <span className="text-sm text-gray-300 flex-1">{typeof task === 'string' ? task : task.description || task.id}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Details
            </h3>
            <div className="bg-[#1c1c1c] border border-gray-700 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">ID:</span>
                <span className="text-gray-300 font-mono text-xs">{agent.id}</span>
              </div>
              {agent.branchName && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Branch:</span>
                  <span className="text-gray-300 font-mono text-xs">{agent.branchName}</span>
                </div>
              )}
              {agent.cursorAgentId && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Cursor Agent ID:</span>
                  <span className="text-gray-300 font-mono text-xs">{agent.cursorAgentId}</span>
                </div>
              )}
              {agent.dependsOnAgentIds && agent.dependsOnAgentIds.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Dependencies:</span>
                  <span className="text-gray-300 text-xs">{agent.dependsOnAgentIds.length} agent(s)</span>
                </div>
              )}
              {agent.createdAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Created:</span>
                  <span className="text-gray-300 text-xs">
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
                className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-3 transition-colors"
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
