namespace Source.Features.Orchestration.Models;

public class OrchestrationEvent
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string OrchestrationId { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Data { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Orchestration Orchestration { get; set; } = null!;
}

