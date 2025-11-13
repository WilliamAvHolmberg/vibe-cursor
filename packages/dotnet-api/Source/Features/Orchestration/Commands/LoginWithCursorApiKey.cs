using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Source.Features.Authentication.Services;
using Source.Features.Users.Models;
using Source.Infrastructure;
using Source.Shared.CQRS;
using Source.Shared.Results;

namespace Source.Features.Orchestration.Commands;

public record LoginWithCursorApiKeyCommand(
    string CursorApiKey,
    string? Email = null
) : ICommand<Result<LoginWithCursorApiKeyResponse>>;

public record LoginWithCursorApiKeyResponse(
    string Token,
    DateTime ExpiresAt,
    string UserId,
    string? Email
);

public class LoginWithCursorApiKeyCommandHandler : ICommandHandler<LoginWithCursorApiKeyCommand, Result<LoginWithCursorApiKeyResponse>>
{
    private readonly ApplicationDbContext _context;
    private readonly UserManager<User> _userManager;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly ILogger<LoginWithCursorApiKeyCommandHandler> _logger;

    public LoginWithCursorApiKeyCommandHandler(
        ApplicationDbContext context,
        UserManager<User> userManager,
        IJwtTokenService jwtTokenService,
        ILogger<LoginWithCursorApiKeyCommandHandler> logger)
    {
        _context = context;
        _userManager = userManager;
        _jwtTokenService = jwtTokenService;
        _logger = logger;
    }

    public async Task<Result<LoginWithCursorApiKeyResponse>> Handle(LoginWithCursorApiKeyCommand request, CancellationToken cancellationToken)
    {
        try
        {
            var httpClient = new HttpClient();
            var testResponse = await httpClient.SendAsync(new HttpRequestMessage(HttpMethod.Get, "https://api.cursor.com/v0/agents")
            {
                Headers = { { "Authorization", $"Bearer {request.CursorApiKey}" } }
            }, cancellationToken);

            if (!testResponse.IsSuccessStatusCode)
            {
                return Result.Failure<LoginWithCursorApiKeyResponse>("Invalid Cursor API key");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating Cursor API key");
            return Result.Failure<LoginWithCursorApiKeyResponse>("Failed to validate Cursor API key");
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.CursorApiKey == request.CursorApiKey, cancellationToken);

        if (user == null)
        {
            user = new User
            {
                UserName = request.Email ?? $"cursor_{Guid.NewGuid():N}",
                Email = request.Email,
                EmailConfirmed = request.Email != null,
                CursorApiKey = request.CursorApiKey
            };

            var createResult = await _userManager.CreateAsync(user);
            if (!createResult.Succeeded)
            {
                return Result.Failure<LoginWithCursorApiKeyResponse>($"Failed to create user: {string.Join(", ", createResult.Errors.Select(e => e.Description))}");
            }
        }
        else if (!string.IsNullOrEmpty(request.Email) && user.Email != request.Email)
        {
            user.Email = request.Email;
            user.EmailConfirmed = true;
            user.CursorApiKey = request.CursorApiKey;
            await _userManager.UpdateAsync(user);
        }
        else if (user.CursorApiKey != request.CursorApiKey)
        {
            user.CursorApiKey = request.CursorApiKey;
            await _userManager.UpdateAsync(user);
        }

        var (token, expiresAt) = await _jwtTokenService.GenerateTokenWithExpiryAsync(user, "cursor_api");

        return Result.Success(new LoginWithCursorApiKeyResponse(
            token,
            expiresAt,
            user.Id,
            user.Email
        ));
    }
}

