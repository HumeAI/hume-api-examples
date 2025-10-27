import os
import uuid  # for generating random user id values
import asyncio
import json

import twilio.jwt.access_token
import twilio.jwt.access_token.grants
import twilio.rest
import websockets
from dotenv import load_dotenv
from flask import Flask, render_template, request

# Load environment variables from a .env file
load_dotenv()

account_sid = os.environ["TWILIO_ACCOUNT_SID"]
api_key = os.environ["TWILIO_API_KEY_SID"]
api_secret = os.environ["TWILIO_API_KEY_SECRET"]
twilio_client = twilio.rest.Client(api_key, api_secret, account_sid)
hume_api_key = os.environ["HUME_API_KEY"]

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


async def evi_connection():
    evi_url = f"wss://api.hume.ai/v0/evi/chat?api_key={hume_api_key}"

    print("🔌 Connecting to EVI WebSocket...")

    try:
        async with websockets.connect(evi_url) as websocket:
            print("✅ Successfully connected to EVI!")

            # Wait for the initial message (should be ChatMetadata)
            initial_message = await websocket.recv()
            message_data = json.loads(initial_message)

            print(
                f"📨 Received initial message type: {message_data.get('type')}")
            print(f"📋 Message data: {json.dumps(message_data, indent=2)}")

            # Keep connection open for a moment
            await asyncio.sleep(2)

            print("👋 Closing connection...")

    except Exception as e:
        print(f"❌ Error connecting to EVI: {e}")
        raise


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


@app.route("/evi", methods=["GET"])
def test_evi():
    """
    EVI WebSocket connection: http://localhost:5001/evi
    """
    try:
        # Run the async function in a new event loop
        asyncio.run(evi_connection())
        return {"status": "success", "message": "EVI connection OK"}
    except Exception as e:
        return {"status": "error", "message": str(e)}, 500


# Start the server when this file runs
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", debug=True, port=port)
