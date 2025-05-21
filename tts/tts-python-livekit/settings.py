"""Settings for the LiveKit Agents demo."""

# — STT (speech-to-text) — 
# The Groq Whisper model used for transcribing incoming audio
STT_MODEL = "whisper-large-v3-turbo"


# — LLM (language model) —
# The Anthropic Claude model for generating replies
LLM_MODEL = "claude-3-5-haiku-latest"
# How "creative" the LLM should be: 0.0 = fully deterministic, higher = more varied
LLM_TEMPERATURE = 0.5
# The system prompt passed to the LLM at startup to set persona & tone
LLM_PROMPT = """\
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


# — TTS (text-to-speech) —
# Pick a voice in the Hume Voice Library
# https://platform.hume.ai/tts/voice-library
# Use "HUME_AI" for Hume library voices or "CUSTOM_VOICE" for voices you’ve created
HUME_VOICE = {
    "name": "Male English Actor",
    "provider": "HUME_AI",
}


# — Initial greeting —
# The exact text the agent will speak on startup
GREETING = "Say 'Hi there! How can I help you today?'"


# — VAD (voice-activity detection) —
# Minimum seconds of continuous speech before sending to STT
VAD_SPEECH_DURATION = 0.1
# Minimum seconds of silence to mark the end of a speech segment
VAD_SILENCE_DURATION = 0.5
