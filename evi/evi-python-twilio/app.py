import os
import asyncio
import json
import base64

import numpy as np
import websockets
from dotenv import load_dotenv
from flask import Flask, request
from flask_sock import Sock

from audio_processors import TwilioAudioProcessor, EviAudioProcessor

# Load environment variables from a .env file
load_dotenv()

# Hume API configuration
hume_api_key = os.environ["HUME_API_KEY"]
EVI_CHAT_ENDPOINT = "wss://api.hume.ai/v0/evi/chat"

# Create a Flask app
app = Flask(__name__)
sock = Sock(app)


async def evi_text_to_audio_example():
    """

    1. Connects to EVI WebSocket
    2. Sends session_settings for Twilio-compatible audio format
    3. Sends text message: "Hello how are you doing today?"
    4. Receives audio response from EVI
    5. Converts audio to Twilio format (μ-law 8-bit PCM, 8kHz, mono)

    """
    # Initialize audio processors
    twilio_audio_processor = TwilioAudioProcessor()
    evi_audio_processor = EviAudioProcessor(
        audio_numpy_dtype=np.dtype(np.int16),
        target_frames=8000  # Twilio sample rate
    )

    user_name = "John Doe from Hume AI"

    # Connect to EVI
    evi_url = f"{EVI_CHAT_ENDPOINT}?api_key={hume_api_key}"
    print("🔌 Connecting to EVI WebSocket...")

    async with websockets.connect(evi_url) as evi_ws:
        print("✅ Connected to EVI!")

        # Step 1: Receive initial ChatMetadata message
        initial_message = await evi_ws.recv()
        chat_metadata = json.loads(initial_message)
        print(f"📨 Received: {chat_metadata.get('type')}")
        print(f"   Chat ID: {chat_metadata.get('chat_id')}")

        # Step 2: Send session_settings to configure audio format
        # This tells EVI we're sending/receiving linear16 PCM at 8kHz (Twilio format)
        session_settings = {
            "type": "session_settings",
            "audio": {
                "encoding": "linear16",
                "sample_rate": TwilioAudioProcessor.TWILIO_FRAME_RATE,  # 8000
                "channels": TwilioAudioProcessor.CHANNELS  # 1 (mono)
            }
        }
        await evi_ws.send(json.dumps(session_settings))
        print("📤 Sent session_settings")

        # Step 3: Send text message to EVI
        user_input = {
            "type": "user_input",
            "text": f"Hello {user_name}, how are you doing today?"
        }
        await evi_ws.send(json.dumps(user_input))
        print(f"📤 Sent user_input: '{user_input['text']}'")

        # Step 4: Receive responses from EVI
        audio_chunks_received = 0
        twilio_audio_chunks = []

        print("\n🎧 Listening for EVI responses...")

        async for message in evi_ws:
            try:
                data = json.loads(message)
                message_type = data.get("type")

                if message_type == "audio_output":
                    # Received audio from EVI
                    audio_chunks_received += 1

                    # Decode base64 audio data (EVI sends WAV format)
                    evi_audio_b64 = data.get("data")
                    evi_audio_bytes = base64.b64decode(evi_audio_b64)

                    # Convert EVI audio to Twilio format (μ-law)
                    twilio_audio = evi_audio_processor.postprocess_audio(
                        evi_audio=evi_audio_bytes
                    )

                    # Encode for Twilio transmission
                    twilio_audio_b64 = base64.b64encode(
                        twilio_audio).decode("utf-8")
                    twilio_audio_chunks.append(twilio_audio_b64)

                    print(
                        f"   🔊 Audio chunk {audio_chunks_received} received and converted")

                elif message_type == "assistant_message":
                    # EVI's text response
                    assistant_text = data.get("message", {}).get("content", "")
                    print(f"\n💬 EVI: {assistant_text}")

                elif message_type == "assistant_end":
                    # EVI finished responding
                    print("\n✅ EVI finished responding")
                    break

                elif message_type == "user_message":
                    # Echo of what we sent
                    user_text = data.get("message", {}).get("content", "")
                    print(f"   👤 User (confirmed): {user_text}")

                else:
                    print(f"   ℹ️  Received: {message_type}")

            except json.JSONDecodeError:
                print(f"   ⚠️  Non-JSON message received")
                continue

        print(f"\n📊 Summary:")
        print(f"   - Audio chunks received: {audio_chunks_received}")
        print(f"   - Twilio-ready audio chunks: {len(twilio_audio_chunks)}")
        print(
            f"\n💡 These {len(twilio_audio_chunks)} audio chunks are now ready to send to Twilio!")
        print(f"   Format: μ-law 8-bit PCM, 8kHz, mono (Twilio's required format)")

        return twilio_audio_chunks


