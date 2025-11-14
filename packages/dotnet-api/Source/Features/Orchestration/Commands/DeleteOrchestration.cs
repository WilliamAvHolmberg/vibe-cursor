using Source.Shared.CQRS;
using Source.Shared.Results;
using Source.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Source.Features.Orchestration.Commands;

public record DeleteOrchestrationCommand(
    string OrchestrationId,
    string UserId,
    string CursorApiKey
) : ICommand<Result<bool>>;

public class DeleteOrchestrationCommandHandler : ICommandHandler<DeleteOrchestrationCommand, Result<bool>>
{
    private readonly ApplicationDbContext _context;

    public DeleteOrchestrationCommandHandler(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<bool>> Handle(DeleteOrchestrationCommand request, CancellationToken cancellationToken)
    {
        try
        {
            var orchestration = await _context.Orchestrations
                .Include(o => o.Agents)
                .Include(o => o.FollowUpMessages)
                .Include(o => o.Events)
                .FirstOrDefaultAsync(o => o.Id == request.OrchestrationId && o.UserId == request.UserId, cancellationToken);

            if (orchestration == null)
            {
                return Result.Failure<bool>("Orchestration not found");
            }

            _context.Orchestrations.Remove(orchestration);
            await _context.SaveChangesAsync(cancellationToken);

            return Result.Success(true);
        }
        catch (Exception ex)
        {
            return Result.Failure<bool>($"Failed to delete orchestration: {ex.Message}");
        }
    }
}
