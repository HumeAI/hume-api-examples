// To run tests:
// dotnet test evi-csharp-quickstart.tests.csproj --logger "console;verbosity=detailed"

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using DotNetEnv;
using Hume;
using Hume.EmpathicVoice;
using OneOf;
using Xunit;
using Xunit.Abstractions;

namespace EviCsharpQuickstart.Tests;

public class EviTestFixture : IAsyncLifetime
{
    public string ApiKey { get; private set; } = string.Empty;
    public HumeClient? HumeClient { get; private set; }

    public Task InitializeAsync()
    {
        // Tests run from bin/Debug/net9.0/, so .env is 3 levels up
        Env.Load("../../../.env");

        var apiKey = Environment.GetEnvironmentVariable("TEST_HUME_API_KEY")
            ?? Environment.GetEnvironmentVariable("HUME_API_KEY");

        if (string.IsNullOrEmpty(apiKey))
        {
            throw new InvalidOperationException(
                "API key is required. Set TEST_HUME_API_KEY (CI) or HUME_API_KEY.");
        }

        ApiKey = apiKey;
        HumeClient = new HumeClient(ApiKey);

        return Task.CompletedTask;
    }

    public Task DisposeAsync()
    {
        return Task.CompletedTask;
    }
}

[Collection("EviTests")]
public class EviConnectionTests : IClassFixture<EviTestFixture>
{
    private readonly EviTestFixture _fixture;
    private readonly ITestOutputHelper _output;

    public EviConnectionTests(EviTestFixture fixture, ITestOutputHelper output)
    {
        _fixture = fixture;
        _output = output;
    }

    [Fact(DisplayName = "test fixture has API key")]
    public void TestFixture_HasApiKey()
    {
        Assert.False(string.IsNullOrEmpty(_fixture.ApiKey), "API key loaded");
        Assert.NotNull(_fixture.HumeClient);
    }

    [Fact(DisplayName = "connects w/ API key, starts a chat, receives a chatId, stays alive for 2 seconds")]
    public async Task Connects_StartsChat_ReceivesChatId_StaysAlive()
    {
        string? chatId = null;

        var chatApi = _fixture.HumeClient!.EmpathicVoice.CreateChatApi(new ChatApi.Options
        {
            ApiKey = _fixture.ApiKey,
            SessionSettings = new ConnectSessionSettings(),
        });

        chatApi.ChatMetadata.Subscribe(metadata =>
        {
            chatId = metadata.ChatId;
        });

        await chatApi.ConnectAsync();

        for (int i = 0; i < 100; i++)
        {
            if (chatId != null)
            {
                break;
            }
            await Task.Delay(100);
        }

        Assert.NotNull(chatId);
        Assert.False(string.IsNullOrEmpty(chatId), "Expected chat_id from chat_metadata");

        await Task.Delay(2000);

        await chatApi.DisposeAsync();
    }

