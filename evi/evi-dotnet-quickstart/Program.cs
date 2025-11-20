using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using DotNetEnv;
using Hume;
using Hume.EmpathicVoice;
using Hume.Tts;
using OneOf;
using TtsCsharpQuickstart;

namespace TtsCsharpQuickstart;

class Program
{
    // Constants
    private const string HumeApiKey = "HUME_API_KEY";
    private const string DefaultVoiceName = "Ava Song";
    private const int VoiceCreationDelaySeconds = 8;
    
    private static string? _apiKey;
    private static HumeClient? _client;
    private static string? _outputDir;

    static async Task RunExamplesAsync()
    {
        // Get the API key from .env file
        Env.Load();

        Console.WriteLine("Starting...");

        _apiKey = Environment.GetEnvironmentVariable(HumeApiKey);
        if (string.IsNullOrEmpty(_apiKey))
        {
            throw new InvalidOperationException($"{HumeApiKey} not found in environment variables.");
        }

        _client = new HumeClient(_apiKey);

        // Create an output directory in the temporary folder
        _outputDir = Path.Combine(Path.GetTempPath(), "hume-audio");
        Directory.CreateDirectory(_outputDir);

        Console.WriteLine($"Results will be written to {_outputDir}");

        await Example1Async();

        Console.WriteLine("Done");
    }

    static async Task Main(string[] args)
    {
        await RunExamplesAsync();
    }

    /// <summary>
    /// Example 1: Simple ChatApi usage.
    /// 
    /// Demonstrates how to create a ChatApi, connect to it, send a message,
    /// and receive responses from EVI.
    /// </summary>
    static async Task Example1Async()
    {
        if (_client == null || _apiKey == null)
        {
            throw new InvalidOperationException("Client or API key not initialized");
        }

        Console.WriteLine("Example 1: ChatApi Simple Usage");
        Console.WriteLine("================================");

        // Create ChatApi options with API key and session settings
        var chatOptions = new ChatApi.Options
        {
            ApiKey = _apiKey,

        };

        // Create the ChatApi instance
        var chatApi = _client.EmpathicVoice.CreateChatApi(chatOptions);

        // Subscribe to events
        chatApi.AssistantMessage.Subscribe(message =>
        {
            Console.WriteLine($"Assistant: {message.Message?.Content}");
        });

        chatApi.UserMessage.Subscribe(message =>
        {
            if (message.Message != null)
            {
                Console.WriteLine($"User: {message.Message.Content}");
            }
        });

        chatApi.AudioOutput.Subscribe(audio =>
        {
            Console.WriteLine($"Received audio chunk: {audio.Audio?.Length ?? 0} bytes");
        });

        chatApi.ChatMetadata.Subscribe(metadata =>
        {
            Console.WriteLine($"Chat Metadata - Chat Group ID: {metadata.ChatGroupId}");
        });

        try
        {
            // Connect to the chat
            Console.WriteLine("Connecting to EVI...");
            await chatApi.ConnectAsync();
            Console.WriteLine("Connected!");

            // Wait a moment for connection to stabilize
            await Task.Delay(1000);

            // Send a simple user message
            var userInput = new UserInput
            {
                Text = "Hello! Can you tell me a fun fact?"
            };

            Console.WriteLine($"Sending: {userInput.Text}");
            var message = OneOf<UserInput, AudioInput, SessionSettings, AssistantInput, ToolResponseMessage, ToolErrorMessage, PauseAssistantMessage, ResumeAssistantMessage>.FromT0(userInput);
            await chatApi.Send(message);

            // Wait for responses
            Console.WriteLine("Waiting for responses...");
            await Task.Delay(5000);

            Console.WriteLine("Example 1 completed.");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in Example 1: {ex.Message}");
            Console.WriteLine(ex.StackTrace);
        }
        finally
        {
            // Clean up
            await chatApi.DisposeAsync();
        }
    }

    /// <summary>
    /// Helper method to stream audio chunks from a TTS response to an audio player.
    /// Handles SDK compatibility by working with both TtsOutput and OneOf types.
    /// </summary>
    private static async Task StreamAudioToPlayerAsync<T>(
        IAsyncEnumerable<T> snippetStream,
        StreamingAudioPlayer player)
    {
        await foreach (var snippet in snippetStream)
        {
            // Handle both TtsOutput and OneOf types for SDK compatibility
            // Using dynamic type inspection for compatibility across SDK versions
            var snippetValue = (snippet as dynamic)?.Value;
            if (snippetValue is SnippetAudioChunk audio)
            {
                await player.SendAudioAsync(Convert.FromBase64String(audio.Audio));
            }
        }
    }

    /// <summary>
    /// Real-time streaming audio player using ffplay.
    /// Pipes audio data to ffplay process for immediate playback without writing to disk.
    /// Supports optional buffering for scenarios with variable chunk arrival timing.
    /// </summary>
    public class StreamingAudioPlayer : IDisposable
    {
        private Process? _audioProcess;
        private bool _isStreaming = false;
        private readonly bool _usePcmFormat;
        private readonly bool _useBuffering;
        
        // Buffering support for bidirectional streaming scenarios
        private BlockingCollection<byte[]>? _audioBuffer;
        private CancellationTokenSource? _bufferCts;
        private Task? _bufferTask;

