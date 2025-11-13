import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Sparkles,
  Bot,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface TreeNode {
  id: string;
  type: 'orchestration' | 'planning_agent' | 'task' | 'agent';
  label: string;
  status?: string;
  data?: any;
  children?: TreeNode[];
}

interface OrchestrationTreeProps {
  orchestration: any;
}

export function OrchestrationTree({ orchestration }: OrchestrationTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root', 'planning']));
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const handleNodeClick = (node: TreeNode) => {
    if (node.data) {
      setSelectedNode(node);
      setDialogOpen(true);
    }
  };

  const buildTree = (): TreeNode => {
    const children: TreeNode[] = [];

    children.push({
      id: 'planning',
      type: 'planning_agent',
      label: 'Planning Agent',
      status: orchestration.status,
      data: {
        agentId: orchestration.planningAgentId,
        status: orchestration.status,
        output: orchestration.planningOutput,
        questions: orchestration.planningOutput?.content?.questions,
        plan: orchestration.planningOutput?.content,
      },
    });

    if (orchestration.planningOutput?.content?.tasks) {
      const tasks = orchestration.planningOutput.content.tasks;
      const taskNodes: TreeNode[] = tasks.map((task: any, idx: number) => ({
        id: `task-${task.id || idx}`,
        type: 'task',
        label: `Task ${idx + 1}: ${task.description?.substring(0, 40)}...`,
        status: task.status || 'pending',
        data: task,
      }));

      children[0].children = taskNodes;
    }

    if (orchestration.agents && orchestration.agents.length > 0) {
      const agentNodes: TreeNode[] = orchestration.agents.map((agent: any) => {
        const agentChildren: TreeNode[] = [];
        
        if (agent.tasks && agent.tasks.length > 0) {
          agent.tasks.forEach((task: any, idx: number) => {
            agentChildren.push({
              id: `agent-${agent.id}-task-${task.id || idx}`,
              type: 'task',
              label: `Task ${idx + 1}: ${task.description?.substring(0, 40)}...`,
              status: task.status || 'pending',
              data: task,
            });
          });
        }

        return {
          id: `agent-${agent.id}`,
          type: 'agent',
          label: agent.name || `Agent ${agent.id}`,
          status: agent.status,
          data: agent,
          children: agentChildren,
        };
      });

      children.push(...agentNodes);
    }

    return {
      id: 'root',
      type: 'orchestration',
      label: 'Orchestration',
      status: orchestration.status,
      data: orchestration,
      children,
    };
  };

  const tree = buildTree();

  return (
    <>
      <div className="h-full overflow-y-auto p-4 bg-[#1c1c1c]">
        <div className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wide">
          Execution Tree
        </div>
        <TreeNodeView
          node={tree}
          level={0}
          expandedNodes={expandedNodes}
          onToggle={toggleNode}
          onSelect={handleNodeClick}
        />
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogClose onClick={() => setDialogOpen(false)} />
          {selectedNode && <NodeDetails node={selectedNode} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

interface TreeNodeViewProps {
  node: TreeNode;
  level: number;
  expandedNodes: Set<string>;
  onToggle: (nodeId: string) => void;
  onSelect: (node: TreeNode) => void;
}

function TreeNodeView({ node, level, expandedNodes, onToggle, onSelect }: TreeNodeViewProps) {
  const isExpanded = expandedNodes.has(node.id);
  const hasChildren = node.children && node.children.length > 0;
  const icon = getNodeIcon(node);
  const statusColor = getStatusColor(node.status);

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer hover:bg-[#252525] transition-colors`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.id);
            }}
            className="flex-shrink-0"
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3 text-gray-400" />
            ) : (
              <ChevronRight className="h-3 w-3 text-gray-400" />
            )}
          </button>
        )}
        {!hasChildren && <div className="w-3" />}
        
        <div
          onClick={() => onSelect(node)}
          className="flex items-center gap-2 flex-1 min-w-0"
        >
          {icon}
          <span className="text-sm text-gray-200 truncate flex-1">{node.label}</span>
          {node.status && (
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColor}`} />
          )}
        </div>
      </div>

      {isExpanded && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <TreeNodeView
              key={child.id}
              node={child}
              level={level + 1}
              expandedNodes={expandedNodes}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function getNodeIcon(node: TreeNode) {
  switch (node.type) {
    case 'orchestration':
      return <Sparkles className="h-4 w-4 text-purple-400 flex-shrink-0" />;
    case 'planning_agent':
      return <Bot className="h-4 w-4 text-blue-400 flex-shrink-0" />;
    case 'agent':
      return <Bot className="h-4 w-4 text-green-400 flex-shrink-0" />;
    case 'task':
      return <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />;
    default:
      return null;
  }
}

function getStatusColor(status?: string) {
  if (!status) return 'bg-gray-500';
  
  switch (status.toUpperCase()) {
    case 'COMPLETED':
      return 'bg-green-500';
    case 'FAILED':
      return 'bg-red-500';
    case 'EXECUTING':
    case 'RUNNING':
    case 'PLANNING':
      return 'bg-blue-500 animate-pulse';
    case 'AWAITING_FOLLOWUP':
    case 'AWAITING_APPROVAL':
      return 'bg-yellow-500';
    case 'CANCELLED':
      return 'bg-gray-500';
    default:
      return 'bg-gray-500';
  }
}

function NodeDetails({ node }: { node: TreeNode }) {
  const getStatusBadge = (status?: string) => {
    if (!status) return null;

    const statusConfig: Record<string, { icon: any; className: string }> = {
      PLANNING: {
        icon: Loader2,
        className: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      },
      AWAITING_FOLLOWUP: {
        icon: AlertCircle,
        className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      },
      AWAITING_APPROVAL: {
        icon: AlertCircle,
        className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      },
      EXECUTING: {
        icon: Loader2,
        className: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      },
      COMPLETED: {
        icon: CheckCircle2,
        className: 'bg-green-500/10 text-green-400 border-green-500/20',
      },
      FAILED: {
        icon: XCircle,
        className: 'bg-red-500/10 text-red-400 border-red-500/20',
      },
      CANCELLED: {
        icon: XCircle,
        className: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
      },
    };

    const config = statusConfig[status.toUpperCase()] || statusConfig.PLANNING;
    const Icon = config.icon;

    return (
      <Badge className={`${config.className} border`}>
        <Icon className="h-3 w-3 mr-1" />
        {status}
      </Badge>
    );
  };

  if (node.type === 'planning_agent') {
    return (
      <div className="space-y-4">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Bot className="h-5 w-5 text-blue-400" />
            <DialogTitle>{node.label}</DialogTitle>
            {getStatusBadge(node.status)}
          </div>
        </DialogHeader>

        {node.data.agentId && (
          <div className="space-y-1">
            <div className="text-sm font-medium text-gray-400">Agent ID</div>
            <div className="text-sm text-gray-300 font-mono bg-[#1c1c1c] p-2 rounded border border-gray-800">
              {node.data.agentId}
            </div>
          </div>
        )}

        {node.data.questions && node.data.questions.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-400">Follow-up Questions</div>
            <div className="space-y-2">
              {node.data.questions.map((q: any, idx: number) => (
                <div key={q.id} className="bg-[#1c1c1c] p-3 rounded border border-gray-800">
                  <div className="text-sm text-gray-200 font-medium mb-1">
                    {idx + 1}. {q.question}
                  </div>
                  {q.context && (
                    <div className="text-xs text-gray-400">{q.context}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {node.data.plan && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-400">Plan</div>
            {node.data.plan.summary && (
              <div className="text-sm text-gray-300 mb-3">{node.data.plan.summary}</div>
            )}
            {node.data.plan.tasks && (
              <div className="text-xs text-gray-400">
                {node.data.plan.tasks.length} task(s) planned
              </div>
            )}
          </div>
        )}

        {node.data.output?.rawOutput && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-400">Raw Output</div>
            <div className="bg-[#1c1c1c] p-3 rounded border border-gray-800 max-h-96 overflow-y-auto">
              <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">
                {JSON.stringify(node.data.output.rawOutput, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (node.type === 'task') {
    return (
      <div className="space-y-4">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-gray-400" />
            <DialogTitle>Task Details</DialogTitle>
            {getStatusBadge(node.data.status)}
          </div>
        </DialogHeader>

        <div className="space-y-3">
          {node.data.description && (
            <div className="space-y-1">
              <div className="text-sm font-medium text-gray-400">Description</div>
              <div className="text-sm text-gray-200">{node.data.description}</div>
            </div>
          )}

          {node.data.reasoning && (
            <div className="space-y-1">
              <div className="text-sm font-medium text-gray-400">Reasoning</div>
              <div className="text-sm text-gray-300">{node.data.reasoning}</div>
            </div>
          )}

          {node.data.estimatedComplexity && (
            <div className="space-y-1">
              <div className="text-sm font-medium text-gray-400">Complexity</div>
              <Badge
                className={`${
                  node.data.estimatedComplexity === 'high'
                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                    : node.data.estimatedComplexity === 'medium'
                    ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                    : 'bg-green-500/10 text-green-400 border-green-500/20'
                }`}
              >
                {node.data.estimatedComplexity}
              </Badge>
            </div>
          )}

          {node.data.dependencies && node.data.dependencies.length > 0 && (
            <div className="space-y-1">
              <div className="text-sm font-medium text-gray-400">Dependencies</div>
              <div className="flex flex-wrap gap-2">
                {node.data.dependencies.map((dep: string) => (
                  <Badge key={dep} className="bg-gray-700 text-gray-300">
                    {dep}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (node.type === 'agent') {
    return (
      <div className="space-y-4">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Bot className="h-5 w-5 text-green-400" />
            <DialogTitle>{node.label}</DialogTitle>
            {getStatusBadge(node.data.status)}
          </div>
        </DialogHeader>

        {node.data.cursorAgentId && (
          <div className="space-y-1">
            <div className="text-sm font-medium text-gray-400">Cursor Agent ID</div>
            <div className="text-sm text-gray-300 font-mono bg-[#1c1c1c] p-2 rounded border border-gray-800">
              {node.data.cursorAgentId}
            </div>
          </div>
        )}

        {node.data.description && (
          <div className="space-y-1">
            <div className="text-sm font-medium text-gray-400">Description</div>
            <div className="text-sm text-gray-300">{node.data.description}</div>
          </div>
        )}

        {node.data.systemPrompt && (
          <div className="space-y-1">
            <div className="text-sm font-medium text-gray-400">System Prompt</div>
            <div className="bg-[#1c1c1c] p-3 rounded border border-gray-800 max-h-48 overflow-y-auto">
              <div className="text-sm text-gray-300 whitespace-pre-wrap">
                {node.data.systemPrompt}
              </div>
            </div>
          </div>
        )}

        {node.data.output && (
          <div className="space-y-1">
            <div className="text-sm font-medium text-gray-400">Output</div>
            <div className="bg-[#1c1c1c] p-3 rounded border border-gray-800 max-h-96 overflow-y-auto">
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {node.data.output}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )}

        {node.data.tasks && node.data.tasks.length > 0 && (
          <div className="space-y-1">
            <div className="text-sm font-medium text-gray-400">Tasks</div>
            <div className="text-xs text-gray-400">
              {node.data.tasks.length} task(s) assigned
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>{node.label}</DialogTitle>
      </DialogHeader>
      <div className="text-sm text-gray-400">No details available</div>
    </div>
  );
}
