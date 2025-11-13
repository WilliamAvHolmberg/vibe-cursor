using Source.Shared.CQRS;
using Source.Shared.Results;
using Source.Features.Orchestration.Services;

namespace Source.Features.Orchestration.Commands;

public record CancelOrchestrationCommand(
    string OrchestrationId,
    string UserId,
    string CursorApiKey
) : ICommand<Result<bool>>;

public class CancelOrchestrationCommandHandler : ICommandHandler<CancelOrchestrationCommand, Result<bool>>
{
    private readonly OrchestrationService _orchestrationService;

    public CancelOrchestrationCommandHandler(OrchestrationService orchestrationService)
    {
        _orchestrationService = orchestrationService;
    }

    public async Task<Result<bool>> Handle(CancelOrchestrationCommand request, CancellationToken cancellationToken)
    {
        await _orchestrationService.CancelOrchestrationAsync(
            request.OrchestrationId,
            request.CursorApiKey);

        return Result.Success(true);
    }
}

