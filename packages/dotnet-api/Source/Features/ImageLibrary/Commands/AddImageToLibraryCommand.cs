using Source.Features.ImageLibrary.Models;
using Source.Infrastructure;
using Source.Shared.CQRS;
using Source.Shared.Results;

namespace Source.Features.ImageLibrary.Commands;

public record AddImageToLibraryCommand(
    string FileUrl,
    string FileName,
    long FileSize,
    string Description,
    string UserId
) : ICommand<Result<AddImageToLibraryResponse>>;

public record AddImageToLibraryResponse(
    Guid Id,
    string FileName,
    string Description,
    string FileUrl,
    long FileSize,
    DateTime CreatedAt
);

public class AddImageToLibraryCommandHandler : ICommandHandler<AddImageToLibraryCommand, Result<AddImageToLibraryResponse>>
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<AddImageToLibraryCommandHandler> _logger;

    public AddImageToLibraryCommandHandler(ApplicationDbContext context, ILogger<AddImageToLibraryCommandHandler> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Result<AddImageToLibraryResponse>> Handle(AddImageToLibraryCommand request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Description))
        {
            return Result.Failure<AddImageToLibraryResponse>("Description is required");
        }

        if (string.IsNullOrWhiteSpace(request.FileUrl))
        {
            return Result.Failure<AddImageToLibraryResponse>("File URL is required");
        }

        var imageItem = new ImageLibraryItem
        {
            Id = Guid.NewGuid(),
            FileName = request.FileName,
            Description = request.Description.Trim(),
            FileUrl = request.FileUrl,
            FileSize = request.FileSize,
            UploadedByUserId = request.UserId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.ImageLibrary.Add(imageItem);
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Image added to library: {FileName} (ID: {Id}) by user {UserId}", 
            imageItem.FileName, imageItem.Id, request.UserId);

        var response = new AddImageToLibraryResponse(
            imageItem.Id,
            imageItem.FileName,
            imageItem.Description,
            imageItem.FileUrl,
            imageItem.FileSize,
            imageItem.CreatedAt
        );

        return Result.Success(response);
    }
}

