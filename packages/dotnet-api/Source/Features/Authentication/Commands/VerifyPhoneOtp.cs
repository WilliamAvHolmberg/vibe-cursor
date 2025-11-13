using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Source.Features.Authentication.Services;
using Source.Features.Users.Models;
using Source.Shared.CQRS;
using Source.Shared.Results;

namespace Source.Features.Authentication.Commands;

/// <summary>
/// Command to verify phone OTP code and generate JWT token
/// </summary>
public record VerifyPhoneOtpCommand(string PhoneNumber, string OtpCode) : ICommand<Result<VerifyPhoneOtpResponse>>;

/// <summary>
/// Response for phone OTP verification
/// </summary>
public record VerifyPhoneOtpResponse(string Token, string PhoneNumber, DateTime ExpiresAt, UserInfo User);

/// <summary>
/// User information for mobile app
/// </summary>
public record UserInfo(string Id, string? Email, string? FirstName, string? LastName, bool IsOnboarded);

/// <summary>
/// Handler for phone OTP verification
/// </summary>
public class VerifyPhoneOtpHandler : ICommandHandler<VerifyPhoneOtpCommand, Result<VerifyPhoneOtpResponse>>
{
    private readonly UserManager<User> _userManager;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly ILogger<VerifyPhoneOtpHandler> _logger;

    public VerifyPhoneOtpHandler(
        UserManager<User> userManager,
        IJwtTokenService jwtTokenService,
        ILogger<VerifyPhoneOtpHandler> logger)
    {
        _userManager = userManager;
        _jwtTokenService = jwtTokenService;
        _logger = logger;
    }

    public async Task<Result<VerifyPhoneOtpResponse>> Handle(VerifyPhoneOtpCommand request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("📱 Verifying SMS OTP for phone: {PhoneNumber}", request.PhoneNumber);

        var user = await _userManager.Users.FirstOrDefaultAsync(u => u.PhoneNumber == request.PhoneNumber, cancellationToken);
        if (user == null)
        {
            _logger.LogWarning("⚠️ SMS OTP verification failed: User not found for phone {PhoneNumber}", request.PhoneNumber);
            return Result.Failure<VerifyPhoneOtpResponse>("Invalid phone number or OTP code");
        }

        // Check attempt limit (max 5 attempts)
        if (user.OtpAttempts >= 5)
        {
            _logger.LogWarning("⚠️ SMS OTP verification failed: Too many attempts for phone {PhoneNumber}", request.PhoneNumber);
            user.ClearOtp();
            await _userManager.UpdateAsync(user);
            return Result.Failure<VerifyPhoneOtpResponse>("Too many attempts. Please request a new SMS code");
        }

        // Verify OTP
        if (!user.IsOtpValid(request.OtpCode))
        {
            user.OtpAttempts++;
            await _userManager.UpdateAsync(user);
            
            _logger.LogWarning("⚠️ SMS OTP verification failed: Invalid code for phone {PhoneNumber} (Attempt {Attempts})", 
                request.PhoneNumber, user.OtpAttempts);
            
            if (user.OtpAttempts >= 5)
            {
                user.ClearOtp();
                await _userManager.UpdateAsync(user);
                return Result.Failure<VerifyPhoneOtpResponse>("Too many invalid attempts. Please request a new SMS code");
            }
            
            return Result.Failure<VerifyPhoneOtpResponse>("Invalid OTP code");
        }

        // Clear OTP after successful verification
        user.ClearOtp();
        user.PhoneNumberConfirmed = true; // Confirm phone on successful OTP
        var updateResult = await _userManager.UpdateAsync(user);
        
        if (!updateResult.Succeeded)
        {
            _logger.LogError("Failed to update user after SMS OTP verification: {PhoneNumber}", request.PhoneNumber);
            return Result.Failure<VerifyPhoneOtpResponse>("Authentication failed");
        }

        // Generate JWT token using centralized service
        var (token, expiresAt) = await _jwtTokenService.GenerateTokenWithExpiryAsync(user, "sms-otp");

        _logger.LogInformation("✅ SMS OTP verified successfully for user: {PhoneNumber}", request.PhoneNumber);

        var userInfo = new UserInfo(user.Id, user.Email, user.FirstName, user.LastName, user.IsOnboarded);
        var response = new VerifyPhoneOtpResponse(token, user.PhoneNumber!, expiresAt, userInfo);
        return Result.Success(response);
    }
}
