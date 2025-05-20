<div align="center">
  <img src="https://storage.googleapis.com/hume-public-logos/hume/hume-banner.png">
  <h1>Text-to-Speech | Python LiveKit Agents Example</h1>
</div>

## Overview

This example demonstrates how to use the **Hume Python LiveKit plugin** to integrate:

1. **VAD-powered streaming STT** (Silero VAD + Groq Whisper)
2. **A conversational LLM** (Anthropic Claude Haiku)
3. **Low-latency TTS** (Hume’s streaming API)

…inside a LiveKit Agents worker that runs in **console mode** by default. No front-end required—just your terminal and microphone.

## Instructions

1. **Clone this examples repository**

   ```sh
   git clone https://github.com/humeai/hume-api-examples
   cd hume-api-examples/tts/tts-python-livekit
   ```

2. **Set up the environment**

   We recommend `uv` but you can adapt these commands to your preferred package manager.

   ```sh
   uv sync
   ```

3. **Configure your API keys**

   You’ll need accounts and credentials for:

   - **Hume AI**: https://platform.hume.ai
   - **Anthropic**: https://console.anthropic.com
   - **Groq**: https://console.groq.com
   - **LiveKit**: https://livekit.com

   Copy the example and fill in your credentials:

   ```sh
   cp .env.example .env
   ```

   Edit .env to include:

   ```dotenv
   HUME_API_KEY=…        # from Hume AI
   GROQ_API_KEY=…        # from Groq console
   ANTHROPIC_API_KEY=…   # from Anthropic console
   LIVEKIT_URL=…         # your LiveKit deployment URL
   LIVEKIT_API_KEY=…     # your LiveKit API key
   LIVEKIT_API_SECRET=…  # your LiveKit API secret
   ```

4. **Run the demo**

   Start the console-based assistant and begin talking:

   ```sh
   uv run python main.py
   ```

   Speak into your mic and the assistant will respond.

   > **Optional**: Tweak additional demo settings in settings.py (e.g. models, prompt, voice, VAD thresholds).
