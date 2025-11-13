using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Source.Infrastructure.Services.CursorApi;

public class CursorAgentCreateRequest
{
    [JsonPropertyName("prompt")]
    public required PromptData Prompt { get; set; }

    [JsonPropertyName("source")]
    public required SourceData Source { get; set; }

    [JsonPropertyName("target")]
    public TargetData? Target { get; set; }

    [JsonPropertyName("webhook")]
    public WebhookData? Webhook { get; set; }

    public class PromptData
    {
        [JsonPropertyName("text")]
        public required string Text { get; set; }

        [JsonPropertyName("images")]
        public List<ImageData>? Images { get; set; }
    }

    public class ImageData
    {
        [JsonPropertyName("data")]
        public required string Data { get; set; }

        [JsonPropertyName("dimension")]
        public DimensionData? Dimension { get; set; }
    }

    public class DimensionData
    {
        [JsonPropertyName("width")]
        public int Width { get; set; }

        [JsonPropertyName("height")]
        public int Height { get; set; }
    }

    public class SourceData
    {
        [JsonPropertyName("repository")]
        public required string Repository { get; set; }

        [JsonPropertyName("ref")]
        public string? Ref { get; set; }
    }

    public class TargetData
    {
        [JsonPropertyName("autoCreatePr")]
        public bool? AutoCreatePr { get; set; }

        [JsonPropertyName("openAsCursorGithubApp")]
        public bool? OpenAsCursorGithubApp { get; set; }

        [JsonPropertyName("skipReviewerRequest")]
        public bool? SkipReviewerRequest { get; set; }

        [JsonPropertyName("branchName")]
        public string? BranchName { get; set; }
    }

    public class WebhookData
    {
        [JsonPropertyName("url")]
        public required string Url { get; set; }

        [JsonPropertyName("secret")]
        public string? Secret { get; set; }
    }
}

public class CursorAgent
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("source")]
    public SourceInfo? Source { get; set; }

    [JsonPropertyName("target")]
    public TargetInfo? Target { get; set; }

    [JsonPropertyName("createdAt")]
    public string CreatedAt { get; set; } = string.Empty;

    public class SourceInfo
    {
        [JsonPropertyName("repository")]
        public string Repository { get; set; } = string.Empty;

        [JsonPropertyName("ref")]
        public string Ref { get; set; } = string.Empty;
    }

    public class TargetInfo
    {
        [JsonPropertyName("branchName")]
        public string? BranchName { get; set; }

        [JsonPropertyName("url")]
        public string? Url { get; set; }

        [JsonPropertyName("autoCreatePr")]
        public bool? AutoCreatePr { get; set; }

        [JsonPropertyName("openAsCursorGithubApp")]
        public bool? OpenAsCursorGithubApp { get; set; }

        [JsonPropertyName("skipReviewerRequest")]
        public bool? SkipReviewerRequest { get; set; }
    }
}

public class CursorAgentConversation
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("messages")]
    public List<ConversationMessage> Messages { get; set; } = new();

    public class ConversationMessage
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("type")]
        public string Type { get; set; } = string.Empty;

        [JsonPropertyName("text")]
        public string Text { get; set; } = string.Empty;
    }
}

public class CursorApiClient
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;
    private readonly string _baseUrl;
    private readonly JsonSerializerOptions _jsonOptions;

    public CursorApiClient(string apiKey, HttpClient httpClient, string baseUrl = "https://api.cursor.com/v0")
    {
        _apiKey = apiKey;
        _httpClient = httpClient;
        _baseUrl = baseUrl;
        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
        };
    }

    private async Task<T> RequestAsync<T>(string endpoint, HttpMethod method, object? body = null)
    {
        var url = $"{_baseUrl}{endpoint}";
        var request = new HttpRequestMessage(method, url);
        
        request.Headers.Add("Authorization", $"Bearer {_apiKey}");

        if (body != null)
        {
            var json = JsonSerializer.Serialize(body, _jsonOptions);
            request.Content = new StringContent(json, Encoding.UTF8, "application/json");
        }

        var response = await _httpClient.SendAsync(request);

        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync();
            throw new HttpRequestException($"Cursor API error: {response.StatusCode}. {error}");
        }

        var responseJson = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<T>(responseJson, _jsonOptions)
            ?? throw new InvalidOperationException("Failed to deserialize response");
    }

    public Task<CursorAgent> CreateAgentAsync(CursorAgentCreateRequest request)
    {
        return RequestAsync<CursorAgent>("/agents", HttpMethod.Post, request);
    }

    public Task<CursorAgent> GetAgentAsync(string agentId)
    {
        return RequestAsync<CursorAgent>($"/agents/{agentId}", HttpMethod.Get);
    }

    public Task<CursorAgentConversation> GetAgentConversationAsync(string agentId)
    {
        return RequestAsync<CursorAgentConversation>($"/agents/{agentId}/conversation", HttpMethod.Get);
    }

    public async Task<string> CancelAgentAsync(string agentId)
    {
        var result = await RequestAsync<Dictionary<string, string>>($"/agents/{agentId}/cancel", HttpMethod.Post);
        return result.GetValueOrDefault("id", string.Empty);
    }

    public async Task<string> AddFollowUpAsync(string agentId, CursorAgentCreateRequest.PromptData prompt)
    {
        var body = new { prompt };
        var result = await RequestAsync<Dictionary<string, string>>($"/agents/{agentId}/followup", HttpMethod.Post, body);
        return result.GetValueOrDefault("id", string.Empty);
    }
}

