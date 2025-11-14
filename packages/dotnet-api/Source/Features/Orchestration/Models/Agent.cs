namespace Source.Features.Orchestration.Models;

public class Agent
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string OrchestrationId { get; set; } = string.Empty;
    public string? ParentAgentId { get; set; }
    public string? CursorAgentId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Prompt { get; set; } = string.Empty;
    public AgentStatus Status { get; set; }
    public string? BranchName { get; set; }
    public string? PullRequestUrl { get; set; }
    public string? Error { get; set; }
    public string? Metadata { get; set; }
    public List<string> DependsOnAgentIds { get; set; } = new();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }

    public Orchestration Orchestration { get; set; } = null!;
    public Agent? ParentAgent { get; set; }
    public ICollection<Agent> SubAgents { get; set; } = new List<Agent>();
    public ICollection<AgentStatusUpdate> StatusUpdates { get; set; } = new List<AgentStatusUpdate>();
}

