using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Source.Features.ImageReplacement.Commands;
using Source.Infrastructure.AuthorizationModels;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;

namespace Source.Features.ImageReplacement.Controllers;

[ApiController]
[Route("api/admin/image-replacement")]
[Authorize(Roles = RoleConstants.SuperAdmin)]
[EnableRateLimiting("GeneralPolicy")]
[Tags("AI Image Replacement")]
public class ImageReplacementController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ILogger<ImageReplacementController> _logger;

    public ImageReplacementController(IMediator mediator, ILogger<ImageReplacementController> logger)
    {
        _mediator = mediator;
        _logger = logger;
    }

    /// <summary>
    /// Replace an object in an existing image using AI semantic inpainting
    /// </summary>
    /// <remarks>
    /// Uses Google Gemini 2.5 Flash Image (Nano Banana) to intelligently replace objects in images.
    /// Example: "Replace the salad with a hotdog" - AI maintains lighting, shadows, and composition.
    /// 
    /// Cost: ~$0.039 per image generation.
    /// </remarks>
    [HttpPost("replace")]
    [ProducesResponseType<ReplaceObjectInImageResponse>(200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(401)]
    [ProducesResponseType(429)]
    public async Task<ActionResult<ReplaceObjectInImageResponse>> ReplaceObject(
        [FromBody] ReplaceObjectRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized(new { error = "User not found" });

        var command = new ReplaceObjectInImageCommand(
            request.BaseImageUrl,
            request.ReplacementPrompt,
            request.ReferenceImageUrl,
            request.Temperature ?? 0.4f,
            userId
        );

        var result = await _mediator.Send(command);

        if (!result.IsSuccess)
            return BadRequest(new { error = result.Error });

        return Ok(result.Value);
    }

    /// <summary>
    /// Generate a new image from text prompt using AI
    /// </summary>
    /// <remarks>
    /// Creates a brand new image from a text description using Gemini Flash.
    /// 
    /// Cost: ~$0.039 per image generation.
    /// </remarks>
    [HttpPost("generate")]
    [ProducesResponseType<GenerateImageResponse>(200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(401)]
    [ProducesResponseType(429)]
    public async Task<ActionResult<GenerateImageResponse>> GenerateImage(
        [FromBody] GenerateImageRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized(new { error = "User not found" });

        var command = new GenerateImageCommand(
            request.Prompt,
            request.Temperature ?? 0.7f,
            userId
        );

        var result = await _mediator.Send(command);

        if (!result.IsSuccess)
            return BadRequest(new { error = result.Error });

        return Ok(result.Value);
    }
}

public record ReplaceObjectRequest
{
    /// <summary>
    /// URL or file path of the base image to edit (from your file storage)
    /// </summary>
    [Required]
    [StringLength(1000, MinimumLength = 1)]
    public string BaseImageUrl { get; init; } = string.Empty;

    /// <summary>
    /// Instructions for what to replace (e.g., "Replace the salad with a hotdog")
    /// </summary>
    [Required]
    [StringLength(2000, MinimumLength = 5, ErrorMessage = "Prompt must be between 5 and 2000 characters")]
    public string ReplacementPrompt { get; init; } = string.Empty;

    /// <summary>
    /// Optional reference image URL for style guidance
    /// </summary>
    [StringLength(1000)]
    public string? ReferenceImageUrl { get; init; }

    /// <summary>
    /// Creativity level (0.0-1.0). Lower = more consistent. Default: 0.4
    /// </summary>
    [Range(0.0f, 1.0f)]
    public float? Temperature { get; init; }
}

public record GenerateImageRequest
{
    /// <summary>
    /// Text description of the image to generate
    /// </summary>
    [Required]
    [StringLength(2000, MinimumLength = 5, ErrorMessage = "Prompt must be between 5 and 2000 characters")]
    public string Prompt { get; init; } = string.Empty;

    /// <summary>
    /// Creativity level (0.0-1.0). Higher = more creative. Default: 0.7
    /// </summary>
    [Range(0.0f, 1.0f)]
    public float? Temperature { get; init; }
}
