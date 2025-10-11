using System;
using System.Collections.Generic;
using System.Collections.Concurrent;
using System.IO;
using System.Linq;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Hume.Tts;

namespace TtsCsharpQuickstart
{
    /// <summary>
    /// Thread-safe async queue implementation for WebSocket message handling.
    /// 
    /// Race Condition Fix: This queue is accessed from multiple threads:
    /// 1. The WebSocket receive loop (background thread) calls Push()
    /// 2. The ReceiveAudioChunksAsync() enumerator (foreground thread) calls GetAsyncEnumerable()
    /// 
    /// Without proper locking, these concurrent accesses caused a race condition where audio chunks
    /// were lost (only 1 out of 22 chunks was being yielded). The lock ensures all state (_pushed,
    /// _waiting, _ended) is accessed atomically. TaskCompletionSource is completed outside the lock
    /// to avoid potential deadlocks.
    /// </summary>
    internal class Queue<T>
    {
        private readonly object _lock = new object();
        private readonly List<T> _pushed = new List<T>();
        private TaskCompletionSource<T?>? _waiting = null;
        private bool _ended = false;

        public void Push(T x)
        {
            TaskCompletionSource<T?>? toComplete = null;
            lock (_lock)
            {
                if (_ended) return;
                if (_waiting != null)
                {
                    toComplete = _waiting;
                    _waiting = null;
                }
                else _pushed.Add(x);
            }
            // Complete outside the lock to avoid potential deadlocks
            toComplete?.SetResult(x);
        }

        public void End()
        {
            TaskCompletionSource<T?>? toComplete = null;
            lock (_lock)
            {
                if (_ended) return;
                _ended = true;
                if (_waiting != null)
                {
                    toComplete = _waiting;
                    _waiting = null;
                }
            }
            // Complete outside the lock
            toComplete?.SetResult(default);
        }

        public async IAsyncEnumerable<T> GetAsyncEnumerable()
        {
            while (true)
            {
                T? item = default;
                bool hasItem = false;
                TaskCompletionSource<T?>? tcs = null;

                lock (_lock)
                {
                    if (_pushed.Any())
                    {
                        item = _pushed[0];
                        _pushed.RemoveAt(0);
                        hasItem = true;
                    }
                    else if (!_ended)
                    {
                        _waiting = new TaskCompletionSource<T?>();
                        tcs = _waiting;
                    }
                }

                if (hasItem)
                {
                    yield return item!;
                }
                else if (tcs != null)
                {
                    var x = await tcs.Task;
                    if (x == null) break;
                    if (x is T concreteX) yield return concreteX;
                    else throw new InvalidOperationException("Received null from queue when a non-null value was expected.");
                }
                else
                {
                    // Queue ended and no more items
                    break;
                }
            }
        }
    }

    /// <summary>
    /// WebSocket client for bidirectional streaming TTS.
    /// Handles connection management, message sending/receiving, and audio chunk streaming.
    /// </summary>
    public class StreamingTtsClient : IDisposable
    {
        private const int WebSocketBufferSize = 8192;
        private const string WebSocketEndpoint = "wss://api.hume.ai/v0/tts/stream/input";
        
        private readonly ClientWebSocket _webSocket;
        private readonly string _apiKey;
        private readonly Uri _websocketUri;
        private readonly Queue<string> _queue = new Queue<string>();
        private readonly bool _enableDebugLogging;
        private CancellationTokenSource _cts = new CancellationTokenSource();

        /// <summary>
        /// Creates a new StreamingTtsClient for bidirectional TTS streaming.
        /// </summary>
        /// <param name="apiKey">Your Hume API key</param>
        /// <param name="enableDebugLogging">Enable verbose logging for debugging (default: false)</param>
        public StreamingTtsClient(string apiKey, bool enableDebugLogging = false)
        {
            _apiKey = apiKey;
            _enableDebugLogging = enableDebugLogging;
            _webSocket = new ClientWebSocket();
            
            // For bidirectional streaming, use PCM format with strip_headers=true
            // to ensure continuous streaming without per-chunk headers
            _websocketUri = new Uri($"{WebSocketEndpoint}?api_key={apiKey}&no_binary=true&instant_mode=true&strip_headers=true&format_type=pcm"); 
        }

