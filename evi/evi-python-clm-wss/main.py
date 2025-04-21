from fastapi import FastAPI, WebSocket
from agent import Agent
import json

app = FastAPI()

SYSTEM_PROMPT = """You are a helpful assistant that can look things up online."""


@app.websocket("/llm")
async def websocket_endpoint(websocket: WebSocket):
    """
    Handles incoming WebSocket connections and interactions for the empathic voice interface.

    This endpoint listens for incoming text messages via WebSocket, processes these messages
    to perform web searches or other intelligent tasks, and returns a text response. The processing
    involves parsing the incoming messages, generating responses based on the system's knowledge
    and any web searches performed, and sending these responses back to the client via WebSocket.

    Args:
        websocket (WebSocket): An instance of WebSocket connection.

    Workflow:
        1. Accepts an incoming WebSocket connection.
        2. Creates an Agent instance with a predefined system prompt.
        3. Enters a loop to continuously receive messages from the WebSocket connection.
        4. For each message received, it parses the message and the chat history,
           generates a response using the Agent, and sends this response back through the WebSocket.

    This endpoint allows for a conversational interface where the backend can execute complex actions,
    including web searches, based on user inputs, making it suitable for demos or applications requiring
    intelligent, conversational AI capabilities.
    """
    # Accept the incoming WebSocket connection.
    await websocket.accept()

    # Create an instance of the Agent class, initializing it with a predefined system prompt.
    # This system prompt sets the context or persona for the AI's conversational capabilities.
    agent = Agent(system_prompt=SYSTEM_PROMPT)

    # Continuously listen for messages from the WebSocket connection.
    while True:
        # Wait for a text message from the WebSocket, then asynchronously receive it.
        data = await websocket.receive_text()
        
        # Deserialize the text message (JSON format) to a Python dictionary.
        hume_socket_message = json.loads(data)

        # Parse the received message to extract the last user message and the chat history.
        # This is necessary for understanding the context of the conversation
        message, chat_history = agent.parse_hume_message(hume_socket_message)

        # Print the last message and the entire chat history for logging purposes.
        print(message)
        print(chat_history)

        # Generate responses based on the last message and the chat history.
        responses = agent.get_responses(message, chat_history)

        # Print the responses for logging purposes.
        print(responses)

        # Send the generated responses back to the client via the WebSocket connection.
        for response in responses:
            await websocket.send_text(response)
