using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using Hume.Tts;
using Hume;

[RequireComponent(typeof(AudioSource))]
public class HumeSpeaker : MonoBehaviour
{
    private string apiKey = "YOUR_HUME_API_KEY_HERE";
    public AudioSource audioSource;
    public string textToSpeak = "";
    
    public void SetApiKey(string key)
    {
        apiKey = key;
    }

    public async void Speak()
    {
        if (textToSpeak == "")
        {
            return;
        }
        if (string.IsNullOrEmpty(apiKey) || apiKey == "YOUR_HUME_API_KEY_HERE")
        {
            Debug.LogError("Please set your Hume API key in the Inspector!");
            return;
        }
        if (audioSource == null)
        {
            audioSource = GetComponent<AudioSource>();
        }

        var client = new HumeClient(apiKey);

        var result = await client.Tts.SynthesizeJsonAsync(new PostedTts
            {
                Format = new Hume.Tts.Format.Pcm(),
                Utterances = new List<PostedUtterance>()
                {
                    new PostedUtterance
                    {
                        Text = textToSpeak,
                        Voice = new PostedUtteranceVoiceWithName
                        {
                            Name = "Fastidious Robo-Butler",
                            Provider = VoiceProvider.HumeAi
                        },
                    }
                }
            }
        );

        AudioClip clip = ConvertBase64ToAudioClip(result.Generations.First().Audio);
        audioSource.clip = clip;
        audioSource.Play();
    }
    private AudioClip ConvertBase64ToAudioClip(string base64Audio)
    {
        byte[] audioBytes = Convert.FromBase64String(base64Audio);
        
        Debug.Log($"Audio data length: {audioBytes.Length} bytes");
        
        // Based on your ffplay command: s16le format
        int sampleRate = 44000;  // From your ffplay command
        int channels = 1;        // Assuming mono, adjust if needed
        
        // Convert 16-bit signed little-endian to float array
        float[] audioData = ConvertS16LEToFloats(audioBytes);
        
        AudioClip clip = AudioClip.Create("HumeSpeech", audioData.Length / channels, channels, sampleRate, false);
        clip.SetData(audioData, 0);
        
        Debug.Log($"AudioClip created: {clip.length} seconds, {clip.frequency}Hz, {clip.channels} channels");
        
        return clip;
    }
    
    private float[] ConvertS16LEToFloats(byte[] bytes)
    {
        // Convert 16-bit signed little-endian PCM to float array
        float[] floats = new float[bytes.Length / 2];
        
        for (int i = 0; i < floats.Length; i++)
        {
            // Read 16-bit signed little-endian
            short sample = (short)(bytes[i * 2] | (bytes[i * 2 + 1] << 8));
            floats[i] = sample / 32768f; // Convert to -1.0 to 1.0 range
        }
        
        return floats;
    }

}
