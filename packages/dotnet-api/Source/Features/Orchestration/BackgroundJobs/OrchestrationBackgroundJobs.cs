using System.Collections.Concurrent;
using Microsoft.EntityFrameworkCore;
using Source.Infrastructure;
using Source.Infrastructure.Services.CursorApi;
using System.Text.Json;
using AgentModel = Source.Features.Orchestration.Models.Agent;
using AgentStatusEnum = Source.Features.Orchestration.Models.AgentStatus;
using AgentStatusUpdateModel = Source.Features.Orchestration.Models.AgentStatusUpdate;
using OrchestrationStatusEnum = Source.Features.Orchestration.Models.OrchestrationStatus;

namespace Source.Features.Orchestration.Services;

public class OrchestrationBackgroundJobs
{
    private static readonly ConcurrentDictionary<string, bool> ActivePolls = new();
    private static readonly ConcurrentDictionary<string, bool> ActiveMonitors = new();

    private readonly ApplicationDbContext _context;
    private readonly OrchestrationService _orchestrationService;
    private readonly ILogger<OrchestrationBackgroundJobs> _logger;

    public OrchestrationBackgroundJobs(
        ApplicationDbContext context,
        OrchestrationService orchestrationService,
        ILogger<OrchestrationBackgroundJobs> logger)
    {
        _context = context;
        _orchestrationService = orchestrationService;
        _logger = logger;
    }

    public Task StartPlanningPhaseAsync(string orchestrationId, string cursorApiKey)
    {
        return _orchestrationService.StartPlanningPhaseAsync(orchestrationId, cursorApiKey);
    }

