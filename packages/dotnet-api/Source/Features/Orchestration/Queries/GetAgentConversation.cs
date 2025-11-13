using Source.Shared.CQRS;
using Source.Shared.Results;
using Source.Infrastructure.Services.CursorApi;

namespace Source.Features.Orchestration.Queries;

public record GetAgentConversationQuery(
    string PlanningAgentId,
    string CursorApiKey
) : IQuery<Result<CursorAgentConversation>>;

public class GetAgentConversationQueryHandler : IQueryHandler<GetAgentConversationQuery, Result<CursorAgentConversation>>
{
    public async Task<Result<CursorAgentConversation>> Handle(GetAgentConversationQuery request, CancellationToken cancellationToken)
    {
        var httpClient = new HttpClient();
        var cursorClient = new CursorApiClient(request.CursorApiKey, httpClient);
        
        var conversation = await cursorClient.GetAgentConversationAsync(request.PlanningAgentId);
        return Result.Success(conversation);
    }
}

