<div align="center">
  <img src="https://storage.googleapis.com/hume-public-logos/hume/hume-banner.png">
  <h1>Empathic Voice Interface (EVI) | Unity Quickstart</h1>
  <p>
    <strong>Jumpstart your development with Hume's EVI API in Unity!</strong>
  </p>
</div>

## Overview

This Unity project demonstrates how to integrate [Hume AI](https://hume.ai)'s [Empathic Voice Interface (EVI)](https://dev.hume.ai/docs/empathic-voice-interface-evi/overview) into Unity applications. EVI is a conversational AI that understands and responds to emotional cues in speech.

This project uses `ai.hume.unity`, a Unity package, hosted on [OpenUPM](https://openupm.com/packages/ai.hume.unity/), that wraps the Hume [.NET SDK](https://github.com/humeai/hume-dotnet-sdk).

## Features

- **Real-time voice conversation** with EVI
- **Microphone capture** and audio streaming
- **WAV audio playback** of EVI responses
- **Visual feedback** showing conversation state:
  - Gray (Idle) - Click to start
  - Yellow (Connecting) - Establishing connection
  - Green pulsing (Listening) - EVI is listening to you
  - Blue pulsing (Speaking) - EVI is responding
- **Live transcript display** showing your speech and EVI's responses

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

### Visual States

| State | Cube Color | Meaning |
|-------|------------|---------|
| Idle | Gray | Ready to start conversation |
| Connecting | Yellow | Establishing WebSocket connection |
| Listening | Green (pulsing) | EVI is listening to your voice |
| Speaking | Blue (pulsing, faster spin) | EVI is responding |

## Audio Format

- **Input (microphone)**: 48kHz, 16-bit, mono PCM
- **Output (EVI responses)**: WAV format (headers automatically parsed)

## Troubleshooting

### No audio input
- Check that your microphone is connected and working
- Verify microphone permissions are granted
- Check Unity Console for "No microphone detected!" error

### Connection errors
- Verify your API key is correct
- Check internet connection
- Look for error messages in Unity Console

### No audio output
- Ensure AudioSource component is properly configured
- Check Unity audio settings
- Verify WAV parsing in Console logs

## Next Steps

- Customize the visual feedback colors and animations
- Add UI elements to display full conversation history
- Integrate EVI into your existing Unity projects
- Explore EVI configuration options for different personas

For more advanced usage, see the [Hume EVI Documentation](https://dev.hume.ai/docs/empathic-voice-interface-evi/overview).