    public async Task PollPlanningAgentAsync(string orchestrationId, string cursorAgentId, string cursorApiKey)
    {
        var pollKey = $"planning_{orchestrationId}";
        if (!ActivePolls.TryAdd(pollKey, true))
        {
            _logger.LogInformation("Already polling planning agent for {OrchestrationId}", orchestrationId);
            return;
        }

        try
        {
            var httpClient = new HttpClient();
            var cursorClient = new CursorApiClient(cursorApiKey, httpClient);

            const int maxAttempts = 120;
            const int pollIntervalMs = 5000;

            for (int attempt = 0; attempt < maxAttempts; attempt++)
            {
                await Task.Delay(pollIntervalMs);

                try
                {
                    var agent = await cursorClient.GetAgentAsync(cursorAgentId);
                    _logger.LogInformation("Agent {AgentId} status: {Status}", cursorAgentId, agent.Status);

                    if (agent.Status.Equals("FINISHED", StringComparison.OrdinalIgnoreCase) ||
                        agent.Status.Equals("finished", StringComparison.OrdinalIgnoreCase))
                    {
                        var conversation = await cursorClient.GetAgentConversationAsync(cursorAgentId);
                        var conversationJson = JsonSerializer.Serialize(conversation);
                        await _orchestrationService.ProcessPlanningOutputAsync(orchestrationId, conversationJson);
                        return;
                    }
                    else if (agent.Status.Equals("FAILED", StringComparison.OrdinalIgnoreCase) ||
                             agent.Status.Equals("failed", StringComparison.OrdinalIgnoreCase))
                    {
                        await _orchestrationService.HandleOrchestrationErrorAsync(orchestrationId, "Planning agent failed");
                        return;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error polling planning agent {AgentId}", cursorAgentId);
                    throw;
                }
            }

            await _orchestrationService.HandleOrchestrationErrorAsync(orchestrationId, "Planning agent timeout");
        }
        finally
        {
            ActivePolls.TryRemove(pollKey, out _);
        }
    }

    public async Task ExecutePlanAsync(string orchestrationId, string cursorApiKey)
    {
        var orchestration = await _context.Orchestrations.FindAsync(orchestrationId);
        if (orchestration == null || string.IsNullOrEmpty(orchestration.ApprovedPlan)) return;

        var plan = JsonDocument.Parse(orchestration.ApprovedPlan);
        var content = plan.RootElement.GetProperty("content");
        
        var requiresSubAgents = content.TryGetProperty("requiresSubAgents", out var subAgentsProp) && subAgentsProp.GetBoolean();

        if (requiresSubAgents && content.TryGetProperty("subAgents", out var subAgents))
        {
            foreach (var subAgent in subAgents.EnumerateArray())
            {
                await CreateSubAgentAsync(orchestrationId, cursorApiKey, subAgent);
            }
        }
        else
        {
            await CreateMainExecutionAgentAsync(orchestrationId, cursorApiKey, content);
        }

        Hangfire.BackgroundJob.Enqueue<OrchestrationBackgroundJobs>(x =>
            x.MonitorExecutionAsync(orchestrationId, cursorApiKey));
    }

    private async Task CreateSubAgentAsync(string orchestrationId, string cursorApiKey, JsonElement spec)
    {
        var orchestration = await _context.Orchestrations.FindAsync(orchestrationId);
        if (orchestration == null) return;

        var name = spec.GetProperty("name").GetString() ?? "Sub Agent";
        var prompt = spec.GetProperty("prompt").GetString() ?? "";
        var branchName = spec.TryGetProperty("branchName", out var branch) ? branch.GetString() : null;
        var agentId = spec.TryGetProperty("id", out var id) ? id.GetString() : Guid.NewGuid().ToString();

        var httpClient = new HttpClient();
        var cursorClient = new CursorApiClient(cursorApiKey, httpClient);

        var cursorAgent = await cursorClient.CreateAgentAsync(new CursorAgentCreateRequest
        {
            Prompt = new CursorAgentCreateRequest.PromptData { Text = prompt },
            Source = new CursorAgentCreateRequest.SourceData
            {
                Repository = orchestration.Repository,
                Ref = orchestration.Ref
            },
            Target = new CursorAgentCreateRequest.TargetData
            {
                BranchName = branchName ?? $"feature/{agentId}",
                AutoCreatePr = true
            }
        });

        var agent = new AgentModel
        {
            OrchestrationId = orchestrationId,
            CursorAgentId = cursorAgent.Id,
            Name = name,
            Prompt = prompt,
            Status = AgentStatusEnum.CREATING,
            BranchName = branchName,
            Metadata = spec.GetRawText()
        };

        _context.Agents.Add(agent);
        await _context.SaveChangesAsync();

        await _orchestrationService.CreateEventAsync(orchestrationId, "agent_spawned", new
        {
            agentId = cursorAgent.Id,
            name
        });

        await _orchestrationService.BroadcastToOrchestrationAsync(orchestrationId, new
        {
            type = "agent_spawned",
            agent = new { id = cursorAgent.Id, name, status = "CREATING" }
        });
    }

    private async Task CreateMainExecutionAgentAsync(string orchestrationId, string cursorApiKey, JsonElement plan)
    {
        var orchestration = await _context.Orchestrations.FindAsync(orchestrationId);
        if (orchestration == null) return;

        var tasks = plan.TryGetProperty("tasks", out var tasksElement) ? tasksElement.GetRawText() : "[]";
        var prompt = $"{orchestration.InitialPrompt}\n\nExecution Plan:\n{tasks}";

        var httpClient = new HttpClient();
        var cursorClient = new CursorApiClient(cursorApiKey, httpClient);

        var cursorAgent = await cursorClient.CreateAgentAsync(new CursorAgentCreateRequest
        {
            Prompt = new CursorAgentCreateRequest.PromptData { Text = prompt },
            Source = new CursorAgentCreateRequest.SourceData
            {
                Repository = orchestration.Repository,
                Ref = orchestration.Ref
            },
            Target = new CursorAgentCreateRequest.TargetData
            {
                BranchName = $"feature/{orchestrationId}",
                AutoCreatePr = true
            }
        });

        var agent = new AgentModel
        {
            OrchestrationId = orchestrationId,
            CursorAgentId = cursorAgent.Id,
            Name = "Main Execution Agent",
            Prompt = prompt,
            Status = AgentStatusEnum.CREATING,
            BranchName = $"feature/{orchestrationId}",
            Metadata = tasks
        };

        _context.Agents.Add(agent);
        await _context.SaveChangesAsync();

        await _orchestrationService.CreateEventAsync(orchestrationId, "agent_spawned", new
        {
            agentId = cursorAgent.Id,
            name = "Main Execution Agent"
        });
    }

    public async Task MonitorExecutionAsync(string orchestrationId, string cursorApiKey)
    {
        var monitorKey = $"monitor_{orchestrationId}";
        if (!ActiveMonitors.TryAdd(monitorKey, true))
        {
            _logger.LogInformation("Already monitoring execution for {OrchestrationId}", orchestrationId);
            return;
        }

        try
        {
            var httpClient = new HttpClient();
            var cursorClient = new CursorApiClient(cursorApiKey, httpClient);
            const int pollIntervalMs = 10000;

            while (true)
            {
                await Task.Delay(pollIntervalMs);

                var agents = await _context.Agents
                    .Where(a => a.OrchestrationId == orchestrationId)
                    .ToListAsync();

                if (agents.Count == 0) break;

                bool allCompleted = true;
                bool anyFailed = false;

                foreach (var agent in agents)
                {
                    if (string.IsNullOrEmpty(agent.CursorAgentId)) continue;

                    try
                    {
                        var cursorAgent = await cursorClient.GetAgentAsync(agent.CursorAgentId);
                        var newStatus = MapCursorStatus(cursorAgent.Status);

                        if (agent.Status != newStatus)
                        {
                            agent.Status = newStatus;
                            agent.PullRequestUrl = cursorAgent.Target?.Url;
                            agent.UpdatedAt = DateTime.UtcNow;

                            _context.AgentStatusUpdates.Add(new AgentStatusUpdateModel
                            {
                                AgentId = agent.Id,
                                Status = newStatus.ToString(),
                                Message = $"Status changed to {newStatus}"
                            });

                            await _context.SaveChangesAsync();

                            await _orchestrationService.BroadcastToOrchestrationAsync(orchestrationId, new
                            {
                                type = "agent_status_update",
                                agent = new
                                {
                                    id = agent.Id,
                                    cursorAgentId = agent.CursorAgentId,
                                    name = agent.Name,
                                    status = newStatus.ToString(),
                                    pullRequestUrl = cursorAgent.Target?.Url
                                }
                            });
                        }

                        if (newStatus != AgentStatusEnum.COMPLETED) allCompleted = false;
                        if (newStatus == AgentStatusEnum.FAILED) anyFailed = true;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error checking agent {AgentId}", agent.Id);
                    }
                }

                if (allCompleted || anyFailed)
                {
                    var orchestration = await _context.Orchestrations.FindAsync(orchestrationId);
                    if (orchestration != null)
                    {
                        orchestration.Status = anyFailed ? OrchestrationStatusEnum.FAILED : OrchestrationStatusEnum.COMPLETED;
                        orchestration.CompletedAt = DateTime.UtcNow;
                        await _context.SaveChangesAsync();
                    }

                    var finalStatus = anyFailed ? "FAILED" : "COMPLETED";
                    await _orchestrationService.CreateEventAsync(orchestrationId, "orchestration_completed", new { status = finalStatus });
                    await _orchestrationService.BroadcastToOrchestrationAsync(orchestrationId, new
                    {
                        type = "orchestration_completed",
                        status = finalStatus
                    });

                    break;
                }
            }
        }
        finally
        {
            ActiveMonitors.TryRemove(monitorKey, out _);
        }
    }

    private static AgentStatusEnum MapCursorStatus(string status)
    {
        return status.ToUpperInvariant() switch
        {
            "CREATING" => AgentStatusEnum.CREATING,
            "RUNNING" => AgentStatusEnum.RUNNING,
            "COMPLETED" => AgentStatusEnum.COMPLETED,
            "FAILED" => AgentStatusEnum.FAILED,
            "CANCELLED" => AgentStatusEnum.CANCELLED,
            _ => AgentStatusEnum.RUNNING
        };
    }
}

