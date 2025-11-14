using System.Text.Json;
using System.Text.Json.Nodes;
using OrchestrationModel = Source.Features.Orchestration.Models.Orchestration;
using Source.Features.Orchestration.Models;

namespace Source.Features.Orchestration.DTOs;

public class OrchestrationResponse
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string Repository { get; set; } = string.Empty;
    public string Ref { get; set; } = string.Empty;
    public string InitialPrompt { get; set; } = string.Empty;
    public OrchestrationStatus Status { get; set; }
    public string? PlanningAgentId { get; set; }
    public JsonNode? PlanningOutput { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<FollowUpMessageDto> FollowUpMessages { get; set; } = new();
    public List<AgentDto> Agents { get; set; } = new();
    public List<OrchestrationEventDto> Events { get; set; } = new();

    public static OrchestrationResponse FromEntity(OrchestrationModel orchestration)
    {
        return new OrchestrationResponse
        {
            Id = orchestration.Id,
            UserId = orchestration.UserId,
            Repository = orchestration.Repository,
            Ref = orchestration.Ref,
            InitialPrompt = orchestration.InitialPrompt,
            Status = orchestration.Status,
            PlanningAgentId = orchestration.PlanningAgentId,
            PlanningOutput = ParseJsonString(orchestration.PlanningOutput),
            CreatedAt = orchestration.CreatedAt,
            UpdatedAt = orchestration.UpdatedAt,
            FollowUpMessages = orchestration.FollowUpMessages?.Select(FollowUpMessageDto.FromEntity).ToList() ?? new(),
            Agents = orchestration.Agents?.Select(AgentDto.FromEntity).ToList() ?? new(),
            Events = orchestration.Events?.Select(OrchestrationEventDto.FromEntity).ToList() ?? new()
        };
    }

    private static JsonNode? ParseJsonString(string? jsonString)
    {
        if (string.IsNullOrEmpty(jsonString))
            return null;

        try
        {
            return JsonNode.Parse(jsonString);
        }
        catch
        {
            return null;
        }
    }
}

public class FollowUpMessageDto
{
    public string Id { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    public static FollowUpMessageDto FromEntity(FollowUpMessage entity)
    {
        return new FollowUpMessageDto
        {
            Id = entity.Id,
            Role = entity.Role,
            Content = entity.Content,
            CreatedAt = entity.CreatedAt
        };
    }
}

public class AgentDto
{
    public string Id { get; set; } = string.Empty;
    public string? CursorAgentId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Prompt { get; set; } = string.Empty;
    public AgentStatus Status { get; set; }
    public string? PullRequestUrl { get; set; }
    public List<string> DependsOnAgentIds { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public static AgentDto FromEntity(Agent entity)
    {
        return new AgentDto
        {
            Id = entity.Id,
            CursorAgentId = entity.CursorAgentId,
            Name = entity.Name,
            Prompt = entity.Prompt,
            Status = entity.Status,
            PullRequestUrl = entity.PullRequestUrl,
            DependsOnAgentIds = entity.DependsOnAgentIds,
            CreatedAt = entity.CreatedAt,
            UpdatedAt = entity.UpdatedAt
        };
    }
}

public class OrchestrationEventDto
{
    public string Id { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public JsonNode? Data { get; set; }
    public DateTime CreatedAt { get; set; }

    public static OrchestrationEventDto FromEntity(OrchestrationEvent entity)
    {
        return new OrchestrationEventDto
        {
            Id = entity.Id,
            Type = entity.Type,
            Data = ParseJsonString(entity.Data),
            CreatedAt = entity.CreatedAt
        };
    }

    private static JsonNode? ParseJsonString(string? jsonString)
    {
        if (string.IsNullOrEmpty(jsonString))
            return null;

        try
        {
            return JsonNode.Parse(jsonString);
        }
        catch
        {
            return null;
        }
    }
}

