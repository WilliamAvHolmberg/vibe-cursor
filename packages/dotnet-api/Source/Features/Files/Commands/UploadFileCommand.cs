using Source.Infrastructure.Services.FileStorage;
using Source.Shared.CQRS;
using Source.Shared.Results;

namespace Source.Features.Files.Commands;

public record UploadFileCommand(
    Stream FileStream,
    string FileName,
    string? Folder
) : ICommand<Result<UploadFileResponse>>;

public record UploadFileResponse(string FileUrl, string FileName, long FileSize);

public class UploadFileCommandHandler : ICommandHandler<UploadFileCommand, Result<UploadFileResponse>>
{
    private readonly IFileStorageService _fileStorageService;
    private readonly ILogger<UploadFileCommandHandler> _logger;

    public UploadFileCommandHandler(
        IFileStorageService fileStorageService,
        ILogger<UploadFileCommandHandler> logger)
    {
        _fileStorageService = fileStorageService;
        _logger = logger;
    }

    public async Task<Result<UploadFileResponse>> Handle(UploadFileCommand request, CancellationToken cancellationToken)
    {
        try
        {
            var fileSize = request.FileStream.Length;
            
            // Upload file to storage (R2 or Local)
            var filePath = await _fileStorageService.SaveFileAsync(
                request.FileStream, 
                request.FileName, 
                request.Folder ?? "uploads", 
                cancellationToken);

            // Get public URL
            var fileUrl = await _fileStorageService.GetFileUrlAsync(filePath, cancellationToken);

            _logger.LogInformation("File uploaded successfully: {FileName} -> {FileUrl}", request.FileName, fileUrl);

            var response = new UploadFileResponse(fileUrl, request.FileName, fileSize);
            return Result.Success(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to upload file: {FileName}", request.FileName);
            return Result.Failure<UploadFileResponse>($"File upload failed: {ex.Message}");
        }
    }
}

