using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Source.Features.Users.Models;
using Source.Infrastructure.Services.Sms;
using Source.Shared.CQRS;
using Source.Shared.Results;
using System.Security.Cryptography;

namespace Source.Features.Authentication.Commands;

/// <summary>
/// Command to send OTP code to user's phone number
/// </summary>
public record SendSmsOtpCommand(string PhoneNumber) : ICommand<Result<SendSmsOtpResponse>>;

/// <summary>
/// Response for SMS OTP send request
/// </summary>
public record SendSmsOtpResponse(string Message, DateTime ExpiresAt);

/// <summary>
/// Handler for sending SMS OTP codes
/// </summary>
public class SendSmsOtpHandler : ICommandHandler<SendSmsOtpCommand, Result<SendSmsOtpResponse>>
{
    private const string TempEmailDomain = "@app.com";
    private const string AppReviewPhoneNumber = "+4613371337";
    private const string AppReviewStaticOtp = "123456";
    private readonly UserManager<User> _userManager;
    private readonly ISmsService _smsService;
    private readonly ILogger<SendSmsOtpHandler> _logger;

    public SendSmsOtpHandler(
        UserManager<User> userManager,
        ISmsService smsService,
        ILogger<SendSmsOtpHandler> logger)
    {
        _userManager = userManager;
        _smsService = smsService;
        _logger = logger;
    }

    public async Task<Result<SendSmsOtpResponse>> Handle(SendSmsOtpCommand request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("📱 Sending SMS OTP to phone: {PhoneNumber}", request.PhoneNumber);

        // Validate phone number format (basic E.164 check)
        if (!IsValidPhoneNumber(request.PhoneNumber))
        {
            _logger.LogWarning("⚠️ Invalid phone number format: {PhoneNumber}", request.PhoneNumber);
            return Result.Failure<SendSmsOtpResponse>("Invalid phone number format. Please use international format (e.g., +46701234567)");
        }

        // App Store review user: Skip SMS, use static OTP for app approval process
        if (request.PhoneNumber == AppReviewPhoneNumber)
        {
            _logger.LogInformation("📱 App Store review user detected - using static OTP instead of SMS");
        }

        // Find or create user by phone number
        var user = await _userManager.Users.FirstOrDefaultAsync(u => u.PhoneNumber == request.PhoneNumber, cancellationToken);
        if (user == null)
        {
            // Create new user for phone-only auth
            user = new User
            {
                UserName = request.PhoneNumber, // Use phone as username
                Email = $"temp_{Guid.NewGuid()}{TempEmailDomain}", // Temporary email, will be updated during onboarding
                PhoneNumber = request.PhoneNumber,
                PhoneNumberConfirmed = false, // Will be confirmed after OTP verification
                EmailConfirmed = false
            };

            var result = await _userManager.CreateAsync(user);
            if (!result.Succeeded)
            {
                var errors = string.Join(", ", result.Errors.Select(e => e.Description));
                _logger.LogWarning("Failed to create user {PhoneNumber}: {Errors}", request.PhoneNumber, errors);
                return Result.Failure<SendSmsOtpResponse>($"Failed to create user: {errors}");
            }

            _logger.LogInformation("✅ Created new user for phone: {PhoneNumber}", request.PhoneNumber);
        }

        // Check rate limiting
        if (!user.CanRequestOtp())
        {
            _logger.LogWarning("⚠️ SMS OTP rate limit exceeded for user: {PhoneNumber}", request.PhoneNumber);
            return Result.Failure<SendSmsOtpResponse>("Please wait before requesting another SMS code");
        }

        // Generate OTP (static for app review user, random for others)
        var otpCode = request.PhoneNumber == AppReviewPhoneNumber ? AppReviewStaticOtp : GenerateOtpCode();
        var expiresAt = DateTime.UtcNow.AddMinutes(10); // 10-minute expiry

        // Update user with OTP
        user.OtpCode = otpCode;
        user.OtpExpiresAt = expiresAt;
        user.OtpAttempts = 0;
        user.LastOtpSentAt = DateTime.UtcNow;

        var updateResult = await _userManager.UpdateAsync(user);
        if (!updateResult.Succeeded)
        {
            _logger.LogError("Failed to update user with SMS OTP: {PhoneNumber}", request.PhoneNumber);
            return Result.Failure<SendSmsOtpResponse>("Failed to generate SMS OTP");
        }

        // Send SMS (skip for app review user - they use static OTP)
        if (request.PhoneNumber != AppReviewPhoneNumber)
        {
            try
            {
                var smsMessage = $"Your app login code is: {otpCode}\n\nThis code will expire in 10 minutes.";
                await _smsService.SendSmsAsync(new SmsMessage(request.PhoneNumber, smsMessage, "app"), cancellationToken);
                _logger.LogInformation("📱 SMS OTP sent successfully to: {PhoneNumber}", request.PhoneNumber);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Failed to send SMS OTP to: {PhoneNumber}", request.PhoneNumber);
                
                // Clear OTP on SMS failure
                user.ClearOtp();
                await _userManager.UpdateAsync(user);
                
                return Result.Failure<SendSmsOtpResponse>("Failed to send SMS code");
            }
        }

        // Always return success with normal message (even for app review user)
        var response = new SendSmsOtpResponse("SMS code sent to your phone", expiresAt);
        return Result.Success(response);
    }

    private static string GenerateOtpCode()
    {
        // Generate 6-digit secure random OTP
        using var rng = RandomNumberGenerator.Create();
        var bytes = new byte[4];
        rng.GetBytes(bytes);
        var randomNumber = Math.Abs(BitConverter.ToInt32(bytes, 0));
        return (randomNumber % 1000000).ToString("D6");
    }

    private static bool IsValidPhoneNumber(string phoneNumber)
    {
        // Basic E.164 format validation: starts with '+', followed by 8-15 digits
        if (string.IsNullOrWhiteSpace(phoneNumber))
            return false;

        return System.Text.RegularExpressions.Regex.IsMatch(phoneNumber, @"^\+[1-9]\d{7,14}$");
    }
}
