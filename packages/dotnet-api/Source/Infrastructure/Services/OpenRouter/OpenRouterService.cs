using OpenRouter.NET;

namespace Source.Infrastructure.Services.OpenRouter;

public class OpenRouterService
{
    private readonly ILogger<OpenRouterService> _logger;
    private readonly OpenRouterClient _client;

    public OpenRouterService(
        IConfiguration configuration,
        ILogger<OpenRouterService> logger)
    {
        _logger = logger;

        var apiKey = configuration["OpenRouter:ApiKey"] 
            ?? Environment.GetEnvironmentVariable("OpenRouter__ApiKey")
            ?? throw new InvalidOperationException("OpenRouter API key is required (OpenRouter:ApiKey or OpenRouter__ApiKey)");

        _client = new OpenRouterClient(apiKey);
        
        _logger.LogInformation("OpenRouterService initialized with configured API key");
    }

    public OpenRouterClient Client => _client;
}

