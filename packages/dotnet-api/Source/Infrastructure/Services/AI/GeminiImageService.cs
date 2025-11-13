using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Source.Infrastructure.Services.AI;

/// <summary>
/// Google Gemini 2.5 Flash Image API service for AI-powered image generation and editing
/// Implements semantic inpainting for object replacement
/// </summary>
public class GeminiImageService : IGeminiImageService
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;
    private readonly ILogger<GeminiImageService> _logger;
    private const string ApiBaseUrl = "https://generativelanguage.googleapis.com/v1beta";
    private const string ModelName = "gemini-2.5-flash-image-preview";

    public GeminiImageService(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<GeminiImageService> logger)
    {
        _httpClient = httpClientFactory.CreateClient("GeminiClient");
        _apiKey = configuration["AI:Gemini:ApiKey"] 
            ?? throw new InvalidOperationException("AI:Gemini:ApiKey configuration is required");
        _logger = logger;

        _logger.LogInformation("🍌 Gemini Flash Image service initialized (Nano Banano)");
    }

    public async Task<GeminiImageResult> ReplaceObjectInImageAsync(
        Stream baseImageStream,
        string prompt,
        Stream? referenceImageStream = null,
        float temperature = 0.4f,
        CancellationToken cancellationToken = default)
    {
        if (baseImageStream == null)
            throw new ArgumentNullException(nameof(baseImageStream));
        
        if (string.IsNullOrWhiteSpace(prompt))
            throw new ArgumentException("Prompt cannot be empty", nameof(prompt));

        _logger.LogInformation("🎨 Starting object replacement with prompt: {Prompt}", prompt);

        var parts = new List<ContentPart>();

        // Add base image
        var baseImageBase64 = await ConvertStreamToBase64(baseImageStream);
        parts.Add(new ContentPart
        {
            InlineData = new InlineData
            {
                MimeType = "image/png",
                Data = baseImageBase64
            }
        });

        // Add reference image if provided
        if (referenceImageStream != null)
        {
            var refImageBase64 = await ConvertStreamToBase64(referenceImageStream);
            parts.Add(new ContentPart
            {
                InlineData = new InlineData
                {
                    MimeType = "image/png",
                    Data = refImageBase64
                }
            });
            _logger.LogInformation("📸 Reference image included for style guidance");
        }

        // Add semantic inpainting prompt
        var enhancedPrompt = $"Using the provided image, {prompt}. " +
            "Keep everything else in the image exactly the same, preserving the original style, lighting, composition, and perspective. " +
            "The replacement should look natural and seamlessly integrated.";

        parts.Add(new ContentPart { Text = enhancedPrompt });

        var request = new GeminiGenerateRequest
        {
            Contents = new List<Content>
            {
                new Content
                {
                    Parts = parts
                }
            },
            GenerationConfig = new GenerationConfig
            {
                Temperature = temperature,
                ResponseModalities = new[] { "Image" }
            }
        };

        return await CallGeminiApiAsync(request, cancellationToken);
    }

    public async Task<GeminiImageResult> GenerateImageAsync(
        string prompt,
        float temperature = 0.7f,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(prompt))
            throw new ArgumentException("Prompt cannot be empty", nameof(prompt));

        _logger.LogInformation("✨ Generating new image from prompt: {Prompt}", prompt);

        var request = new GeminiGenerateRequest
        {
            Contents = new List<Content>
            {
                new Content
                {
                    Parts = new List<ContentPart>
                    {
                        new ContentPart { Text = prompt }
                    }
                }
            },
            GenerationConfig = new GenerationConfig
            {
                Temperature = temperature,
                ResponseModalities = new[] { "Image" }
            }
        };

        return await CallGeminiApiAsync(request, cancellationToken);
    }

    private async Task<GeminiImageResult> CallGeminiApiAsync(
        GeminiGenerateRequest request,
        CancellationToken cancellationToken)
    {
        var url = $"{ApiBaseUrl}/models/{ModelName}:generateContent?key={_apiKey}";

        var jsonContent = JsonSerializer.Serialize(request, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
        });

        var httpContent = new StringContent(jsonContent, Encoding.UTF8, "application/json");

        try
        {
            _logger.LogInformation("📡 Calling Gemini API...");
            var response = await _httpClient.PostAsync(url, httpContent, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogError("❌ Gemini API error: {StatusCode} - {Error}", 
                    response.StatusCode, errorContent);
                throw new HttpRequestException(
                    $"Gemini API request failed: {response.StatusCode} - {errorContent}");
            }

            var responseJson = await response.Content.ReadAsStringAsync(cancellationToken);
            var geminiResponse = JsonSerializer.Deserialize<GeminiGenerateResponse>(responseJson, 
                new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                });

            if (geminiResponse?.Candidates == null || geminiResponse.Candidates.Count == 0)
            {
                _logger.LogError("❌ No candidates returned from Gemini API");
                throw new InvalidOperationException("No image generated by Gemini API");
            }

            var candidate = geminiResponse.Candidates[0];
            var imagePart = candidate.Content?.Parts?.FirstOrDefault(p => p.InlineData != null);

            if (imagePart?.InlineData?.Data == null)
            {
                _logger.LogError("❌ No image data in Gemini response");
                throw new InvalidOperationException("No image data returned from Gemini API");
            }

            var imageBytes = Convert.FromBase64String(imagePart.InlineData.Data);
            var imageStream = new MemoryStream(imageBytes);

            _logger.LogInformation("✅ Image generated successfully: {Size} KB", 
                imageBytes.Length / 1024);

            return new GeminiImageResult(
                imageStream,
                imagePart.InlineData.MimeType ?? "image/png",
                imageBytes.Length
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Failed to generate image with Gemini API");
            throw;
        }
    }

    private static async Task<string> ConvertStreamToBase64(Stream stream)
    {
        if (stream.CanSeek)
            stream.Position = 0;

        using var memoryStream = new MemoryStream();
        await stream.CopyToAsync(memoryStream);
        var bytes = memoryStream.ToArray();
        return Convert.ToBase64String(bytes);
    }

    // DTOs for Gemini API
    private class GeminiGenerateRequest
    {
        public List<Content> Contents { get; set; } = new();
        public GenerationConfig? GenerationConfig { get; set; }
    }

    private class Content
    {
        public List<ContentPart> Parts { get; set; } = new();
    }

    private class ContentPart
    {
        public string? Text { get; set; }
        public InlineData? InlineData { get; set; }
    }

    private class InlineData
    {
        public string MimeType { get; set; } = string.Empty;
        public string Data { get; set; } = string.Empty;
    }

    private class GenerationConfig
    {
        public float Temperature { get; set; }
        public string[] ResponseModalities { get; set; } = Array.Empty<string>();
    }

    private class GeminiGenerateResponse
    {
        public List<Candidate> Candidates { get; set; } = new();
    }

    private class Candidate
    {
        public Content? Content { get; set; }
    }
}