        public async Task ConnectAsync()
        {
            try
            {
                await _webSocket.ConnectAsync(_websocketUri, _cts.Token);
                LogDebug("WebSocket connected.");
            }
            catch (WebSocketException ex)
            {
                Console.WriteLine($"WebSocket connection error: {ex.Message}");
                throw;
            }

            _ = Task.Run(async () =>
            {
                var buffer = new byte[WebSocketBufferSize];
                var messageBuffer = new MemoryStream();
                int messagesReceived = 0;
                try
                {
                    LogDebug("WebSocket receive loop started");
                    while (_webSocket.State == WebSocketState.Open)
                    {
                        var result = await _webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), _cts.Token);

                        if (result.MessageType == WebSocketMessageType.Close)
                        {
                            LogDebug("WebSocket close message received");
                            await _webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Server closed", _cts.Token);
                            _queue.End();
                            break;
                        }

                        // Write the received chunk to the message buffer
                        messageBuffer.Write(buffer, 0, result.Count);

                        // Check if this is the end of the message
                        if (result.EndOfMessage)
                        {
                            messagesReceived++;
                            var json = Encoding.UTF8.GetString(messageBuffer.ToArray());
                            LogDebug($"Received message #{messagesReceived}");
                            _queue.Push(json);
                            messageBuffer.SetLength(0); // Reset the buffer for the next message
                        }
                    }
                    LogDebug($"WebSocket receive loop exited. State: {_webSocket.State}, Messages: {messagesReceived}");
                }
                catch (WebSocketException ex)
                {
                    Console.WriteLine($"WebSocket error: {ex.Message}");
                    _queue.End();
                }
                catch (OperationCanceledException)
                {
                    LogDebug("WebSocket receive loop cancelled");
                    _queue.End();
                }
                finally
                {
                    messageBuffer.Dispose();
                }
            });
        }

        public async Task SendAsync(object message)
        {
            if (_webSocket.State != WebSocketState.Open) throw new InvalidOperationException("WebSocket not connected.");
            var jsonMessage = JsonSerializer.Serialize(message);
            var bytes = System.Text.Encoding.UTF8.GetBytes(jsonMessage);
            await _webSocket.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, _cts.Token);
        }

        public async Task SendFlushAsync()
        {
            if (_webSocket.State != WebSocketState.Open) throw new InvalidOperationException("WebSocket not connected.");
            await SendAsync(new { flush = true }); 
        }

        public async Task SendCloseAsync()
        {
            if (_webSocket.State != WebSocketState.Open) throw new InvalidOperationException("WebSocket not connected.");
            await SendAsync(new { close = true });
        }

        public async IAsyncEnumerable<SnippetAudioChunk> ReceiveAudioChunksAsync()
        {
            LogDebug("Starting to receive audio chunks...");
            int messageCount = 0;
            int audioChunkCount = 0;
            
            await foreach (var item in _queue.GetAsyncEnumerable())
            {
                messageCount++;
                using (JsonDocument doc = JsonDocument.Parse(item))
                {
                    if (doc.RootElement.TryGetProperty("audio", out JsonElement audioElement))
                    {
                        // It's an audio chunk, deserialize and yield
                        audioChunkCount++;
                        LogDebug($"Yielding audio chunk #{audioChunkCount}");
                        var chunk = JsonSerializer.Deserialize<SnippetAudioChunk>(item)!;
                        yield return chunk; 
                    }
                    else
                    {
                        // Non-audio messages (e.g., timestamps) are silently ignored
                        LogDebug($"Message #{messageCount} is not an audio chunk");
                    }
                }
            }
            
            LogDebug($"Finished receiving. Total messages: {messageCount}, Audio chunks: {audioChunkCount}");
        }

        private void LogDebug(string message)
        {
            if (_enableDebugLogging)
            {
                Console.WriteLine($"[StreamingTtsClient] {message}");
            }
        }

        public void Dispose()
        {
            _cts.Cancel();
            _webSocket.Dispose();
            _cts.Dispose();
        }
    }

    /// <summary>
    /// Buffers and streams audio chunks to an output stream in a continuous manner.
    /// Prevents audio playback gaps by maintaining a buffer between audio chunk arrival
    /// and playback. Useful for real-time streaming scenarios where chunks may arrive
    /// with slight delays.
    /// </summary>
    public class SilenceFiller : IDisposable
    {
        private readonly BlockingCollection<byte[]> _audioBuffer = new BlockingCollection<byte[]>();
        private readonly CancellationTokenSource _cts = new CancellationTokenSource();
        private Task? _playbackTask;
        private readonly Stream _outputStream;

        /// <summary>
        /// Creates a new SilenceFiller that writes audio to the specified output stream.
        /// </summary>
        /// <param name="outputStream">The stream to write audio data to (typically ffplay's stdin)</param>
        public SilenceFiller(Stream outputStream)
        {
            _outputStream = outputStream;
        }

        /// <summary>
        /// Adds an audio chunk to the buffer for playback.
        /// </summary>
        public void WriteAudio(byte[] audioBytes)
        {
            _audioBuffer.Add(audioBytes);
        }

        /// <summary>
        /// Starts the background task that continuously writes buffered audio to the output stream.
        /// </summary>
        public void Start()
        {
            _playbackTask = Task.Run(async () =>
            {
                try
                {
                    foreach (var audio in _audioBuffer.GetConsumingEnumerable(_cts.Token))
                    {
                        await _outputStream.WriteAsync(audio, _cts.Token);
                        await _outputStream.FlushAsync(_cts.Token);
                    }
                }
                catch (OperationCanceledException)
                {
                    // Expected when _cts.Cancel() is called
                }
            });
        }

        /// <summary>
        /// Signals that no more audio will be added and waits for all buffered audio to be written.
        /// </summary>
        public async Task EndStreamAsync()
        {
            _audioBuffer.CompleteAdding();
            if (_playbackTask != null) await _playbackTask;
        }

        public void Dispose()
        {
            _cts.Cancel();
            _audioBuffer.Dispose();
            _cts.Dispose();
        }
    }
}
