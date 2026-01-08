using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using UnityEngine;
using Hume;
using Hume.EmpathicVoice;

[RequireComponent(typeof(AudioSource))]
public class HumeEVI : MonoBehaviour
{
    private string apiKey = "YOUR_HUME_API_KEY_HERE";
    public AudioSource audioSource;

    // EVI client and connection
    private HumeClient client;
    private ChatApi chatApi;
    private bool isConnected = false;
    private bool isConversationActive = false;
    private bool isSpeaking = false;

    // Microphone capture
    private AudioClip microphoneClip;
    private string microphoneDevice;
    private bool isRecording = false;
    private int lastMicPosition = 0;
    private const int SampleRate = 48000;
    private const int Channels = 1;
    private const int ChunkDurationMs = 100; // Send audio every 100ms
    private float nextSendTime = 0f;

    // Audio playback buffer - concatenate chunks for seamless playback
    private List<float> audioBuffer = new List<float>();
    private bool isPlayingResponse = false;
    private int playbackPosition = 0;
    private AudioClip streamingClip;
    private const int StreamingClipLength = 48000 * 30; // 30 seconds buffer

    // Events for UI updates
    public event Action<string> OnUserTranscript;
    public event Action<string> OnAssistantMessage;
    public event Action OnConnectionStateChanged;
    public event Action<ConversationState> OnStateChanged;

    public enum ConversationState
    {
        Idle,
        Connecting,
        Listening,
        Speaking
    }

    public bool IsConnected => isConnected;
    public bool IsConversationActive => isConversationActive;
    public bool IsSpeaking => isSpeaking;
    // IsMicrophoneActive indicates if we're actually capturing and sending audio
    public bool IsMicrophoneActive => isRecording && isConnected && !IsPlayingAudio;
    // IsPlayingAudio is true when audio is playing or buffered (used for turn-taking)
    public bool IsPlayingAudio => isPlayingResponse || audioBuffer.Count > playbackPosition;
    public ConversationState CurrentState
    {
        get
        {
            if (!isConversationActive) return ConversationState.Idle;
            if (!isConnected) return ConversationState.Connecting;
            if (IsPlayingAudio) return ConversationState.Speaking;
            return ConversationState.Listening;
        }
    }

    public void SetApiKey(string key)
    {
        apiKey = key;
    }

    void Update()
    {
        // Stream microphone audio while recording, but NOT while audio is playing (turn-taking)
        if (isRecording && isConnected && !IsPlayingAudio && Time.time >= nextSendTime)
        {
            SendMicrophoneAudio();
            nextSendTime = Time.time + (ChunkDurationMs / 1000f);
        }

        // Start playback if we have buffered audio and not already playing
        if (!isPlayingResponse && audioBuffer.Count > playbackPosition)
        {
            StartStreamingPlayback();
        }

        // Check if playback has finished
        if (isPlayingResponse && audioSource != null && !audioSource.isPlaying)
        {
            OnPlaybackFinished();
        }
    }

    void OnDestroy()
    {
        StopConversation();
    }

