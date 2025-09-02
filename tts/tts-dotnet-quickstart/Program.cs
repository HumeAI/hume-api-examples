using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Threading.Tasks;
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

        // Streaming example with audio playback
        Console.WriteLine("Streaming audio...");
        var voice = new PostedUtteranceVoiceWithName { Name = name };
        
        using var audioPlayer = GetAudioPlayer();
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
            Format = new Format(new Format.Pcm(new FormatPcm()))
        }))
        {
            audioPlayer.SendAudio(Convert.FromBase64String(snippet.Audio));
        }

        await audioPlayer.PlayAll();

        Console.WriteLine("Done");
    }

    // Audio player setup for streaming playback
    // This is only needed for the streaming example below
    public class AudioPlayer : IDisposable
    {
        private readonly List<byte[]> _audioChunks = new();

        public void SendAudio(byte[] audioBytes)
        {
            _audioChunks.Add(audioBytes);
        }

        public async Task PlayAll()
        {
            var allAudioData = _audioChunks.SelectMany(chunk => chunk).ToArray();
            if (allAudioData.Length == 0) return;
            
            var tempFile = Path.GetTempFileName() + ".wav";
            try
            {
                var header = CreateWavHeader(allAudioData.Length);
                var wavData = header.Concat(allAudioData).ToArray();
                File.WriteAllBytes(tempFile, wavData);
                
                await PlayAudioFile(tempFile);
            }
            finally
            {
                try { File.Delete(tempFile); } catch { }
            }
        }

        private async Task PlayAudioFile(string filePath)
        {
            if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            {
                var startInfo = new ProcessStartInfo
                {
                    FileName = "powershell.exe",
                    Arguments = $"-Command \"(New-Object System.Media.SoundPlayer '{filePath}').PlaySync()\"",
                    UseShellExecute = false,
                    CreateNoWindow = true
                };
                using var process = Process.Start(startInfo);
                if (process != null)
                    await process.WaitForExitAsync();
                    
                if (process?.ExitCode != 0)
                {
                    throw new InvalidOperationException($"PowerShell audio playback failed with exit code {process?.ExitCode}");
                }
            }
            else
            {
                var startInfo = new ProcessStartInfo
                {
                    FileName = "ffplay",
                    Arguments = $"-nodisp -autoexit \"{filePath}\"",
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    RedirectStandardError = true
                };
                using var process = Process.Start(startInfo);
                if (process != null)
                    await process.WaitForExitAsync();
                    
                if (process?.ExitCode != 0)
                {
                    throw new InvalidOperationException($"ffplay audio playback failed with exit code {process?.ExitCode}");
                }
            }
        }

        private static byte[] CreateWavHeader(int dataLength)
        {
            var header = new byte[44];
            var writer = new BinaryWriter(new MemoryStream(header));
            
            writer.Write("RIFF".ToCharArray());
            writer.Write(36 + dataLength);
            writer.Write("WAVE".ToCharArray());
            writer.Write("fmt ".ToCharArray());
            writer.Write(16);
            writer.Write((short)1);
            writer.Write((short)1);
            writer.Write(48000);
            writer.Write(96000);
            writer.Write((short)2);
            writer.Write((short)16);
            writer.Write("data".ToCharArray());
            writer.Write(dataLength);
            
            return header;
        }

        public void Dispose()
        {
            // Nothing to clean up now since we use temp files that are auto-deleted
        }
    }

    public class DummyAudioPlayer : AudioPlayer
    {
        public new void SendAudio(byte[] audioBytes)
        {
            Console.WriteLine("Skipping playing back audio chunk...");
        }

        public new Task PlayAll()
        {
            return Task.CompletedTask;
        }
    }

    private static AudioPlayer GetAudioPlayer()
    {
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
        {
            try
            {
                var startInfo = new ProcessStartInfo
                {
                    FileName = "powershell.exe",
                    Arguments = "-Command \"Get-Host\"",
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true
                };
                using var process = Process.Start(startInfo);
                process?.WaitForExit();
                
                if (process?.ExitCode == 0)
                {
                    return new AudioPlayer();
                }
            }
            catch { }
            
            Console.WriteLine("Skipping audio playback. PowerShell is required for audio playback on Windows.");
            return new DummyAudioPlayer();
        }
        else
        {
            try
            {
                var startInfo = new ProcessStartInfo
                {
                    FileName = "which",
                    Arguments = "ffplay",
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true
                };
                using var process = Process.Start(startInfo);
                process?.WaitForExit();
                
                if (process?.ExitCode == 0)
                {
                    return new AudioPlayer();
                }
            }
            catch { }
            
            Console.WriteLine("Skipping audio playback. Install ffplay (from FFmpeg) to enable audio playback.");
            return new DummyAudioPlayer();
        }
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
