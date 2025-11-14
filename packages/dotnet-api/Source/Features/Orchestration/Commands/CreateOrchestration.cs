using Source.Shared.CQRS;
using Source.Shared.Results;
using Source.Features.Orchestration.Services;
using OrchestrationModel = Source.Features.Orchestration.Models.Orchestration;

namespace Source.Features.Orchestration.Commands;

public record CreateOrchestrationCommand(
    string UserId,
    string CursorApiKey,
    string Repository,
    string Prompt,
    string? Ref = null,
    string? Model = null
) : ICommand<Result<CreateOrchestrationResponse>>;

public record CreateOrchestrationResponse(
    string Id,
    string Repository,
    string InitialPrompt,
    string Status
);

public class CreateOrchestrationCommandHandler : ICommandHandler<CreateOrchestrationCommand, Result<CreateOrchestrationResponse>>
{
    private readonly OrchestrationService _orchestrationService;

    public CreateOrchestrationCommandHandler(OrchestrationService orchestrationService)
    {
        _orchestrationService = orchestrationService;
    }

    public async Task<Result<CreateOrchestrationResponse>> Handle(CreateOrchestrationCommand request, CancellationToken cancellationToken)
    {
        var orchestration = await _orchestrationService.CreateOrchestrationAsync(
            request.UserId,
            request.CursorApiKey,
            request.Repository,
            request.Prompt,
            request.Ref,
            request.Model);

        return Result.Success(new CreateOrchestrationResponse(
            orchestration.Id,
            orchestration.Repository,
            orchestration.InitialPrompt,
            orchestration.Status.ToString()
        ));
    }
}

