import asyncio
import json
import os
from datetime import datetime
from dotenv import load_dotenv
from hume.client import AsyncHumeClient
from hume.empathic_voice.types import ReturnChatEvent
from typing import cast, TypedDict

load_dotenv()

class EmotionScore(TypedDict):
    emotion: str
    score: float

async def main() -> None:
    """
    The main entry point of the script.

    Steps:
    1. Set the CHAT_ID to the chat you want to analyze.
    2. Fetch all chat events for that CHAT_ID.
    3. Generate a transcript from user and assistant messages.
    4. Save the transcript to a local text file.
    5. Calculate and display the top 3 emotions by average score.
    """
    # Replace with your actual Chat ID
    CHAT_ID = "<YOUR_CHAT_ID>"

    chat_events = await fetch_all_chat_events(CHAT_ID)
    transcript = generate_transcript(chat_events)

    # Write the transcript to a text file
    transcript_file_name = f"transcript_{CHAT_ID}.txt"
    with open(transcript_file_name, "w", encoding="utf-8") as f:
        f.write(transcript)
    print(f"Transcript saved to {transcript_file_name}")

    # Calculate and print the top 3 emotions (on average)
    top_emotions = get_top_emotions(chat_events)
    print("Top 3 Emotions:", top_emotions)


async def fetch_all_chat_events(chat_id: str) -> list[ReturnChatEvent]:
    """
    Fetches all chat events for the given chat ID using the AsyncHumeClient.
    The function returns all events in chronological order.

    :param chat_id: The unique identifier of the chat to fetch events for.
    :return: A list of ReturnChatEvent objects representing all fetched events.
    :raises ValueError: If HUME_API_KEY is not set in environment variables.
    """
    api_key = os.environ.get("HUME_API_KEY")
    if not api_key:
        raise ValueError("HUME_API_KEY is not set in the environment variables.")

    client = AsyncHumeClient(api_key=api_key)

    all_chat_events: list[ReturnChatEvent] = []
    # The response is an iterator over chat events
    response = await client.empathic_voice.chats.list_chat_events(id=chat_id, page_number=0, ascending_order=True)
    async for event in response:
        all_chat_events.append(event)
    return all_chat_events

def generate_transcript(chat_events: list[ReturnChatEvent]) -> str:
    """
    Generates a formatted transcript string from the given chat events.
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

def get_top_emotions(chat_events: list[ReturnChatEvent]) -> dict[str, float]:
    """
    Calculates the top 3 average emotion scores from user messages within the provided chat events.
    
    Steps:
    1. Filters for user messages that contain emotion features.
    2. Infers emotion keys from the first user message.
    3. Accumulates scores for each emotion across all user messages.
    4. Computes average scores and returns the top 3 as a dictionary { emotion: score }.

    :param chat_events: A list of chat events to analyze.
    :return: A dictionary of the top 3 emotions mapped to their average scores.
             Returns an empty dictionary if no user messages have emotion features.
    """
    # Filter user messages that have emotion features
    user_messages = [e for e in chat_events if e.type == "USER_MESSAGE" and e.emotion_features]

    total_messages = len(user_messages)

    # Parse the emotion features of the first user message to determine emotion keys
    first_message_emotions = cast(dict[str, float], json.loads(cast(str, user_messages[0].emotion_features)))
    emotion_keys: list[str] = list(first_message_emotions.keys())

    # Initialize sums for all emotions to 0
    emotion_sums = {key: 0.0 for key in emotion_keys}

    # Accumulate emotion scores from each user message
    for event in user_messages:
        emotions = json.loads(cast(str, event.emotion_features))
        for key in emotion_keys:
            emotion_sums[key] += emotions[key]

    # Compute average scores for each emotion
    average_emotions: list[EmotionScore] = [{"emotion": key, "score": emotion_sums[key] / total_messages} for key in emotion_keys]

    # Sort by average score (descending) and return top 3
    average_emotions.sort(key=lambda x: x["score"], reverse=True)
    top_3 = average_emotions[:3]

    # Convert top 3 into a dictionary of { emotion: score }
    return {item["emotion"]: item["score"] for item in top_3}

if __name__ == "__main__":
    asyncio.run(main())