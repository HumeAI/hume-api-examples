import os
import uuid  # for generating random user id values
import asyncio
import json
import base64

import numpy as np
import twilio.jwt.access_token
import twilio.jwt.access_token.grants
import twilio.rest
import websockets
from dotenv import load_dotenv
from flask import Flask, render_template, request

from audio_processors import TwilioAudioProcessor, EviAudioProcessor, AudioProcessingConfig

# Load environment variables from a .env file
load_dotenv()

account_sid = os.environ["TWILIO_ACCOUNT_SID"]
api_key = os.environ["TWILIO_API_KEY_SID"]
api_secret = os.environ["TWILIO_API_KEY_SECRET"]
twilio_client = twilio.rest.Client(api_key, api_secret, account_sid)
hume_api_key = os.environ["HUME_API_KEY"]
EVI_CHAT_ENDPOINT = "wss://api.hume.ai/v0/evi/chat"

# Create a Flask app
app = Flask(__name__)


def find_or_create_room(room_name):
    try:
        # try to fetch an in-progress room with this name
        twilio_client.video.v1.rooms(room_name).fetch()
    except twilio.base.exceptions.TwilioRestException:
        # Create a room without specifying type (defaults to group room)
        twilio_client.video.v1.rooms.create(unique_name=room_name)


def get_access_token(room_name):
    # create the access token
    access_token = twilio.jwt.access_token.AccessToken(
        account_sid, api_key, api_secret, identity=uuid.uuid4().int
    )
    # create the video grant
    video_grant = twilio.jwt.access_token.grants.VideoGrant(room=room_name)
    # Add the video grant to the access token
    access_token.add_grant(video_grant)
    return access_token


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
            "text": "Hello how are you doing today?"
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
    return "In progress!"


@app.route("/join-room", methods=["POST"])
def join_room():
    # extract the room_name from the JSON body of the POST request
    room_name = request.json.get("room_name")
    # find an existing room with this room_name, or create one
    find_or_create_room(room_name)
    # retrieve an access token for this room
    access_token = get_access_token(room_name)
    # return the decoded access token in the response
    # NOTE: if you are using version 6 of the Python Twilio SDK,
    # you should call `access_token.to_jwt().decode()`
    return {"token": access_token.to_jwt()}


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


# Start the server when this file runs
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", debug=True, port=port)
