from pydantic import BaseModel
from typing import Union, Optional

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