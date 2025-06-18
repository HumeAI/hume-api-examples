"""
Shared constants
"""

# Sample rate supported by Hume TTS API
SAMPLE_RATE = 48000

# TTS (text-to-speech)
# Pick a voice in the Hume Voice Library https://platform.hume.ai/tts/voice-library
# Use "HUME_AI" for Hume library voices or "CUSTOM_VOICE" for voices you’ve created
HUME_VOICE = {
    "name": "Male English Actor",
    "provider": "HUME_AI",
}

# Required environment variable sets for workflows
WORKFLOWS = {
    "agent": [
        "HUME_API_KEY",
        "LIVEKIT_URL",
        "LIVEKIT_API_KEY",
        "LIVEKIT_API_SECRET",
        "GROQ_API_KEY",
        "ANTHROPIC_API_KEY",
    ],
    "standalone": [
        "HUME_API_KEY",
        "LIVEKIT_URL",
        "LIVEKIT_API_KEY",
        "LIVEKIT_API_SECRET",
    ],
}
