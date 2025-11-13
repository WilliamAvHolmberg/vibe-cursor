using Source.Features.Users.Models;

namespace Source.Features.Orchestration.Models;

public class Orchestration
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string UserId { get; set; } = string.Empty;
    public string Repository { get; set; } = string.Empty;
    public string Ref { get; set; } = "main";
    public string InitialPrompt { get; set; } = string.Empty;
    public OrchestrationStatus Status { get; set; }
    public string? PlanningAgentId { get; set; }
    public string? PlanningOutput { get; set; }
    public string? ApprovedPlan { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }

    public User User { get; set; } = null!;
    public ICollection<FollowUpMessage> FollowUpMessages { get; set; } = new List<FollowUpMessage>();
    public ICollection<Agent> Agents { get; set; } = new List<Agent>();
    public ICollection<OrchestrationEvent> Events { get; set; } = new List<OrchestrationEvent>();
}

