<div align="center">
  <img src="https://storage.googleapis.com/hume-public-logos/hume/hume-banner.png">
  <h1>Empathic Voice Interface (EVI) | Unity Quickstart</h1>
  <p>
    <strong>Jumpstart your development with Hume's EVI API in Unity!</strong>
  </p>
</div>

## Overview

This Unity project implements a expressive AI cube that you can talk to with your voice.

It demonstrates how to integrate [Hume AI](https://hume.ai)'s [Empathic Voice Interface (EVI)](https://dev.hume.ai/docs/empathic-voice-interface-evi/overview) into Unity applications. EVI is a conversational AI that understands and responds to emotional cues in speech.

This project uses `ai.hume.unity`, a Unity package, hosted on [OpenUPM](https://openupm.com/packages/ai.hume.unity/), that wraps the Hume [.NET SDK](https://github.com/humeai/hume-dotnet-sdk).

## Prerequisites

- Unity 2022.3 LTS or later
- Internet connection for API calls
- Valid Hume API key
- Microphone (for voice input)

## Setup Instructions

1. Clone this examples repository:

   ```shell
   git clone https://github.com/humeai/hume-api-examples
   cd hume-api-examples/evi/evi-unity-quickstart
   ```

2. Open the project in Unity:

   - Launch Unity Hub
   - Click "Open" and select the `evi-unity-quickstart` folder
   - The `DefaultScene` should automatically load when you open the project

3. Set up your API key:

   You must authenticate to use the Hume EVI API. Your API key can be retrieved from the [Hume AI platform](https://platform.hume.ai/settings/keys). For detailed instructions, see our documentation on [getting your api keys](https://dev.hume.ai/docs/introduction/api-key).

   In the Unity scene:
   - Select the `SceneLauncher` GameObject in the Hierarchy
   - In the Inspector, find the `SceneBuilder` component
   - Replace `'YOUR_HUME_API_KEY_HERE'` with your actual Hume API key

4. Configure microphone permissions (platform-specific):
   - **macOS/Windows**: Usually works out of the box
   - **iOS**: Add `NSMicrophoneUsageDescription` to Info.plist
   - **Android**: Add `RECORD_AUDIO` permission to AndroidManifest.xml

## Project Structure

- `Assets/DefaultScene.unity` - The main scene with EVI setup
- `Assets/Scripts/HumeEVI.cs` - Core EVI functionality:
  - WebSocket connection to EVI
  - Microphone capture and audio streaming
  - WAV audio parsing and playback
  - Event handling for transcripts and responses
- `Assets/Scripts/SceneBuilder.cs` - Scene management and visual feedback:
  - `SceneBuilder` - Creates the interactive cube scene
  - `ConversationVisualFeedback` - Handles color/animation based on state
  - `ClickToConverse` - Handles click interaction

## Usage

1. Press Play in Unity
2. Click the cube to start a conversation with EVI
3. Speak into your microphone - the cube will pulse green while listening
4. EVI will respond - the cube will pulse blue while speaking
5. Click the cube again to end the conversation

## Troubleshooting

For more advanced usage, see the [Hume EVI Documentation](https://dev.hume.ai/docs/empathic-voice-interface-evi/overview). Also refer to the source code [Hume .NET SDK](https://github.com/HumeAI/hume-dotnet-sdk) repository to see method names.
