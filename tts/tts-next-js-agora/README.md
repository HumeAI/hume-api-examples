<div align="center">
  <img src="https://storage.googleapis.com/hume-public-logos/hume/hume-banner.png">
  <h1>Text-to-Speech | Agora Conversational AI Example</h1>
  <p>
    <strong>Real-time voice conversation with AI using Hume TTS and Agora's Conversational AI Engine</strong>
  </p>
</div>

![preview.png](preview.png)

## Overview

This example demonstrates how to build a real-time voice conversation application using [Hume AI TTS](https://dev.hume.ai/docs/text-to-speech-tts/overview) integrated with [Agora's Conversational AI Engine](https://www.agora.io/en/products/conversational-ai-engine/). The application enables bidirectional voice communication with an AI assistant, where your speech is transcribed and the AI's responses are converted to natural speech using Hume's expressive voice models.

## What this example demonstrates

- **Real-time voice conversation** - Speak to an AI assistant and receive audio responses
- **Hume TTS integration** - AI responses are converted to speech using Hume's voice models
- **Live transcription** - See real-time text transcripts of both your speech and AI responses
- **WebRTC audio streaming** - Low-latency audio communication powered by Agora

## Quickstart

Visit the [Hume Platform](https://platform.hume.ai/settings/keys) and [Agora Console](https://console.agora.io/) to retrieve your API keys.

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp env.example .env.local
# Edit .env.local and add your credentials:
# - Agora App ID, Certificate, Customer ID, and Secret
# - Hume API Key and Voice ID
# - OpenAI API Key (for LLM)

# 3. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser and start a conversation!
