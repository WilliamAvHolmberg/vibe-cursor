using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Source.Infrastructure;
using Source.Infrastructure.Services.CursorApi;
using Source.Features.Orchestration.Hubs;
using Hangfire;
using OrchestrationModel = Source.Features.Orchestration.Models.Orchestration;
using AgentModel = Source.Features.Orchestration.Models.Agent;
using OrchestrationStatusEnum = Source.Features.Orchestration.Models.OrchestrationStatus;
using AgentStatusEnum = Source.Features.Orchestration.Models.AgentStatus;
using FollowUpMessageModel = Source.Features.Orchestration.Models.FollowUpMessage;
using OrchestrationEventModel = Source.Features.Orchestration.Models.OrchestrationEvent;

namespace Source.Features.Orchestration.Services;

public class OrchestrationService
{
    private readonly ApplicationDbContext _context;
    private readonly IHubContext<OrchestrationHub> _hubContext;
    private readonly ILogger<OrchestrationService> _logger;

    public OrchestrationService(
        ApplicationDbContext context,
        IHubContext<OrchestrationHub> hubContext,
        ILogger<OrchestrationService> logger)
    {
        _context = context;
        _hubContext = hubContext;
        _logger = logger;
    }

    public async Task<OrchestrationModel> CreateOrchestrationAsync(
        string userId,
        string cursorApiKey,
        string repository,
        string initialPrompt,
        string? refBranch = null)
    {
        var orchestration = new OrchestrationModel
        {
            UserId = userId,
            Repository = repository,
            Ref = refBranch ?? "main",
            InitialPrompt = initialPrompt,
            Status = OrchestrationStatusEnum.PLANNING
        };

        _context.Orchestrations.Add(orchestration);
        await _context.SaveChangesAsync();

        await CreateEventAsync(orchestration.Id, "orchestration_created", new
        {
            repository,
            prompt = initialPrompt
        });

        BackgroundJob.Enqueue<OrchestrationBackgroundJobs>(x =>
            x.StartPlanningPhaseAsync(orchestration.Id, cursorApiKey));

        return orchestration;
    }

    public async Task<OrchestrationModel?> GetOrchestrationAsync(string orchestrationId, string userId)
    {
        return await _context.Orchestrations
            .Include(o => o.Agents)
                .ThenInclude(a => a.StatusUpdates.OrderByDescending(s => s.CreatedAt).Take(5))
            .Include(o => o.FollowUpMessages.OrderBy(f => f.CreatedAt))
            .Include(o => o.Events.OrderByDescending(e => e.CreatedAt).Take(20))
            .FirstOrDefaultAsync(o => o.Id == orchestrationId && o.UserId == userId);
    }

    public async Task<List<OrchestrationModel>> ListOrchestrationsAsync(string userId)
    {
        return await _context.Orchestrations
            .Include(o => o.Agents)
            .Where(o => o.UserId == userId)
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();
    }

