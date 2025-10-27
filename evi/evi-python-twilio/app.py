import os
import asyncio
import json
import base64
import numpy as np
from dotenv import load_dotenv
from flask import Flask, request
from flask_sock import Sock
from hume import AsyncHumeClient
from hume.empathic_voice.chat.socket_client import ChatConnectOptions
from hume.empathic_voice.chat.types import SubscribeEvent
from hume.empathic_voice import SessionSettings, AudioInput, UserInput
from audio_processors import TwilioAudioProcessor, EviAudioProcessor

# Load environment variables from .env file
load_dotenv()
hume_api_key = os.environ["HUME_API_KEY"]

hume_client = AsyncHumeClient(api_key=hume_api_key)
app = Flask(__name__)
sock = Sock(app)


@app.route("/")
def serve_homepage():
    return "EVI + Twilio Integration Server"


@app.route("/twiml", methods=["POST"])
def twiml_response():
    """
    TwiML endpoint that Twilio calls when a phone call comes in.
    Configure this URL in your Twilio phone number webhook settings.
    """
    server_url = request.url_root.replace(
        "http://", "wss://").replace("https://", "wss://")

    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>Connecting you to Hume AI</Say>
    <Connect>
        <Stream url="{server_url}media-stream" />
    </Connect>
</Response>"""

    print(f"📞 Incoming call")
    print(f"   Media Stream URL: {server_url}media-stream")

    return twiml, 200, {"Content-Type": "application/xml"}


@sock.route("/media-stream")
def media_stream(ws):
    """WebSocket endpoint for bidirectional audio streaming between Twilio and EVI."""
    print("📞 Twilio Media Stream WebSocket connected")

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(handle_media_stream(ws))
    finally:
        loop.close()


async def handle_media_stream(ws):
    from asyncio import Queue

    # Queues for passing audio between tasks
    twilio_to_evi_queue = Queue()
    evi_to_twilio_queue = Queue()

    # Audio processors for format conversion
    twilio_audio_processor = TwilioAudioProcessor()
    evi_audio_processor = EviAudioProcessor(
        audio_numpy_dtype=np.dtype(np.int16),
        target_frames=8000
    )

    stream_sid = None
    evi_socket = None

    try:
        async def receive_from_twilio():
            """Receives audio from Twilio, converts μ-law to linear16, and queues for EVI."""
            nonlocal stream_sid
            loop = asyncio.get_event_loop()

            while True:
                message = await loop.run_in_executor(None, ws.receive)
                if message is None:
                    break

                data = json.loads(message)
                event_type = data.get("event")

                if event_type == "connected":
                    print("✅ Twilio connected")

                elif event_type == "start":
                    stream_sid = data.get("streamSid")
                    print(f"🎤 Call started: {stream_sid}")

                elif event_type == "media":
                    # Queue Twilio audio for conversion and sending to EVI
                    media_data = data.get("media", {})
                    await twilio_audio_processor.queue_twilio_audio(
                        twilio_media_payload={
                            "payload": media_data.get("payload"),
                            "track": "inbound",
                            "timestamp": media_data.get("timestamp")
                        },
                        twilio_to_evi_queue=twilio_to_evi_queue
                    )

                elif event_type == "stop":
                    print("🛑 Call ended")
                    break

        async def send_to_evi():
            """Sends queued audio chunks to EVI."""
            nonlocal evi_socket
            while True:
                chunk = await twilio_to_evi_queue.get()
                if evi_socket:
                    audio_input = AudioInput(
                        data=base64.b64encode(chunk).decode("utf-8"))
                    await evi_socket.send_audio_input(audio_input)

        async def on_evi_message(message: SubscribeEvent):
            """Handles messages received from EVI."""
            if message.type == "chat_metadata":
                print(f"📨 Chat ID: {message.chat_id}")

            elif message.type == "audio_output":
                # Convert EVI audio to Twilio μ-law format and queue
                evi_audio_bytes = base64.b64decode(
                    message.data.encode("utf-8"))
                twilio_audio = evi_audio_processor.postprocess_audio(
                    evi_audio_bytes)
                evi_to_twilio_queue.put_nowait(
                    base64.b64encode(twilio_audio).decode("utf-8"))
                print("🔊 EVI audio received")

            elif message.type == "user_message":
                print(f"👤 User: {message.message.content}")

            elif message.type == "assistant_message":
                print(f"💬 EVI: {message.message.content}")

            elif message.type == "error":
                print(f"❌ EVI Error: {message.message}")

        async def send_to_twilio():
            """Sends queued audio chunks to Twilio."""
            loop = asyncio.get_event_loop()
            while True:
                audio_b64 = await evi_to_twilio_queue.get()
                if stream_sid:
                    payload = {
                        "event": "media",
                        "streamSid": stream_sid,
                        "media": {"payload": audio_b64}
                    }
                    await loop.run_in_executor(None, ws.send, json.dumps(payload))

        # Connect to EVI
        print("🔌 Connecting to EVI...")

        async with hume_client.empathic_voice.chat.connect_with_callbacks(
            options=ChatConnectOptions(),
            on_open=lambda: print("✅ EVI connected"),
            on_message=on_evi_message,
            on_close=lambda: print("👋 EVI disconnected"),
            on_error=lambda err: print(f"❌ EVI Error: {err}")
        ) as socket:
            evi_socket = socket

            session_settings_config = {
                "audio": {
                    "encoding": "linear16",
                    "sample_rate": 8000,
                    "channels": 1
                }
            }

            # Add user name as persistent context if provided
            # See more here: https://dev.hume.ai/reference/speech-to-speech-evi/chat#send.SessionSettings.context
            user_name = "Benedict Cumberbatch from Hume AI"

            if user_name:
                session_settings_config["context"] = {
                    "type": "persistent",
                    "text": f"The user's name is {user_name}. Remember to use their name when appropriate."
                }

            await socket.send_session_settings(SessionSettings(**session_settings_config))

            # Run all audio streaming tasks concurrently
            tasks = [
                asyncio.create_task(receive_from_twilio()),
                asyncio.create_task(send_to_evi()),
                asyncio.create_task(send_to_twilio()),
            ]

            # Wait for any task to complete, then clean up
            await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
            for task in tasks:
                task.cancel()

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        print("👋 Call ended")


# Start the server
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", debug=True, port=port)
