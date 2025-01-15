from pydantic import BaseModel
from typing import Union, Optional
from enum import Enum

# Enum for webhook event names
class WebhookEventName(str, Enum):
    CHAT_STARTED = "chat_started"
    CHAT_ENDED = "chat_ended"

# Shared schema for common webhook event fields
class WebhookEventBase(BaseModel):
    event_name: WebhookEventName
    chat_group_id: str
    chat_id: str
    config_id: str
    caller_number: Optional[str]
    custom_session_id: Optional[str]

# Schema for chat_started webhook event
class WebhookEventChatStarted(WebhookEventBase):
    start_time: int
    chat_start_type: str

# Schema for chat_ended webhook event
class WebhookEventChatEnded(WebhookEventBase):
    end_time: int
    duration_seconds: int
    end_reason: str

# Type alias for webhook events
WebhookEvent = Union[WebhookEventChatStarted, WebhookEventChatEnded]