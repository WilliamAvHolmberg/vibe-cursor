using Source.Shared.CQRS;
using Source.Shared.Results;
using Source.Features.Orchestration.Services;

namespace Source.Features.Orchestration.Commands;

public record AnswerFollowUpQuestionsCommand(
    string OrchestrationId,
    string UserId,
    string CursorApiKey,
    Dictionary<string, string> Answers
) : ICommand<Result<bool>>;

public class AnswerFollowUpQuestionsCommandHandler : ICommandHandler<AnswerFollowUpQuestionsCommand, Result<bool>>
{
    private readonly OrchestrationService _orchestrationService;

    public AnswerFollowUpQuestionsCommandHandler(OrchestrationService orchestrationService)
    {
        _orchestrationService = orchestrationService;
    }

    public async Task<Result<bool>> Handle(AnswerFollowUpQuestionsCommand request, CancellationToken cancellationToken)
    {
        try
        {
            await _orchestrationService.AnswerFollowUpQuestionsAsync(
                request.OrchestrationId,
                request.CursorApiKey,
                request.Answers);

            return Result.Success(true);
        }
        catch (InvalidOperationException ex)
        {
            return Result.Failure<bool>(ex.Message);
        }
    }
}

