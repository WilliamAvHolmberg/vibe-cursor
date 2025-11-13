using Source.Shared.CQRS;
using Source.Shared.Results;
using Source.Features.Orchestration.Services;
using Hangfire;

namespace Source.Features.Orchestration.Commands;

public record StartAgentCommand(
    string AgentId,
    string UserId,
    string CursorApiKey
) : ICommand<Result<bool>>;

public class StartAgentCommandHandler : ICommandHandler<StartAgentCommand, Result<bool>>
{
    private readonly IBackgroundJobClient _backgroundJobClient;

    public StartAgentCommandHandler(IBackgroundJobClient backgroundJobClient)
    {
        _backgroundJobClient = backgroundJobClient;
    }

    public async Task<Result<bool>> Handle(StartAgentCommand request, CancellationToken cancellationToken)
    {
        try
        {
            _backgroundJobClient.Enqueue<OrchestrationBackgroundJobs>(x =>
                x.StartAgentAsync(request.AgentId, request.CursorApiKey));

            return Result.Success(true);
        }
        catch (Exception ex)
        {
            return Result.Failure<bool>(ex.Message);
        }
    }
}
