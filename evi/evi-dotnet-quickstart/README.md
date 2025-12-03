<div align="center">
  <img src="https://storage.googleapis.com/hume-public-logos/hume/hume-banner.png">
  <h1>EVI | C# Quickstart</h1>
  <p>
    <strong>Jumpstart your development with Hume's Empathic Voice Interface!</strong>
  </p>
</div>

## Overview

This project demonstrates how to use [Hume AI](https://hume.ai)'s [Empathic Voice Interface (EVI)](https://dev.hume.ai/docs/empathic-voice-interface-evi/overview) with C#.

EVI is an emotionally intelligent voice AI that understands and responds to human emotions in real-time. It processes speech with emotional awareness, enabling more natural and empathetic conversations.

## Instructions

1. Clone this examples repository:

    ```shell
    git clone https://github.com/humeai/hume-api-examples
    cd hume-api-examples/evi/evi-dotnet-quickstart
    ```

2. Set up your API key:

    Your API key can be retrieved from the [Hume AI platform](https://platform.hume.ai/settings/keys). For detailed instructions, see our documentation on [getting your api keys](https://dev.hume.ai/docs/introduction/api-key).

    Create a `.env` file in this folder with your API key:

    ```
    HUME_API_KEY=your_api_key_here
    ```

    Or set it as an environment variable:

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

This quickstart demonstrates key features of the EVI API:

- **WebSocket Connection**: Establishing a real-time connection to EVI
- **Audio Streaming**: Sending audio data in chunks for processing
- **Event Handling**: Subscribing to assistant messages, user transcriptions, and audio output
- **Session Management**: Configuring audio settings and managing chat metadata

## Requirements

- .NET 8.0 or later
- A Hume API key

## Output

The application connects to EVI, streams your audio file, and displays:
- Transcribed user speech
- Assistant responses
- Audio output notifications
