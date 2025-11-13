using System.Security.Claims;

namespace Source.Infrastructure.Extensions;

/// <summary>
/// Extension methods for ClaimsPrincipal to work with restaurant authorization
/// </summary>
public static class ClaimsPrincipalExtensions
{
    /// <summary>
    /// Get user ID from claims
    /// </summary>
    public static string? GetUserId(this ClaimsPrincipal user)
    {
        return user.FindFirstValue(ClaimTypes.NameIdentifier);
    }

    /// <summary>
    /// Get Cursor API Key from claims
    /// </summary>
    public static string? GetCursorApiKey(this ClaimsPrincipal user)
    {
        return user.FindFirstValue("cursor_api_key");
    }
}
