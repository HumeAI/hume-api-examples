<div align="center">
  <img src="https://storage.googleapis.com/hume-public-logos/hume/hume-banner.png">
  <h1>EVI Python Function Calling Example</h1>
</div>

## Overview

This project showcases how to call functions in a sample implementation of Hume's [Empathic Voice Interface](https://hume.docs.buildwithfern.com/docs/empathic-voice-interface-evi/overview) using Hume's Python SDK. Here, we have a simple EVI that calls a function to get the current weather for a given location.

## Prerequisites

The Hume Python SDK supports Python versions 3.9, 3.10, and 3.11 on macOS and Linux systems.

### Setting up a virtual environment (optional)

You can create a virtual environment using either `conda` from Miniconda or Anaconda, or the built-in `venv` module in Python. Instructions for both methods are provided below.

#### Using `conda`
1. Install `conda` using [Miniconda](https://docs.anaconda.com/miniconda/), the free minimal installer for it.
2. Create a new virtual environment:
    ```bash
    conda create --name evi-env python=3.11
    ```
3. Activate the virtual environment:
    ```bash
    conda activate evi-env
    ```

#### Using `venv`

To create a virtual environment with `venv`, run the following commands in your terminal:

1. Create a new virtual environment:
    ```bash
    python -m venv evi-env
    ```
2. Activate the virtual environment:
    ```bash
    source evi-env/bin/activate
    ```

### Package and system dependencies

Follow these steps to install the required packages and system dependencies for using environment variables, EVI, and handling audio input/output.

#### Environment Variables

Install the `python-dotenv` package to load variables from a `.env` file:

```bash
pip install python-dotenv
```

#### EVI and audio input/output

Install the Hume Python SDK with microphone support:

```bash
pip install "hume[microphone]"
```

For audio playback and processing, additional system-level dependencies are required:

##### macOS

Install `ffmpeg` using Homebrew:

```bash
brew install ffmpeg
```

##### Linux

Install the required packages:

```bash
sudo apt-get --yes update
sudo apt-get --yes install libasound2-dev libportaudio2 ffmpeg
```

##### Windows

Not yet supported.

## EVI setup

Before running this project, you'll need to set up EVI with the ability to leverage tools or call functions. Follow these steps for authentication, creating a Tool, and adding it to a configuration.

1. Create a `.env` file in the root folder of the repo and add your [API Key and Secret Key](https://dev.hume.ai/docs/introduction/api-key):

```sh
HUME_API_KEY=<YOUR API KEY>
HUME_SECRET_KEY=<YOUR SECRET KEY>
```

2. [Create a tool](https://dev.hume.ai/docs/empathic-voice-interface-evi/tool-use#setup) with the following payload:

```json
{
  "name": "get_current_weather",
  "description": "This tool is for getting the current weather.",
  "parameters": "{ \"type\": \"object\", \"properties\": { \"location\": { \"type\": \"string\", \"description\": \"The city and state, e.g. San Francisco, CA\" }, \"format\": { \"type\": \"string\", \"enum\": [\"celsius\", \"fahrenheit\"], \"description\": \"The temperature unit to use. Infer this from the users location.\" } }, \"required\": [\"location\", \"format\"] }"
}
```

3. Create a configuration equipped with that tool: 

```json
{
  "name": "Weather Assistant Config",
  "language_model": {
    "model_provider": "OPEN_AI",
    "model_resource": "gpt-3.5-turbo"
  },
  "tools": [
    {
      "id": "<YOUR_TOOL_ID>",
      "version": 0
    }
  ]
}
```

4. Add the Config ID to your environmental variables in your `.env` file:

```bash
HUME_CONFIG_ID=<YOUR CONFIG ID>
```

5. Add your Geocoding API key to your environmental variables (free to use from geocode.maps.co):

```bash
GEOCODING_API_KEY=<YOUR GEOCODING API KEY>
```

## Usage

This implementation of Hume's Empathic User Interface (EVI) is minimal, using default configurations for the interface and a basic terminal application to authenticate, connect to, and disconnect from the interface.

To run the project:

1. Ensure you have set up your virtual environment and installed all required dependencies.
2. Execute the script by running `python main.py`.
3. Once the script is running, you can begin speaking with the interface. The transcript of the conversation will be displayed in the terminal in real-time.
4. The EVI is equipped with a tool to fetch weather information. You can ask about the weather in different locations, and the EVI will use the tool to provide current weather data.
5. Terminate the script by pressing `Ctrl+C` when you're finished.

## Example Conversation

Here's an example of how you might interact with the EVI to get weather information:

User: "What's the weather like in New York City?"
EVI: (Uses the get_current_weather tool to fetch data) "Currently in New York City, it's 72°F (22°C) and partly cloudy. The forecast calls for a high of 78°F (26°C) and a low of 65°F (18°C) today."