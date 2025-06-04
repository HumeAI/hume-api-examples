# EVI Proxy

This example contains an EVI "proxy" that accepts a websocket connection from a client, connects to EVI, and forwards messages back and forth between the client and EVI.

This app is useful as an example in its own right: it demonstrates
  * how to connect to EVI from a Typescript backend,
  * how to accept websocket connections, process messages, and send them upstream to EVI

See [upstream.ts](app/upstream.ts) and [downstream.ts](app/downstream.ts) for more details.

It is also useful as a debugging tool: it supports
  * recording and replaying EVI conversations,
  * simulating error conditions that you might want to handle to make your EVI application more robust.

## Prerequisites

 - Node.js (for running the proxy and building the web frontend)
 - Hume AI API credentials

## Installation

1. Clone this repository:
   ```bash
   git clone <repository-url>
   cd eviproxy
   ```

2. Install dependencies for both app and web components:
   ```bash
   cd app && npm install
   cd ../web && npm install && npm run build
   cd ..
   ```

## Environment Variables

Create a `.env` file in the `app/` directory with the following variables:

```bash
HUME_API_KEY=your_hume_api_key_here
HUME_CONFIG_ID=your_config_id_here  # Optional
```

To get your API key:
1. Log into the [Hume AI Platform](https://platform.hume.ai/)
2. Visit the [API keys page](https://platform.hume.ai/settings/keys)
3. See the [documentation](https://dev.hume.ai/docs/introduction/api-key) for detailed instructions

## Usage

### Start the Proxy Server

```bash
cd app && npm start
```

This starts the WebSocket proxy server on port 3000 with an interactive CLI interface. The CLI allows you to:
- Switch between record and playback modes
- Control recording sessions
- Manage saved conversation scripts

### Connect Your Own Applications

To connect your own Hume EVI applications to this proxy instead of directly to Hume's servers, configure them to use `http://localhost:3000` as the environment:

**TypeScript/JavaScript:**
```typescript
const hume = new HumeClient({
    environment: "http://localhost:3000"
});
```

**Python:**
```python
client = AsyncHumeClient(
    environment="http://localhost:3000",
)
```

### Access the Web Interface

The proxy also includes a built-in web interface available at:
```
http://localhost:3000
```
The interface is built using [Vite](https://vitejs.dev). If you modify any
frontend code, run `npm run build` in the `web/` directory again to rebuild the
static assets.

### Recording and Playback

1. **Record Mode**: Captures real conversations with Hume EVI and saves them to JSONL files
2. **Playback Mode**: Replays saved conversations for testing and debugging
3. **Script Files**: Conversations are saved in JSONL format (default: `recording.jsonl`)

## Project Structure

```
eviproxy/
├── app/                      # Main proxy server (Node.js)
│   ├── main.ts               # Entry point and state machine
│   ├── cli.ts                # Interactive CLI interface
│   ├── upstream.ts           # Hume API connections
│   ├── downstream.ts         # Client WebSocket server
│   ├── api.ts                # HTTP API endpoints for web-based control
│   └── util.ts               # Helpers
├── web/                      # React frontend
│   ├── app.tsx               # Main React application entry point
│   ├── EVIChat.tsx           # Main chat interface using @humeai/voice-react
│   ├── ChatControls.tsx      # Voice controls (mute, stop, etc.)
│   ├── ChatMessages.tsx      # Message display component
│   ├── StartCall.tsx         # Call initiation component
│   ├── WebSocketControls.tsx # WebSocket connection controls
│   ├── index.html            # HTML entry point
│   └── package.json          # Frontend dependencies
└── shared/                   # Shared TypeScript types
    └── types.ts              # Common interfaces and types
```
