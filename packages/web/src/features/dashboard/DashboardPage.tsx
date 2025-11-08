import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/auth-context';
import { Plus, Loader2, GitBranch, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [repository, setRepository] = useState('');
  const [ref, setRef] = useState('main');
  const [prompt, setPrompt] = useState('');
  const [creating, setCreating] = useState(false);

  const { data: orchestrations } = useQuery({
    queryKey: ['orchestrations'],
    queryFn: async () => {
      const response = await api.orchestration.list();
      return response.data;
    },
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!repository || !prompt) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);
    try {
      const response = await api.orchestration.create({ repository, ref, prompt });
      toast({
        title: 'Orchestration Created',
        description: 'Planning phase started',
      });
      navigate(`/orchestration/${response.data.id}`);
    } catch (error: any) {
      toast({
        title: 'Failed to Create',
        description: error.response?.data?.error || 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PLANNING':
      case 'EXECUTING':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'AWAITING_FOLLOWUP':
      case 'AWAITING_APPROVAL':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'COMPLETED':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'FAILED':
      case 'CANCELLED':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Cursor Agent Orchestrator</h1>
            <p className="text-sm text-muted-foreground">{user?.email || 'Authenticated'}</p>
          </div>
          <Button variant="outline" onClick={logout}>
            Logout
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {!showCreateForm ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Your Orchestrations</h2>
                <p className="text-sm text-muted-foreground">
                  Manage and monitor your agent orchestrations
                </p>
              </div>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Orchestration
              </Button>
            </div>

            <div className="grid gap-4">
              {orchestrations?.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground mb-4">No orchestrations yet</p>
                    <Button onClick={() => setShowCreateForm(true)}>
                      Create Your First Orchestration
                    </Button>
                  </CardContent>
                </Card>
              )}

              {orchestrations?.map((orch: any) => (
                <Card
                  key={orch.id}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => navigate(`/orchestration/${orch.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(orch.status)}
                          <CardTitle className="text-lg">{getStatusText(orch.status)}</CardTitle>
                        </div>
                        <CardDescription className="mt-2 line-clamp-2">
                          {orch.initialPrompt}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <GitBranch className="h-4 w-4" />
                        {new URL(orch.repository).pathname.replace('.git', '')}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {new Date(orch.createdAt).toLocaleDateString()}
                      </div>
                      {orch._count && (
                        <div>
                          {orch._count.agents} agent{orch._count.agents !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Create New Orchestration</CardTitle>
              <CardDescription>
                Start a new AI-powered orchestration for your repository
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="repository">Repository URL</Label>
                  <Input
                    id="repository"
                    type="url"
                    placeholder="https://github.com/username/repo"
                    value={repository}
                    onChange={(e) => setRepository(e.target.value)}
                    required
                    disabled={creating}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ref">Branch/Ref</Label>
                  <Input
                    id="ref"
                    placeholder="main"
                    value={ref}
                    onChange={(e) => setRef(e.target.value)}
                    disabled={creating}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prompt">Task Description</Label>
                  <Textarea
                    id="prompt"
                    placeholder="Describe what you want the agent to do..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    required
                    disabled={creating}
                    className="min-h-[120px]"
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={creating}>
                    {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Orchestration
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateForm(false)}
                    disabled={creating}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
