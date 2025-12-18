import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from starlette.responses import JSONResponse
from hume.client import AsyncHumeClient
from hume.empathic_voice.control_plane.client import AsyncControlPlaneClient
from hume.empathic_voice.types import (
    WebhookEvent,
    WebhookEventChatStarted,
    WebhookEventChatEnded,
    WebhookEventToolCall
)
from utils import fetch_weather_tool, get_chat_transcript, validate_headers
import uvicorn

# load environment variables
load_dotenv()

# FastAPI app instance
app = FastAPI()

# Instantiate the Hume clients
client = AsyncHumeClient(api_key=os.getenv("HUME_API_KEY"))
control_plane_client = AsyncControlPlaneClient(client_wrapper=client._client_wrapper)

@app.post("/hume-webhook")
async def hume_webhook_handler(request: Request, event: WebhookEvent):
    """
    Handles incoming chat_started and chat_ended webhook events.
    """

    # Get the raw request body
    raw_payload = await request.body()
    payload_str = raw_payload.decode("utf-8")

    # Validate the request headers to ensure security
    # - Verifies the HMAC signature to confirm the payload was sent by Hume and not tampered with.
    # - Checks the timestamp to prevent replay attacks using older requests.
    # If validation fails, the request is rejected with an appropriate error.
    try:
        validate_headers(payload_str, request.headers)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

    if isinstance(event, WebhookEventChatStarted):
        print(f"Processing chat_started event: {event.dict()}")

        # Add additional chat_started processing logic here as needed

    elif isinstance(event, WebhookEventChatEnded):
        print(f"Processing chat_ended event: {event.dict()}")

        # Fetch Chat events, construct a Chat transcript, and write transcript to a file
        await get_chat_transcript(client, event.chat_id)

        # Add additional chat_ended processing logic here as needed
    
    elif isinstance(event, WebhookEventToolCall):
        print(f"Processing tool_call event: {event.dict()}")

        # Handle the specific tool call for fetching the current weather
        await fetch_weather_tool(control_plane_client, event.chat_id, event.tool_call_message)

        # Add additional tool_call processing logic here as needed

# Run the Uvicorn server
if __name__ == "__main__":
    uvicorn.run("app:app", host="127.0.0.1", port=5000, reload=True)
