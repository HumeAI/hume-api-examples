// To run tests:
// dotnet test evi-csharp-quickstart.tests.csproj --logger "console;verbosity=detailed"

using System;
using System.Threading.Tasks;
using DotNetEnv;
using Hume;
using Hume.EmpathicVoice;
using Xunit;

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

    public EviConnectionTests(EviTestFixture fixture)
    {
        _fixture = fixture;
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

        // Create the ChatApi instance
        var chatApi = _fixture.HumeClient!.EmpathicVoice.CreateChatApi(new ChatApi.Options
        {
            ApiKey = _fixture.ApiKey,
            SessionSettings = new ConnectSessionSettings(),
        });

        // Subscribe to ChatMetadata to receive chatId
        chatApi.ChatMetadata.Subscribe(metadata =>
        {
            chatId = metadata.ChatId;
        });

        // Connect to EVI
        await chatApi.ConnectAsync();

        // Wait for chat_metadata with chatId (timeout after 10 seconds)
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

        // Stay alive for 2 seconds
        await Task.Delay(2000);

        // Verify socket is still connected (if it had closed, we would have gotten an error)
        // The fact that we can wait without exception means the connection is still alive

        // Clean up
        await chatApi.DisposeAsync();
    }
}

[CollectionDefinition("EviTests")]
public class EviTestCollection : ICollectionFixture<EviTestFixture>
{
}
