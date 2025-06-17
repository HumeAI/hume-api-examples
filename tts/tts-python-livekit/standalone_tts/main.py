import os
import sys
import asyncio

import aiohttp
import simpleaudio as sa
from dotenv import load_dotenv
from livekit.plugins import hume
from livekit.plugins.hume import PostedUtterance

from constants import HUME_VOICE, NUM_CHANNELS, SAMPLE_RATE
from utils import validate_env_vars


async def async_main():
    # Create an HTTP session for the plugin
    async with aiohttp.ClientSession() as http_session:
        # Configure the Hume plugin
        tts = hume.TTS(
            utterance_options=PostedUtterance(voice=HUME_VOICE),
            instant_mode=True,
            sample_rate=SAMPLE_RATE,
            http_session=http_session,
        )

        print("Enter text input (blank line to quit):")
        loop = asyncio.get_event_loop()

        while True:
            # Prompt for text input
            text = await loop.run_in_executor(None, input, "> ")
            text = text.strip()
            if not text:
                print("End")
                break

            # Synthesize + buffer all PCM
            pcm_buf = bytearray()
            stream = tts.synthesize(text)
            async for chunk in stream:
                pcm_buf.extend(chunk.frame.data)

            # Play back audio
            sa.play_buffer(
                pcm_buf,
                num_channels=NUM_CHANNELS, # mono
                bytes_per_sample=2,        # 16-bit
                sample_rate=SAMPLE_RATE,   # 48kHz
            ).wait_done()


if __name__ == "__main__":
    # Fail quickly if missing required environment variables
    validate_env_vars()

    asyncio.run(async_main())