    [Fact(DisplayName = "connects w/ API key, verifies sessionSettings are passed on connect()")]
    public async Task Connects_VerifiesSessionSettingsOnConnect()
    {
        var sessionSettings = new ConnectSessionSettings
        {
            SystemPrompt = "You are a helpful assistant that verifies sessionSettings are passed on connect()",
            Variables = new Dictionary<string, OneOf<string, double, bool>>
            {
                { "userName", OneOf<string, double, bool>.FromT0("John") },
                { "userAge", OneOf<string, double, bool>.FromT1(30.0) },
                { "isPremium", OneOf<string, double, bool>.FromT2(true) }
            }
        };

        string? chatId = null;

        var chatApi = _fixture.HumeClient!.EmpathicVoice.CreateChatApi(new ChatApi.Options
        {
            ApiKey = _fixture.ApiKey,
            SessionSettings = sessionSettings,
        });

        chatApi.ChatMetadata.Subscribe(metadata =>
        {
            chatId = metadata.ChatId;
        });

        await chatApi.ConnectAsync();

        for (int i = 0; i < 100; i++)
        {
            if (chatId != null)
            {
                break;
            }
            await Task.Delay(100);
        }

        Assert.NotNull(chatId);
        Assert.False(string.IsNullOrEmpty(chatId), "Expected chat_id from chat_metadata");

        await chatApi.DisposeAsync();

        await Task.Delay(2000);

        // Fetch chat events and verify session settings
        var events = new List<ReturnChatEvent>();

        var request = new ChatsListChatEventsRequest
        {
            PageNumber = 0,
            AscendingOrder = true
        };
        var pager = await _fixture.HumeClient!.EmpathicVoice.Chats.ListChatEventsAsync(chatId, request);

        await foreach (var evt in pager)
        {
            events.Add(evt);
        }

        var eventTypes = events.Select(e => e.Type.ToString()).ToList();

        var sessionSettingsEvent = events.FirstOrDefault(e => e.Type.ToString() == "SESSION_SETTINGS");

        if (sessionSettingsEvent == null)
        {
            var eventTypesStr = string.Join(", ", eventTypes);
            Assert.Fail(
                $"Expected SESSION_SETTINGS event but found none. Event types found: {eventTypesStr}. Total events: {events.Count}");
            return;
        }

        Assert.NotNull(sessionSettingsEvent.MessageText);

        var parsedSettings = JsonSerializer.Deserialize<JsonElement>(sessionSettingsEvent.MessageText!);

        Assert.Equal("session_settings", parsedSettings.GetProperty("type").GetString());

        Assert.Equal("You are a helpful assistant that verifies sessionSettings are passed on connect()", parsedSettings.GetProperty("system_prompt").GetString());

        var variables = parsedSettings.GetProperty("variables");
        Assert.Equal("John", variables.GetProperty("userName").GetString());
        Assert.Equal("30", variables.GetProperty("userAge").GetString());
        Assert.Equal("true", variables.GetProperty("isPremium").GetString());
    }

    [Fact(DisplayName = "connects w/ API key, verifies sessionSettings can be updated after connect()")]
    public async Task Connects_VerifiesSessionSettingsUpdatedAfterConnect()
    {
        string? chatId = null;

        var chatApi = _fixture.HumeClient!.EmpathicVoice.CreateChatApi(new ChatApi.Options
        {
            ApiKey = _fixture.ApiKey,
            SessionSettings = new ConnectSessionSettings(),
        });

        chatApi.ChatMetadata.Subscribe(metadata =>
        {
            chatId = metadata.ChatId;
        });

        await chatApi.ConnectAsync();

        for (int i = 0; i < 100; i++)
        {
            if (chatId != null)
            {
                break;
            }
            await Task.Delay(100);
        }

        Assert.NotNull(chatId);
        Assert.False(string.IsNullOrEmpty(chatId), "Expected chat_id from chat_metadata");

        var updatedSettings = new SessionSettings
        {
            SystemPrompt = "You are a helpful test assistant with updated system prompt"
        };
        await chatApi.Send(updatedSettings);

        await Task.Delay(1000);

        await chatApi.DisposeAsync();

        await Task.Delay(1000);

        var events = new List<ReturnChatEvent>();
        var request = new ChatsListChatEventsRequest
        {
            PageNumber = 0,
            AscendingOrder = true
        };
        var pager = await _fixture.HumeClient!.EmpathicVoice.Chats.ListChatEventsAsync(chatId, request);

        await foreach (var evt in pager)
        {
            events.Add(evt);
        }

        var sessionSettingsEvents = events.Where(e => (string)e.Type == "SESSION_SETTINGS").ToList();

        Assert.True(sessionSettingsEvents.Count >= 1,
            $"Expected at least 1 SESSION_SETTINGS event. Found event types: {string.Join(", ", events.Select(e => e.Type))}");

        var updatedEvent = sessionSettingsEvents.Last();

        Assert.NotNull(updatedEvent.MessageText);

        var parsedSettings = JsonSerializer.Deserialize<JsonElement>(updatedEvent.MessageText!);
        Assert.Equal("session_settings", parsedSettings.GetProperty("type").GetString());
        Assert.Equal("You are a helpful test assistant with updated system prompt",
            parsedSettings.GetProperty("system_prompt").GetString());
    }
}

[CollectionDefinition("EviTests")]
public class EviTestCollection : ICollectionFixture<EviTestFixture>
{
}
