# EVI ELIZA on Modal

This project sets up a WebSocket server on [Modal](https://modal.com/) for the [EVI Custom Language Model integration](https://dev.hume.ai/docs/empathic-voice-interface-evi/custom-language-model), enabling real-time interactions with the EVI agent using the [ELIZA](https://en.wikipedia.org/wiki/ELIZA) chatbot model for human-like conversations.

## Prerequisites

Before starting, ensure you have the following prerequisites installed on your system:
- Python
- Poetry
- [Modal](https://modal.com/) CLI

For detailed instructions on how to set these up, [see this guide.](./docs/detailed-install-instructions-mac.md)

## Setup Steps

### 0. Local development

Run the app with a hot-loading Modal development serve via `modal serve main.py`.

### 1. Deploy the WebSocket Modal app

First, deploy the Modal app to a server. This app will act as the WebSocket server for the AI Assistant API. To deploy the app, simply run:
```
poetry run python -m modal deploy main.py
```

This will deploy your app to Modal and return to you an endpoint URL that you can use to connect to the WebSocket server. Note that you'll need to swap the `https` with 'wss` in the URL to use it as a WebSocket endpoint.

### 2. Create a voice configuration that specifies the socket

In Hume's web portal, visit the Voice Configurations in the left navigation bar, or you can access it directly at https://beta.hume.ai/voice.

Create a new voice configuration, give it a name and optionally a system prompt, and then use the following dropdown to specify `Custom language model` and specify the `wss` address of your socket as given by Modal in the previous step:

![](./img/custom-language-model-config.jpg)

### 4. Connect to the socket

With the configuration ID, you can now connect to EVI using your custom language model. Use the query parameter to pass the `config_id` argument, which is the ID shown for the voice configuration you created in the previous step. For example, if this were `config-gIblKUsH80lrH4NDs7uLy`, the URL would be:

```
wss://api.hume.ai/v0/assistant/chat?config_id=config-gIblKUsH80lrH4NDs7uLy&api_key=<Your API Key>
```

Remember to change the `config_id` with the configuration ID you created in step 2, and also replace `<Your API Key>` with your actual API key.

## You're done!

You have now successfully set up the server for the AI Assistant API. If you encounter any issues during the setup process, please consult the troubleshooting section or contact support.

---

## How it works

The project uses the ELIZA chatbot model to create a conversational agent that simulates human-like interactions. The agent processes user messages, generates responses, and maintains conversational context to create a natural dialogue experience.

ELIZA was an early natural language processing program developed in the 1960s by Joseph Weizenbaum. It uses pattern matching and substitution rules to simulate a conversation with a human user. The agent in this project follows a similar approach, using regular expressions to match user input and generate responses based on predefined patterns.

---

## About the WebSocket implementation

WebSockets provide an efficient and persistent connection between the client and server, allowing data to be exchanged as soon as it's available without the need to establish a new connection for each message.

### FastAPI and WebSocket Setup

The agent uses FastAPI, a modern web framework for building APIs with Python 3.7+, which includes support for WebSockets. The `main.py` file includes a WebSocket route that listens for incoming WebSocket connections at the `/llm` endpoint.

### WebSocket Connection Lifecycle

1. **Connection Establishment**: The client initiates a WebSocket connection to the server by sending a WebSocket handshake request to the `/llm` endpoint. The server accepts this connection with `await websocket.accept()`, establishing a full-duplex communication channel.

2. **Receiving Messages**: Once the connection is established, the server enters a loop where it listens for messages from the client using `await websocket.receive_text()`. This asynchronous call waits for the client to send a message through the WebSocket connection.

3. **Processing Messages**: Upon receiving a message, the server (specifically, the agent in this case) processes it. This involves:
   - Deserializing the received JSON string to extract the message and any associated data.
   - Parsing the message and any conversational context to understand the user's intent.
   - Generating an appropriate response using the agent's logic, which may involve querying external APIs, performing computations, or simply crafting a reply based on the conversation history.

4. **Sending Responses**: The generated response is sent back to the client through the same WebSocket connection using `await websocket.send_text(response)`. This allows for immediate delivery of the response to the user.

5. **Connection Closure**: The connection remains open for continuous exchange of messages until either the client or server initiates a closure. The server can close the connection using `await websocket.close()`, though in practice, for a conversational agent, the connection often remains open to allow for ongoing interaction.

### Example WebSocket Communication Flow

1. The client (a web app) establishes a WebSocket connection to the server at `wss://example.com/ws`.
2. The user sends a message through the client interface, which is then forwarded to the server via the WebSocket connection.
3. The server receives the message, and the agent processes it, generating a response.
4. The response is sent back to the client through the WebSocket, and the user sees the response in the client interface.
5. Steps 2-4 repeat for each message sent by the user, creating a conversational experience.