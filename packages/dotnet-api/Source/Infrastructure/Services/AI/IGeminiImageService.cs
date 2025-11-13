namespace Source.Infrastructure.Services.AI;

/// <summary>
/// Service for AI-powered image generation and editing using Google Gemini Flash Image
/// </summary>
public interface IGeminiImageService
{
    /// <summary>
    /// Replace an object in an image using AI semantic inpainting
    /// </summary>
    /// <param name="baseImageStream">The base image to edit</param>
    /// <param name="prompt">Instructions for what to replace (e.g., "Replace the salad with a hotdog")</param>
    /// <param name="referenceImageStream">Optional reference image for style guidance</param>
    /// <param name="temperature">Creativity level (0.0-1.0, default 0.4 for consistency)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Generated image as stream</returns>
    Task<GeminiImageResult> ReplaceObjectInImageAsync(
        Stream baseImageStream,
        string prompt,
        Stream? referenceImageStream = null,
        float temperature = 0.4f,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Generate a new image from text prompt
    /// </summary>
    Task<GeminiImageResult> GenerateImageAsync(
        string prompt,
        float temperature = 0.7f,
        CancellationToken cancellationToken = default);
}

/// <summary>
/// Result from Gemini image generation
/// </summary>
public record GeminiImageResult(
    Stream ImageStream,
    string MimeType,
    long EstimatedSizeBytes
);