@app.route("/")
def serve_homepage():
    return "EVI + Twilio Integration Server"


@app.route("/twiml", methods=["POST"])
def twiml_response():
    """
    TwiML endpoint for Twilio to call when a phone call comes in.
    Returns TwiML that starts a Media Stream to our WebSocket endpoint.

    Configure this URL in your Twilio phone number settings:
    https://your-server.com/twiml
    """
    # Get the server's base URL (you may need to configure this for production)
    # For local testing with ngrok: use your ngrok URL
    # For production: use your actual domain
    server_url = request.url_root.replace(
        "http://", "wss://").replace("https://", "wss://")

    # Build TwiML response
    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>Connecting you to E V I</Say>
    <Connect>
        <Stream url="{server_url}media-stream" />
    </Connect>
</Response>"""

    print(f"📞 Incoming call - returning TwiML")
    print(f"   Media Stream URL: {server_url}media-stream")

    return twiml, 200, {"Content-Type": "application/xml"}


@app.route("/evi-demo", methods=["GET"])
def evi_demo():
    """
    Demo endpoint: Sends text to EVI and receives Twilio-formatted audio.
    Visit http://localhost:5001/evi-demo to test.
    """
    try:
        audio_chunks = asyncio.run(evi_text_to_audio_example())
        return {
            "status": "success",
            "message": "EVI demo completed! Check server logs for details.",
            "audio_chunks_count": len(audio_chunks)
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}, 500


@sock.route("/media-stream")
def media_stream(ws):
    """
    Twilio Media Stream WebSocket endpoint.
    Bidirectional audio streaming between Twilio and EVI.

    Based on Hume's reference implementation.
    """
    print("📞 Twilio Media Stream WebSocket connected")

    # Run the async handler
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(handle_media_stream(ws))
    finally:
        loop.close()


async def handle_media_stream(ws):
    """
    Async handler for bidirectional Twilio <-> EVI audio streaming.
    Based on reference: twilio_mediator.py
    """
    from asyncio import Queue

    # Create queues for bidirectional communication (from reference)
    twilio_to_evi_queue = Queue()
    evi_to_twilio_queue = Queue()

    # Initialize audio processors (from reference)
    twilio_audio_processor = TwilioAudioProcessor()
    evi_audio_processor = EviAudioProcessor(
        audio_numpy_dtype=np.dtype(np.int16),
        target_frames=8000
    )

    stream_sid = None
    evi_ws = None

    try:
        # Task 1: Receive from Twilio and queue for EVI
        async def receive_from_twilio():
            nonlocal stream_sid
            loop = asyncio.get_event_loop()
            while True:
                # Run synchronous ws.receive() in executor to avoid blocking
                message = await loop.run_in_executor(None, ws.receive)
                if message is None:
                    break

                data = json.loads(message)
                event_type = data.get("event")

                if event_type == "connected":
                    print("✅ Twilio Media Stream: Connected")

                elif event_type == "start":
                    stream_sid = data.get("streamSid")
                    start_data = data.get("start", {})
                    print(f"🎤 Media Stream started: {stream_sid}")
                    print(f"   Call SID: {start_data.get('callSid')}")

                elif event_type == "media":
                    # Received audio from Twilio (μ-law base64)
                    # From reference: twilio_message_broker.py line 120-123
                    media_data = data.get("media", {})
                    twilio_media_payload = {
                        "payload": media_data.get("payload"),
                        "track": "inbound",
                        "timestamp": media_data.get("timestamp")
                    }

                    # Convert and queue for EVI (from reference: twilio_audio_processor.py)
                    await twilio_audio_processor.queue_twilio_audio(
                        twilio_media_payload=twilio_media_payload,
                        twilio_to_evi_queue=twilio_to_evi_queue
                    )

                elif event_type == "stop":
                    print("🛑 Media Stream stopped")
                    break

        # Task 2: Send queued audio to EVI
        async def send_to_assistant():
            nonlocal evi_ws
            while True:
                queued_chunk = await twilio_to_evi_queue.get()
                if evi_ws:
                    # Send as audio_input to EVI (from reference: evi_message_broker.py line 145-148)
                    audio_input = {
                        "type": "audio_input",
                        "data": base64.b64encode(queued_chunk).decode("utf-8")
                    }
                    await evi_ws.send(json.dumps(audio_input))

        # Task 3: Receive from EVI and queue for Twilio
        async def receive_from_assistant():
            nonlocal evi_ws
            while True:
                if not evi_ws:
                    await asyncio.sleep(0.1)
                    continue

                evi_message = await evi_ws.recv()
                data = json.loads(evi_message)
                message_type = data.get("type")

                if message_type == "audio_output":
                    # From reference: evi_message_broker.py line 138-140
                    evi_audio_b64 = data.get("data")
                    evi_audio_bytes = base64.b64decode(evi_audio_b64)
                    twilio_audio = evi_audio_processor.postprocess_audio(
                        evi_audio=evi_audio_bytes)
                    evi_to_twilio_queue.put_nowait(
                        base64.b64encode(twilio_audio).decode("utf-8"))
                    print("🔊 EVI audio received and converted")

                elif message_type == "user_message":
                    user_text = data.get("message", {}).get("content", "")
                    print(f"👤 User said: {user_text}")

                elif message_type == "assistant_message":
                    assistant_text = data.get("message", {}).get("content", "")
                    print(f"💬 EVI: {assistant_text}")

        # Task 4: Send queued audio to Twilio
        async def send_to_twilio():
            loop = asyncio.get_event_loop()
            while True:
                mulaw_audio_b64 = await evi_to_twilio_queue.get()
                if stream_sid:
                    # From reference: twilio_message_broker.py line 158-172
                    payload = {
                        "event": "media",
                        "streamSid": stream_sid,
                        "media": {"payload": mulaw_audio_b64}
                    }
                    # Run synchronous ws.send() in executor to avoid blocking
                    await loop.run_in_executor(None, ws.send, json.dumps(payload))
                    print("📤 Sent audio to Twilio")

        # Connect to EVI (from reference: evi_message_broker.py line 77-94)
        evi_url = f"{EVI_CHAT_ENDPOINT}?api_key={hume_api_key}"
        print("🔌 Connecting to EVI...")
        evi_ws = await websockets.connect(evi_url)
        print("✅ Connected to EVI!")

        # Receive ChatMetadata
        initial_message = await evi_ws.recv()
        chat_metadata = json.loads(initial_message)
        print(f"📨 Chat ID: {chat_metadata.get('chat_id')}")

        # Send session_settings (from reference: evi_message_broker.py line 100-107)
        session_settings = {
            "type": "session_settings",
            "audio": {
                "encoding": "linear16",
                "sample_rate": TwilioAudioProcessor.TWILIO_FRAME_RATE,
                "channels": TwilioAudioProcessor.CHANNELS
            }
        }
        await evi_ws.send(json.dumps(session_settings))
        print("📤 Sent session_settings to EVI")

        # Run all tasks concurrently (from reference: twilio_mediator.py line 93-98)
        tasks = [
            asyncio.create_task(receive_from_twilio()),
            asyncio.create_task(send_to_assistant()),
            asyncio.create_task(receive_from_assistant()),
            asyncio.create_task(send_to_twilio()),
        ]

        # Wait for any task to complete (from reference: twilio_mediator.py line 100)
        done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)

        # Cancel remaining tasks
        for task in pending:
            task.cancel()

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if evi_ws:
            await evi_ws.close()
        print("👋 Media Stream closed")


# Start the server when this file runs
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", debug=True, port=port)
