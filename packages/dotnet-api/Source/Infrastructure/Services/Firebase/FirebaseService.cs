using FirebaseAdmin;
using FirebaseAdmin.Messaging;
using Google.Apis.Auth.OAuth2;

namespace Source.Infrastructure.Services.Firebase;

public class FirebaseService : IFirebaseService
{
    private readonly FirebaseMessaging _messaging;
    private readonly ILogger<FirebaseService> _logger;

    public FirebaseService(IConfiguration configuration, ILogger<FirebaseService> logger)
    {
        _logger = logger;

        try
        {
            var projectId = configuration["Firebase:ProjectId"];
            var serviceAccountJson = configuration["Firebase:ServiceAccountJson"];

            if (string.IsNullOrEmpty(projectId))
            {
                throw new InvalidOperationException("Firebase:ProjectId is not configured");
            }

            if (string.IsNullOrEmpty(serviceAccountJson))
            {
                throw new InvalidOperationException("Firebase:ServiceAccountJson is not configured");
            }

            // 🔍 Debug the JSON string
            _logger.LogInformation("🔍 Firebase JSON length: {Length}", serviceAccountJson.Length);
            _logger.LogInformation("🔍 Firebase JSON first 50 chars: {FirstChars}", 
                serviceAccountJson.Length > 50 ? serviceAccountJson.Substring(0, 50) : serviceAccountJson);

            // 🔧 Unescape the JSON string - .NET config reads escaped quotes as literals
            var unescapedJson = serviceAccountJson.Replace("\\\"", "\"");
            _logger.LogInformation("🔧 Unescaped JSON first 50 chars: {FirstChars}", 
                unescapedJson.Length > 50 ? unescapedJson.Substring(0, 50) : unescapedJson);

            // Initialize Firebase app if not already done
            if (FirebaseApp.DefaultInstance == null)
            {
                FirebaseApp.Create(new AppOptions()
                {
                    Credential = GoogleCredential.FromJson(unescapedJson),
                    ProjectId = projectId
                });

                _logger.LogInformation("🔥 Firebase initialized successfully for project: {ProjectId}", projectId);
            }

            _messaging = FirebaseMessaging.DefaultInstance;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Failed to initialize Firebase service");
            throw;
        }
    }

