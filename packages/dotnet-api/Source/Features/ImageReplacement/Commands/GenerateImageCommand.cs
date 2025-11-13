using Source.Infrastructure.Services.AI;
using Source.Infrastructure.Services.FileStorage;
using Source.Shared.CQRS;
using Source.Shared.Results;

namespace Source.Features.ImageReplacement.Commands;

public record GenerateImageCommand(
    string Prompt,
    float Temperature,
    string UserId
) : ICommand<Result<GenerateImageResponse>>;

public record GenerateImageResponse(
    string GeneratedImageUrl,
    string FileName,
    long FileSizeBytes,
    string Prompt,
    float Temperature,
    DateTime GeneratedAt,
    decimal EstimatedCostUsd
);

public class GenerateImageCommandHandler 
    : ICommandHandler<GenerateImageCommand, Result<GenerateImageResponse>>
{
    private readonly IGeminiImageService _geminiService;
    private readonly IFileStorageService _fileStorage;
    private readonly ILogger<GenerateImageCommandHandler> _logger;
    private const decimal CostPerImage = 0.039m;

    public GenerateImageCommandHandler(
        IGeminiImageService geminiService,
        IFileStorageService fileStorage,
        ILogger<GenerateImageCommandHandler> logger)
    {
        _geminiService = geminiService;
        _fileStorage = fileStorage;
        _logger = logger;
    }

    public async Task<Result<GenerateImageResponse>> Handle(
        GenerateImageCommand request, 
        CancellationToken cancellationToken)
    {
        try
        {
            _logger.LogInformation(
                "🎨 Generating new image for user {UserId}: {Prompt}", 
                request.UserId, 
                request.Prompt);

            // Generate image with Gemini
            GeminiImageResult result;
            try
            {
                result = await _geminiService.GenerateImageAsync(
                    request.Prompt,
                    request.Temperature,
                    cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Gemini API failed to generate image");
                return Result.Failure<GenerateImageResponse>(
                    "Failed to generate image. The AI service may be temporarily unavailable.");
            }

            // Save generated image
            var fileName = $"ai-generated-{DateTime.UtcNow:yyyyMMdd-HHmmss}.png";
            string storedFilePath;
            
            try
            {
                storedFilePath = await _fileStorage.SaveFileAsync(
                    result.ImageStream,
                    fileName,
                    "ai-generated",
                    cancellationToken);
                    
                _logger.LogInformation("💾 Generated image saved: {Path}", storedFilePath);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to save generated image");
                return Result.Failure<GenerateImageResponse>(
                    "Image was generated but failed to save.");
            }
            finally
            {
                await result.ImageStream.DisposeAsync();
            }

            var publicUrl = await _fileStorage.GetFileUrlAsync(storedFilePath, cancellationToken);

            var response = new GenerateImageResponse(
                publicUrl,
                fileName,
                result.EstimatedSizeBytes,
                request.Prompt,
                request.Temperature,
                DateTime.UtcNow,
                CostPerImage
            );

            _logger.LogInformation(
                "✅ Image generation completed. Cost: ${Cost:F3}", 
                CostPerImage);

            return Result.Success(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error during image generation");
            return Result.Failure<GenerateImageResponse>(
                "An unexpected error occurred. Please try again later.");
        }
    }
}
