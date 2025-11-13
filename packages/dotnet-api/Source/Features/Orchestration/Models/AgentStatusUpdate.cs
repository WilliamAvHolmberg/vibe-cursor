namespace Source.Features.Orchestration.Models;

public class AgentStatusUpdate
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string AgentId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? Message { get; set; }
    public string? Metadata { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Agent Agent { get; set; } = null!;
}

