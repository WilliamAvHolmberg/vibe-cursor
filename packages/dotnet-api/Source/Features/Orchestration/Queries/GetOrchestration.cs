using Source.Shared.CQRS;
using Source.Shared.Results;
using Source.Features.Orchestration.Services;
using Source.Features.Orchestration.DTOs;

namespace Source.Features.Orchestration.Queries;

public record GetOrchestrationQuery(
    string OrchestrationId,
    string UserId
) : IQuery<Result<OrchestrationResponse?>>;

public class GetOrchestrationQueryHandler : IQueryHandler<GetOrchestrationQuery, Result<OrchestrationResponse?>>
{
    private readonly OrchestrationService _orchestrationService;

    public GetOrchestrationQueryHandler(OrchestrationService orchestrationService)
    {
        _orchestrationService = orchestrationService;
    }

    public async Task<Result<OrchestrationResponse?>> Handle(GetOrchestrationQuery request, CancellationToken cancellationToken)
    {
        var orchestration = await _orchestrationService.GetOrchestrationAsync(
            request.OrchestrationId,
            request.UserId);

        if (orchestration == null)
        {
            return Result.Failure<OrchestrationResponse?>("Orchestration not found");
        }

        return Result.Success<OrchestrationResponse?>(OrchestrationResponse.FromEntity(orchestration));
    }
}

