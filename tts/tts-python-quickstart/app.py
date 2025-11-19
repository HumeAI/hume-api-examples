import asyncio
import base64
import os
import time
from hume import AsyncHumeClient
from hume.tts import (
    PostedUtterance,
    PostedUtteranceVoiceWithName,
    PostedContextWithGenerationId,
    PublishTts,
)
from hume.empathic_voice.chat.audio.audio_utilities import play_audio_streaming, play_audio
from dotenv import load_dotenv

load_dotenv()

# Initialize the Hume client
api_key = os.getenv("HUME_API_KEY")
if not api_key:
    raise EnvironmentError("HUME_API_KEY not found in environment variables.")

hume = AsyncHumeClient(api_key=api_key)


# Example 3: Bidirectional streaming
# This example uses the StreamingTtsClient defined in streaming.py to
# connect to the /v0/tts/stream/input endpoint.
#
# Native support in the Hume Python SDK is coming soon.
async def example():
    assert api_key, "HUME_API_KEY not found in environment variables."
    hume = AsyncHumeClient(api_key=api_key)
    async with hume.tts.stream_input.connect(version="1", no_binary=True, strip_headers=True) as stream:
        async def send_text_and_log(text: str):
            print(f"Sending text: {text}")
            await stream.send_publish(PublishTts(text=text, voice=PostedUtteranceVoiceWithName(name="Ava Song", provider="HUME_AI")))
    
        async def send_input():
            print("Sending TTS messages...")
            await send_text_and_log("Hello, I am simulating sending various amounts of text through the Web Socket.")
            await asyncio.sleep(.2)
            await send_text_and_log("In a real application this would likely originate from an LLM.")
            await asyncio.sleep(.8)
            await send_text_and_log("But for our purposes, it will suffice to just send a few hard-coded messages")
            await asyncio.sleep(.3)
            await send_text_and_log("Thank you for your attention to this matter.")

            await stream.send_publish(PublishTts(flush=True))
            print("Pausing for 3 seconds...")
            await asyncio.sleep(3)
            print("Sending more TTS messages after a short pause...")
            await send_text_and_log("I have paused a little bit.")
            await asyncio.sleep(.2)
            await send_text_and_log("Pausing for a bit is important to test different patterns of sending and receiving data.")
            await asyncio.sleep(.8)
            await send_text_and_log("It's dangerous to assume that data will always arrive in a continuous stream.")
            await asyncio.sleep(.3)
            await send_text_and_log("But with proper testing, we can ensure that our services are robust.")
            await stream.send_publish(PublishTts(flush=True))
            await asyncio.sleep(5)
            await stream.send_publish(PublishTts(close=True))
        
        async def handle_messages():
            await play_audio_streaming(base64.b64decode(chunk.audio) async for chunk in stream)
    
        await asyncio.gather(handle_messages(), send_input())

async def main():
    await example()


if __name__ == "__main__":
    asyncio.run(main())
