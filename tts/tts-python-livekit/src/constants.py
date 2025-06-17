# - Audio encoding -
SAMPLE_RATE = 48000 # Hume TTS API supported sample rate
NUM_CHANNELS = 1

# — STT (speech-to-text) — 
STT_MODEL = "whisper-large-v3-turbo"

# — LLM (language model) —
LLM_MODEL = "claude-3-5-haiku-latest"
LLM_TEMPERATURE = 0.5
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

# — Initial greeting —
GREETING = "Say 'Hi there! How can I help you today?'"

# — TTS (text-to-speech) —
# Pick a voice in the Hume Voice Library https://platform.hume.ai/tts/voice-library
# Use "HUME_AI" for Hume library voices or "CUSTOM_VOICE" for voices you’ve created
HUME_VOICE = {
    "name": "Male English Actor",
    "provider": "HUME_AI",
}

# — VAD (voice-activity detection) —
VAD_SPEECH_DURATION = 0.1
VAD_SILENCE_DURATION = 0.5

# - Required environment variable sets -
AGENT_SESSION_ENV_VARS = [
    "HUME_API_KEY",
    "GROQ_API_KEY",
    "ANTHROPIC_API_KEY",
    "LIVEKIT_URL",
    "LIVEKIT_API_KEY",
    "LIVEKIT_API_SECRET",
]
STANDALONE_TTS_ENV_VARS = [
    "HUME_API_KEY",
    "LIVEKIT_URL",
    "LIVEKIT_API_KEY",
    "LIVEKIT_API_SECRET",
]