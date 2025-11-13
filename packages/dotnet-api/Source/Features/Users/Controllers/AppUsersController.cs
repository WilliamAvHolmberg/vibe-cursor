using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Source.Features.Users.Commands;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;

namespace Source.Features.Users.Controllers;

[ApiController]
[Route("api/app/users")]
[Authorize]
[EnableRateLimiting("GeneralPolicy")]
[Tags("Mobile Users")]
public class AppUsersController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ILogger<AppUsersController> _logger;

    public AppUsersController(IMediator mediator, ILogger<AppUsersController> logger)
    {
        _mediator = mediator;
        _logger = logger;
    }

    /// <summary>
    /// Complete student onboarding - set name, email and mark as onboarded
    /// </summary>
    [HttpPut("onboarding")]
    [ProducesResponseType<CompleteOnboardingResponse>(200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(401)]
    public async Task<ActionResult<CompleteOnboardingResponse>> CompleteOnboarding([FromBody] CompleteOnboardingRequest request)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(currentUserId))
            return Unauthorized("Invalid token");

        var command = new CompleteOnboardingCommand(currentUserId, request.FirstName, request.LastName, request.Email, request.DateOfBirth);
        var result = await _mediator.Send(command);

        if (!result.IsSuccess)
            return BadRequest(new { error = result.Error });

        _logger.LogInformation("Student onboarding completed for user: {UserId}", currentUserId);
        return Ok(result.Value);
    }
}

/// <summary>
/// Request model for completing student onboarding
/// </summary>
public record CompleteOnboardingRequest(
    [Required]
    [StringLength(100, MinimumLength = 1, ErrorMessage = "First name is required")]
    string FirstName,
    
    [Required]
    [StringLength(100, MinimumLength = 1, ErrorMessage = "Last name is required")]
    string LastName,
    
    [Required]
    [EmailAddress(ErrorMessage = "Please provide a valid email address")]
    string Email,
    
    DateOnly? DateOfBirth
);

/// <summary>
/// Response for completed onboarding
/// </summary>
public record CompleteOnboardingResponse(
    string Message,
    string UserId,
    bool IsOnboarded
);
