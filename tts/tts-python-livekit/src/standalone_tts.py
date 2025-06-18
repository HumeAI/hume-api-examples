"""
Standalone TTS demo for Hume LiveKit Agents TTS plugin.
"""
import asyncio

import simpleaudio as sa
from aiohttp import ClientSession
from livekit.plugins.hume import PostedUtterance, TTS

from constants import HUME_VOICE, SAMPLE_RATE

NUM_CHANNELS = 1

async def synthesize_text(text: str, session: ClientSession) -> bytes:
    """
    Synthesize `text` via the LiveKit Agents Hume TTS plugin using a shared
    aiohttp session and return raw PCM bytes.
    """
    pcm_buf = bytearray()
    tts = TTS(
        utterance_options=PostedUtterance(voice=HUME_VOICE),
        instant_mode=True,
        sample_rate=SAMPLE_RATE,
        http_session=session,
    )
    async for chunk in tts.synthesize(text):
        pcm_buf.extend(chunk.frame.data)
    return bytes(pcm_buf)


def play_audio(pcm: bytes) -> None:
    """
    Play back raw PCM bytes.
    """
    sa.play_buffer(
        pcm,
        num_channels=NUM_CHANNELS, # mono
        bytes_per_sample=2,        # 16-bit
        sample_rate=SAMPLE_RATE,   # 48 kHz
    ).wait_done()

async def interactive_repl() -> None:
    """
    Prompt the user for text, synthesize it, and play back audio.
    Reuses a single aiohttp session across multiple requests.
    Exit on blank input or Ctrl-C/Ctrl-D.
    """
    print("Enter text (blank to quit):")
    async with ClientSession() as session:
        while True:
            try:
                user_input = await asyncio.to_thread(input, "> ")
            except (KeyboardInterrupt, EOFError):
                break

            text = user_input.strip()
            if not text:
                break

            try:
                pcm = await synthesize_text(text, session)
                play_audio(pcm)
            except Exception as err:
                print(f"[Error] Could not synthesize/play: {err}")


def standalone_tts() -> None:
    """
    Run the asynchronous REPL for standalone TTS.
    """
    asyncio.run(interactive_repl())
