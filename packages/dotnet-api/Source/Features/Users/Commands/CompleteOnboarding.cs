using MediatR;
using Microsoft.AspNetCore.Identity;
using Source.Features.Users.Events;
using Source.Features.Users.Models;
using Source.Shared.CQRS;
using Source.Shared.Results;

namespace Source.Features.Users.Commands;

/// <summary>
/// Command to complete student onboarding
/// </summary>
public record CompleteOnboardingCommand(
    string UserId, 
    string FirstName, 
    string LastName, 
    string Email,
    DateOnly? DateOfBirth
) : ICommand<Result<CompleteOnboardingResponse>>;

/// <summary>
/// Response for completed onboarding
/// </summary>
public record CompleteOnboardingResponse(
    string Message,
    string UserId,
    bool IsOnboarded
);

/// <summary>
/// Handler for completing student onboarding
/// </summary>
public class CompleteOnboardingHandler : ICommandHandler<CompleteOnboardingCommand, Result<CompleteOnboardingResponse>>
{
    private readonly UserManager<User> _userManager;
    private readonly IMediator _mediator;
    private readonly ILogger<CompleteOnboardingHandler> _logger;

    public CompleteOnboardingHandler(
        UserManager<User> userManager,
        IMediator mediator,
        ILogger<CompleteOnboardingHandler> logger)
    {
        _userManager = userManager;
        _mediator = mediator;
        _logger = logger;
    }

    public async Task<Result<CompleteOnboardingResponse>> Handle(CompleteOnboardingCommand request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("📚 Completing onboarding for user: {UserId}", request.UserId);

        var user = await _userManager.FindByIdAsync(request.UserId);
        if (user == null)
        {
            _logger.LogWarning("⚠️ User not found: {UserId}", request.UserId);
            return Result.Failure<CompleteOnboardingResponse>("User not found");
        }

        // Check if user is already onboarded
        if (user.IsOnboarded)
        {
            _logger.LogWarning("⚠️ User already onboarded: {UserId}", request.UserId);
            return Result.Failure<CompleteOnboardingResponse>("User is already onboarded");
        }

        // Check if email is already in use by another user
        var existingUserWithEmail = await _userManager.FindByEmailAsync(request.Email);
        if (existingUserWithEmail != null && existingUserWithEmail.Id != user.Id)
        {
            _logger.LogWarning("⚠️ Email already in use: {Email}", request.Email);
            return Result.Failure<CompleteOnboardingResponse>("Email address is already in use");
        }

        // Update user information
        user.FirstName = request.FirstName.Trim();
        user.LastName = request.LastName.Trim();
        user.Email = request.Email.Trim().ToLowerInvariant();
        user.EmailConfirmed = false; // Will need to verify email later if needed
        user.DateOfBirth = request.DateOfBirth;
        user.IsOnboarded = true;
        user.UpdatedAt = DateTime.UtcNow;

        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            _logger.LogError("❌ Failed to update user during onboarding: {UserId}, Errors: {Errors}", 
                request.UserId, errors);
            return Result.Failure<CompleteOnboardingResponse>($"Failed to complete onboarding: {errors}");
        }

        _logger.LogInformation("✅ Onboarding completed successfully for user: {UserId}", request.UserId);

        var userCreatedEvent = new UserCreated(user.Id, user.Email, DateTime.UtcNow);
        await _mediator.Publish(userCreatedEvent, cancellationToken);
        _logger.LogInformation("📧 UserCreated event published - welcome email will be sent to {Email}", user.Email);

        var response = new CompleteOnboardingResponse(
            "Onboarding completed successfully",
            user.Id,
            user.IsOnboarded
        );

        return Result.Success(response);
    }
}
