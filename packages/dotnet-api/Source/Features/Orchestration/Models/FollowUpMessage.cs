namespace Source.Features.Orchestration.Models;

public class FollowUpMessage
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string OrchestrationId { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Orchestration Orchestration { get; set; } = null!;
}

