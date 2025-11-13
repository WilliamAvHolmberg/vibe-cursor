using Hangfire.Dashboard;
using Source.Infrastructure.AuthorizationModels;

namespace Source.Infrastructure.Security;

public class HangfireAuthorizationFilter : IDashboardAuthorizationFilter
{
    public bool Authorize(DashboardContext context)
    {
        var httpContext = context.GetHttpContext();
        
        if (httpContext?.User == null)
        {
            return false;
        }

        return httpContext.User.IsInRole(RoleConstants.SuperAdmin);
    }
}

