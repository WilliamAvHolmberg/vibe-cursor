using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Source.Infrastructure.Extensions;
using Source.Features.Orchestration.Commands;
using Source.Features.Orchestration.Queries;
using OrchestrationModel = Source.Features.Orchestration.Models.Orchestration;

namespace Source.Features.Orchestration.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class OrchestrationController : ControllerBase
{
    private readonly IMediator _mediator;

    public OrchestrationController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost("create")]
    public async Task<IActionResult> Create([FromBody] CreateOrchestrationRequest request)
    {
        var userId = User.GetUserId();
        var cursorApiKey = User.GetCursorApiKey();

        if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(cursorApiKey))
        {
            return Unauthorized(new { error = "Missing user credentials" });
        }

        var command = new CreateOrchestrationCommand(
            userId,
            cursorApiKey,
            request.Repository,
            request.Prompt,
            request.Ref);

        var result = await _mediator.Send(command);

        if (!result.IsSuccess)
        {
            return BadRequest(new { error = result.Error });
        }

        return Ok(result.Value);
    }

    [HttpGet("list")]
    public async Task<IActionResult> List()
    {
        var userId = User.GetUserId();
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Missing user credentials" });
        }

        var query = new ListOrchestrationsQuery(userId);
        var result = await _mediator.Send(query);

        if (!result.IsSuccess)
        {
            return BadRequest(new { error = result.Error });
        }

        return Ok(result.Value);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var userId = User.GetUserId();
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Missing user credentials" });
        }

        var query = new GetOrchestrationQuery(id, userId);
        var result = await _mediator.Send(query);

        if (!result.IsSuccess)
        {
            return NotFound(new { error = result.Error });
        }

        return Ok(result.Value);
    }

    [HttpPost("{id}/answer")]
    public async Task<IActionResult> AnswerQuestions(string id, [FromBody] AnswerQuestionsRequest request)
    {
        var userId = User.GetUserId();
        var cursorApiKey = User.GetCursorApiKey();

        if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(cursorApiKey))
        {
            return Unauthorized(new { error = "Missing user credentials" });
        }

        var command = new AnswerFollowUpQuestionsCommand(id, userId, cursorApiKey, request.Answers);
        var result = await _mediator.Send(command);

        if (!result.IsSuccess)
        {
            return BadRequest(new { error = result.Error });
        }

        return Ok(new { success = true });
    }

    [HttpPost("{id}/approve")]
    public async Task<IActionResult> ApprovePlan(string id)
    {
        var userId = User.GetUserId();
        var cursorApiKey = User.GetCursorApiKey();

        if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(cursorApiKey))
        {
            return Unauthorized(new { error = "Missing user credentials" });
        }

        var command = new ApprovePlanCommand(id, userId, cursorApiKey);
        var result = await _mediator.Send(command);

        if (!result.IsSuccess)
        {
            return BadRequest(new { error = result.Error });
        }

        return Ok(new { success = true });
    }

    [HttpPost("{id}/cancel")]
    public async Task<IActionResult> Cancel(string id)
    {
        var userId = User.GetUserId();
        var cursorApiKey = User.GetCursorApiKey();

        if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(cursorApiKey))
        {
            return Unauthorized(new { error = "Missing user credentials" });
        }

        var command = new CancelOrchestrationCommand(id, userId, cursorApiKey);
        var result = await _mediator.Send(command);

        if (!result.IsSuccess)
        {
            return BadRequest(new { error = result.Error });
        }

        return Ok(new { success = true });
    }

    [HttpGet("{id}/conversation")]
    public async Task<IActionResult> GetConversation(string id)
    {
        var userId = User.GetUserId();
        var cursorApiKey = User.GetCursorApiKey();

        if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(cursorApiKey))
        {
            return Unauthorized(new { error = "Missing user credentials" });
        }

        var orchestrationQuery = new GetOrchestrationQuery(id, userId);
        var orchestrationResult = await _mediator.Send(orchestrationQuery);

        if (!orchestrationResult.IsSuccess || orchestrationResult.Value == null)
        {
            return NotFound(new { error = "Orchestration not found" });
        }

        if (string.IsNullOrEmpty(orchestrationResult.Value.PlanningAgentId))
        {
            return Ok(new { messages = new List<object>() });
        }

        var conversationQuery = new GetAgentConversationQuery(
            orchestrationResult.Value.PlanningAgentId,
            cursorApiKey);
        var conversationResult = await _mediator.Send(conversationQuery);

        if (!conversationResult.IsSuccess)
        {
            return BadRequest(new { error = conversationResult.Error });
        }

        return Ok(conversationResult.Value);
    }
}

public record CreateOrchestrationRequest(
    string Repository,
    string Prompt,
    string? Ref
);

public record AnswerQuestionsRequest(
    Dictionary<string, string> Answers
);

