<div align="center">
  <img src="https://storage.googleapis.com/hume-public-logos/hume/hume-banner.png">
  <h1>Empathic Voice Interface | Python Function Calling Example</h1>
  <p>
    <strong>Jumpstart your development with Hume's Empathic Voice Interface!</strong>
  </p>
</div>

## Overview

This project showcases how to call functions in a sample implementation of Hume's [Empathic Voice Interface (EVI)](https://dev.hume.ai/docs/empathic-voice-interface-evi/overview) using Hume's [Python SDK](https://github.com/HumeAI/hume-python-sdk). Here, we have a simple EVI that calls a function to get the current weather for a given location.

See the [Tool Use guide](https://dev.hume.ai/docs/empathic-voice-interface-evi/features/tool-use) for a detailed explanation of the code in this project.

## Prerequisites

The Hume Python SDK supports Python versions `3.9`, `3.10`, and `3.11` on macOS and Linux systems.

It does not currently support Windows.

## Setup Instructions

1. Clone this examples repository:

    ```shell
    git clone https://github.com/humeai/hume-api-examples
    cd hume-api-examples/evi/python/evi-python-function-calling
    ```

2. Set up a virtual environment (Optional):
   
    It's recommended to isolate dependencies in a virtual environment. Choose one of the following methods:
   
    - **Using `conda`** (requires [Miniconda](https://docs.anaconda.com/miniconda/) or [Anaconda](https://www.anaconda.com/)):

        ```bash
        conda create --name evi-env python=3.11
        conda activate evi-env
        ```

    - **Using built-in `venv`** (available with Python 3.3+):

        ```bash
        python -m venv evi-env
        source evi-env/bin/activate
        ```

   After activating the environment, proceed with installing dependencies.

3. Set up environment variables:

    This project uses `python-dotenv` to load your API credentials securely from a `.env` file.

    1. Install the package:

        ```bash
        pip install python-dotenv
        ```

    2. Copy the `.env.example` file to use as a template:

        ```shell
        cp .env.example .env
        ```

    2. Place your API keys inside:

        -  Visit the [API keys page](https://platform.hume.ai/settings/keys) on the Hume Platform to retrieve your API keys. See our documentation on [getting your api keys](https://dev.hume.ai/docs/introduction/api-key).
        - Upon doing so, the `.env` file becomes a persistent local store of your API key, Secret key, and EVI config ID. The `.gitignore` file contains local env file paths so that they are not committed to GitHub.

4. Install dependencies:

    Install the Hume Python SDK with microphone support:

    ```bash
    pip install "hume[microphone]"
    ```

    For audio playback and processing, additional system-level dependencies are required. Below are download instructions for each supported operating system:

    #### macOS

    To ensure audio playback functionality, you will need to install `ffmpeg`, a powerful multimedia framework that handles audio and video processing.

    One of the most common ways to install `ffmpeg` on macOS is by using [Homebrew](https://brew.sh/). Homebrew is a popular package manager for macOS that simplifies the installation of software by automating the process of downloading, compiling, and setting up packages.

    To install `ffmpeg` using Homebrew, follow these steps:

    1. Install Homebrew onto your system according to the instructions on the [Homebrew website](https://brew.sh/).

    2. Once Homebrew is installed, you can install `ffmpeg` with:
        ```bash
        brew install ffmpeg
        ```

    If you prefer not to use Homebrew, you can download a pre-built `ffmpeg` binary directly from the [FFmpeg website](https://ffmpeg.org/download.html) or use other package managers like [MacPorts](https://www.macports.org/).

    #### Linux

    On Linux systems, you will need to install a few additional packages to support audio input/output and playback:

    - `libasound2-dev`: This package contains development files for the ALSA (Advanced Linux Sound Architecture) sound system.
    - `libportaudio2`: PortAudio is a cross-platform audio I/O library that is essential for handling audio streams.
    - `ffmpeg`: Required for processing audio and video files.

    To install these dependencies, use the following commands:

    ```bash
    sudo apt-get --yes update
    sudo apt-get --yes install libasound2-dev libportaudio2 ffmpeg
    ```

    #### Windows

    Not yet supported.

5. **Set up EVI configuration**

    Before running this project, you'll need to set up EVI with the ability to leverage tools or call functions. Follow these steps for authentication, creating a Tool, and adding it to a configuration.

    > See our documentation on [Setup for Tool Use](https://dev.hume.ai/docs/empathic-voice-interface-evi/tool-use#setup) for no-code and full-code guides on creating a tool and adding it to a configuration.

    - [Create a tool](https://dev.hume.ai/reference/empathic-voice-interface-evi/tools/create-tool) with the following payload:

      ```bash
      curl -X POST https://api.hume.ai/v0/evi/tools \
          -H "X-Hume-Api-Key: <YOUR_HUME_API_KEY>" \
          -H "Content-Type: application/json" \
          -d '{
        "name": "get_current_weather",
        "parameters": "{ \"type\": \"object\", \"properties\": { \"location\": { \"type\": \"string\", \"description\": \"The     city and state, e.g. San Francisco, CA\" }, \"format\": { \"type\": \"string\", \"enum\": [\"celsius\", \"fahrenheit\"], \"description\": \"The temperature unit to use. Infer this from the users location.\" } }, \"required\": [\"location\", \"format\"] }",
        "version_description": "Fetches current weather and uses celsius or fahrenheit based on location of user.",
        "description": "This tool is for getting the current weather.",
        "fallback_content": "Unable to fetch current weather."
      }'
      ```

      This will yield a Tool ID, which you can assign to a new EVI configuration.

    - [Create a configuration](https://dev.hume.ai/reference/empathic-voice-interface-evi/configs/create-config) equipped with that tool: 

      ```bash
      curl -X POST https://api.hume.ai/v0/evi/configs \
          -H "X-Hume-Api-Key: <YOUR_HUME_API_KEY>" \
          -H "Content-Type: application/json" \
          -d '{
        "evi_version": "2",
        "name": "Weather Assistant Config",
        "voice": {
          "provider": "HUME_AI",
          "name": "ITO"
        },
        "language_model": {
          "model_provider": "ANTHROPIC",
          "model_resource": "claude-3-5-sonnet-20240620",
          "temperature": 1
        },
        "tools": [
          {
            "id": "<YOUR_TOOL_ID>"
          }
        ]
      }'
      ```

    - Add the Config ID to your environmental variables in your `.env` file:

      ```bash
      HUME_CONFIG_ID=<YOUR CONFIG ID>
      ```

6. Add the Geocoding API key to the `.env` file. You can obtain it for free from [geocode.maps.co](https://geocode.maps.co/).

    ```bash
    GEOCODING_API_KEY=<YOUR GEOCODING API KEY>
    ```

7. Run the project:
    ```shell
    python main.py
    ```

#### What happens when run:

- Once the script is running, you can begin speaking with the interface. The transcript of the conversation will be displayed in the terminal in real-time.
- EVI is equipped with a tool to fetch weather information. You can ask about the weather in different locations, and the EVI will use the tool to provide current weather data.
- Terminate the script by pressing `Ctrl+C` when you're finished.

#### Example Conversation

Here's an example of how you might interact with the EVI to get weather information:

*User: "What's the weather like in New York City?"*

*EVI: (Uses the get_current_weather tool to fetch data) "Currently in New York City, it's 72°F (22°C) and partly cloudy. The forecast calls for a high of 78°F (26°C) and a low of 65°F (18°C) today."*