using Source.Infrastructure.Services.AI;
using Source.Infrastructure.Services.FileStorage;
using Source.Shared.CQRS;
using Source.Shared.Results;

namespace Source.Features.ImageReplacement.Commands;

public record ReplaceObjectInImageCommand(
    string BaseImageUrl,
    string ReplacementPrompt,
    string? ReferenceImageUrl,
    float Temperature,
    string UserId
) : ICommand<Result<ReplaceObjectInImageResponse>>;

public record ReplaceObjectInImageResponse(
    string GeneratedImageUrl,
    string FileName,
    long FileSizeBytes,
    string Prompt,
    float Temperature,
    DateTime GeneratedAt,
    decimal EstimatedCostUsd
);

public class ReplaceObjectInImageCommandHandler 
    : ICommandHandler<ReplaceObjectInImageCommand, Result<ReplaceObjectInImageResponse>>
{
    private readonly IGeminiImageService _geminiService;
    private readonly IFileStorageService _fileStorage;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<ReplaceObjectInImageCommandHandler> _logger;
    private const decimal CostPerImage = 0.039m;

    public ReplaceObjectInImageCommandHandler(
        IGeminiImageService geminiService,
        IFileStorageService fileStorage,
        IHttpClientFactory httpClientFactory,
        ILogger<ReplaceObjectInImageCommandHandler> logger)
    {
        _geminiService = geminiService;
        _fileStorage = fileStorage;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<Result<ReplaceObjectInImageResponse>> Handle(
        ReplaceObjectInImageCommand request, 
        CancellationToken cancellationToken)
    {
        try
        {
            _logger.LogInformation(
                "🔄 Starting image replacement for user {UserId}: {Prompt}", 
                request.UserId, 
                request.ReplacementPrompt);

            var httpClient = _httpClientFactory.CreateClient();

            // Download base image from URL
            Stream baseImageStream;
            try
            {
                _logger.LogInformation("📥 Downloading base image: {Url}", request.BaseImageUrl);
                var baseImageResponse = await httpClient.GetAsync(request.BaseImageUrl, cancellationToken);
                baseImageResponse.EnsureSuccessStatusCode();
                baseImageStream = await baseImageResponse.Content.ReadAsStreamAsync(cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to download base image: {Url}", request.BaseImageUrl);
                return Result.Failure<ReplaceObjectInImageResponse>(
                    "Failed to load base image. Please ensure the image URL is accessible.");
            }

            // Download reference image if provided
            Stream? referenceImageStream = null;
            if (!string.IsNullOrEmpty(request.ReferenceImageUrl))
            {
                try
                {
                    _logger.LogInformation("📥 Downloading reference image: {Url}", request.ReferenceImageUrl);
                    var referenceImageResponse = await httpClient.GetAsync(request.ReferenceImageUrl, cancellationToken);
                    referenceImageResponse.EnsureSuccessStatusCode();
                    referenceImageStream = await referenceImageResponse.Content.ReadAsStreamAsync(cancellationToken);
                    _logger.LogInformation("📎 Reference image loaded successfully");
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, 
                        "Failed to load reference image, continuing without it: {Url}", 
                        request.ReferenceImageUrl);
                }
            }

            // Generate edited image with Gemini
            GeminiImageResult result;
            try
            {
                result = await _geminiService.ReplaceObjectInImageAsync(
                    baseImageStream,
                    request.ReplacementPrompt,
                    referenceImageStream,
                    request.Temperature,
                    cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Gemini API failed to generate image");
                return Result.Failure<ReplaceObjectInImageResponse>(
                    "Failed to generate image. The AI service may be temporarily unavailable. Please try again.");
            }
            finally
            {
                await baseImageStream.DisposeAsync();
                if (referenceImageStream != null)
                    await referenceImageStream.DisposeAsync();
            }

            // Save generated image to storage
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
                return Result.Failure<ReplaceObjectInImageResponse>(
                    "Image was generated but failed to save. Please try again.");
            }
            finally
            {
                await result.ImageStream.DisposeAsync();
            }

            // Get public URL
            var publicUrl = await _fileStorage.GetFileUrlAsync(storedFilePath, cancellationToken);

            var response = new ReplaceObjectInImageResponse(
                publicUrl,
                fileName,
                result.EstimatedSizeBytes,
                request.ReplacementPrompt,
                request.Temperature,
                DateTime.UtcNow,
                CostPerImage
            );

            _logger.LogInformation(
                "✅ Image replacement completed successfully. Cost: ${Cost:F3}", 
                CostPerImage);

            return Result.Success(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error during image replacement");
            return Result.Failure<ReplaceObjectInImageResponse>(
                "An unexpected error occurred. Please try again later.");
        }
    }
}
