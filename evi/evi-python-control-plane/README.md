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

This example uses Hume's [Python SDK](https://github.com/HumeAI/hume-python-sdk) to establish a data plane connection (the main chat) and demonstrate control plane operations.

## Quickstart

Visit the [API key page](https://app.hume.ai/keys) on the Hume Platform to retrieve your API key, then [create a configuration](https://platform.hume.ai/evi/configs) and copy its config ID.

```shell
# 1. Clone the examples repo
git clone https://github.com/humeai/hume-api-examples

# 2. Navigate to this example project
cd hume-api-examples/evi/evi-python-control-plane

# 3. Rename .env.example to .env and paste your credentials
# HUME_API_KEY=your_api_key_here
# HUME_CONFIG_ID=your_config_id_here

# 4. Install the dependencies
uv sync

# 5.1.
# Start an EVI chat elsewhere:
# In the Hume playground: https://platform.hume.ai/evi/playground
# Or via a Phone call using Twilio webhook: https://dev.hume.ai/docs/integrations/twilio

# Then run this to connect to the existing chat -- you should see and hear the Control Plane actions from main.py (sending a message, changing the voice) occur shortly after connecting:
uv run main.py --existing

# 5.2.
# Start a new EVI chat and run the control plane demo via terminal:
uv run main.py --new
```

## System dependencies

To ensure audio playback functionality, you will need to install `ffmpeg`:

```bash
brew install ffmpeg
```
