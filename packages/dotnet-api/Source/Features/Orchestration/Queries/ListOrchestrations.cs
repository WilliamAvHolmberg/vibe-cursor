using Source.Shared.CQRS;
using Source.Shared.Results;
using Source.Features.Orchestration.Services;
using Source.Features.Orchestration.DTOs;

namespace Source.Features.Orchestration.Queries;

public record ListOrchestrationsQuery(
    string UserId
) : IQuery<Result<List<OrchestrationResponse>>>;

public class ListOrchestrationsQueryHandler : IQueryHandler<ListOrchestrationsQuery, Result<List<OrchestrationResponse>>>
{
    private readonly OrchestrationService _orchestrationService;

    public ListOrchestrationsQueryHandler(OrchestrationService orchestrationService)
    {
        _orchestrationService = orchestrationService;
    }

    public async Task<Result<List<OrchestrationResponse>>> Handle(ListOrchestrationsQuery request, CancellationToken cancellationToken)
    {
        var orchestrations = await _orchestrationService.ListOrchestrationsAsync(request.UserId);
        var dtos = orchestrations.Select(OrchestrationResponse.FromEntity).ToList();
        return Result.Success(dtos);
    }
}

