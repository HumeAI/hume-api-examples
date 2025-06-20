<div align="center">
  <img src="https://storage.googleapis.com/hume-public-logos/hume/hume-banner.png">
  <h1>Text-to-Speech | Python LiveKit Agents Example</h1>
</div>

## Overview

This repository provides reference implementations for the [LiveKit Agents Hume 
TTS plugin](https://docs.livekit.io/agents/integrations/tts/hume/) in two distinct workflows:

1. **Standalone TTS**: A lightweight terminal REPL. Type any text and press Enter to synthesize and play
   back speech via Hume TTS—no LiveKit room or front-end required.

2. **Agent Sessions**: A real-time conversational assistant powered by LiveKit Agents. Microphone input
   is processed with VAD and speech-to-text, then passed through an LLM, and finally synthesized with Hume TTS. The following models are used in this example:
   - **Speech-to-Text with Voice Activity Detection (VAD)** (Silero VAD + Groq Whisper)
   - **A conversational LLM** (Anthropic Claude Haiku)
   - **Low-latency Text-to-Speech** (Hume AI's streaming API for Octave)

## Pre-requisites

You’ll need accounts and credentials for:

- **Hume AI**: https://platform.hume.ai
- **LiveKit**: https://livekit.com

If using the Agent Session workflow you will additionally need accounts and credentials for:
- **Anthropic**: https://console.anthropic.com
- **Groq**: https://console.groq.com

## Instructions

1. **Clone this examples repository**

   ```sh
   git clone https://github.com/humeai/hume-api-examples
   cd hume-api-examples/tts/tts-python-livekit
   ```

2. **Set up the environment**

   We recommend `uv`, but you can adapt the install dependencies command to your preferred package manager.

   ```sh
   uv sync
   ```

3. **Configure your API keys**

   Copy the example and fill in your credentials:

   ```sh
   cp .env.example .env
   ```

   Edit `.env` to include:

   ```dotenv
   # Required for Standalone TTS & Agent Session workflows:
   HUME_API_KEY=…        # from Hume AI
   LIVEKIT_URL=…         # your LiveKit deployment URL
   LIVEKIT_API_KEY=…     # your LiveKit API key
   LIVEKIT_API_SECRET=…  # your LiveKit API secret

   # Only required for Agent Session workflow:
   GROQ_API_KEY=…        # from Groq console, only needed for Agent Sessions
   ANTHROPIC_API_KEY=…   # from Anthropic console, only needed for Agent Sessions
   ```

4. **Run the demo**

   **Standalone TTS**:
   
   ```sh
   uv run python -m src.standalone_tts.main
   ```

   Type text at the prompt and press Enter to hear it.

   **Agent Sessions**:
   
   ```sh
   uv run python -m src.agent_session.main
   ```

   Speak into your mic; the agent responds with Hume TTS.