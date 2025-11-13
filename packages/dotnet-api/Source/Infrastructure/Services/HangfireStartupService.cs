using Hangfire;

namespace Source.Infrastructure.Services;

public class HangfireStartupService : IHostedService
{
    private readonly IRecurringJobManager _recurringJobManager;
    private readonly IConfiguration _configuration;

    public HangfireStartupService(IRecurringJobManager recurringJobManager, IConfiguration configuration)
    {
        _recurringJobManager = recurringJobManager;
        _configuration = configuration;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        var enableHangfire = _configuration.GetValue<bool>("Features:EnableHangfire", true);
        
        if (!enableHangfire)
        {
            return Task.CompletedTask;
        }

        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
    }
}

