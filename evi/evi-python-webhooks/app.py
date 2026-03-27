import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from hume.client import AsyncHumeClient
from hume.empathic_voice.types import (
    WebhookEvent,
    WebhookEventChatStarted,
    WebhookEventChatEnded,
    WebhookEventToolCall,
)
from utils import fetch_weather_tool, get_chat_transcript, validate_webhook_headers
import uvicorn

# Load environment variables
load_dotenv()

# FastAPI app instance
app = FastAPI()

# Instantiate the Hume client
client = AsyncHumeClient(api_key=os.getenv("HUME_API_KEY"))


@app.post("/hume-webhook")
async def hume_webhook_handler(request: Request, event: WebhookEvent):
    """Handles incoming webhook events from Hume's Empathic Voice Interface."""

    # Get the raw request body
    raw_payload = await request.body()
    payload_str = raw_payload.decode("utf-8")

    # Validate HMAC signature and timestamp to ensure request authenticity
    try:
        validate_webhook_headers(payload_str, request.headers)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

    if isinstance(event, WebhookEventChatStarted):
        print(f"Processing chat_started event: {event.dict()}")
        # Add additional chat_started processing logic here

    elif isinstance(event, WebhookEventChatEnded):
        print(f"Processing chat_ended event: {event.dict()}")
        # Fetch chat events, construct a transcript, and write it to a file
        await get_chat_transcript(client, event.chat_id)
        # Add additional chat_ended processing logic here

    elif isinstance(event, WebhookEventToolCall):
        print(f"Processing tool_call event: {event.dict()}")
        # Handle the specific tool call for fetching the current weather
        await fetch_weather_tool(client, event.chat_id, event.tool_call_message)
        # Add additional tool_call processing logic here


# Run the Uvicorn server
if __name__ == "__main__":
    uvicorn.run("app:app", host="127.0.0.1", port=5000, reload=True)
