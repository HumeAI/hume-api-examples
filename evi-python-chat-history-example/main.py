import asyncio
import os
import json
from typing import cast, TypedDict
from dotenv import load_dotenv
from hume.client import AsyncHumeClient
from hume.empathic_voice.types import ReturnChatEvent

load_dotenv()

class EmotionScore(TypedDict):
    emotion: str
    score: float

async def main():
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
    # Filter for user and assistant messages
    relevant_events = [e for e in chat_events if e.type in ("USER_MESSAGE", "AGENT_MESSAGE")]

    lines: list[str] = []
    for event in relevant_events:
        role = "User" if event.role == "USER" else "Assistant"
        timestamp = event.timestamp
        from datetime import datetime
        dt = datetime.fromtimestamp(timestamp / 1000.0)
        readable_time = dt.strftime("%Y-%m-%d %H:%M:%S")
        lines.append(f"[{readable_time}] {role}: {event.message_text}")

    return "\n".join(lines)

def get_top_emotions(chat_events: list[ReturnChatEvent]) -> dict[str, float]:
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