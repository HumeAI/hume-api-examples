<div align="center">
  <img src="https://storage.googleapis.com/hume-public-logos/hume/hume-banner.png">
  <h1>Text-to-Speech | TypeScript Quickstart</h1>
  <p>
    <strong>Jumpstart your development with Hume's OCTAVE TTS API!</strong>
  </p>
</div>

## Overview

This project demonstrates how to use [Hume AI](https://hume.ai)'s [OCTAVE TTS API](https://dev.hume.ai/docs/text-to-speech-tts/overview) with Typescript.

Unlike conventional TTS that merely "reads" words, Octave is a speech-language model that understands what words mean in context, unlocking a new level of expressiveness. It acts out characters, generates voices from prompts, and takes instructions to modify the emotion and style of a given utterance.

See the [Quickstart guide](https://dev.hume.ai/docs/text-to-speech-tts/quickstart/typescript) for a detailed explanation of the code in this project.

## Instructions

1. Clone this examples repository

    ```shell
    git clone https://github.com/humeai/hume-api-examples
    cd hume-api-examples/tts/typescript/tts-typescript-quickstart
    ```

2. Set up the environment:

    ```shell
    npm init -y
    npm install hume dotenv
    npm install --save-dev typescript @types/node
    ```

3. Set up your API key

  * Visit the [API keys page](https://platform.hume.ai/settings/keys) on the Hume Platform to retrieve your API key. See our documentation on [getting your api keys](https://dev.hume.ai/docs/introduction/api-key).
  * Place your `HUME_API_KEY` in a `.env` file at the project root. You can copy the `.env.example` file to use as a template:

    ```shell
    cp .env.example .env
    ```

4. Run the project:

    ```shell
    npm run dev
    ```
