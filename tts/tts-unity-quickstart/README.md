<div align="center">
  <img src="https://storage.googleapis.com/hume-public-logos/hume/hume-banner.png">
  <h1>Text-to-Speech | Unity Quickstart</h1>
  <p>
    <strong>Jumpstart your development with Hume's OCTAVE TTS API in Unity!</strong>
  </p>
</div>

## Overview

This Unity project demonstrates how to integrate [Hume AI](https://hume.ai)'s [Text-to-speech API](https://dev.hume.ai/docs/text-to-speech-tts/overview) into Unity applications.

This project uses `ai.hume.unity`, a Unity package, hosted on [OpenUPM](https://openupm.com/packages/ai.hume.unity/), that wraps the Hume [.NET SDK](https://github.com/humeai/hume-dotnet-sdk).

## Prerequisites

- Unity 2022.3 LTS or later
- Internet connection for API calls
- Valid Hume API key

## Setup Instructions

1. Clone this examples repository:

   ```shell
   git clone https://github.com/humeai/hume-api-examples
   cd hume-api-examples/tts/tts-unity-quickstart
   ```

2. Open the project in Unity:

   - Launch Unity Hub
   - Click "Open" and select the `tts-unity-quickstart` folder
   - The `DefaultScene` should automatically load when you open the project

3. Set up your API key:

   You must authenticate to use the Hume TTS API. Your API key can be retrieved from the [Hume AI platform](https://app.hume.ai/keys). For detailed instructions, see our documentation on [getting your api keys](https://dev.hume.ai/docs/introduction/api-key).

   In the Unity scene:
   - Select the `SceneLauncher` GameObject in the Hierarchy
   - In the Inspector, find the `HumeSpeaker` component
   - Replace `'YOUR_HUME_API_KEY_HERE'` with your actual Hume API key

## Project Structure

- `Assets/DefaultScene.unity` - The main scene with TTS setup
- `Assets/Scripts/HumeSpeaker.cs` - Main TTS functionality component
- `Assets/Scripts/SceneBuilder.cs` - Scene management utilities

## Usage

Once you've set your API key in the `HumeSpeaker` component, the scene is ready to use for TTS functionality. The component handles all communication with the Hume API.

## Next Steps

- Customize the TTS parameters in the `HumeSpeaker` component
- Add your own UI elements to trigger TTS requests
- Integrate the TTS functionality into your existing Unity projects

For more advanced usage, see the [Hume TTS Documentation](https://dev.hume.ai/docs/text-to-speech-tts/overview).