    public async Task StartPlanningPhaseAsync(string orchestrationId, string cursorApiKey)
    {
        var orchestration = await _context.Orchestrations
            .Include(o => o.FollowUpMessages.OrderBy(f => f.CreatedAt))
            .FirstOrDefaultAsync(o => o.Id == orchestrationId);

        if (orchestration == null)
        {
            _logger.LogError("Orchestration {OrchestrationId} not found", orchestrationId);
            return;
        }

        var previousQA = orchestration.FollowUpMessages
            .Where(m => m.Role == "agent")
            .Select((agentMsg, index) =>
            {
                var nextUserMsg = orchestration.FollowUpMessages
                    .FirstOrDefault(m => m.Role == "user" && m.CreatedAt > agentMsg.CreatedAt);
                return nextUserMsg != null
                    ? (question: agentMsg.Content, answer: nextUserMsg.Content)
                    : ((string, string)?)null;
            })
            .Where(qa => qa.HasValue)
            .Select(qa => qa!.Value)
            .ToList();

        var prompt = OrchestrationPrompts.BuildPlanningAgentPrompt(
            orchestration.InitialPrompt,
            orchestration.Repository,
            previousQA.Count > 0 ? previousQA : null);

        var fullPrompt = $"{OrchestrationPrompts.PLANNING_AGENT_SYSTEM_PROMPT}\n\n{prompt}";

        var httpClient = new HttpClient();
        var cursorClient = new CursorApiClient(cursorApiKey, httpClient);

        var cursorAgent = await cursorClient.CreateAgentAsync(new CursorAgentCreateRequest
        {
            Prompt = new CursorAgentCreateRequest.PromptData { Text = fullPrompt },
            Source = new CursorAgentCreateRequest.SourceData
            {
                Repository = orchestration.Repository,
                Ref = orchestration.Ref
            },
            Target = new CursorAgentCreateRequest.TargetData
            {
                BranchName = $"planning/{orchestrationId}",
                AutoCreatePr = false
            }
        });

        orchestration.PlanningAgentId = cursorAgent.Id;
        await _context.SaveChangesAsync();

        await CreateEventAsync(orchestrationId, "planning_agent_created", new
        {
            cursorAgentId = cursorAgent.Id
        });

        BackgroundJob.Enqueue<OrchestrationBackgroundJobs>(x =>
            x.PollPlanningAgentAsync(orchestrationId, cursorAgent.Id, cursorApiKey));
    }

