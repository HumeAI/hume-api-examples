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
    public class Queue<T>
    {
        private readonly List<T> _pushed = new List<T>();
        private TaskCompletionSource<T?>? _waiting = null;
        private bool _ended = false;

        public void Push(T x)
        {
            if (_ended) return;
            if (_waiting != null)
            {
                _waiting.SetResult(x);
                _waiting = null;
            }
            else _pushed.Add(x);
        }

        public void End()
        {
            if (_ended) return;
            _ended = true;
            if (_waiting != null) { _waiting.SetResult(default); _waiting = null; }
        }

        public async IAsyncEnumerable<T> GetAsyncEnumerable()
        {
            while (true)
            {
                if (_pushed.Any())
                {
                    var item = _pushed[0];
                    _pushed.RemoveAt(0);
                    yield return item;
                }
                else
                {
                    _waiting = new TaskCompletionSource<T?>();
                    var x = await _waiting.Task;
                    if (x == null) break;
                    if (x is T concreteX) yield return concreteX;
                    else throw new InvalidOperationException("Received null from queue when a non-null value was expected.");
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
                try
                {
                    while (_webSocket.State == WebSocketState.Open)
                    {
                        var result = await _webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), _cts.Token);

                        if (result.MessageType == WebSocketMessageType.Close)
                        {
                            await _webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Server closed", _cts.Token);
                            _queue.End();
                            break;
                        }

                        var json = System.Text.Encoding.UTF8.GetString(buffer, 0, result.Count);
                        _queue.Push(json);
                    }
                }
                catch (WebSocketException ex)
                {
                    Console.WriteLine($"WebSocket error in Receive loop: {ex.Message}");
                    _queue.End();
                }
                catch (OperationCanceledException)
                {
                    _queue.End();
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
            await foreach (var item in _queue.GetAsyncEnumerable())
            {
                using (JsonDocument doc = JsonDocument.Parse(item))
                {
                    if (doc.RootElement.TryGetProperty("audio", out JsonElement audioElement))
                    {
                        // It's an audio chunk, deserialize and yield
                        var chunk = JsonSerializer.Deserialize<SnippetAudioChunk>(item)!;
                        yield return chunk; 
                    }
                }
            }
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
