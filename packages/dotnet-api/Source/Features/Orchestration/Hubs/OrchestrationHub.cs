using Microsoft.AspNetCore.SignalR;

namespace Source.Features.Orchestration.Hubs;

public class OrchestrationHub : Hub
{
    public async Task SubscribeToOrchestration(string orchestrationId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, orchestrationId);
        await Clients.Caller.SendAsync("Subscribed", new { orchestrationId });
    }

    public async Task UnsubscribeFromOrchestration(string orchestrationId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, orchestrationId);
    }
}

