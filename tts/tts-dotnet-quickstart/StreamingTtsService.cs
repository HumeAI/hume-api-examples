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
    /// Thread-safe async queue implementation.
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
    public class Queue<T>
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

    public class StreamingTtsClient : IDisposable
    {
        private readonly ClientWebSocket _webSocket;
        private readonly string _apiKey;
        private readonly Uri _websocketUri;
        private readonly Queue<string> _queue = new Queue<string>();
        private CancellationTokenSource _cts = new CancellationTokenSource();

        public StreamingTtsClient(string apiKey)
        {
            _apiKey = apiKey;
            _webSocket = new ClientWebSocket();
            // For bidirectional streaming, use PCM format with strip_headers=true
            // to ensure continuous streaming without per-chunk headers
            _websocketUri = new Uri($"wss://api.hume.ai/v0/tts/stream/input?api_key={apiKey}&no_binary=true&instant_mode=true&strip_headers=true&format_type=pcm"); 
        }

        public async Task ConnectAsync()
        {
            try
            {
                await _webSocket.ConnectAsync(_websocketUri, _cts.Token);
                Console.WriteLine("WebSocket connected.");
            }
            catch (WebSocketException ex)
            {
                Console.WriteLine($"WebSocket connection error: {ex.Message}");
                throw;
            }

            _ = Task.Run(async () =>
            {
                var buffer = new byte[8192];
                var messageBuffer = new MemoryStream();
                int messagesReceived = 0;
                try
                {
                    Console.WriteLine("WebSocket receive loop started");
                    while (_webSocket.State == WebSocketState.Open)
                    {
                        var result = await _webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), _cts.Token);

                        if (result.MessageType == WebSocketMessageType.Close)
                        {
                            Console.WriteLine("WebSocket close message received");
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
                            var json = System.Text.Encoding.UTF8.GetString(messageBuffer.ToArray());
                            Console.WriteLine($"WebSocket received message #{messagesReceived}: {json.Substring(0, Math.Min(60, json.Length))}...");
                            _queue.Push(json);
                            messageBuffer.SetLength(0); // Reset the buffer for the next message
                        }
                    }
                    Console.WriteLine($"WebSocket receive loop exited normally. State: {_webSocket.State}, Messages received: {messagesReceived}");
                }
                catch (WebSocketException ex)
                {
                    Console.WriteLine($"WebSocket error in Receive loop: {ex.Message}");
                    _queue.End();
                }
                catch (OperationCanceledException)
                {
                    Console.WriteLine("WebSocket receive loop cancelled");
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
            Console.WriteLine("Starting to receive audio chunks...");
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
                        Console.WriteLine($"Yielding audio chunk #{audioChunkCount}");
                        var chunk = JsonSerializer.Deserialize<SnippetAudioChunk>(item)!;
                        yield return chunk; 
                    }
                    else
                    {
                        Console.WriteLine($"Message #{messageCount} is not an audio chunk (might be timestamp or other message type)");
                    }
                }
            }
            Console.WriteLine($"Finished receiving. Total messages: {messageCount}, Audio chunks: {audioChunkCount}");
        }

        public void Dispose()
        {
            _cts.Cancel();
            _webSocket.Dispose();
            _cts.Dispose();
        }
    }

    public class SilenceFiller : IDisposable
    {
        private readonly BlockingCollection<byte[]> _audioBuffer = new BlockingCollection<byte[]>();
        private readonly CancellationTokenSource _cts = new CancellationTokenSource();
        private Task? _playbackTask;
        private readonly Stream _outputStream;

        public SilenceFiller(Stream outputStream)
        {
            _outputStream = outputStream;
        }

        public void WriteAudio(byte[] audioBytes)
        {
            _audioBuffer.Add(audioBytes);
        }

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
