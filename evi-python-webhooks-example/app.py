from fastapi import FastAPI, HTTPException, Request
from typing import Union, Optional
from pydantic import BaseModel
from utils import fetch_all_chat_events, construct_transcript, save_transcript_to_file
import uvicorn

# Shared schema for common fields
class WebhookEventBase(BaseModel):
    event_name: str
    chat_group_id: str
    chat_id: str
    config_id: str
    caller_number: Optional[str]
    custom_session_id: Optional[str]

# Schema for chat_started event
class ChatStartedEvent(WebhookEventBase):
    start_time: int
    chat_start_type: str

# Schema for chat_ended event
class ChatEndedEvent(WebhookEventBase):
    end_time: int
    duration_seconds: int
    end_reason: str

# Type alias for webhook events
WebhookEvent = Union[ChatStartedEvent, ChatEndedEvent]

# FastAPI app instance
app = FastAPI()

@app.post("/hume-webhook")
async def hume_webhook_handler(request: Request, event: WebhookEvent):
    """
    Handles incoming webhook events for chat_started and chat_ended.
    """
    try:
        # Print the raw incoming payload for debugging
        raw_payload = await request.json()

        if isinstance(event, ChatStartedEvent):
            # Process chat_started event
            print(f"Processing chat_started event: {event.dict()}")
            # Add additional chat_started processing logic here if needed

        elif isinstance(event, ChatEndedEvent):
            # Process chat_ended event
            print(f"Processing chat_ended event: {event.dict()}")

            # Step 1: Fetch all chat events for the given chat_id
            chat_events = await fetch_all_chat_events(event.chat_id)

            # Step 2: Construct a formatted transcript string
            transcript = construct_transcript(chat_events)

            # Step 3: Save the transcript to a .txt file
            save_transcript_to_file(transcript, event.chat_id)

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