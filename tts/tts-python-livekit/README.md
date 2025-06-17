<div align="center">
  <img src="https://storage.googleapis.com/hume-public-logos/hume/hume-banner.png">
  <h1>Text-to-Speech | Python LiveKit Agents Example</h1>
</div>

## Overview

This repository provides reference implementations for the [LiveKit Agents Hume 
TTS plugin](https://docs.livekit.io/agents/integrations/tts/hume/) in two distinct workflows:

1. **Agent Sessions**: A real-time conversational assistant powered by LiveKit Agents. Microphone input
   is processed with VAD and speech-to-text, then passed through an LLM, and finally synthesized with Hume TTS. The following models are used in this example:
   - **Speech-to-Text with Voice Activity Detection (VAD)** (Silero VAD + Groq Whisper)
   - **A conversational LLM** (Anthropic Claude Haiku)
   - **Low-latency Text-to-Speech** (Hume AI's streaming API for Octave)

2. **Standalone TTS**: A lightweight terminal REPL. Type any text and press Enter to synthesize and play
   back speech via Hume TTS—no LiveKit room or front-end required.

## Pre-requisites

You’ll need accounts and credentials for:

- **LiveKit**: https://livekit.com
- **Hume AI**: https://platform.hume.ai
- **Anthropic**: https://console.anthropic.com (Agent Session workflow only)
- **Groq**: https://console.groq.com (Agent Session workflow only)

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

   Copy the example and fill in your credentials:

   ```sh
   cp .env.example .env
   ```

   Edit .env to include:

   ```dotenv
   HUME_API_KEY=…        # from Hume AI
   LIVEKIT_URL=…         # your LiveKit deployment URL
   LIVEKIT_API_KEY=…     # your LiveKit API key
   LIVEKIT_API_SECRET=…  # your LiveKit API secret

   # Needed only for Agent Session workflow
   GROQ_API_KEY=…        # from Groq console, only needed for Agent Sessions
   ANTHROPIC_API_KEY=…   # from Anthropic console, only needed for Agent Sessions
   ```

4. **Run the demo**

   **Agent Sessions**:
   
   ```sh
   uv run python agent_session/main.py
   ```

   Speak into your mic; the agent responds with Hume TTS.

   **Standalone TTS**:
   
   ```sh
   uv run python standalone_tts/main.py
   ```

   Type text at the prompt and press Enter to hear it.

   > Tip: Modify voice settings, VAD thresholds, or LLM prompts in the respective settings.py files.
