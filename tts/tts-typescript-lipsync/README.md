<div align="center">
  <img src="https://storage.googleapis.com/hume-public-logos/hume/hume-banner.png">
  <h1>Hume Text-to-Speech Using Phoneme Timestamp for Lip Sync | </h1>
  <p>
    <strong>Sync mouth animations with Hume's TTS API!</strong>
  </p>
</div>

## Overview

This project demonstrates how to consume the phoneme-level timestamps from Hume's [Text-to-Speech API](https://dev.hume.ai/docs/text-to-speech/overview) to create synchronized mouth animations.

## Prerequisites

- [Node.js](https://nodejs.org/en) (`v18.0.0` or higher)
- [pnpm](https://pnpm.io/installation) (`v8.0.0` or higher)

Get your API key from the [Hume portal](https://hume.docs.buildwithfern.com/docs/introduction/getting-your-api-key) and add it to a `.env` file:

```sh
VITE_HUME_API_KEY="<YOUR_API_KEY>"
```

See [`.env.example`](./.env.example) for reference.

## Run

1. `pnpm i`
2. `pnpm dev`
3. Visit `localhost:5173`

## Usage

Enter text and click "Synthesize" to generate speech with a synchronized animated mouth.
