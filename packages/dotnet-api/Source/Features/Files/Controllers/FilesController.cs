using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Source.Features.Files.Commands;
using Source.Infrastructure.AuthorizationModels;

namespace Source.Features.Files.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = RoleConstants.SuperAdmin)]
[EnableRateLimiting("GeneralPolicy")]
[Tags("Files")]
public class FilesController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ILogger<FilesController> _logger;

    public FilesController(IMediator mediator, ILogger<FilesController> logger)
    {
        _mediator = mediator;
        _logger = logger;
    }

    /// <summary>
    /// Upload a file to storage (R2 or Local) - SuperAdmin only
    /// </summary>
    [HttpPost("upload")]
    [Consumes("multipart/form-data")]
    [ProducesResponseType<UploadFileResponse>(200)]
    [ProducesResponseType(400)]
    [RequestSizeLimit(10 * 1024 * 1024)] // 10MB limit
    public async Task<ActionResult<UploadFileResponse>> UploadFile(
        IFormFile file,
        string? folder = null)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { error = "No file uploaded" });
        }

        // Validate file size (10MB max)
        if (file.Length > 10 * 1024 * 1024)
        {
            return BadRequest(new { error = "File size must be less than 10MB" });
        }

        // Validate file type (images only for now)
        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg" };
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        
        if (!allowedExtensions.Contains(extension))
        {
            return BadRequest(new { error = "Only image files are allowed (jpg, jpeg, png, gif, webp, svg)" });
        }

        await using var stream = file.OpenReadStream();
        
        var command = new UploadFileCommand(stream, file.FileName, folder);
        var result = await _mediator.Send(command);

        if (!result.IsSuccess)
        {
            return BadRequest(new { error = result.Error });
        }

        return Ok(result.Value);
    }
}