    public async Task SendNotificationAsync(string token, string title, string body, Dictionary<string, string>? data = null)
    {
        try
        {
            var message = new Message()
            {
                Token = token,
                Notification = new Notification()
                {
                    Title = title,
                    Body = body
                },
                Data = data
            };

            var response = await _messaging.SendAsync(message);
            _logger.LogInformation("✅ Successfully sent notification to token {Token}: {Response}", 
                token.Substring(0, Math.Min(10, token.Length)) + "...", response);
        }
        catch (FirebaseMessagingException ex)
        {
            _logger.LogError(ex, "❌ Firebase messaging error for token {Token}: {ErrorCode}", 
                token.Substring(0, Math.Min(10, token.Length)) + "...", ex.MessagingErrorCode);
            
            // Don't rethrow for invalid tokens - log and continue
            if (ex.MessagingErrorCode == MessagingErrorCode.InvalidArgument || 
                ex.MessagingErrorCode == MessagingErrorCode.Unregistered)
            {
                _logger.LogWarning("🔄 Invalid or unregistered token, should be removed from database: {Token}", 
                    token.Substring(0, Math.Min(10, token.Length)) + "...");
                return;
            }
            
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Unexpected error sending notification to token {Token}", 
                token.Substring(0, Math.Min(10, token.Length)) + "...");
            throw;
        }
    }

    public async Task SendToTopicAsync(string topic, string title, string body, Dictionary<string, string>? data = null)
    {
        try
        {
            var message = new Message()
            {
                Topic = topic,
                Notification = new Notification()
                {
                    Title = title,
                    Body = body
                },
                Data = data
            };

            var response = await _messaging.SendAsync(message);
            _logger.LogInformation("✅ Successfully sent notification to topic {Topic}: {Response}", topic, response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Error sending notification to topic {Topic}", topic);
            throw;
        }
    }

    public async Task SubscribeToTopicAsync(string token, string topic)
    {
        try
        {
            var response = await _messaging.SubscribeToTopicAsync(new[] { token }, topic);
            
            if (response.SuccessCount > 0)
            {
                _logger.LogInformation("✅ Successfully subscribed token to topic {Topic}", topic);
            }
            
            if (response.FailureCount > 0)
            {
                _logger.LogWarning("⚠️ Failed to subscribe {FailureCount} tokens to topic {Topic}", 
                    response.FailureCount, topic);
                
                foreach (var error in response.Errors)
                {
                    _logger.LogWarning("📍 Subscription error: {Reason}", error.Reason);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Error subscribing token to topic {Topic}", topic);
            throw;
        }
    }

    public async Task UnsubscribeFromTopicAsync(string token, string topic)
    {
        try
        {
            var response = await _messaging.UnsubscribeFromTopicAsync(new[] { token }, topic);
            
            if (response.SuccessCount > 0)
            {
                _logger.LogInformation("✅ Successfully unsubscribed token from topic {Topic}", topic);
            }
            
            if (response.FailureCount > 0)
            {
                _logger.LogWarning("⚠️ Failed to unsubscribe {FailureCount} tokens from topic {Topic}", 
                    response.FailureCount, topic);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Error unsubscribing token from topic {Topic}", topic);
            throw;
        }
    }

    public async Task SendToMultipleAsync(List<string> tokens, string title, string body, Dictionary<string, string>? data = null)
    {
        if (!tokens.Any())
        {
            _logger.LogWarning("⚠️ No tokens provided for batch send");
            return;
        }

        try
        {
            var messages = tokens.Select(token => new Message()
            {
                Token = token,
                Notification = new Notification()
                {
                    Title = title,
                    Body = body
                },
                Data = data
            }).ToList();

            var response = await _messaging.SendEachAsync(messages);
            
            _logger.LogInformation("📊 Batch send results: {SuccessCount} success, {FailureCount} failures out of {TotalCount} messages",
                response.SuccessCount, response.FailureCount, tokens.Count);

            // Log failures for debugging
            for (int i = 0; i < response.Responses.Count; i++)
            {
                var result = response.Responses[i];
                if (!result.IsSuccess)
                {
                    _logger.LogWarning("❌ Failed to send to token {Index}: {Exception}", 
                        i, result.Exception?.Message);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Error in batch send to {TokenCount} tokens", tokens.Count);
            throw;
        }
    }

    public async Task SubscribeMultipleToTopicAsync(List<string> tokens, string topic)
    {
        if (!tokens.Any())
        {
            _logger.LogWarning("⚠️ No tokens provided for batch subscription");
            return;
        }

        try
        {
            var response = await _messaging.SubscribeToTopicAsync(tokens, topic);
            
            _logger.LogInformation("📊 Batch subscription to {Topic}: {SuccessCount} success, {FailureCount} failures",
                topic, response.SuccessCount, response.FailureCount);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Error in batch subscription to topic {Topic}", topic);
            throw;
        }
    }

    public async Task UnsubscribeMultipleFromTopicAsync(List<string> tokens, string topic)
    {
        if (!tokens.Any())
        {
            _logger.LogWarning("⚠️ No tokens provided for batch unsubscription");
            return;
        }

        try
        {
            var response = await _messaging.UnsubscribeFromTopicAsync(tokens, topic);
            
            _logger.LogInformation("📊 Batch unsubscription from {Topic}: {SuccessCount} success, {FailureCount} failures",
                topic, response.SuccessCount, response.FailureCount);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Error in batch unsubscription from topic {Topic}", topic);
            throw;
        }
    }
}