    public async Task ProcessPlanningOutputAsync(string orchestrationId, string conversationJson)
    {
        var orchestration = await _context.Orchestrations.FindAsync(orchestrationId);
        if (orchestration == null) return;

        var conversation = JsonSerializer.Deserialize<CursorAgentConversation>(conversationJson);
        var lastMessage = conversation?.Messages
            .Where(m => m.Type == "assistant_message")
            .LastOrDefault();

        if (lastMessage == null)
        {
            await HandleOrchestrationErrorAsync(orchestrationId, "No output from planning agent");
            return;
        }

        try
        {
            var jsonMatch = System.Text.RegularExpressions.Regex.Match(lastMessage.Text, @"\{[\s\S]*\}");
            if (!jsonMatch.Success)
            {
                await HandleOrchestrationErrorAsync(orchestrationId, "No JSON found in agent output");
                return;
            }

            var outputJson = jsonMatch.Value;
            var output = JsonNode.Parse(outputJson);
            var type = output?["type"]?.GetValue<string>();

            if (type == "questions")
            {
                orchestration.Status = OrchestrationStatusEnum.AWAITING_FOLLOWUP;
                orchestration.PlanningOutput = outputJson;
                await _context.SaveChangesAsync();

                var questions = output["content"]?["questions"]?.AsArray();
                if (questions != null)
                {
                    foreach (var q in questions)
                    {
                        var question = q?["question"]?.GetValue<string>();
                        if (!string.IsNullOrEmpty(question))
                        {
                            _context.FollowUpMessages.Add(new FollowUpMessageModel
                            {
                                OrchestrationId = orchestrationId,
                                Role = "agent",
                                Content = question
                            });
                        }
                    }
                    await _context.SaveChangesAsync();
                }

                await CreateEventAsync(orchestrationId, "questions_asked", new { questions });
                await BroadcastToOrchestrationAsync(orchestrationId, new { type = "questions_asked", questions });
            }
            else if (type == "plan")
            {
                orchestration.Status = OrchestrationStatusEnum.AWAITING_APPROVAL;
                orchestration.PlanningOutput = outputJson;
                await _context.SaveChangesAsync();

                var plan = output["content"];
                await CreateEventAsync(orchestrationId, "plan_ready", new { plan });
                await BroadcastToOrchestrationAsync(orchestrationId, new { type = "plan_ready", plan });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to parse planning output for {OrchestrationId}", orchestrationId);
            await HandleOrchestrationErrorAsync(orchestrationId, $"Invalid planning output: {ex.Message}");
        }
    }

    public async Task AnswerFollowUpQuestionsAsync(
        string orchestrationId,
        string cursorApiKey,
        Dictionary<string, string> answers)
    {
        var orchestration = await _context.Orchestrations.FindAsync(orchestrationId);
        if (orchestration == null || orchestration.Status != OrchestrationStatusEnum.AWAITING_FOLLOWUP)
        {
            throw new InvalidOperationException("Invalid orchestration state");
        }

        if (string.IsNullOrEmpty(orchestration.PlanningAgentId))
        {
            throw new InvalidOperationException("No planning agent found");
        }

        foreach (var answer in answers.Values)
        {
            _context.FollowUpMessages.Add(new FollowUpMessageModel
            {
                OrchestrationId = orchestrationId,
                Role = "user",
                Content = answer
            });
        }

        orchestration.Status = OrchestrationStatusEnum.PLANNING;
        await _context.SaveChangesAsync();

        var answersText = string.Join("\n\n", answers.Values);
        var followUpText = $"Here are the answers to your questions:\n\n{answersText}\n\nPlease continue with the planning.";

        var httpClient = new HttpClient();
        var cursorClient = new CursorApiClient(cursorApiKey, httpClient);

        await cursorClient.AddFollowUpAsync(
            orchestration.PlanningAgentId,
            new CursorAgentCreateRequest.PromptData { Text = followUpText });

        await CreateEventAsync(orchestrationId, "followup_answered", new { answers });

        BackgroundJob.Enqueue<OrchestrationBackgroundJobs>(x =>
            x.PollPlanningAgentAsync(orchestrationId, orchestration.PlanningAgentId, cursorApiKey));
    }

    public async Task ApprovePlanAsync(string orchestrationId, string cursorApiKey)
    {
        var orchestration = await _context.Orchestrations.FindAsync(orchestrationId);
        if (orchestration == null || orchestration.Status != OrchestrationStatusEnum.AWAITING_APPROVAL)
        {
            throw new InvalidOperationException("Invalid orchestration state");
        }

        orchestration.Status = OrchestrationStatusEnum.EXECUTING;
        orchestration.ApprovedPlan = orchestration.PlanningOutput;
        await _context.SaveChangesAsync();

        await CreateEventAsync(orchestrationId, "plan_approved", new { });

        BackgroundJob.Enqueue<OrchestrationBackgroundJobs>(x =>
            x.ExecutePlanAsync(orchestrationId, cursorApiKey));
    }

    public async Task CancelOrchestrationAsync(string orchestrationId, string cursorApiKey)
    {
        var orchestration = await _context.Orchestrations
            .Include(o => o.Agents)
            .FirstOrDefaultAsync(o => o.Id == orchestrationId);

        if (orchestration == null) return;

        orchestration.Status = OrchestrationStatusEnum.CANCELLED;
        await _context.SaveChangesAsync();

        var httpClient = new HttpClient();
        var cursorClient = new CursorApiClient(cursorApiKey, httpClient);

        foreach (var agent in orchestration.Agents.Where(a => a.Status == AgentStatusEnum.RUNNING))
        {
            try
            {
                if (!string.IsNullOrEmpty(agent.CursorAgentId))
                {
                    await cursorClient.CancelAgentAsync(agent.CursorAgentId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to cancel agent {AgentId}", agent.Id);
            }
        }
    }

    public async Task CreateEventAsync(string orchestrationId, string type, object data)
    {
        var dataJson = JsonSerializer.Serialize(data);
        _context.OrchestrationEvents.Add(new OrchestrationEventModel
        {
            OrchestrationId = orchestrationId,
            Type = type,
            Data = dataJson
        });
        await _context.SaveChangesAsync();
    }

    public async Task HandleOrchestrationErrorAsync(string orchestrationId, string errorMessage)
    {
        var orchestration = await _context.Orchestrations.FindAsync(orchestrationId);
        if (orchestration != null)
        {
            orchestration.Status = OrchestrationStatusEnum.FAILED;
            await _context.SaveChangesAsync();
        }

        await CreateEventAsync(orchestrationId, "error", new { message = errorMessage });
        await BroadcastToOrchestrationAsync(orchestrationId, new { type = "error", message = errorMessage });
    }

    public async Task BroadcastToOrchestrationAsync(string orchestrationId, object message)
    {
        await _hubContext.Clients
            .Group(orchestrationId)
            .SendAsync("BroadcastToOrchestration", message);
    }
}

