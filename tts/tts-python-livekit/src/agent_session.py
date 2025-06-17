import sys

from livekit.agents import Agent, AgentSession, JobContext, WorkerOptions, cli
from livekit.agents.stt.stream_adapter import StreamAdapter
from livekit.plugins import hume, groq, anthropic, silero
from livekit.plugins.hume import PostedUtterance

from .constants import (
    AGENT_SESSION_ENV_VARS,
    GREETING,
    HUME_VOICE,
    LLM_MODEL,
    LLM_PROMPT,
    LLM_TEMPERATURE,
    STT_MODEL,
    VAD_SILENCE_DURATION,
    VAD_SPEECH_DURATION,
)
from .utils import validate_env_vars


class VoiceAssistant(Agent):
    """Agent using the voice-assistant prompt."""
    def __init__(self):
        super().__init__(instructions=LLM_PROMPT)


async def entrypoint(ctx: JobContext):
    """Configure and run STT, LLM, and TTS in a LiveKit session."""
    await ctx.connect()

    # Voice-activity detection + buffering for non-streaming STT
    VAD_SPEECH_DURATION = 0.1
    VAD_SILENCE_DURATION = 0.5
    vad = silero.VAD.load(
        min_speech_duration=VAD_SPEECH_DURATION,
        min_silence_duration=VAD_SILENCE_DURATION,
    )

    session = AgentSession(
        vad=vad,
        stt=StreamAdapter(
            stt=groq.STT(model=STT_MODEL, language="en"),
            vad=vad,
        ),
        llm=anthropic.LLM(
            model=LLM_MODEL,
            temperature=LLM_TEMPERATURE,
        ),
        tts=hume.TTS(
            utterance_options=PostedUtterance(voice=HUME_VOICE),
            instant_mode=True,
        ),
    )

    await session.start(agent=VoiceAssistant(), room=ctx.room)
    await session.generate_reply(instructions=GREETING)


def main():
    """Validate environment variables, default to console mode, then launch the worker."""
    validate_env_vars(AGENT_SESSION_ENV_VARS)

    if len(sys.argv) == 1:
        sys.argv.append("console")
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))


if __name__ == "__main__":
    main()
