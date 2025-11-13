using Microsoft.EntityFrameworkCore;
using Source.Infrastructure;
using Source.Shared.CQRS;
using Source.Shared.Results;

namespace Source.Features.ImageLibrary.Commands;

public record UpdateImageLibraryItemCommand(
    Guid Id,
    string Description
) : ICommand<Result<UpdateImageLibraryItemResponse>>;

public record UpdateImageLibraryItemResponse(
    Guid Id,
    string Description,
    DateTime UpdatedAt
);

public class UpdateImageLibraryItemCommandHandler : ICommandHandler<UpdateImageLibraryItemCommand, Result<UpdateImageLibraryItemResponse>>
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<UpdateImageLibraryItemCommandHandler> _logger;

    public UpdateImageLibraryItemCommandHandler(
        ApplicationDbContext context,
        ILogger<UpdateImageLibraryItemCommandHandler> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Result<UpdateImageLibraryItemResponse>> Handle(
        UpdateImageLibraryItemCommand request,
        CancellationToken cancellationToken)
    {
        try
        {
            var item = await _context.ImageLibrary
                .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

            if (item == null)
            {
                return Result.Failure<UpdateImageLibraryItemResponse>("Image not found in library");
            }

            item.Description = request.Description;
            item.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Updated image library item: {ItemId}", item.Id);

            return Result.Success(new UpdateImageLibraryItemResponse(
                item.Id,
                item.Description,
                item.UpdatedAt
            ));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update image library item: {ItemId}", request.Id);
            return Result.Failure<UpdateImageLibraryItemResponse>($"Failed to update image: {ex.Message}");
        }
    }
}

