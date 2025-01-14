import os
from hume.client import AsyncHumeClient
from hume.empathic_voice.types import ReturnChatEvent
from datetime import datetime
from dotenv import load_dotenv

async def fetch_all_chat_events(chat_id: str) -> list[ReturnChatEvent]:
    """
    Fetches all Chat Events for the given chat ID using the AsyncHumeClient.
    The function returns all events in chronological order.

    :param chat_id: The unique identifier of the chat to fetch events for.
    :return: A list of ReturnChatEvent objects representing all fetched events.
    :raises ValueError: If HUME_API_KEY is not set in environment variables.
    """
    load_dotenv()
    api_key = os.environ.get("HUME_API_KEY")
    if not api_key:
        raise ValueError("HUME_API_KEY is not set in the environment variables.")

    client = AsyncHumeClient(api_key=api_key)

    all_chat_events: list[ReturnChatEvent] = []
    # The response is an iterator over Chat Events
    response = await client.empathic_voice.chats.list_chat_events(id=chat_id, page_number=0, ascending_order=True)
    async for event in response:
        all_chat_events.append(event)
    return all_chat_events

def construct_transcript(chat_events: list[ReturnChatEvent]) -> str:
    """
    Constructs a formatted transcript string from the given chat events.
    Only user and assistant messages are included. Each line includes a timestamp,
    the speaker role, and the message text.

    :param chat_events: A list of chat events to parse.
    :return: A multi-line string representing the transcript.
    """
    # Filter for user and assistant messages
    relevant_events = [e for e in chat_events if e.type in ("USER_MESSAGE", "AGENT_MESSAGE")]

    lines: list[str] = []
    for event in relevant_events:
        role = "User" if event.role == "USER" else "Assistant"
        timestamp = event.timestamp
        dt = datetime.fromtimestamp(timestamp / 1000.0)
        readable_time = dt.strftime("%Y-%m-%d %H:%M:%S")
        lines.append(f"[{readable_time}] {role}: {event.message_text}")

    return "\n".join(lines)

def save_transcript_to_file(transcript: str, chat_id: str) -> None:
    """
    Saves the given transcript to a .txt file with a name based on the chat ID.

    Args:
        transcript (str): The transcript text to save.
        chat_id (str): The chat ID used to name the file.
    """
    transcript_file_name = f"transcript_{chat_id}.txt"
    with open(transcript_file_name, "w", encoding="utf-8") as f:
        f.write(transcript)
    print(f"Transcript saved to {transcript_file_name}")
