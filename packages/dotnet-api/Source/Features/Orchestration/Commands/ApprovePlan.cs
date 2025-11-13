using Source.Shared.CQRS;
using Source.Shared.Results;
using Source.Features.Orchestration.Services;

namespace Source.Features.Orchestration.Commands;

public record ApprovePlanCommand(
    string OrchestrationId,
    string UserId,
    string CursorApiKey
) : ICommand<Result<bool>>;

public class ApprovePlanCommandHandler : ICommandHandler<ApprovePlanCommand, Result<bool>>
{
    private readonly OrchestrationService _orchestrationService;

    public ApprovePlanCommandHandler(OrchestrationService orchestrationService)
    {
        _orchestrationService = orchestrationService;
    }

    public async Task<Result<bool>> Handle(ApprovePlanCommand request, CancellationToken cancellationToken)
    {
        try
        {
            await _orchestrationService.ApprovePlanAsync(
                request.OrchestrationId,
                request.CursorApiKey);

            return Result.Success(true);
        }
        catch (InvalidOperationException ex)
        {
            return Result.Failure<bool>(ex.Message);
        }
    }
}

