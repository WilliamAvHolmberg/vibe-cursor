using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Source.Features.Authentication.Commands;
using System.ComponentModel.DataAnnotations;

namespace Source.Features.Authentication.Controllers;

[ApiController]
[Route("api/app/auth")]
[Tags("Mobile Authentication")]
public class AppAuthController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ILogger<AppAuthController> _logger;
    private readonly IWebHostEnvironment _environment;

    public AppAuthController(IMediator mediator, ILogger<AppAuthController> logger, IWebHostEnvironment environment)
    {
        _mediator = mediator;
        _logger = logger;
        _environment = environment;
    }

    private CookieOptions CreateAuthCookieOptions(DateTime? expires = null) => new()
    {
        HttpOnly = true,
        Secure = !_environment.IsDevelopment(),
        SameSite = SameSiteMode.Lax,
        Expires = expires,
        Path = "/"
    };

    /// <summary>
    /// Send OTP code to phone number (mobile app)
    /// </summary>
    [HttpPost("send-otp-sms")]
    [EnableRateLimiting("EmailPolicy")]  // 🚨 Rate limited: 3 per minute
    [ProducesResponseType<SendSmsOtpResponse>(200)]
    [ProducesResponseType(400)]
    public async Task<ActionResult<SendSmsOtpResponse>> SendOtpSms([FromBody] SendOtpSmsRequest request)
    {
        var command = new SendSmsOtpCommand(request.PhoneNumber);
        var result = await _mediator.Send(command);

        if (result.IsSuccess)
        {
            _logger.LogInformation("SMS OTP sent successfully to: {PhoneNumber}", request.PhoneNumber);
            return Ok(result.Value);
        }

        _logger.LogWarning("Failed to send SMS OTP to {PhoneNumber}: {Error}", request.PhoneNumber, result.Error);
        return BadRequest(new { error = result.Error });
    }

    /// <summary>
    /// Verify SMS OTP code and set authentication cookie (mobile app)
    /// </summary>
    [HttpPost("verify-otp-sms")]
    [EnableRateLimiting("AuthPolicy")]  // 🚨 Rate limited: 5 per minute
    [ProducesResponseType<VerifyOtpSmsResponse>(200)]
    [ProducesResponseType(400)]
    public async Task<ActionResult<VerifyOtpSmsResponse>> VerifyOtpSms([FromBody] VerifyOtpSmsRequest request)
    {
        var command = new VerifyPhoneOtpCommand(request.PhoneNumber, request.OtpCode);
        var result = await _mediator.Send(command);

        if (result.IsSuccess)
        {
            // Set HTTP-only authentication cookie (same as web!)
            Response.Cookies.Append("auth-token", result.Value.Token, CreateAuthCookieOptions(result.Value.ExpiresAt));

            _logger.LogInformation("SMS OTP verified and auth cookie set for: {PhoneNumber}", request.PhoneNumber);

            // Return success with user info (no token exposure)
            var response = new VerifyOtpSmsResponse(
                "Authentication successful", 
                result.Value.PhoneNumber,
                result.Value.User
            );
            return Ok(response);
        }

        _logger.LogWarning("SMS OTP verification failed for {PhoneNumber}: {Error}", request.PhoneNumber, result.Error);
        return BadRequest(new { error = result.Error });
    }

    /// <summary>
    /// Logout user by clearing authentication cookie (mobile app)
    /// </summary>
    [HttpPost("logout")]
    [ProducesResponseType(200)]
    public ActionResult<object> Logout()
    {
        // Clear the authentication cookie
        Response.Cookies.Delete("auth-token", CreateAuthCookieOptions());

        _logger.LogInformation("Mobile user logged out - auth cookie cleared");
        return Ok(new { message = "Logged out successfully" });
    }
}

/// <summary>
/// Request model for sending SMS OTP
/// </summary>
public record SendOtpSmsRequest(
    [Required] 
    [Phone(ErrorMessage = "Please provide a valid phone number in international format (e.g., +46701234567)")]
    string PhoneNumber
);

/// <summary>
/// Request model for verifying SMS OTP
/// </summary>
public record VerifyOtpSmsRequest(
    [Required] 
    [Phone(ErrorMessage = "Please provide a valid phone number in international format")]
    string PhoneNumber,
    [Required] 
    [StringLength(6, MinimumLength = 6, ErrorMessage = "OTP must be exactly 6 digits")] 
    string OtpCode
);

/// <summary>
/// Response for SMS OTP verification with cookie
/// </summary>
public record VerifyOtpSmsResponse(
    string Message, 
    string PhoneNumber, 
    UserInfo User
);
