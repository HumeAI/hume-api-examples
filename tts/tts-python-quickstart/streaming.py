
import asyncio
import json
from typing import AsyncGenerator, Dict, Any
import websockets
from hume.tts import PublishTts, SnippetAudioChunk

class StreamingTtsClient:
    def __init__(self, websocket: websockets.WebSocketClientProtocol):
        self._websocket: websockets.WebSocketClientProtocol = websocket
        self._message_queue = asyncio.Queue()

    @classmethod
    async def connect(cls, api_key: str) -> "StreamingTtsClient":
        client = await websockets.connect(
            f"wss://api.hume.ai/v0/tts/stream/input?api_key={api_key}&instant_mode=true&strip_headers=true&no_binary=true"
        )
        ret = cls(client)
        try:
            asyncio.create_task(ret._message_handler())
        except (websockets.exceptions.InvalidURI, websockets.exceptions.InvalidHandshake) as e:
            raise RuntimeError(f"Failed to connect to WebSocket: {e}") from e
        return ret

    async def _message_handler(self):
        try:
            while True:
                message = await self._websocket.recv()
                try:
                    parsed_json = json.loads(message)
                    chunk = SnippetAudioChunk.model_validate(parsed_json)
                    await self._message_queue.put(chunk)
                except Exception as parse_error:
                    print(f"Error parsing message: {parse_error}")
                    print(f"Raw message was: {message}")
        except websockets.exceptions.ConnectionClosed:
            print("WebSocket connection closed")
            await self._message_queue.put(None)  # Signal end of stream
        except Exception as e:
            print(f"Error in message handler: {e}")
            await self._message_queue.put(None)

    async def __aiter__(self) -> AsyncGenerator[SnippetAudioChunk, None]:
        while True:
            message = await self._message_queue.get()
            if message is None:
                break
            yield message

    def send(self, tts: PublishTts):
        message = tts.json()
        print(f"Sending TTS message: {message}")
        asyncio.create_task(self._websocket.send(message))

    async def _send_dict(self, message: Dict[str, Any]):
        await self._websocket.send(json.dumps(message))


    async def close(self):
        if self._websocket and not self._websocket.closed:
            await self._websocket.close()
