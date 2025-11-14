using Source.Shared.CQRS;
using Source.Shared.Results;
using Source.Features.Orchestration.Services;

namespace Source.Features.Orchestration.Commands;

public record SendPlanFeedbackCommand(
    string OrchestrationId,
    string UserId,
    string CursorApiKey,
    string Feedback
) : ICommand<Result<bool>>;

public class SendPlanFeedbackCommandHandler : ICommandHandler<SendPlanFeedbackCommand, Result<bool>>
{
    private readonly OrchestrationService _orchestrationService;

    public SendPlanFeedbackCommandHandler(OrchestrationService orchestrationService)
    {
        _orchestrationService = orchestrationService;
    }

    public async Task<Result<bool>> Handle(SendPlanFeedbackCommand request, CancellationToken cancellationToken)
    {
        try
        {
            await _orchestrationService.SendPlanFeedbackAsync(
                request.OrchestrationId,
                request.CursorApiKey,
                request.Feedback);

            return Result.Success(true);
        }
        catch (InvalidOperationException ex)
        {
            return Result.Failure<bool>(ex.Message);
        }
    }
}
