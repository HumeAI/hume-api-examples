using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using DotNetEnv;
using Hume;
using Hume.EmpathicVoice;

Env.Load();

var apiKey = Environment.GetEnvironmentVariable("HUME_API_KEY")!;
var client = new HumeClient(apiKey);

// Create a signal to wait for Chat Metadata
var chatMetadataReceived = new TaskCompletionSource<bool>();

// Create the ChatApi instance
var chatApi = client.EmpathicVoice.CreateChatApi(new ChatApi.Options
{
    ApiKey = apiKey,
    SessionSettings = new ConnectSessionSettings(),
});

// Subscribe to events
chatApi.AssistantMessage.Subscribe(message =>
{
    Console.WriteLine($"Assistant: {message.Message?.Content}");
});

chatApi.UserMessage.Subscribe(message =>
{
    Console.WriteLine($"User: {message.Message?.Content}");
});

chatApi.AudioOutput.Subscribe(audio =>
{
    Console.WriteLine($"Received audio chunk: {audio.Data?.Length ?? 0} bytes");
});

chatApi.ChatMetadata.Subscribe(metadata =>
{
    Console.WriteLine($"Chat Metadata - Chat ID: {metadata.ChatId}");
    chatMetadataReceived.TrySetResult(true);
});

// Connect to EVI
Console.WriteLine("Connecting to EVI...");
await chatApi.ConnectAsync();
Console.WriteLine("Connected!");

// Wait for Chat Metadata
Console.WriteLine("Waiting for Chat Metadata...");
await chatMetadataReceived.Task;
Console.WriteLine("Chat Metadata received.");

// Configure audio format (48kHz, 16-bit, mono PCM)
const int sampleRate = 48000;
const int channels = 1;

var sessionSettings = new SessionSettings
{
    Audio = new AudioConfiguration
    {
        Encoding = "linear16",
        SampleRate = sampleRate,
        Channels = channels
    }
};

Console.WriteLine("Sending session settings:");
Console.WriteLine($"  Encoding: {sessionSettings.Audio?.Encoding}");
Console.WriteLine($"  Sample Rate: {sessionSettings.Audio?.SampleRate} Hz");
Console.WriteLine($"  Channels: {sessionSettings.Audio?.Channels}");

await chatApi.Send(sessionSettings);
Console.WriteLine("Session settings sent successfully.");

Console.WriteLine("Starting audio transmission...");
await TransmitTestAudio(chatApi, "sample_input.pcm", sampleRate, channels);

// Wait for responses
Console.WriteLine("Waiting for responses...");
await Task.Delay(5000);

await chatApi.DisposeAsync();
Console.WriteLine("Done");

/// <summary>
/// Reads a PCM file and streams its audio data to EVI in real-time chunks.
/// </summary>
static async Task TransmitTestAudio(ChatApi chatApi, string filePath, int sampleRate, int channels)
{
    const int chunkDurationMs = 10;
    const int bytesPerSample = 2; // 16-bit audio
    int bytesPerChunk = sampleRate * bytesPerSample * channels * chunkDurationMs / 1000;

    // Step 1: Read PCM file
    var audioData = File.ReadAllBytes(filePath);
    Console.WriteLine($"Read {audioData.Length} bytes of audio from {filePath}");

    // Step 2: Split into chunks
    var chunks = SplitAudioIntoChunks(audioData, bytesPerChunk);

    // Step 3: Send chunks with delays
    await SendAudioChunksAsync(chatApi, chunks, chunkDurationMs);
}

static byte[][] SplitAudioIntoChunks(byte[] audioData, int bytesPerChunk)
{
    var chunks = new List<byte[]>();

    for (int offset = 0; offset < audioData.Length; offset += bytesPerChunk)
    {
        var chunkSize = Math.Min(bytesPerChunk, audioData.Length - offset);
        var chunk = audioData.Skip(offset).Take(chunkSize).ToArray();

        // Pad final chunk if needed
        if (chunk.Length < bytesPerChunk)
        {
            chunk = chunk.Concat(new byte[bytesPerChunk - chunk.Length]).ToArray();
        }

        chunks.Add(chunk);
    }

    Console.WriteLine($"Split audio into {chunks.Count} chunks");
    return chunks.ToArray();
}

static async Task SendAudioChunksAsync(ChatApi chatApi, byte[][] chunks, int chunkDurationMs)
{
    Console.WriteLine($"Sending {chunks.Length} audio chunks...");

    var lastLogTime = DateTime.Now;
    long bytesSent = 0;

    for (int i = 0; i < chunks.Length; i++)
    {
        var data = Convert.ToBase64String(chunks[i]);
        await chatApi.Send(new AudioInput { Data = data });

        bytesSent += chunks[i].Length;

        // Log progress every 5 seconds
        var now = DateTime.Now;
        if ((now - lastLogTime).TotalSeconds >= 5)
        {
            Console.WriteLine($"Sent {bytesSent} bytes ({i + 1}/{chunks.Length} chunks)");
            lastLogTime = now;
        }

        await Task.Delay(chunkDurationMs);
    }

    Console.WriteLine("Finished sending audio.");
    Console.WriteLine($"Total bytes sent: {bytesSent}");
}
