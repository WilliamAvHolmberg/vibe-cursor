namespace Source.Infrastructure.Services.Firebase;

public interface IFirebaseService
{
    /// <summary>
    /// Send a push notification to a specific device token
    /// </summary>
    Task SendNotificationAsync(string token, string title, string body, Dictionary<string, string>? data = null);

    /// <summary>
    /// Send a push notification to all subscribers of a topic
    /// </summary>
    Task SendToTopicAsync(string topic, string title, string body, Dictionary<string, string>? data = null);

    /// <summary>
    /// Subscribe a device token to a topic
    /// </summary>
    Task SubscribeToTopicAsync(string token, string topic);

    /// <summary>
    /// Unsubscribe a device token from a topic
    /// </summary>
    Task UnsubscribeFromTopicAsync(string token, string topic);

    /// <summary>
    /// Send the same notification to multiple device tokens efficiently
    /// </summary>
    Task SendToMultipleAsync(List<string> tokens, string title, string body, Dictionary<string, string>? data = null);

    /// <summary>
    /// Subscribe multiple tokens to a topic in batch
    /// </summary>
    Task SubscribeMultipleToTopicAsync(List<string> tokens, string topic);

    /// <summary>
    /// Unsubscribe multiple tokens from a topic in batch
    /// </summary>
    Task UnsubscribeMultipleFromTopicAsync(List<string> tokens, string topic);
}
