<div align="center">
  <img src="https://storage.googleapis.com/hume-public-logos/hume/hume-banner.png">
  <h1>Empathic Voice Interface | Control Plane Example</h1>
  <p>
    <strong>Control active EVI chats from a trusted backend using the control plane API</strong>
  </p>
</div>

## Overview

This project demonstrates how to use Hume's EVI Control Plane API to:

- **Send control messages** to an active chat (`POST /chat/:chatId/send`)
  - Update session settings (system prompt, voice ID, etc.)
  - Set supplemental LLM API keys
  - Send user messages
- **Observe active chats** (`WSS /chat/:chatId/connect`)
  - Receive full chat history on connect
  - Stream live events in real-time
  - Mirror chats for analytics, moderation, or logging

The control plane works alongside your active Chat's data plane, allowing you to update session settings and attach mirrors from trusted servers without exposing secrets or disrupting the live stream.

## Prerequisites

- **Node.js**: Version `18.0.0` or higher
- **npm** or **pnpm**: For package management
- **Active EVI Chat**: You need an active chat and its `chatId` to use the control plane

## Setup Instructions

1. **Install dependencies:**

   ```bash
   npm install
   # or
   pnpm install
   ```

2. **Set your API key:**

   Create a `.env` file in the project root:

   ```sh
   HUME_API_KEY="your_api_key_here"
   ```

   Or you can set it directly in the code (not recommended for production).

## Usage

### Getting a Chat ID

Before you can use the control plane, you need an active chat ID. You can get one by:

1. **Starting a chat** using the [EVI TypeScript Quickstart](https://github.com/HumeAI/hume-api-examples/tree/main/evi/evi-typescript-quickstart) example
2. **Getting the chatId** from the `chat_metadata` event when the chat starts
3. **Using the chat history API** to find an active chat

### Running the Examples

Run the control plane examples:

```bash
npm run dev <chatId>
```

For example:

```bash
npm run dev abc123-def456-ghi789
```

### Example 1: Sending Control Messages

The example demonstrates how to:

- **Update system prompt**: Change the assistant's behavior mid-chat
- **Update session settings**: Change voice ID, temperature, etc.
- **Set supplemental LLM API key**: Rotate or set API keys server-side
- **Send user messages**: Post messages to the chat from your backend

### Example 2: Observing Active Chat

The example demonstrates how to:

- **Connect to an existing chat** using its `chatId`
- **Receive full chat history** when you first connect
- **Stream live events** as they happen in real-time
- **Handle different event types**: user messages, assistant messages, audio output, errors, etc.

## Code Examples

### Send Control Message

```typescript
import { HumeClient } from "hume";

const client = new HumeClient({ apiKey: "your-api-key" });

// Update system prompt
await client.empathicVoice.chat.send({
  chatId: "your-chat-id",
  message: {
    type: "session_settings",
    session_settings: {
      system_prompt: "You are a helpful assistant.",
    },
  },
});
```

### Observe Active Chat

```typescript
import { HumeClient } from "hume";

const client = new HumeClient({ apiKey: "your-api-key" });

const socket = client.empathicVoice.chat.connect({ chatId: "your-chat-id" });

socket.on("open", () => {
  console.log("Connected to chat");
});

socket.on("message", (event) => {
  console.log("Received event:", event.type);
  // Handle different event types
});
```

## Key Features

- **Server-side control**: Update chat settings without exposing secrets to the client
- **Real-time observation**: Mirror active chats for analytics, moderation, or logging
- **Full history replay**: Get complete chat history when connecting
- **Bi-directional**: Send control messages (except audio_input) through the observation socket

## Important Notes

- The control plane only works with **currently active chats**
- Use the [chat history APIs](https://dev.hume.ai/reference/speech-to-speech-evi/chats/list-chats) to fetch transcripts for past sessions
- You cannot send `audio_input` through the control plane or observation socket
- Authentication uses the same API key as your EVI chat connection

## Learn More

- [Control Plane Documentation](https://dev.hume.ai/docs/empathic-voice-interface-evi/control-plane)
- [EVI Quickstart Guide](https://dev.hume.ai/docs/empathic-voice-interface-evi/quickstart/typescript)
- [API Reference](https://dev.hume.ai/reference/speech-to-speech-evi)
