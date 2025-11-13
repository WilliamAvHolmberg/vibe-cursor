using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Source.Features.ImageLibrary.Commands;
using Source.Features.ImageLibrary.Queries;
using Source.Infrastructure.AuthorizationModels;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;

namespace Source.Features.ImageLibrary.Controllers;

[ApiController]
[Route("api/imagelibrary")]
[Authorize(Roles = RoleConstants.SuperAdmin)]
[EnableRateLimiting("GeneralPolicy")]
[Tags("Image Library")]
public class ImageLibraryController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ILogger<ImageLibraryController> _logger;

    public ImageLibraryController(IMediator mediator, ILogger<ImageLibraryController> logger)
    {
        _mediator = mediator;
        _logger = logger;
    }

    /// <summary>
    /// Get all images from library with optional search and pagination
    /// </summary>
    [HttpGet]
    [ProducesResponseType<GetImageLibraryResponse>(200)]
    [ProducesResponseType(400)]
    public async Task<ActionResult<GetImageLibraryResponse>> GetImageLibrary(
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var query = new GetImageLibraryQuery(search, page, pageSize);
        var result = await _mediator.Send(query);

        if (!result.IsSuccess)
            return BadRequest(new { error = result.Error });

        return Ok(result.Value);
    }

    /// <summary>
    /// Add an existing uploaded image to the library with description
    /// </summary>
    [HttpPost]
    [ProducesResponseType<AddImageToLibraryResponse>(201)]
    [ProducesResponseType(400)]
    public async Task<ActionResult<AddImageToLibraryResponse>> AddImageToLibrary(
        [FromBody] AddImageToLibraryRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized(new { error = "User not found" });

        var command = new AddImageToLibraryCommand(
            request.FileUrl,
            request.FileName,
            request.FileSize,
            request.Description,
            userId
        );

        var result = await _mediator.Send(command);

        if (!result.IsSuccess)
            return BadRequest(new { error = result.Error });

        return CreatedAtAction(
            nameof(GetImageLibrary),
            new { id = result.Value.Id },
            result.Value
        );
    }

    /// <summary>
    /// Update an image's description in the library
    /// </summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType<UpdateImageLibraryItemResponse>(200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    public async Task<ActionResult<UpdateImageLibraryItemResponse>> UpdateImageLibraryItem(
        Guid id,
        [FromBody] UpdateImageLibraryItemRequest request)
    {
        var command = new UpdateImageLibraryItemCommand(id, request.Description);
        var result = await _mediator.Send(command);

        if (!result.IsSuccess)
            return NotFound(new { error = result.Error });

        return Ok(result.Value);
    }

    /// <summary>
    /// Remove an image from the library (does not delete the file from storage)
    /// </summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType<DeleteImageFromLibraryResponse>(200)]
    [ProducesResponseType(404)]
    public async Task<ActionResult<DeleteImageFromLibraryResponse>> DeleteImageFromLibrary(Guid id)
    {
        var command = new DeleteImageFromLibraryCommand(id);
        var result = await _mediator.Send(command);

        if (!result.IsSuccess)
            return NotFound(new { error = result.Error });

        return Ok(result.Value);
    }
}

public record AddImageToLibraryRequest
{
    [Required]
    public string FileUrl { get; init; } = string.Empty;
    
    [Required]
    public string FileName { get; init; } = string.Empty;
    
    [Required]
    public long FileSize { get; init; }
    
    [Required]
    [StringLength(500, MinimumLength = 1, ErrorMessage = "Description is required and must be between 1 and 500 characters")]
    public string Description { get; init; } = string.Empty;
}

public record UpdateImageLibraryItemRequest
{
    [Required]
    [StringLength(500, MinimumLength = 1, ErrorMessage = "Description is required and must be between 1 and 500 characters")]
    public string Description { get; init; } = string.Empty;
}

