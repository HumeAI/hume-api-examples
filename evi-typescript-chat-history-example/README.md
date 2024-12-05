<div align="center">
  <img src="https://storage.googleapis.com/hume-public-logos/hume/hume-banner.png">
  <h1>Empathic Voice Interface | Chat History</h1>
  <p>
    <strong>Fetch Chat Events, Generate a Transcript, and Identify Top Emotions</strong>
  </p>
</div>

## Overview

**This project demonstrates how to:**

- Retrieve all chat events for a specified Chat ID from Hume's Empathic Voice Interface (EVI) using the TypeScript SDK.
- Parse user and assistant messages to produce a formatted chat transcript.
- Compute the top three average emotion scores from user messages, leveraging the built-in `EmotionScores` interface.

**Key Features:**

- **Transcript generation:** Outputs a human-readable `.txt` file capturing the conversation between user and assistant.
- **Top 3 emotions:** Identifies the three emotions with the highest average scores across all user messages, returning them as a `Partial<EmotionScores>` object.

## Prerequisites

Ensure your environment meets the following requirements:

- **Node.js**: Version `18.0.0` or higher
- **npm**: Version `8.0.0` or higher

Check versions on macOS:
```sh
node -v
npm -v
```

If you need to update or install Node.js, visit the [official Node.js website](https://nodejs.org/en/).

### Setting up credentials

- **Obtain Your API Key**: Follow the instructions in the Hume documentation to acquire your API key.
- **Create a .env File**: In the project's root directory, create a .env file if it doesn't exist. Add your API key:

```sh
HUME_API_KEY="<YOUR_API_KEY>"
```

Refer to `.env.example` as a template.

### Specifying the Chat ID

In the main function within src/index.ts (or the project's main file), set the `CHAT_ID`` variable to the target conversation ID:

```typescript
async function main(): Promise<void> {
  const CHAT_ID = "<YOUR_CHAT_ID>"; // Replace with your actual Chat ID
  // ...
}
```

This determines which Chat's events to fetch and process.

### Installation and usage

1. **Install dependencies**:
```sh
npm install
```
2. **Run the project**:
```sh
npm run dev
```

#### What happens when run:

- The script fetches all events for the specified CHAT_ID.
- It generates a `transcript_<CHAT_ID>.txt` file containing the user and assistant messages with timestamps.
- It logs the top 3 average emotions to the console:

```json
{
  "Joy": 0.7419108072916666,
  "Interest": 0.63111979166666666,
  "Amusement": 0.63061116536458334
}
```
(These keys and scores are just examples; the actual output depends on the chat's content.)