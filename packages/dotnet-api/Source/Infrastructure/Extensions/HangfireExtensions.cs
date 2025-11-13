using Hangfire;
using Hangfire.PostgreSql;
using Source.Infrastructure.Services;
using Source.Infrastructure.Security;

namespace Source.Infrastructure.Extensions;

public static class HangfireExtensions
{
    public static IServiceCollection AddHangfireServices(this IServiceCollection services, IConfiguration configuration)
    {
        var enableHangfire = configuration.GetValue<bool>("Features:EnableHangfire", true);
        
        if (!enableHangfire)
        {
            return services;
        }

        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

        services.AddHangfire(config =>
        {
            config.UsePostgreSqlStorage(options =>
            {
                options.UseNpgsqlConnection(connectionString);
            });
        });

        services.AddHangfireServer(options =>
        {
            options.WorkerCount = Math.Min(Environment.ProcessorCount * 2, 8);
            options.Queues = new[] { "default", "critical", "background" };
        });

        services.AddHostedService<HangfireStartupService>();

        return services;
    }

    public static IApplicationBuilder UseHangfire(this IApplicationBuilder app, IWebHostEnvironment environment)
    {
        app.UseHangfireDashboard("/api/hangfire", new DashboardOptions
        {
            Authorization = new[] { new HangfireAuthorizationFilter() }
        });

        return app;
    }
} 