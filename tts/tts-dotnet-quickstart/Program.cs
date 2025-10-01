using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Threading;
using Hume;
using Hume.Tts;
using System.Collections.Generic;
using TtsCsharpQuickstart;

namespace TtsCsharpQuickstart;

class Program
{
    private static string? _apiKey;
    private static HumeClient? _client;
    private static string? _outputDir;

    static async Task RunExamplesAsync()
    {
        Console.WriteLine("Starting...");

        _apiKey = Environment.GetEnvironmentVariable("HUME_API_KEY");
        if (string.IsNullOrEmpty(_apiKey))
        {
            throw new InvalidOperationException("HUME_API_KEY not found in environment variables.");
        }

        _client = new HumeClient(_apiKey);

        // Create an output directory in the temporary folder
        _outputDir = Path.Combine(Path.GetTempPath(), "hume-audio");
        Directory.CreateDirectory(_outputDir);

        Console.WriteLine($"Results will be written to {_outputDir}");

        // await Example1Async();
        // await Example2Async();
        await Example3Async();

        Console.WriteLine("Done");
    }

    static async Task Main(string[] args)
    {
        await RunExamplesAsync();
    }

    /** Example 1: Using a pre-existing voice.
    *
    * Use this method if you want to synthesize speech with a high-quality voice from
    * Hume's Voice Library, or specify `provider: 'CUSTOM_VOICE'` to use a voice that
    * you created previously via the Hume Platform or the API.
    * */
    static async Task Example1Async()
    {
        Console.WriteLine("Example 1: Synthesizing audio using a pre-existing voice...");

        var voice = new PostedUtteranceVoiceWithName
        {
            Name = "Ava Song",
            Provider = new VoiceProvider(Hume.Tts.VoiceProvider.Values.HumeAi)
        };

        using var streamingPlayer = StartAudioPlayer();
        await streamingPlayer.StartStreamingAsync();

        await foreach (var snippet in _client!.Tts.SynthesizeJsonStreamingAsync(new PostedTts
        {
            Utterances = new List<PostedUtterance>
            {
                new PostedUtterance { Text = "Dogs became domesticated between 23,000 and 30,000 years ago.", Voice = voice },
            },
            Format = new Format(new Format.Wav()),
            // With `stripHeaders: true`, only the first audio chunk will contain
            // headers in container formats (wav, mp3). This allows you to start a
            // single audio player and stream all audio chunks to it without artifacts.
            StripHeaders = true,
        }))
        {
            await streamingPlayer.SendAudioAsync(Convert.FromBase64String(snippet.Audio));
        }

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

        var stream = (System.Collections.Generic.IAsyncEnumerable<SnippetAudioChunk>)_client!.Tts.SynthesizeJsonStreamingAsync(new PostedTts
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
        });

        await foreach (var snippet in stream)
        {
            await streamingPlayer2.SendAudioAsync(Convert.FromBase64String(snippet.Audio));
        }
        await streamingPlayer2.StopStreamingAsync();
        Console.WriteLine("Done!");
    }

    static async Task Example3Async()
    {
        Console.WriteLine("Example 3: Bidirectional streaming...");

        using var streamingTtsClient = new StreamingTtsClient(_apiKey!);
        await streamingTtsClient.ConnectAsync();

        using var audioPlayer = StartAudioPlayer();
        using var silenceFiller = new SilenceFiller(audioPlayer.StandardInput!);
        silenceFiller.Start();

        var sendInputTask = Task.Run(async () =>
        {
            await streamingTtsClient.SendAsync(new { Utterances = new List<PostedUtterance> { new PostedUtterance { Text = "Hello world." } } });
            await streamingTtsClient.SendFlushAsync();
            Console.WriteLine("Waiting 8 seconds...");
            await Task.Delay(8000);
            await streamingTtsClient.SendAsync(new { Utterances = new List<PostedUtterance> { new PostedUtterance { Text = "Goodbye, world." } } });
            await streamingTtsClient.SendFlushAsync();
            await streamingTtsClient.SendCloseAsync();
        });

        var handleMessagesTask = Task.Run(async () =>
        {
            Console.WriteLine("Playing audio: Example 3 - Bidirectional streaming");
            await foreach (var chunk in streamingTtsClient.ReceiveAudioChunksAsync())
            {
                var buf = Convert.FromBase64String(chunk.Audio);
                silenceFiller.WriteAudio(buf);
            }
            await silenceFiller.EndStreamAsync();
            await audioPlayer.StopStreamingAsync();
        });

        await Task.WhenAll(sendInputTask, handleMessagesTask);

        Console.WriteLine("Done!");
    }

    // Real-time streaming audio player using pipe-based approach
    public class StreamingAudioPlayer : IDisposable
    {
        private Process? _audioProcess;
        public Stream? StandardInput { get; private set; }
        private bool _isStreaming = false;

        public Task StartStreamingAsync()
        {
            _isStreaming = true;
            StartAudioProcess();
            Console.WriteLine("Streaming audio player started...");
            return Task.CompletedTask;
        }

        public Task SendAudioAsync(byte[] audioBytes)
        {
            if (!_isStreaming || _audioProcess?.HasExited != false) return Task.CompletedTask;

            try
            {
                _audioProcess?.StandardInput.BaseStream.Write(audioBytes, 0, audioBytes.Length);
                _audioProcess?.StandardInput.BaseStream.Flush();
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
                var startInfo = new ProcessStartInfo
                {
                    FileName = "ffplay",
                    Arguments = "-nodisp -autoexit -infbuf -i -",
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

                StandardInput = _audioProcess.StandardInput.BaseStream;

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
                if (_audioProcess != null && !_audioProcess.HasExited)
                {
                    _audioProcess.Kill();
                }
                _audioProcess?.Dispose();
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