    public async void StartConversation()
    {
        if (isConversationActive)
        {
            Debug.LogWarning("Conversation already active");
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

        isConversationActive = true;
        OnStateChanged?.Invoke(ConversationState.Connecting);
        OnConnectionStateChanged?.Invoke();

        Debug.Log("Starting EVI conversation...");

        try
        {
            await ConnectToEVI();
            StartMicrophoneCapture();
        }
        catch (Exception ex)
        {
            Debug.LogError($"Failed to start conversation: {ex.Message}");
            isConversationActive = false;
            isConnected = false;
            OnStateChanged?.Invoke(ConversationState.Idle);
            OnConnectionStateChanged?.Invoke();
        }
    }

    public async void StopConversation()
    {
        if (!isConversationActive)
        {
            return;
        }

        Debug.Log("Stopping EVI conversation...");

        StopMicrophoneCapture();

        if (chatApi != null)
        {
            try
            {
                await chatApi.DisposeAsync();
            }
            catch (Exception ex)
            {
                Debug.LogWarning($"Error disposing ChatApi: {ex.Message}");
            }
            chatApi = null;
        }

        client = null;
        isConnected = false;
        isConversationActive = false;
        isSpeaking = false;
        audioBuffer.Clear();
        playbackPosition = 0;

        OnStateChanged?.Invoke(ConversationState.Idle);
        OnConnectionStateChanged?.Invoke();

        Debug.Log("EVI conversation stopped.");
    }

    private async Task ConnectToEVI()
    {
        client = new HumeClient(apiKey);

        chatApi = client.EmpathicVoice.CreateChatApi(new ChatApi.Options
        {
            ApiKey = apiKey,
            SessionSettings = new ConnectSessionSettings(),
        });

        // Subscribe to events
        SubscribeToEvents();

        // Connect to EVI
        Debug.Log("Connecting to EVI...");
        await chatApi.ConnectAsync();
        Debug.Log("Connected to EVI!");

        isConnected = true;
        OnStateChanged?.Invoke(ConversationState.Listening);
        OnConnectionStateChanged?.Invoke();

        // Configure audio format
        var sessionSettings = new SessionSettings
        {
            Audio = new Hume.EmpathicVoice.AudioConfiguration
            {
                Encoding = "linear16",
                SampleRate = SampleRate,
                Channels = Channels
            }
        };

        Debug.Log($"Sending session settings: {SampleRate}Hz, {Channels} channel(s), linear16");
        await chatApi.Send(sessionSettings);
    }

    private void SubscribeToEvents()
    {
        chatApi.AssistantMessage.Subscribe(message =>
        {
            var content = message.Message?.Content ?? "";
            Debug.Log($"Assistant: {content}");

            // Use Unity's main thread for UI updates
            UnityMainThreadDispatcher.Enqueue(() =>
            {
                OnAssistantMessage?.Invoke(content);
            });
        });

        chatApi.UserMessage.Subscribe(message =>
        {
            var content = message.Message?.Content ?? "";
            Debug.Log($"User: {content}");

            UnityMainThreadDispatcher.Enqueue(() =>
            {
                OnUserTranscript?.Invoke(content);
            });
        });

        chatApi.AudioOutput.Subscribe(audio =>
        {
            if (!string.IsNullOrEmpty(audio.Data))
            {
                Debug.Log($"Received audio chunk: {audio.Data.Length} base64 chars");

                UnityMainThreadDispatcher.Enqueue(() =>
                {
                    ProcessAudioOutput(audio.Data);
                });
            }
        });

        chatApi.ChatMetadata.Subscribe(metadata =>
        {
            Debug.Log($"Chat Metadata - Chat ID: {metadata.ChatId}");
        });

        // Subscribe to assistant speaking events for state management
        chatApi.AssistantEnd.Subscribe(_ =>
        {
            UnityMainThreadDispatcher.Enqueue(() =>
            {
                isSpeaking = false;
                // State change will be triggered when audio playback actually finishes
            });
        });
    }

    private void ProcessAudioOutput(string base64Audio)
    {
        try
        {
            byte[] audioBytes = Convert.FromBase64String(base64Audio);

            // Parse WAV header and extract PCM data
            float[] audioData = ConvertWavToFloats(audioBytes);

            if (audioData != null && audioData.Length > 0)
            {
                // Append to buffer for seamless playback
                audioBuffer.AddRange(audioData);

                if (!isSpeaking)
                {
                    isSpeaking = true;
                    OnStateChanged?.Invoke(ConversationState.Speaking);
                }
            }
        }
        catch (Exception ex)
        {
            Debug.LogError($"Error processing audio: {ex.Message}");
        }
    }

    private void StartStreamingPlayback()
    {
        if (audioBuffer.Count <= playbackPosition)
        {
            return;
        }

        // Get all available audio from current position
        int samplesToPlay = audioBuffer.Count - playbackPosition;
        float[] audioData = new float[samplesToPlay];
        audioBuffer.CopyTo(playbackPosition, audioData, 0, samplesToPlay);
        playbackPosition = audioBuffer.Count;

        // Create and play clip
        AudioClip clip = AudioClip.Create("EVIResponse", samplesToPlay / Channels, Channels, SampleRate, false);
        clip.SetData(audioData, 0);

        audioSource.clip = clip;
        audioSource.Play();
        isPlayingResponse = true;
    }

    private void OnPlaybackFinished()
    {
        // Check if more audio arrived while we were playing
        if (audioBuffer.Count > playbackPosition)
        {
            // More audio available, play it
            StartStreamingPlayback();
        }
        else
        {
            // No more audio, we're done
            isPlayingResponse = false;

            // Reset for next response
            audioBuffer.Clear();
            playbackPosition = 0;

            // Reset mic position to avoid sending stale audio captured during playback
            if (microphoneDevice != null && isRecording)
            {
                lastMicPosition = Microphone.GetPosition(microphoneDevice);
            }
            OnStateChanged?.Invoke(ConversationState.Listening);
        }
    }

    #region Microphone Capture

    private void StartMicrophoneCapture()
    {
        if (Microphone.devices.Length == 0)
        {
            Debug.LogError("No microphone detected!");
            return;
        }

        microphoneDevice = Microphone.devices[0];
        Debug.Log($"Using microphone: {microphoneDevice}");

        // Start recording with a looping buffer
        microphoneClip = Microphone.Start(microphoneDevice, true, 1, SampleRate);

        if (microphoneClip == null)
        {
            Debug.LogError("Failed to start microphone - Microphone.Start returned null");
            return;
        }

        // Wait for microphone to start (with timeout)
        int timeout = 100;
        while (Microphone.GetPosition(microphoneDevice) <= 0 && timeout > 0)
        {
            timeout--;
            System.Threading.Thread.Sleep(10);
        }

        if (timeout <= 0)
        {
            Debug.LogError("Microphone failed to start recording (timeout)");
            return;
        }

        isRecording = true;
        lastMicPosition = 0;
        nextSendTime = Time.time;

        Debug.Log("Microphone capture started.");
    }

    private void StopMicrophoneCapture()
    {
        if (isRecording)
        {
            Microphone.End(microphoneDevice);
            isRecording = false;

            if (microphoneClip != null)
            {
                Destroy(microphoneClip);
                microphoneClip = null;
            }

            Debug.Log("Microphone capture stopped.");
        }
    }

    private async void SendMicrophoneAudio()
    {
        if (microphoneClip == null || chatApi == null || !isConnected)
        {
            return;
        }

        int currentPosition = Microphone.GetPosition(microphoneDevice);

        if (currentPosition == lastMicPosition)
        {
            return;
        }

        // Calculate samples to read
        int samplesToRead;
        if (currentPosition > lastMicPosition)
        {
            samplesToRead = currentPosition - lastMicPosition;
        }
        else
        {
            // Wrapped around
            samplesToRead = (microphoneClip.samples - lastMicPosition) + currentPosition;
        }

        if (samplesToRead <= 0)
        {
            return;
        }

        // Read audio data
        float[] samples = new float[samplesToRead * Channels];

        if (currentPosition > lastMicPosition)
        {
            microphoneClip.GetData(samples, lastMicPosition);
        }
        else
        {
            // Handle wrap-around
            int firstPart = microphoneClip.samples - lastMicPosition;
            float[] firstSamples = new float[firstPart * Channels];
            float[] secondSamples = new float[currentPosition * Channels];

            microphoneClip.GetData(firstSamples, lastMicPosition);
            microphoneClip.GetData(secondSamples, 0);

            Array.Copy(firstSamples, 0, samples, 0, firstSamples.Length);
            Array.Copy(secondSamples, 0, samples, firstSamples.Length, secondSamples.Length);
        }

        lastMicPosition = currentPosition;

        // Convert to PCM 16-bit and send
        byte[] pcmData = ConvertFloatsToPCM(samples);
        string base64Audio = Convert.ToBase64String(pcmData);

        try
        {
            await chatApi.Send(new AudioInput { Data = base64Audio });
        }
        catch (Exception ex)
        {
            Debug.LogError($"Error sending audio: {ex.Message}");
        }
    }

    #endregion

    #region Audio Conversion

    /// <summary>
    /// Parses WAV file bytes and extracts PCM data as float array.
    /// Handles standard WAV headers.
    /// </summary>
    private float[] ConvertWavToFloats(byte[] wavBytes)
    {
        // Minimum WAV header size
        if (wavBytes.Length < 44)
        {
            Debug.LogWarning("Audio data too small for WAV header, treating as raw PCM");
            return ConvertS16LEToFloats(wavBytes);
        }

        // Check for RIFF header
        string riff = System.Text.Encoding.ASCII.GetString(wavBytes, 0, 4);
        if (riff != "RIFF")
        {
            Debug.LogWarning("No RIFF header found, treating as raw PCM");
            return ConvertS16LEToFloats(wavBytes);
        }

        // Check for WAVE format
        string wave = System.Text.Encoding.ASCII.GetString(wavBytes, 8, 4);
        if (wave != "WAVE")
        {
            Debug.LogWarning("No WAVE format found, treating as raw PCM");
            return ConvertS16LEToFloats(wavBytes);
        }

        // Find the data chunk
        int dataOffset = 12;
        int dataSize = 0;
        int sampleRate = SampleRate;
        int channels = Channels;
        int bitsPerSample = 16;

        while (dataOffset < wavBytes.Length - 8)
        {
            string chunkId = System.Text.Encoding.ASCII.GetString(wavBytes, dataOffset, 4);
            int chunkSize = BitConverter.ToInt32(wavBytes, dataOffset + 4);

            if (chunkId == "fmt ")
            {
                // Parse format chunk
                int audioFormat = BitConverter.ToInt16(wavBytes, dataOffset + 8);
                channels = BitConverter.ToInt16(wavBytes, dataOffset + 10);
                sampleRate = BitConverter.ToInt32(wavBytes, dataOffset + 12);
                bitsPerSample = BitConverter.ToInt16(wavBytes, dataOffset + 22);

                Debug.Log($"WAV format: {sampleRate}Hz, {channels} channel(s), {bitsPerSample}-bit");
            }
            else if (chunkId == "data")
            {
                dataOffset += 8; // Move past chunk header
                dataSize = chunkSize;
                break;
            }

            dataOffset += 8 + chunkSize;

            // Ensure even alignment
            if (chunkSize % 2 != 0)
            {
                dataOffset++;
            }
        }

        if (dataSize == 0 || dataOffset >= wavBytes.Length)
        {
            Debug.LogWarning("Could not find data chunk, treating as raw PCM");
            return ConvertS16LEToFloats(wavBytes);
        }

        // Extract PCM data
        int actualDataSize = Math.Min(dataSize, wavBytes.Length - dataOffset);
        byte[] pcmData = new byte[actualDataSize];
        Array.Copy(wavBytes, dataOffset, pcmData, 0, actualDataSize);

        // Convert based on bits per sample
        if (bitsPerSample == 16)
        {
            return ConvertS16LEToFloats(pcmData);
        }
        else if (bitsPerSample == 8)
        {
            return ConvertU8ToFloats(pcmData);
        }
        else
        {
            Debug.LogWarning($"Unsupported bits per sample: {bitsPerSample}, assuming 16-bit");
            return ConvertS16LEToFloats(pcmData);
        }
    }

    /// <summary>
    /// Converts 16-bit signed little-endian PCM to float array (-1.0 to 1.0).
    /// </summary>
    private float[] ConvertS16LEToFloats(byte[] bytes)
    {
        float[] floats = new float[bytes.Length / 2];

        for (int i = 0; i < floats.Length; i++)
        {
            short sample = (short)(bytes[i * 2] | (bytes[i * 2 + 1] << 8));
            floats[i] = sample / 32768f;
        }

        return floats;
    }

    /// <summary>
    /// Converts 8-bit unsigned PCM to float array (-1.0 to 1.0).
    /// </summary>
    private float[] ConvertU8ToFloats(byte[] bytes)
    {
        float[] floats = new float[bytes.Length];

        for (int i = 0; i < bytes.Length; i++)
        {
            floats[i] = (bytes[i] - 128) / 128f;
        }

        return floats;
    }

    /// <summary>
    /// Converts Unity float audio samples to 16-bit PCM bytes for streaming to EVI.
    /// </summary>
    private byte[] ConvertFloatsToPCM(float[] samples)
    {
        byte[] pcmData = new byte[samples.Length * 2];

        for (int i = 0; i < samples.Length; i++)
        {
            // Clamp to valid range
            float sample = Mathf.Clamp(samples[i], -1f, 1f);

            // Convert to 16-bit signed
            short pcmSample = (short)(sample * 32767f);

            // Write as little-endian
            pcmData[i * 2] = (byte)(pcmSample & 0xFF);
            pcmData[i * 2 + 1] = (byte)((pcmSample >> 8) & 0xFF);
        }

        return pcmData;
    }

    #endregion
}

/// <summary>
/// Helper class to dispatch actions to Unity's main thread.
/// EVI events come from background threads and Unity APIs must be called from the main thread.
/// </summary>
public class UnityMainThreadDispatcher : MonoBehaviour
{
    private static UnityMainThreadDispatcher instance;
    private static readonly Queue<Action> executionQueue = new Queue<Action>();

    void Awake()
    {
        if (instance == null)
        {
            instance = this;
            DontDestroyOnLoad(gameObject);
        }
        else if (instance != this)
        {
            Destroy(gameObject);
        }
    }

    void Update()
    {
        lock (executionQueue)
        {
            while (executionQueue.Count > 0)
            {
                executionQueue.Dequeue().Invoke();
            }
        }
    }

    public static void Enqueue(Action action)
    {
        if (action == null) return;

        lock (executionQueue)
        {
            executionQueue.Enqueue(action);
        }
    }

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
    private static void Initialize()
    {
        if (instance == null)
        {
            var go = new GameObject("UnityMainThreadDispatcher");
            instance = go.AddComponent<UnityMainThreadDispatcher>();
            DontDestroyOnLoad(go);
        }
    }
}
