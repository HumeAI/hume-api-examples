# connection.py

import asyncio
import base64
import json
import tempfile
import logging
import io
import wave
import numpy as np
import websockets
import soundfile
from playsound import playsound
from pyaudio import Stream as PyAudioStream
from concurrent.futures import ThreadPoolExecutor

# Set up a thread pool executor for non-blocking audio stream reading
executor = ThreadPoolExecutor(max_workers=1)

# Configure logging
logging.basicConfig(
    format="%(asctime)s - %(levelname)s - %(message)s", level=logging.DEBUG
)

class Connection:
    """
    A class to handle the connection to the WebSocket server for streaming audio data.
    """

    @classmethod
    async def connect(
        cls,
        socket_url: str,
        audio_stream: PyAudioStream,
        sample_rate: int,
        sample_width: int,
        num_channels: int,
        chunk_size: int,
    ):
        """
        Establish and maintain a connection to the WebSocket server, handling reconnections as needed.

        Args:
            socket_url (str): The URL of the WebSocket server.
            audio_stream (PyAudioStream): The PyAudio stream to read audio data from.
            sample_rate (int): The sample rate of the audio data.
            sample_width (int): The sample width of the audio data.
            num_channels (int): The number of audio channels.
            chunk_size (int): The size of each audio chunk.

        Raises:
            Exception: If any error occurs during WebSocket connection or data transmission.
        """
        while True:
            try:
                async with websockets.connect(socket_url) as socket:
                    print("Connected to WebSocket")
                    # Create tasks for sending and receiving audio data
                    send_task = asyncio.create_task(
                        cls._send_audio_data(
                            socket,
                            audio_stream,
                            sample_rate,
                            sample_width,
                            num_channels,
                            chunk_size,
                        )
                    )
                    receive_task = asyncio.create_task(cls._receive_audio_data(socket))
                    # Wait for both tasks to complete
                    await asyncio.gather(receive_task, send_task)
            except websockets.exceptions.ConnectionClosed:
                print(
                    "WebSocket connection closed. Attempting to reconnect in 5 seconds..."
                )
                await asyncio.sleep(5)
            except Exception as e:
                print(
                    f"An error occurred: {e}. Attempting to reconnect in 5 seconds..."
                )
                await asyncio.sleep(5)

    @classmethod
    async def _receive_audio_data(cls, socket):
        """
        Receive and process audio data from the WebSocket server.

        Args:
            socket (WebSocketClientProtocol): The WebSocket connection.

        Raises:
            Exception: If any error occurs while receiving or processing audio data.
        """
        try:
            async for message in socket:
                try:
                    # Attempt to parse the JSON message
                    json_message = json.loads(message)
                    print("Received JSON message:", json_message)

                    # Check if the message type is 'audio_output'
                    if json_message.get("type") == "audio_output":
                        # Decode the base64 audio data
                        audio_data = base64.b64decode(json_message["data"])

                        # Write the decoded audio data to a temporary file and play it
                        with tempfile.NamedTemporaryFile(delete=True, suffix=".wav") as tmpfile:
                            tmpfile.write(audio_data)
                            tmpfile.flush()  # Ensure all data is written to disk
                            playsound(tmpfile.name)
                            print("Audio played")

                except ValueError as e:
                    print(f"Failed to parse JSON, error: {e}")
                except KeyError as e:
                    print(f"Key error in JSON data: {e}")

        except Exception as e:
            print(f"An error occurred while receiving audio: {e}")

    @classmethod
    async def _read_audio_stream_non_blocking(cls, audio_stream, chunk_size):
        """
        Read a chunk of audio data from the PyAudio stream in a non-blocking manner.

        Args:
            audio_stream (PyAudioStream): The PyAudio stream to read audio data from.
            chunk_size (int): The size of each audio chunk.

        Returns:
            bytes: The audio data read from the stream.
        """
        loop = asyncio.get_running_loop()
        data = await loop.run_in_executor(
            executor, audio_stream.read, chunk_size, False
        )
        return data

    @classmethod
    async def _send_audio_data(
        cls,
        socket,
        audio_stream: PyAudioStream,
        sample_rate: int,
        sample_width: int,
        num_channels: int,
        chunk_size: int,
    ):
        """
        Read audio data from the PyAudio stream and send it to the WebSocket server.

        Args:
            socket (WebSocketClientProtocol): The WebSocket connection.
            audio_stream (PyAudioStream): The PyAudio stream to read audio data from.
            sample_rate (int): The sample rate of the audio data.
            sample_width (int): The sample width of the audio data.
            num_channels (int): The number of audio channels.
            chunk_size (int): The size of each audio chunk.
        """
        wav_buffer = io.BytesIO()
        headers_sent = False

        while True:
            # Read audio data from the stream
            data = await cls._read_audio_stream_non_blocking(audio_stream, chunk_size)
            if num_channels == 2:  # Stereo to mono conversion if stereo is detected
                # Assuming the sample width is 2 bytes, hence 'int16'
                stereo_data = np.frombuffer(data, dtype=np.int16)
                # Averaging every two samples (left and right channels)
                mono_data = ((stereo_data[0::2] + stereo_data[1::2]) / 2).astype(np.int16)
                data = mono_data.tobytes()

            # Convert audio data to numpy array and write to buffer
            np_array = np.frombuffer(data, dtype="int16")
            soundfile.write(
                wav_buffer,
                np_array,
                samplerate=sample_rate,
                subtype="PCM_16",
                format="RAW",
            )

            wav_content = wav_buffer.getvalue()
            if not headers_sent:
                # Write WAV header if not already sent
                header_buffer = io.BytesIO()
                with wave.open(header_buffer, "wb") as wf:
                    wf.setnchannels(num_channels)
                    wf.setsampwidth(sample_width)
                    wf.setframerate(sample_rate)
                    wf.setnframes(chunk_size)

                    wf.writeframes(b"")

                headers = header_buffer.getvalue()
                wav_content = headers + wav_content
                headers_sent = True

            # Encode audio data to base64 and send as JSON message
            encoded_audio = base64.b64encode(wav_content).decode('utf-8')
            json_message = json.dumps({"type": "audio_input", "data": encoded_audio})
            await socket.send(json_message)

            # Reset buffer for the next chunk of audio data
            wav_buffer = io.BytesIO()
