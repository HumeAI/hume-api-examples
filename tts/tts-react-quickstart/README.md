# TTS React Quickstart

<div align="center">
  <img src="https://storage.googleapis.com/hume-public-logos/hume/hume-banner.png">
  <h1>Text-to-Speech | React Quickstart</h1>
  <p>
    <strong>Jumpstart your web development with Hume's OCTAVE TTS API!</strong>
  </p>
</div>

This quickstart demonstrates how to use Hume's Text-to-Speech API in a web browser using React and TypeScript. It includes both streaming synthesis and bidirectional streaming examples.

## Features

- **React-based UI**: Modern React components with hooks for state management
- **Streaming Synthesis**: Convert text to speech using `synthesizeJsonStreaming`
- **Bidirectional Streaming**: Real-time text-to-speech with WebSocket connection
- **Web Audio Playback**: Uses `EVIWebAudioPlayer` for seamless audio playback
- **Modern Web Stack**: Built with Vite, React, TypeScript, and modern web APIs

## Prerequisites

- Node.js 18 or higher
- A Hume API key

## Setup

1. **Clone and install dependencies:**
   ```bash
   cd tts-react-quickstart
   npm install
   ```

2. **Set up your API key:**
   
   **⚠️ Security Note**: This example hardcodes the API key for simplicity. In production, you should implement proper access token exchange through a backend server.
   
   Open `src/App.tsx` and replace `YOUR_API_KEY_HERE` with your actual Hume API key:
   ```typescript
   const API_KEY = "your_actual_api_key_here";
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser** and navigate to `http://localhost:3000`

## Usage

### Streaming Synthesis
1. Enter text in the textarea
2. Click **Synthesize** to convert text to speech
3. The audio will play automatically

### Bidirectional Streaming
1. Click **Start Streaming** to begin a WebSocket connection
2. The example will send test messages and play the responses
3. Click **Stop** to end the session

## Project Structure

```
src/
├── main.tsx          # React entry point
├── App.tsx           # Main React component with hooks
├── audio-player.ts   # Web audio player wrapper
├── streaming.ts      # WebSocket streaming client
└── styles.css        # CSS styles
```

## Key Components

### App Component
The main React component that manages:
- State for text input, connection status, and audio players
- Event handlers for synthesis and streaming
- UI rendering with proper button states

### WebAudioPlayer
A wrapper around `EVIWebAudioPlayer` that handles audio chunk playback for TTS.

### StreamingTtsClient
A WebSocket client for bidirectional TTS streaming that connects to the `/v0/tts/stream/input` endpoint.

## React Features Used

- **useState**: For managing component state (text, status, connections)
- **useCallback**: For optimizing event handlers and preventing unnecessary re-renders
- **Functional Components**: Modern React patterns with hooks
- **TypeScript**: Full type safety for React components and props

## API Configuration

The streaming client connects to:
```
wss://api.hume.ai/v0/tts/stream/input?api_key={API_KEY}&no_binary=true&instant_mode=true&strip_headers=false&format_type=wav
```

Key parameters:
- `strip_headers=false`: Each chunk is a complete WAV file
- `format_type=wav`: Audio format for web playback
- `instant_mode=true`: Faster response times

## Production Considerations

1. **API Key Security**: Implement proper access token exchange through a backend server
2. **Error Handling**: Add comprehensive error handling for network issues
3. **Audio Management**: Implement proper audio queue management for longer texts
4. **User Experience**: Add loading states and progress indicators
5. **React Best Practices**: Consider using React Query for API state management

## Troubleshooting

- **Audio not playing**: Check browser console for errors and ensure audio permissions
- **WebSocket connection fails**: Verify your API key and network connectivity
- **Build errors**: Ensure all dependencies are installed with `npm install`
- **React errors**: Check that all components are properly imported and typed

## Learn More

- [Hume TTS API Documentation](https://docs.hume.ai/reference/post_tts-synthesize-json-streaming)
- [Hume WebSocket Streaming](https://docs.hume.ai/reference/websocket-tts-stream-input)
- [EVIWebAudioPlayer Documentation](https://docs.hume.ai/reference/evi-web-audio-player)
- [React Documentation](https://react.dev/)
