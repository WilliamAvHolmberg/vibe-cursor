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

    public Task StartPlanningPhaseAsync(string orchestrationId, string cursorApiKey, string? model = null)
    {
        return _orchestrationService.StartPlanningPhaseAsync(orchestrationId, cursorApiKey, model);
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

    public async Task CreateAgentsFromPlanAsync(string orchestrationId, string cursorApiKey)
    {
        var orchestration = await _context.Orchestrations.FindAsync(orchestrationId);
        if (orchestration == null || string.IsNullOrEmpty(orchestration.ApprovedPlan)) return;

        var plan = JsonDocument.Parse(orchestration.ApprovedPlan);
        var content = plan.RootElement.GetProperty("content");
        
        if (content.TryGetProperty("subAgents", out var subAgents))
        {
            foreach (var subAgent in subAgents.EnumerateArray())
            {
                await CreateSubAgentAsync(orchestrationId, cursorApiKey, subAgent);
            }
        }
        else
        {
            _logger.LogWarning("Plan for orchestration {OrchestrationId} has no subAgents", orchestrationId);
        }

        Hangfire.BackgroundJob.Enqueue<OrchestrationBackgroundJobs>(x =>
            x.MonitorExecutionAsync(orchestrationId, cursorApiKey));
    }

    public async Task ExecutePlanAsync(string orchestrationId, string cursorApiKey)
    {
        await CreateAgentsFromPlanAsync(orchestrationId, cursorApiKey);
    }

    private async Task CreateSubAgentAsync(string orchestrationId, string cursorApiKey, JsonElement spec)
    {
        var orchestration = await _context.Orchestrations.FindAsync(orchestrationId);
        if (orchestration == null) return;

        var name = spec.GetProperty("name").GetString() ?? "Sub Agent";
        var prompt = spec.GetProperty("prompt").GetString() ?? "";
        var branchName = spec.TryGetProperty("branchName", out var branch) ? branch.GetString() : null;
        var planAgentId = spec.TryGetProperty("id", out var id) ? id.GetString() : null;
        
        if (string.IsNullOrEmpty(planAgentId))
        {
            planAgentId = Guid.NewGuid().ToString();
        }
        
        var existingAgent = await _context.Agents
            .FirstOrDefaultAsync(a => a.OrchestrationId == orchestrationId && a.Id == planAgentId);
        
        if (existingAgent != null)
        {
            _logger.LogWarning("Agent {AgentId} already exists for orchestration {OrchestrationId}, skipping creation", planAgentId, orchestrationId);
            return;
        }
        
        var dependsOn = new List<string>();
        if (spec.TryGetProperty("dependsOn", out var dependsOnProp) && dependsOnProp.ValueKind == JsonValueKind.Array)
        {
            dependsOn = dependsOnProp.EnumerateArray().Select(e => e.GetString() ?? "").Where(s => !string.IsNullOrEmpty(s)).ToList();
        }

        var agent = new AgentModel
        {
            Id = planAgentId,
            OrchestrationId = orchestrationId,
            Name = name,
            Prompt = prompt,
            Status = AgentStatusEnum.PENDING,
            BranchName = branchName,
            DependsOnAgentIds = dependsOn,
            Metadata = spec.GetRawText()
        };

        _context.Agents.Add(agent);
        await _context.SaveChangesAsync();

        await _orchestrationService.CreateEventAsync(orchestrationId, "agent_created", new
        {
            agentId = planAgentId,
            name,
            dependsOn
        });

        await _orchestrationService.BroadcastToOrchestrationAsync(orchestrationId, new
        {
            type = "agent_created",
            agent = new { id = planAgentId, name, status = "PENDING", dependsOn }
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
                bool anyRunning = false;

                foreach (var agent in agents)
                {
                    if (agent.Status == AgentStatusEnum.PENDING)
                    {
                        allCompleted = false;
                        continue;
                    }

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

                            if (newStatus == AgentStatusEnum.COMPLETED)
                            {
                                agent.CompletedAt = DateTime.UtcNow;
                            }

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
                        if (newStatus == AgentStatusEnum.RUNNING || newStatus == AgentStatusEnum.CREATING) anyRunning = true;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error checking agent {AgentId}", agent.Id);
                    }
                }

                if (allCompleted || (anyFailed && !anyRunning))
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

    public async Task<bool> StartAgentAsync(string agentId, string cursorApiKey)
    {
        var agent = await _context.Agents
            .Include(a => a.Orchestration)
            .FirstOrDefaultAsync(a => a.Id == agentId);

        if (agent == null)
        {
            _logger.LogError("Agent {AgentId} not found", agentId);
            return false;
        }

        if (agent.Status != AgentStatusEnum.PENDING)
        {
            _logger.LogWarning("Agent {AgentId} is not in PENDING state", agentId);
            return false;
        }

        var allAgents = await _context.Agents
            .Where(a => a.OrchestrationId == agent.OrchestrationId)
            .ToListAsync();

        foreach (var depId in agent.DependsOnAgentIds)
        {
            var depAgent = allAgents.FirstOrDefault(a => a.Id == depId);
            if (depAgent == null || depAgent.Status != AgentStatusEnum.COMPLETED)
            {
                _logger.LogWarning("Agent {AgentId} dependency {DepId} not completed", agentId, depId);
                return false;
            }
        }

        var httpClient = new HttpClient();
        var cursorClient = new CursorApiClient(cursorApiKey, httpClient);

        var cursorAgent = await cursorClient.CreateAgentAsync(new CursorAgentCreateRequest
        {
            Prompt = new CursorAgentCreateRequest.PromptData { Text = agent.Prompt },
            Source = new CursorAgentCreateRequest.SourceData
            {
                Repository = agent.Orchestration.Repository,
                Ref = agent.Orchestration.Ref
            },
            Target = new CursorAgentCreateRequest.TargetData
            {
                BranchName = agent.BranchName ?? $"feature/{agentId}",
                AutoCreatePr = true
            }
        });

        agent.CursorAgentId = cursorAgent.Id;
        agent.Status = AgentStatusEnum.CREATING;
        agent.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        await _orchestrationService.CreateEventAsync(agent.OrchestrationId, "agent_started", new
        {
            agentId,
            cursorAgentId = cursorAgent.Id
        });

        await _orchestrationService.BroadcastToOrchestrationAsync(agent.OrchestrationId, new
        {
            type = "agent_started",
            agent = new { id = agentId, cursorAgentId = cursorAgent.Id, status = "CREATING" }
        });

        return true;
    }
}

