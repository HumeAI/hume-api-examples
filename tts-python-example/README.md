## Overview

This project demonstrates how to use [Hume AI](https://hume.ai)'s [OCTAVE TTS API](https://dev.hume.ai/docs/text-to-speech-tts/overview) with Python.

Unlike conventional TTS that merely "reads" words, Octave is a speech-language model that understands what words mean in context, unlocking a new level of expressiveness. It acts out characters, generates voices from prompts, and takes instructions to modify the emotion and style of a given utterance.

See the [Quickstart guide](https://dev.hume.ai/docs/text-to-speech-tts/quickstart/python) for a detailed explanation of the code in this project.

## Instructions

1. Clone this examples repository

    ```shell
    git clone https://github.com/humeai/hume-api-examples
    cd hume-api-examples/tts-python-example
    ```

2. Install dependencies:

    We recommend `uv` but you can adapt these commands to your preferred package manager.
    ```shell
    uv sync
    uv pip install -e $HOME/dev/fern-config/fern/apis/unioned/.preview/fern-python-sdk
    ```

3. Set up your API keys:

  * Visit the [API keys page](https://platform.hume.ai/settings/keys) on the Hume Platform to retrieve your API key.
  * Place it in a `.env` file at the project root. You can use the `.env.example` file as a template:

    ```shell
    cp .env.example .env
    ```

4. Run project

    ```shell
    uv run app.py
    ```
