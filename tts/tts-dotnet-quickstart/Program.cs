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
using Hume.Tts;
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

        await Example1Async();
        await Example2Async();
        await Example3Async();

        Console.WriteLine("Done");
    }

    static async Task Main(string[] args)
    {
        await RunExamplesAsync();
    }

    /// <summary>
    /// Example 1: Using a pre-existing voice.
    /// 
    /// Use this method if you want to synthesize speech with a high-quality voice from
    /// Hume's Voice Library, or specify `provider: 'CUSTOM_VOICE'` to use a voice that
    /// you created previously via the Hume Platform or the API.
    /// </summary>
    static async Task Example1Async()
    {
        Console.WriteLine("Example 1: Synthesizing audio using a pre-existing voice...");

        var voice = new PostedUtteranceVoiceWithName
        {
            Name = DefaultVoiceName,
            Provider = new VoiceProvider(Hume.Tts.VoiceProvider.Values.HumeAi)
        };

        using var streamingPlayer = StartAudioPlayer();
        await streamingPlayer.StartStreamingAsync();

        var ttsRequest = new PostedTts
        {
            Utterances = new List<PostedUtterance>
            {
                new PostedUtterance { Text = "Dogs became domesticated between 23,000 and 30,000 years ago.", Voice = voice },
            },
            // With `stripHeaders: true`, only the first audio chunk will contain
            // headers in container formats (wav, mp3). This allows you to start a
            // single audio player and stream all audio chunks to it without artifacts.
            StripHeaders = true,
        };

        await StreamAudioToPlayerAsync(_client!.Tts.SynthesizeJsonStreamingAsync(ttsRequest), streamingPlayer);
        await streamingPlayer.StopStreamingAsync();
        Console.WriteLine("Done!");
    }

    /** Example 2: Voice Design.
    * 
    * This method demonstrates how you can create a custom voice via the API.
    * First, synthesize speech by specifying a `description` prompt and characteristic
    * sample text. Specify the generation_id of the resulting audio in a subsequent
    * call to create a voice. Then, future calls to tts endpoints can specify the
    * voice by name or generation_id.
    */
    static async Task Example2Async()
    {
        Console.WriteLine("Example 2: Voice Design - Creating a custom voice...");

        var result1 = await _client!.Tts.SynthesizeJsonAsync(new PostedTts
        {
            Utterances = new List<PostedUtterance>
            {
                new PostedUtterance
                {
                    Description = "Crisp, upper-class British accent with impeccably articulated consonants and perfectly placed vowels. Authoritative and theatrical, as if giving a lecture.",
                    Text = "The science of speech. That's my profession; also my hobby. Happy is the man who can make a living by his hobby!"
                }
            },
            NumGenerations = 2,
            StripHeaders = true,
        });

        Console.WriteLine("Example 2: Synthesizing voice options for voice creation...");
        using var audioPlayer = StartAudioPlayer();
        await audioPlayer.StartStreamingAsync();

        int sampleNumber = 1;
        var generationsList = result1.Generations.ToList();
        foreach (var generation in generationsList)
        {
            await audioPlayer.SendAudioAsync(Convert.FromBase64String(generation.Audio));
            Console.WriteLine($"Playing option {sampleNumber}...");
            sampleNumber++;
        }
        await audioPlayer.StopStreamingAsync();

        // Prompt user to select which voice they prefer
        Console.WriteLine("\nWhich voice did you prefer?");
        Console.WriteLine($"1. First voice (generation ID: {generationsList[0].GenerationId})");
        Console.WriteLine($"2. Second voice (generation ID: {generationsList[1].GenerationId})");

        string? userChoice;
        int selectedIndex;
        do
        {
            Console.Write("Enter your choice (1 or 2): ");
            userChoice = Console.ReadLine();
        } while (!int.TryParse(userChoice, out selectedIndex) || (selectedIndex != 1 && selectedIndex != 2));

        var selectedGenerationId = generationsList[selectedIndex - 1].GenerationId;
        Console.WriteLine($"Selected voice option {selectedIndex} (generation ID: {selectedGenerationId})");

        // Save the selected voice
        var voiceName = $"higgins-{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}";
        await _client!.Tts.Voices.CreateAsync(new PostedVoice
        {
            Name = voiceName,
            GenerationId = selectedGenerationId,
        });

        Console.WriteLine($"Created voice: {voiceName}");

        Console.WriteLine($"Continuing speech with the selected voice: {voiceName}");

        using var streamingPlayer2 = StartAudioPlayer();
        await streamingPlayer2.StartStreamingAsync();

        var continuationRequest = new PostedTts
        {
            Utterances = new List<PostedUtterance>
            {
                new PostedUtterance
                {
                    Voice = new PostedUtteranceVoiceWithName { Name = voiceName },
                    Text = "YOU can spot an Irishman or a Yorkshireman by his brogue. I can place any man within six miles. I can place him within two miles in London. Sometimes within two streets.",
                    Description = "Bragging about his abilities"
                }
            },
            Context = new PostedContextWithGenerationId
            {
                GenerationId = selectedGenerationId
            },
            StripHeaders = true,
        };

        await StreamAudioToPlayerAsync(_client!.Tts.SynthesizeJsonStreamingAsync(continuationRequest), streamingPlayer2);
        await streamingPlayer2.StopStreamingAsync();
        Console.WriteLine("Done!");
    }

    /// <summary>
    /// Example 3: Bidirectional streaming.
    /// 
    /// Demonstrates how to use WebSocket-based streaming for real-time text-to-speech.
    /// This allows you to send text incrementally and receive audio chunks as they're generated,
    /// enabling low-latency conversational experiences.
    /// </summary>
    static async Task Example3Async()
    {
        Console.WriteLine("Example 3: Bidirectional streaming...");

        using var streamingTtsClient = new StreamingTtsClient(_apiKey!, enableDebugLogging: true);
        await streamingTtsClient.ConnectAsync();

        // Use buffered mode for bidirectional streaming to handle irregular chunk arrival timing
        using var audioPlayer = new StreamingAudioPlayer(usePcmFormat: true, useBuffering: true);
        await audioPlayer.StartStreamingAsync();

        // Task 1: Send text input to the TTS service
        var sendInputTask = Task.Run(async () =>
        {
            await streamingTtsClient.SendAsync(new { text = "Hello" });
            await streamingTtsClient.SendAsync(new { text = " world." });
            // The whitespace    ^ is important, otherwise the model would see
            // "Helloworld." and not "Hello world."
            await streamingTtsClient.SendFlushAsync();
            
            // Simulate a delay before continuing the conversation
            await Task.Delay(TimeSpan.FromSeconds(VoiceCreationDelaySeconds));
            
            await streamingTtsClient.SendAsync(new { text = " Goodbye, world." });
            // Flush to ensure text is processed, then close
            // The server will send all remaining audio chunks before closing
            await streamingTtsClient.SendFlushAsync();
            await streamingTtsClient.SendCloseAsync();
        });

        // Task 2: Receive and play audio chunks as they arrive
        var handleMessagesTask = Task.Run(async () =>
        {
            Console.WriteLine("Playing audio: Example 3 - Bidirectional streaming");
            await foreach (var chunk in streamingTtsClient.ReceiveAudioChunksAsync())
            {
                var audioBytes = Convert.FromBase64String(chunk.Audio);
                await audioPlayer.SendAudioAsync(audioBytes);
            }
            await audioPlayer.StopStreamingAsync();
        });

        // Wait for both tasks to complete
        // The send task sends close, and the receive task processes all audio until connection closes
        await Task.WhenAll(sendInputTask, handleMessagesTask);

        Console.WriteLine("Done!");
    }

    /// <summary>
    /// Helper method to stream audio chunks from a TTS response to an audio player.
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
                        int chunkCount = 0;
                        foreach (var audioBytes in _audioBuffer.GetConsumingEnumerable(_bufferCts.Token))
                        {
                            if (_audioProcess?.StandardInput?.BaseStream != null && !_audioProcess.HasExited)
                            {
                                chunkCount++;
                                Console.WriteLine($"[BufferTask] Writing chunk #{chunkCount} to ffplay ({audioBytes.Length} bytes)");
                                await _audioProcess.StandardInput.BaseStream.WriteAsync(audioBytes, _bufferCts.Token);
                                await _audioProcess.StandardInput.BaseStream.FlushAsync(_bufferCts.Token);
                            }
                        }
                        Console.WriteLine($"[BufferTask] Finished writing all chunks (total: {chunkCount})");
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
            if (!_isStreaming)
            {
                Console.WriteLine("[AudioPlayer] Warning: Received audio chunk but streaming is stopped");
                return Task.CompletedTask;
            }

            if (audioBytes.Length == 0)
            {
                return Task.CompletedTask;
            }

            try
            {
                if (_useBuffering && _audioBuffer != null)
                {
                    _audioBuffer.Add(audioBytes);
                }
                else if (_audioProcess?.HasExited == false)
                {
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
                    // Mark buffer as complete - no more chunks will be added
                    _audioBuffer.CompleteAdding();
                    // Wait for buffer task to finish writing all queued chunks to ffplay
                    if (_bufferTask != null)
                    {
                        await _bufferTask;
                    }
                    // Give ffplay additional time to play all buffered audio before closing input stream
                    // This ensures "Goodbye, world." audio chunks are fully played
                    await Task.Delay(TimeSpan.FromSeconds(5));
                }
                
                // Close ffplay process input stream - ffplay will finish playing all buffered audio then exit
                if (_audioProcess != null && !_audioProcess.HasExited)
                {
                    _audioProcess.StandardInput.Close();
                    // Wait for ffplay to finish playing all buffered audio (without -autoexit, it will exit when stream ends)
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

}
