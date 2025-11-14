<div align="center">
  <img src="https://storage.googleapis.com/hume-public-logos/hume/hume-banner.png">
  <h1>Empathic Voice Interface | Python Control Plane Example</h1>
  <p>
    <strong>Demonstrate control plane features for Hume's Empathic Voice Interface!</strong>
  </p>
</div>

## Overview

This project demonstrates how to use the [EVI Control Plane](https://dev.hume.ai/docs/speech-to-speech-evi/guides/control-plane) to control and observe active EVI chats from a trusted backend. The control plane allows you to:

- **Post messages to an active chat** - Update session settings, send user input, or modify configuration without exposing secrets on the client
- **Connect to an existing chat** - Attach a secondary connection to observe, analyze, or moderate a chat session in real-time

This example uses Hume's [Python SDK](https://github.com/HumeAI/hume-python-sdk) to establish a data plane connection (the main chat) and then demonstrates control plane operations.

## What this example demonstrates

When you run the script, it will:

1. **Establish a data plane connection** - Creates the main EVI Chat connection (the reference Chat connection that carries live audio and assistant responses) with microphone input and audio output
2. **Capture the chatId** - Once the Chat is established, it captures the `chatId` from the `chat_metadata` event. This is required for control plane operations.
3. **Demonstrate control plane features**:
   - **Post messages to an active Chat** - Uses `POST /v0/evi/chat/:chatId/send` to send a user input message to the active Chat
   - **Update session settings** - Updates the system prompt and voice via the control plane API without exposing secrets on the client
   - **Connect to an existing Chat** - Connects to the Chat using `WSS /v0/evi/chat/:chatId/connect` to observe it in real-time, receiving the full session history on connect, then streaming new messages live

## Quickstart

Visit the [API key page](https://platform.hume.ai/settings/keys) on the Hume Platform to retrieve your API key.

```shell
# 1. Rename .env.example to .env and paste your credentials
# HUME_API_KEY=your_api_key_here
# HUME_CONFIG_ID=your_config_id_here

# 2. Clone the examples repo
git clone https://github.com/humeai/hume-api-examples

# 3. Navigate to this example project
cd hume-api-examples/evi/evi-python-controlplane

# 4.
uv sync
uv run python main.py
```

## System dependencies

To ensure audio playback functionality, you will need to install `ffmpeg`:

```bash
brew install ffmpeg
```
