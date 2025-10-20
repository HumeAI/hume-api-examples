#!/usr/bin/env python3
"""
Standalone TTS demo for Hume LiveKit Agents TTS plugin.
"""
import asyncio

from aiohttp import ClientSession
from livekit.plugins.hume import AudioFormat, TTS, VoiceByName, VoiceProvider
from simpleaudio import play_buffer

from src.utils import validate_env_vars


async def synthesize_text(text: str, session: ClientSession) -> bytes:
    """
    Synthesize `text` via the LiveKit Agents Hume TTS plugin using a shared
    aiohttp session and return raw PCM bytes.
    """
    pcm_buf = bytearray()
    tts = TTS(
        voice=VoiceByName(
            name="Male English Actor",
            provider=VoiceProvider.hume,
        ),
        instant_mode=True,
        audio_format=AudioFormat.wav,
        http_session=session,
        # use Octave 2 (preview): https://dev.hume.ai/docs/text-to-speech-tts/overview#octave-versions
        model_version="2",
    )
    async for chunk in tts.synthesize(text):
        pcm_buf.extend(chunk.frame.data)

    return bytes(pcm_buf)


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
                play_buffer(
                    pcm,
                    num_channels=1,     # mono
                    bytes_per_sample=2,  # 16-bit
                    sample_rate=48000,  # 48 kHz
                ).wait_done()
            except Exception as err:
                print(f"[Error] Could not synthesize/play: {err}")


if __name__ == "__main__":
    """
    Validate environment variables then run the asynchronous REPL for standalone TTS.
    """
    validate_env_vars([
        "HUME_API_KEY",
        "LIVEKIT_URL",
        "LIVEKIT_API_KEY",
        "LIVEKIT_API_SECRET",
    ])

    asyncio.run(interactive_repl())
