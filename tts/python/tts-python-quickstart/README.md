<div align="center">
  <img src="https://storage.googleapis.com/hume-public-logos/hume/hume-banner.png">
  <h1>Text-to-Speech | Python Quickstart</h1>
  <p>
    <strong>Jumpstart your development with Hume's OCTAVE TTS API!</strong>
  </p>
</div>

## Overview

This project demonstrates how to use [Hume AI](https://hume.ai)'s [OCTAVE TTS API](https://dev.hume.ai/docs/text-to-speech-tts/overview) with Python.

Unlike conventional TTS that merely "reads" words, Octave is a speech-language model that understands what words mean in context, unlocking a new level of expressiveness. It acts out characters, generates voices from prompts, and takes instructions to modify the emotion and style of a given utterance.

See the [Quickstart guide](https://dev.hume.ai/docs/text-to-speech-tts/quickstart/python) for a detailed explanation of the code in this project.

## Instructions

1. Clone this examples repository:

    ```shell
    git clone https://github.com/humeai/hume-api-examples
    cd hume-api-examples/tts/python/tts-python-quickstart
    ```

2. Set up the environment:

    We recommend `uv` but you can adapt these commands to your preferred package manager.
    ```shell
    uv init
    uv add hume python-dotenv aiofiles
    ```

3. Set up your API keys:

    You must authenticate to use the Hume TTS API. Your API key can be retrieved from the [Hume AI platform](https://platform.hume.ai/settings/keys). For detailed instructions, see our documentation on [getting your api keys](https://dev.hume.ai/docs/introduction/api-key).
  
    This example uses [dotenv](https://www.npmjs.com/package/dotenv). Place your API key in a `.env` file at the root of your project.

    ```shell
    echo "HUME_API_KEY=your_api_key_here" > .env
    ```
  
    You can copy the `.env.example` file to use as a template.

4. Run the project:

    ```shell
    uv run app.py
    ```
