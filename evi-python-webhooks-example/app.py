from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from hume_webhook_types import WebhookEvent, WebhookEventChatStarted, WebhookEventChatEnded 
import logging
from utils import get_chat_transcript, validate_headers
import uvicorn

# load environment variables
load_dotenv()

# FastAPI app instance
app = FastAPI()

@app.post("/hume-webhook")
async def hume_webhook_handler(request: Request, event: WebhookEvent):
    """
    Handles incoming chat_started and chat_ended webhook events.
    """
    try:
        # Get the raw request body
        raw_payload = await request.body()
        payload_str = raw_payload.decode("utf-8")

        # Validate the request headers to ensure security
        # - Verifies the HMAC signature to confirm the payload was sent by Hume and not tampered with.
        # - Checks the timestamp to prevent replay attacks using older requests.
        # If validation fails, the request is rejected with an appropriate error.
        validate_headers(payload_str, request.headers)

        if isinstance(event, WebhookEventChatStarted):
            # Process chat_started event
            print(f"Processing chat_started event: {event.dict()}")

            # Add additional chat_started processing logic here if needed

        elif isinstance(event, WebhookEventChatEnded):
            # Process chat_ended event
            print(f"Processing chat_ended event: {event.dict()}")

            # Fetch Chat events, construct a Chat transcript, and write transcript to a file
            await get_chat_transcript(event.chat_id)

            # Add additional chat_ended processing logic here if needed

        else:
            # This case is unlikely due to type validation by FastAPI
            raise HTTPException(status_code=400, detail="Unsupported event type")

        # Respond with a success message
        return {"status": "success", "message": f"{event.event_name} processed"}

    except Exception as e:
        # Print unexpected errors for debugging
        print(f"Error in webhook handler: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Run the Uvicorn server
if __name__ == "__main__":
    uvicorn.run("app:app", host="127.0.0.1", port=5000, reload=True)