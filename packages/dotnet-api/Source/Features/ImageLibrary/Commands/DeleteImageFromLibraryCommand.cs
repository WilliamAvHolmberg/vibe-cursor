using Microsoft.EntityFrameworkCore;
using Source.Infrastructure;
using Source.Shared.CQRS;
using Source.Shared.Results;

namespace Source.Features.ImageLibrary.Commands;

public record DeleteImageFromLibraryCommand(Guid Id) : ICommand<Result<DeleteImageFromLibraryResponse>>;

public record DeleteImageFromLibraryResponse(Guid Id, string Message);

public class DeleteImageFromLibraryCommandHandler : ICommandHandler<DeleteImageFromLibraryCommand, Result<DeleteImageFromLibraryResponse>>
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<DeleteImageFromLibraryCommandHandler> _logger;

    public DeleteImageFromLibraryCommandHandler(ApplicationDbContext context, ILogger<DeleteImageFromLibraryCommandHandler> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Result<DeleteImageFromLibraryResponse>> Handle(DeleteImageFromLibraryCommand request, CancellationToken cancellationToken)
    {
        var imageItem = await _context.ImageLibrary
            .FirstOrDefaultAsync(i => i.Id == request.Id, cancellationToken);

        if (imageItem == null)
        {
            return Result.Failure<DeleteImageFromLibraryResponse>("Image not found in library");
        }

        _context.ImageLibrary.Remove(imageItem);
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Image removed from library: {FileName} (ID: {Id}). File remains in storage.", 
            imageItem.FileName, imageItem.Id);

        var response = new DeleteImageFromLibraryResponse(
            request.Id,
            $"Image '{imageItem.FileName}' removed from library"
        );

        return Result.Success(response);
    }
}

