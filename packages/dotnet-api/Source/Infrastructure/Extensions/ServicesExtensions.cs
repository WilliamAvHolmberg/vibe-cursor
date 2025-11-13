using Source.Infrastructure.Services.Email;
using Source.Infrastructure.Services.FileStorage;
using Source.Infrastructure.Services.Sms;
using Source.Infrastructure.Services.OpenRouter;
using Source.Infrastructure.Services.AI;
using Source.Infrastructure.Services.CursorApi;
using Source.Features.Orchestration.Services;
using Resend;

namespace Source.Infrastructure.Extensions;

public static class ServicesExtensions
{
    public static IServiceCollection AddOfflineFirstServices(this IServiceCollection services, IConfiguration configuration)
    {
        // Email Service - Configurable provider
        var emailProvider = configuration["Email:Provider"] ?? "Console";
        
        switch (emailProvider.ToUpperInvariant())
        {
            case "RESEND":
                // Configure Resend client
                services.AddOptions();
                services.AddHttpClient<ResendClient>();
                services.Configure<ResendClientOptions>(o =>
                {
                    o.ApiToken = configuration["Email:Resend:ApiToken"] 
                        ?? throw new InvalidOperationException("Email:Resend:ApiToken configuration is required when using Resend provider");
                });
                services.AddTransient<IResend, ResendClient>();
                services.AddScoped<IEmailService, ResendEmailService>();
                break;
            case "CONSOLE":
            default:
                services.AddScoped<IEmailService, ConsoleEmailService>();
                break;
        }

        // File Storage Service - Configurable provider
        var fileStorageProvider = configuration["FileStorage:Provider"] ?? "Local";
        Console.WriteLine($"File Storage Provider: {fileStorageProvider}");
        Console.WriteLine($"Connection string from env: {configuration["ConnectionStrings:DefaultConnection"]}");

        switch (fileStorageProvider.ToUpperInvariant())
        {
            case "R2":
                services.AddScoped<IFileStorageService, CloudflareR2StorageService>();
                break;
            case "LOCAL":
            default:
                services.AddScoped<IFileStorageService, LocalFileStorageService>();
                break;
        }

        // SMS Service - Configurable provider
        var smsProvider = configuration["Sms:Provider"] ?? "Console";
        switch (smsProvider.ToUpperInvariant())
        {
            case "ELKS":
                services.AddHttpClient<ElksSmsService>();
                services.AddScoped<ISmsService, ElksSmsService>();
                break;
            case "CONSOLE":
            default:
                services.AddScoped<ISmsService, ConsoleSmsService>();
                break;
        }

        // OpenRouter Service (AI) - Singleton for client reuse
        services.AddSingleton<OpenRouterService>();

        // Gemini Image Service (AI) - For image generation and editing
        services.AddHttpClient("GeminiClient");
        services.AddScoped<IGeminiImageService, GeminiImageService>();

        // Cursor API Client - Scoped per request to use user's API key
        services.AddHttpClient<CursorApiClient>();

        // Orchestration Service - Scoped for managing orchestrations
        services.AddScoped<OrchestrationService>();
        services.AddScoped<OrchestrationBackgroundJobs>();

        return services;
    }

    /// <summary>
    /// Add real-time services (SignalR + PostgreSQL Listen/Notify)
    /// </summary>
    public static IServiceCollection AddRealTimeServices(this IServiceCollection services)
    {
        // SignalR
        services.AddSignalR();
        
        // // PostgreSQL Listen/Notify background service
        // services.AddHostedService<PostgreSqlNotificationService>();
        
        return services;
    }
} 