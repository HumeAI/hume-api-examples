"""
Agent Session demo for Hume LiveKit Agents TTS plugin.
"""
import sys

from livekit.agents import Agent, AgentSession, JobContext, WorkerOptions, cli
from livekit.agents.stt.stream_adapter import StreamAdapter
from livekit.plugins.anthropic import LLM
from livekit.plugins.groq import STT
from livekit.plugins.hume import PostedUtterance, TTS
from livekit.plugins.silero import VAD

from constants import HUME_VOICE, SAMPLE_RATE

VAD_SPEECH_DURATION = 0.1
VAD_SILENCE_DURATION = 0.5
STT_MODEL = "whisper-large-v3-turbo"
STT_LANGUAGE = "en"
LLM_MODEL = "claude-3-5-haiku-latest"
LLM_TEMPERATURE = 0.5
SYSTEM_PROMPT = """\
VOICE ASSISTANT GUIDELINES

CORE IDENTITY:
- Helpful, professional voice assistant communicating via audio
- Warm, conversational tone using short, clear sentences
- No references to underlying model or implementation

INTERACTION PATTERN:
- Keep responses concise (~50 words/30 seconds of spoken audio)
- Provide longer responses only when explicitly requested
- Ask one focused follow-up question if user request is unclear
- When interrupted, stop immediately and respond to new input

INFORMATION HANDLING:
- Prioritize accuracy over completeness
- Acknowledge uncertainty rather than guessing
- When unsure, offer to suggest next steps
"""
GREETING_INSTRUCTIONS = "Say 'Hi there! How can I help you today?'"

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
        min_speech_duration=VAD_SPEECH_DURATION, 
        min_silence_duration=VAD_SILENCE_DURATION
    )

    session = AgentSession(
        vad=vad,
        stt=StreamAdapter(
            stt=STT(model=STT_MODEL, language=STT_LANGUAGE),
            vad=vad,
        ),
        llm=LLM(model=LLM_MODEL, temperature=LLM_TEMPERATURE),
        tts=TTS(
            utterance_options=PostedUtterance(voice=HUME_VOICE),
            instant_mode=True,
            sample_rate=SAMPLE_RATE,
        ),
    )

    await session.start(agent=VoiceAssistant(), room=ctx.room)
    await session.generate_reply(instructions=GREETING_INSTRUCTIONS)

def agent_session() -> None:
    """
    Default to console mode then launch the worker.
    """
    if len(sys.argv) == 1:
        sys.argv.append("console")
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
