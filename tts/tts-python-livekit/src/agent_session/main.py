#!/usr/bin/env python3
"""
Agent Session demo for Hume LiveKit Agents TTS plugin.
"""
import sys

from livekit.agents import Agent, AgentSession, JobContext, WorkerOptions, cli
from livekit.agents.stt.stream_adapter import StreamAdapter
from livekit.plugins.anthropic import LLM
from livekit.plugins.groq import STT
from livekit.plugins.hume import TTS, VoiceByName, VoiceProvider
from livekit.plugins.silero import VAD

from src.agent_session.constants import SYSTEM_PROMPT, GREETING_INSTRUCTIONS
from src.utils import validate_env_vars

class VoiceAssistant(Agent):
    """
    Agent using the voice-assistant prompt.
    """
    def __init__(self):
        super().__init__(instructions=SYSTEM_PROMPT)


async def entrypoint(ctx: JobContext) -> None:
    """
    Configure and run STT, LLM, and TTS in a LiveKit session.
    """
    await ctx.connect()

    # Voice-activity detection + buffering for non-streaming STT
    vad = VAD.load(
        min_speech_duration=0.1, 
        min_silence_duration=0.5
    )

    session = AgentSession(
        vad=vad,
        stt=StreamAdapter(
            stt=STT(
                model="whisper-large-v3-turbo", 
                language="en",
            ),
            vad=vad,
        ),
        llm=LLM(
            model="claude-3-5-haiku-latest", 
            temperature=0.5,
        ),
        tts=TTS(
            voice=VoiceByName(
                name="Male English Actor",
                provider=VoiceProvider.hume,
            ), 
            instant_mode=True
        ),
    )

    await session.start(agent=VoiceAssistant(), room=ctx.room)
    await session.generate_reply(instructions=GREETING_INSTRUCTIONS)


if __name__ == "__main__":
    """
    Validate environment variables, default to console mode, then launch the worker.
    """
    validate_env_vars([
        "HUME_API_KEY",
        "LIVEKIT_URL",
        "LIVEKIT_API_KEY",
        "LIVEKIT_API_SECRET",
        "GROQ_API_KEY",
        "ANTHROPIC_API_KEY",
    ])

    if len(sys.argv) == 1:
        sys.argv.append("console")

    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