        /// <summary>
        /// Creates a new StreamingAudioPlayer.
        /// </summary>
        /// <param name="usePcmFormat">
        /// If true, configures ffplay for raw PCM audio (48kHz, 16-bit signed little-endian).
        /// If false, uses auto-detection for container formats like WAV or MP3 (default).
        /// </param>
        /// <param name="useBuffering">
        /// If true, enables buffered mode where audio chunks are queued and played continuously
        /// by a background task. This is useful for bidirectional streaming where chunks may
        /// arrive with irregular timing. If false, audio is written directly to ffplay (default).
        /// </param>
        public StreamingAudioPlayer(bool usePcmFormat = false, bool useBuffering = false)
        {
            _usePcmFormat = usePcmFormat;
            _useBuffering = useBuffering;
            
            if (_useBuffering)
            {
                _audioBuffer = new BlockingCollection<byte[]>();
                _bufferCts = new CancellationTokenSource();
            }
        }

        public Task StartStreamingAsync()
        {
            _isStreaming = true;
            StartAudioProcess();
            
            // Start buffer draining task if buffering is enabled
            if (_useBuffering && _audioBuffer != null && _bufferCts != null && _audioProcess != null)
            {
                _bufferTask = Task.Run(async () =>
                {
                    try
                    {
                        foreach (var audioBytes in _audioBuffer.GetConsumingEnumerable(_bufferCts.Token))
                        {
                            if (_audioProcess?.StandardInput?.BaseStream != null)
                            {
                                await _audioProcess.StandardInput.BaseStream.WriteAsync(audioBytes, _bufferCts.Token);
                                await _audioProcess.StandardInput.BaseStream.FlushAsync(_bufferCts.Token);
                            }
                        }
                    }
                    catch (OperationCanceledException)
                    {
                        // Expected when stopping
                    }
                });
            }
            
            Console.WriteLine("Streaming audio player started...");
            return Task.CompletedTask;
        }

        public Task SendAudioAsync(byte[] audioBytes)
        {
            if (!_isStreaming) return Task.CompletedTask;

            try
            {
                if (_useBuffering && _audioBuffer != null)
                {
                    // Buffered mode: add to queue for background task to process
                    _audioBuffer.Add(audioBytes);
                }
                else if (_audioProcess?.HasExited == false)
                {
                    // Direct mode: write immediately to ffplay
                    _audioProcess?.StandardInput.BaseStream.Write(audioBytes, 0, audioBytes.Length);
                    _audioProcess?.StandardInput.BaseStream.Flush();
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error sending audio chunk: {ex.Message}");
            }

            return Task.CompletedTask;
        }

        public async Task StopStreamingAsync()
        {
            _isStreaming = false;

            try
            {
                // Complete buffered audio if using buffering
                if (_useBuffering && _audioBuffer != null)
                {
                    _audioBuffer.CompleteAdding();
                    if (_bufferTask != null)
                    {
                        await _bufferTask;
                    }
                }
                
                // Close ffplay process
                if (_audioProcess != null && !_audioProcess.HasExited)
                {
                    _audioProcess.StandardInput.Close();
                    await _audioProcess.WaitForExitAsync();
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error stopping audio process: {ex.Message}");
            }

            Console.WriteLine("Streaming audio player stopped.");
        }

        private void StartAudioProcess()
        {
            try
            {
                // PCM format requires explicit format specification, WAV/MP3 can auto-detect
                var arguments = _usePcmFormat
                    ? "-f s16le -ar 48000 -fflags nobuffer -flags low_delay -probesize 32 -analyzeduration 0 -i - -nodisp -autoexit"
                    : "-nodisp -autoexit -infbuf -i -";

                var startInfo = new ProcessStartInfo
                {
                    FileName = "ffplay",
                    Arguments = arguments,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    RedirectStandardInput = true,
                    RedirectStandardError = true,
                    RedirectStandardOutput = true
                };

                _audioProcess = Process.Start(startInfo);

                if (_audioProcess == null)
                {
                    throw new InvalidOperationException("Failed to start ffplay process");
                }

                _audioProcess.ErrorDataReceived += (sender, e) =>
                {
                    if (!string.IsNullOrEmpty(e.Data))
                        Console.WriteLine($"ffplay: {e.Data}");
                };
                _audioProcess.BeginErrorReadLine();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to start ffplay: {ex.Message}");
                Console.WriteLine("Please install ffmpeg to enable streaming audio playback.");
            }
        }

        public void Dispose()
        {
            try
            {
                // Cancel buffering operations
                _bufferCts?.Cancel();
                
                // Kill ffplay process if still running
                if (_audioProcess != null && !_audioProcess.HasExited)
                {
                    _audioProcess.Kill();
                }
                
                // Dispose resources
                _audioProcess?.Dispose();
                _audioBuffer?.Dispose();
                _bufferCts?.Dispose();
            }
            catch { }
        }
    }

    private static StreamingAudioPlayer StartAudioPlayer()
    {
        return new StreamingAudioPlayer();
    }

    private static async Task WriteResultToFile(string base64EncodedAudio, string filename, string outputDir)
    {
        var filePath = Path.Combine(outputDir, $"{filename}.wav");
        // Decode the base64-encoded audio data
        var audioData = Convert.FromBase64String(base64EncodedAudio);
        await File.WriteAllBytesAsync(filePath, audioData);
        Console.WriteLine($"Wrote {filePath}");
    }

}
