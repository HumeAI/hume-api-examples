<div align="center">
  <img src="https://storage.googleapis.com/hume-public-logos/hume/hume-banner.png">
  <h1>Text-to-Speech | C# Quickstart</h1>
  <p>
    <strong>Jumpstart your development with Hume's OCTAVE TTS API!</strong>
  </p>
</div>

## Overview

This project demonstrates how to use [Hume AI](https://hume.ai)'s [OCTAVE TTS API](https://dev.hume.ai/docs/text-to-speech-tts/overview) with C#.

Unlike conventional TTS that merely "reads" words, Octave is a speech-language model that understands what words mean in context, unlocking a new level of expressiveness. It acts out characters, generates voices from prompts, and takes instructions to modify the emotion and style of a given utterance.

See the [Quickstart guide](https://dev.hume.ai/docs/text-to-speech-tts/quickstart/csharp) for a detailed explanation of the code in this project.

## Instructions

1. Clone this examples repository:

    ```shell
    git clone https://github.com/humeai/hume-api-examples
    cd hume-api-examples/tts/tts-csharp-quickstart
    ```

2. Set up your API key:

    You must authenticate to use the Hume TTS API. Your API key can be retrieved from the [Hume AI platform](https://platform.hume.ai/settings/keys). For detailed instructions, see our documentation on [getting your api keys](https://dev.hume.ai/docs/introduction/api-key).
  
    To set your API key as an environment variable: create a .env file in the example folder and past your API key there (HUME_API_KEY=""), or run this:

    **Windows (Command Prompt):**
    ```cmd
    set HUME_API_KEY=your_api_key_here
    ```

    **Windows (PowerShell):**
    ```powershell
    $env:HUME_API_KEY="your_api_key_here"
    ```

    **macOS/Linux:**
    ```bash
    export HUME_API_KEY=your_api_key_here
    ```

3. Install dependencies:

    ```shell
    dotnet restore
    ```

4. Run the project:

    ```shell
    dotnet run
    ```

## Features Demonstrated

This quickstart demonstrates several key features of the Hume TTS API:

- **Voice Generation**: Creating a new voice from a text description
- **Voice Library**: Saving and reusing custom voices
- **Context Continuation**: Maintaining speech consistency across utterances
- **Acting Instructions**: Modulating speech style and emotion
- **Streaming**: Real-time audio generation for low-latency applications

## Requirements

- .NET 8.0 or later
- A Hume API key

## Output

The application will generate several audio files in a temporary directory and demonstrate streaming functionality. Check the console output for the location of generated audio files.