import asyncio
import base64
import datetime
import os
from dotenv import load_dotenv
from hume import MicrophoneInterface, Stream
from hume.client import AsyncHumeClient
from hume.empathic_voice.types import (
    ConnectSessionSettings,
    ConnectSessionSettingsAudio,
    ConnectSessionSettingsContext,
)
from hume.empathic_voice.chat.types import SubscribeEvent


def extract_top_n_emotions(emotion_scores: dict, n: int) -> dict:
    sorted_emotions = sorted(emotion_scores.items(),
                             key=lambda item: item[1], reverse=True)
    top_n_emotions = {emotion: score for emotion, score in sorted_emotions[:n]}

    return top_n_emotions


def print_emotions(emotion_scores: dict) -> None:
    print(
        ' | '.join([f"{emotion} ({score:.2f})" for emotion,
                   score in emotion_scores.items()])
    )


def log(text: str) -> None:
    now = datetime.datetime.now(tz=datetime.timezone.utc).strftime("%H:%M:%S")
    print(f"[{now}] {text}")


async def main() -> None:
    load_dotenv()

    HUME_API_KEY = os.getenv("HUME_API_KEY")
    # HUME_CONFIG_ID = os.getenv("HUME_CONFIG_ID")

    client = AsyncHumeClient(api_key=HUME_API_KEY)

    stream = Stream.new()

    async def on_message(message: SubscribeEvent):
        if message.type == "chat_metadata":
            log(
                f"<{message.type}> Chat ID: {message.chat_id}, Chat Group ID: {message.chat_group_id}"
            )
        elif message.type == "user_message" or message.type == "assistant_message":
            log(f"{message.message.role}: {message.message.content}")
            print_emotions(
                extract_top_n_emotions(
                    dict(message.models.prosody and message.models.prosody.scores or {}), 3)
            )
        elif message.type == "audio_output":
            await stream.put(
                base64.b64decode(message.data.encode("utf-8"))
            )
        elif message.type == "error":
            raise RuntimeError(
                f"Received error message from Hume websocket ({message.code}): {message.message}"
            )
        else:
            log(f"<{message.type}>")

    connect_kwargs = {
        # "config_id": HUME_CONFIG_ID,
        "verbose_transcription": True,
        "session_settings": ConnectSessionSettings(
            audio=ConnectSessionSettingsAudio(
                encoding="linear16",
                sample_rate=8000,
                channels=1,
            ),
            context=ConnectSessionSettingsContext(
                text=(
                    "The new context is that you are the Predator from the movie Predator. You are a dangerous and deadly hunter. Start conversation with telling the user who you are."
                ),
                type="persistent",
            ),
        ),
    }

    async with client.empathic_voice.chat.connect(
        **connect_kwargs
    ) as socket:
        print("WebSocket connection opened.")

        # Message pump: read messages from socket and dispatch
        async def pump_messages():
            try:
                async for message in socket:
                    await on_message(message)
            except Exception as err:
                print(f"Error: {err}")
                raise
            finally:
                print("WebSocket connection closed.")

        # Run microphone interface and message pump concurrently
        await asyncio.gather(
            asyncio.create_task(
                MicrophoneInterface.start(
                    socket,
                    allow_user_interrupt=False,
                    byte_stream=stream
                )
            ),
            asyncio.create_task(pump_messages())
        )

if __name__ == "__main__":
    asyncio.run(main())
