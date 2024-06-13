# main.py

import asyncio
import os

from authenticator import Authenticator
from connection import Connection
from devices import AudioDevices
from dotenv import load_dotenv
from pyaudio import PyAudio, paInt16

# Audio format and parameters
FORMAT = paInt16
CHANNELS = 1
SAMPLE_WIDTH = 2  # PyAudio.get_sample_size(pyaudio, format=paInt16)
CHUNK_SIZE = 1024


async def main():
    """
    Main asynchronous function to set up audio devices, authenticate, and connect to the Hume AI websocket.
    """
    # Initialize PyAudio instance
    pyaudio = PyAudio()
    
    # List available audio input and output devices
    input_devices, output_devices = AudioDevices.list_audio_devices(pyaudio)
    
    # Choose the audio input device and get its sample rate
    input_device_index, input_device_sample_rate = AudioDevices.choose_device(
        input_devices, "input"
    )
    
    # Choose the audio output device
    output_device_index = AudioDevices.choose_device(output_devices, "output")

    # Open the audio stream with the selected parameters
    audio_stream = pyaudio.open(
        format=FORMAT,
        channels=CHANNELS,
        frames_per_buffer=CHUNK_SIZE,
        rate=input_device_sample_rate,
        input=True,
        output=True,
        input_device_index=input_device_index,
        output_device_index=output_device_index,
    )

    # Fetch the access token for authentication
    access_token = get_access_token()

    # Construct the websocket URL with the access token
    socket_url = (
        "wss://api.hume.ai/v0/assistant/chat?"
        f"access_token={access_token}"
    )

    # Connect to the websocket and start the audio stream
    await Connection.connect(
        socket_url,
        audio_stream,
        input_device_sample_rate,
        SAMPLE_WIDTH,
        CHANNELS,
        CHUNK_SIZE,
    )

    # Close the PyAudio stream and terminate PyAudio
    audio_stream.stop_stream()
    audio_stream.close()
    pyaudio.terminate()


def get_access_token() -> str:
    """
    Load API credentials from environment variables and fetch an access token.

    Returns:
        str: The access token.

    Raises:
        SystemExit: If API key or Secret key are not set.
    """
    load_dotenv()

    # Attempt to retrieve API key and Secret key from environment variables
    HUME_API_KEY = os.getenv("HUME_API_KEY")
    HUME_SECRET_KEY = os.getenv("HUME_SECRET_KEY")

    # Ensure API key and Secret key are set
    if HUME_API_KEY is None or HUME_SECRET_KEY is None:
        print(
            "Error: HUME_API_KEY and HUME_SECRET_KEY must be set either in a .env file or as environment variables."
        )
        exit()

    # Create an instance of Authenticator with the API key and Secret key
    authenticator = Authenticator(HUME_API_KEY, HUME_SECRET_KEY)

    # Fetch the access token
    access_token = authenticator.fetch_access_token()
    return access_token


if __name__ == "__main__":
    """
    Entry point for the script. Runs the main asynchronous function.
    """
    asyncio.run(main())
