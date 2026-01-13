// To run tests:
// dotnet test tts-csharp-quickstart.tests.csproj --logger "console;verbosity=detailed"

using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using DotNetEnv;
using Hume;
using Hume.Tts;
using Xunit;

namespace TtsCsharpQuickstart.Tests;

public class TtsTestFixture : IAsyncLifetime
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

[Collection("TtsTests")]
public class TtsJsonStreamTests : IClassFixture<TtsTestFixture>
{
    private readonly TtsTestFixture _fixture;

    public TtsJsonStreamTests(TtsTestFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact(DisplayName = "test fixture has API key")]
    public void TestFixture_HasApiKey()
    {
        Assert.False(string.IsNullOrEmpty(_fixture.ApiKey), "API key loaded");
        Assert.NotNull(_fixture.HumeClient);
    }

    [Fact(DisplayName = "connects w/ API key, generates JSON stream w/ Octave 1")]
    public async Task GeneratesJsonStream_WithOctave1()
    {
        var request = new PostedTts
        {
            Utterances = Program.Example1RequestParams.Utterances,
            StripHeaders = Program.Example1RequestParams.StripHeaders,
            Version = OctaveVersion.One,
        };

        var audioChunks = new List<SnippetAudioChunk>();

        await foreach (var chunk in _fixture.HumeClient!.Tts.SynthesizeJsonStreamingAsync(request))
        {
            var chunkValue = (chunk as dynamic)?.Value;
            if (chunkValue is SnippetAudioChunk audio)
            {
                audioChunks.Add(audio);
            }
        }

        Assert.True(audioChunks.Count > 0, "Should receive at least one audio chunk");
        Assert.NotNull(audioChunks[0].Audio);
        Assert.IsType<string>(audioChunks[0].Audio); // base64 encoded audio
    }

    [Fact(DisplayName = "connects w/ API key, generates JSON stream w/ Octave 2 with timestamps")]
    public async Task GeneratesJsonStream_WithOctave2AndTimestamps()
    {
        var request = new PostedTts
        {
            Utterances = Program.Example1RequestParams.Utterances,
            StripHeaders = Program.Example1RequestParams.StripHeaders,
            Version = OctaveVersion.Two,
            IncludeTimestampTypes = new List<TimestampType> { TimestampType.Word, TimestampType.Phoneme },
        };

        var audioChunks = new List<SnippetAudioChunk>();
        var timestampChunks = new List<TimestampMessage>();

        await foreach (var chunk in _fixture.HumeClient!.Tts.SynthesizeJsonStreamingAsync(request))
        {
            var chunkValue = (chunk as dynamic)?.Value;
            if (chunkValue is SnippetAudioChunk audio)
            {
                audioChunks.Add(audio);
            }
            else if (chunkValue is TimestampMessage timestamp)
            {
                timestampChunks.Add(timestamp);
            }
        }

        // Verify audio chunks
        Assert.True(audioChunks.Count > 0, "Expected at least one audio chunk");
        Assert.NotNull(audioChunks[0].Audio);
        Assert.IsType<string>(audioChunks[0].Audio); // base64 encoded audio

        // Verify timestamp chunks
        Assert.True(timestampChunks.Count > 0, "Expected at least one timestamp chunk");
        var firstTimestamp = timestampChunks[0];
        Assert.NotNull(firstTimestamp.RequestId);
        Assert.NotNull(firstTimestamp.GenerationId);
        Assert.NotNull(firstTimestamp.SnippetId);
        Assert.NotNull(firstTimestamp.Timestamp);
        Assert.NotNull(firstTimestamp.Timestamp.Text);
        Assert.NotNull(firstTimestamp.Timestamp.Time);

        // Verify both timestamp types present
        var typesFound = new HashSet<string>();
        foreach (var ts in timestampChunks)
        {
            if (ts.Timestamp?.Type != null)
            {
                typesFound.Add(ts.Timestamp.Type.Value);
            }
        }
        Assert.Contains("word", typesFound);
        Assert.Contains("phoneme", typesFound);
    }
}

[Collection("TtsTests")]
public class TtsStreamInputTests : IClassFixture<TtsTestFixture>
{
    private readonly TtsTestFixture _fixture;

    public TtsStreamInputTests(TtsTestFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact(DisplayName = "StreamingTtsClient: creates a bidirectional stream and connects successfully")]
    public async Task CreatesStreamAndConnectsSuccessfully()
    {
        using var streamingClient = new TtsCsharpQuickstart.StreamingTtsClient(_fixture.ApiKey);
        
        await streamingClient.ConnectAsync();
        
        // Verify the client is created and connected
        Assert.NotNull(streamingClient);
        
        // Verify we can send messages (this would throw if not connected)
        await streamingClient.SendAsync(new { text = "Hello" });
        await streamingClient.SendFlushAsync();
        await streamingClient.SendCloseAsync();
    }

    [Fact(DisplayName = "StreamingTtsClient: sends messages and receives audio chunks")]
    public async Task SendsMessagesAndReceivesAudioChunks()
    {
        var audioChunks = new List<SnippetAudioChunk>();

        using var streamingClient = new TtsCsharpQuickstart.StreamingTtsClient(_fixture.ApiKey);
        await streamingClient.ConnectAsync();

        // Task 1: Receive audio chunks
        var handleMessagesTask = Task.Run(async () =>
        {
            await foreach (var chunk in streamingClient.ReceiveAudioChunksAsync())
            {
                audioChunks.Add(chunk);
            }
        });

        // Task 2: Send input messages
        var sendInputTask = Task.Run(async () =>
        {
            await streamingClient.SendAsync(new
            {
                text = "Hello",
                voice = new { name = Program.DefaultVoiceName, provider = "HUME_AI" }
            });
            await streamingClient.SendFlushAsync();
            await Task.Delay(1000);
            await streamingClient.SendCloseAsync();
        });

        await Task.WhenAll(handleMessagesTask, sendInputTask);

        Assert.True(audioChunks.Count > 0, "Expected at least one audio chunk");
        Assert.NotNull(audioChunks[0].Audio);
        Assert.IsType<string>(audioChunks[0].Audio); // base64 encoded audio
    }
}

[CollectionDefinition("TtsTests")]
public class TtsTestCollection : ICollectionFixture<TtsTestFixture>
{
}
