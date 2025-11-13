using Hangfire;
using Microsoft.EntityFrameworkCore;
using Source.Infrastructure;
using Source.Infrastructure.Extensions;
using Source.Features.Orchestration.Hubs;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });
// Check if running in swagger generation mode (skip DB-dependent services)
var isSwaggerGeneration = Environment.GetEnvironmentVariable("SWAGGER_GENERATION_MODE") == "true";

builder.Services.AddDatabaseServices(builder.Configuration);
builder.Services.AddIdentityServices();
builder.Services.AddMediatRServices();

if (!isSwaggerGeneration)
{
    builder.Services.AddHangfireServices(builder.Configuration);
}

builder.Services.AddAuthenticationServices(builder.Configuration);
builder.Services.AddOfflineFirstServices(builder.Configuration);
builder.Services.AddRealTimeServices();
builder.Services.AddRateLimitingServices();
builder.Services.AddTelemetryServices(builder.Configuration);
builder.Services.AddSwaggerServices();

var app = builder.Build();

// Auto-migrate database and seed development data
// Skip when generating swagger to avoid database dependency
if (!isSwaggerGeneration)
{
    await app.MigrateDatabase();
}

if (app.Environment.IsDevelopment() && !isSwaggerGeneration)
{
    await app.SeedDevelopmentData();
}

// Configure the HTTP request pipeline
app.UseSwaggerInDevelopment();

app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

if (!isSwaggerGeneration)
{
    app.UseHangfire(app.Environment);
}

// Map Controllers
app.MapControllers();

// Map SignalR Hubs
app.MapHub<OrchestrationHub>("/hubs/orchestration");

// Health check endpoint
app.MapGet("/", () => "Hello World! API is running 🚀");

app.Run();

// Make Program class accessible for testing
public partial class Program { }
