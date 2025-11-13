namespace Source.Features.Orchestration.Models;

public enum OrchestrationStatus
{
    PLANNING,
    AWAITING_FOLLOWUP,
    AWAITING_APPROVAL,
    EXECUTING,
    COMPLETED,
    FAILED,
    CANCELLED
}

