using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Threading.Tasks;
using System.Collections.Concurrent;
using System.Threading;
using HumeApi;
using HumeApi.Tts;

namespace TtsCsharpQuickstart;

class Program
{
    static async Task Main(string[] args)
    {
        Console.WriteLine("Starting...");
        
        var apiKey = Environment.GetEnvironmentVariable("HUME_API_KEY");
        if (string.IsNullOrEmpty(apiKey))
        {
            throw new InvalidOperationException("HUME_API_KEY not found in environment variables.");
        }

        var client = new HumeApiClient(apiKey);
        
        // Create an output directory in the temporary folder
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        var outputDir = Path.Combine(Path.GetTempPath(), $"hume-audio-{timestamp}");
        Directory.CreateDirectory(outputDir);
        
        Console.WriteLine($"Results will be written to {outputDir}");

        // Synthesizing speech with a new voice
        var speech1 = await client.Tts.SynthesizeJsonAsync(new SynthesizeJsonRequest
        {
            Body = new PostedTts
            {
                Utterances = new List<PostedUtterance>
                {
                    new PostedUtterance
                    {
                        Description = "A refined, British aristocrat",
                        Text = "Take an arrow from the quiver."
                    }
                }
            }
        });

        await WriteResultToFile(speech1.Generations.First().Audio, "speech1_0", outputDir);

        var name = $"aristocrat-{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}";
        
        // Naming the voice and saving it to your voice library
        // for later use
        var generationId = speech1.Generations.First().GenerationId;
        await client.Tts.Voices.CreateAsync(new PostedVoice
        {
            Name = name,
            GenerationId = generationId
        });

        // Continuing previously-generated speech
        var speech2 = await client.Tts.SynthesizeJsonAsync(new SynthesizeJsonRequest
        {
            Body = new PostedTts
            {
                Utterances = new List<PostedUtterance>
                {
                    new PostedUtterance
                    {
                        // Using a voice from your voice library
                        Voice = new PostedUtteranceVoiceWithName { Name = name },
                        Text = "Now take a bow."
                    }
                },
                // Providing previous context to maintain consistency.
                // This should cause "bow" to rhyme with "toe" and not "cow".
                Context = new PostedContextWithGenerationId { GenerationId = generationId },
                NumGenerations = 2
            }
        });

        await WriteResultToFile(speech2.Generations.First().Audio, "speech2_0", outputDir);
        await WriteResultToFile(speech2.Generations.Skip(1).First().Audio, "speech2_1", outputDir);

        // Acting instructions: modulating the speech from a previously-generated voice
        var speech3 = await client.Tts.SynthesizeJsonAsync(new SynthesizeJsonRequest
        {
            Body = new PostedTts
            {
                Utterances = new List<PostedUtterance>
                {
                    new PostedUtterance
                    {
                        Voice = new PostedUtteranceVoiceWithName { Name = name },
                        Description = "Murmured softly, with a heavy dose of sarcasm and contempt",
                        Text = "Does he even know how to use that thing?"
                    }
                },
                Context = new PostedContextWithGenerationId 
                { 
                    GenerationId = speech2.Generations.First().GenerationId 
                },
                NumGenerations = 1
            }
        });

        await WriteResultToFile(speech3.Generations.First().Audio, "speech3_0", outputDir);

        // Streaming example with real-time audio playback
        Console.WriteLine("Streaming audio in real-time...");
        var voice = new PostedUtteranceVoiceWithName { Name = name };
        
        using var streamingPlayer = GetStreamingAudioPlayer();
        await streamingPlayer.StartStreamingAsync();
        
        await foreach (var snippet in client.Tts.SynthesizeJsonStreamingAsync(new PostedTts
        {
            Context = new PostedContextWithGenerationId 
            { 
                GenerationId = speech3.Generations.First().GenerationId 
            },
            Utterances = new List<PostedUtterance>
            {
                new PostedUtterance { Text = "He's drawn the bow...", Voice = voice },
                new PostedUtterance { Text = "he's fired the arrow...", Voice = voice },
                new PostedUtterance { Text = "I can't believe it! A perfect bullseye!", Voice = voice }
            },
            Format = new Format(new Format.Wav()),
            StripHeaders = true,
        }))
        {
            await streamingPlayer.SendAudioAsync(Convert.FromBase64String(snippet.Audio));
        }

        await streamingPlayer.StopStreamingAsync();

        Console.WriteLine("Done");
    }

    // Real-time streaming audio player using pipe-based approach
    public class StreamingAudioPlayer : IDisposable
    {
        private Process? _audioProcess;
        private int _chunkCounter = 0;
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
                
                _audioProcess.ErrorDataReceived += (sender, e) => {
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

    private static StreamingAudioPlayer GetStreamingAudioPlayer()
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
