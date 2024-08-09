import asyncio
import base64
import json
import os
import datetime
from dotenv import load_dotenv
from hume.client import AsyncHumeClient
from hume.empathic_voice.chat.socket_client import ChatConnectOptions, ChatWebsocketConnection
from hume.empathic_voice.chat.types import SubscribeEvent
from hume.empathic_voice.types import UserInput, AudioConfiguration, SessionSettings
from hume.empathic_voice.chat.audio.asyncio_utilities import Stream
from hume.empathic_voice.chat.audio.microphone_sender import MicrophoneSender
from hume.empathic_voice.chat.audio.audio_utilities import play_audio
from hume.empathic_voice.chat.audio.microphone import Microphone
from hume.core.api_error import ApiError

class WebSocketInterface:
    """Interface for containing the EVI WebSocket and associated socket handling behavior."""
    
    # Queue to hold byte strings representing audio data
    byte_strs = Stream.new()

    def __init__(self):
        """Construct the WebSocketInterface, initially assigning the socket and sender to None."""
        self.socket = None
        self.sender = None

    def set_socket(self, socket: ChatWebsocketConnection):
        """Set the socket.
        
        This method assigns the provided asynchronous WebSocket connection
        to the instance variable `self.socket`. It is invoked after successfully
        establishing a connection using the client's connect method.

        Args:
            socket (ChatWebsocketConnection): EVI asynchronous WebSocket returned by the client's connect method.
        """
        self.socket = socket

    def set_sender(self, sender: MicrophoneSender):
        """Set the sender.
        
        This method assigns the provided `MicrophoneSender` instance
        to the instance variable `self.sender`. The `MicrophoneSender` is
        responsible for capturing audio from the microphone and sending
        it over the WebSocket connection to the EVI.

        This method should be invoked after creating and configuring the 
        `MicrophoneSender`, typically right after the microphone context 
        is established and the sender is initialized.

        Args:
            sender (MicrophoneSender): An instance of `MicrophoneSender` 
            responsible for streaming audio data from the microphone to the 
            EVI WebSocket connection.
        """
        self.sender = sender

    async def on_open(self):
        """Logic invoked when the WebSocket connection is opened."""
        print("WebSocket connection opened.")

    async def on_message(self, data: SubscribeEvent):
        """Callback function to handle a WebSocket message event.
        
        This asynchronous method decodes the message, determines its type, and 
        handles it accordingly. Depending on the type of message, it 
        might log metadata, handle user or assistant messages, process
        audio data, raise an error if the message type is "error", and more.

        This method interacts with the following message types to demonstrate logging output to the terminal:
        - [chat_metadata](https://dev.hume.ai/reference/empathic-voice-interface-evi/chat/chat#receive.Chat%20Metadata.type)
        - [user_message](https://dev.hume.ai/reference/empathic-voice-interface-evi/chat/chat#receive.User%20Message.type)
        - [assistant_message](https://dev.hume.ai/reference/empathic-voice-interface-evi/chat/chat#receive.Assistant%20Message.type)
        - [audio_output](https://dev.hume.ai/reference/empathic-voice-interface-evi/chat/chat#receive.Audio%20Output.type)
        
        Args:
            data (SubscribeEvent): This represents any type of message that is received through the EVI WebSocket, formatted in JSON. See the full list of messages in the API Reference [here](https://dev.hume.ai/reference/empathic-voice-interface-evi/chat/chat#receive).
        """

        # Convert JSON string to Python dictionary
        message = json.loads(data)

        # Create an empty dictionary to store expression inference scores
        scores = {}

        if message["type"] == "chat_metadata":
            message_type = message["type"].upper()
            chat_id = message["chat_id"]
            chat_group_id = message["chat_group_id"]
            text = f"<{message_type}> Chat ID: {chat_id}, Chat Group ID: {chat_group_id}"
        elif message["type"] in ["user_message", "assistant_message"]:
            role = message["message"]["role"].upper()
            message_text = message["message"]["content"]
            text = f"{role}: {message_text}"
            if message["from_text"] is False:
                scores = message["models"]["prosody"]["scores"]
        elif message["type"] == "audio_output":
            message_str: str = message["data"]
            message_bytes = base64.b64decode(message_str.encode("utf-8"))
            await self.byte_strs.put(message_bytes)
            return
        elif message["type"] == "error":
            error_code: str = message["code"]
            error_message: str = message["message"]
            raise ApiError(status_code=error_code, body=error_message)
        else:
            message_type = message["type"].upper()
            text = f"<{message_type}>"
        
        # Print the formatted message
        print_prompt(text)

        # Extract and print the top 3 emotions inferred from user and assistant expressions
        if len(scores) > 0:
            top_3_emotions = extract_top_n_emotions(scores, 3)
            print_emotion_scores(top_3_emotions)
    
    async def on_close(self):
        """Logic invoked when the WebSocket connection is closed."""
        print("WebSocket connection closed.")

    async def on_error(self, error):
        """Logic invoked when an error occurs in the WebSocket connection."""
        print(f"Error: {error}")
    
    async def _play(self) -> None:
        """Play audio from the byte stream."""
        async for byte_str in self.byte_strs:
            await self.sender.on_audio_begin()
            await play_audio(byte_str)
            await self.sender.on_audio_end()

    async def run(self) -> None:
        """Run the WebSocketInterface, handling audio playback and sending."""
        send = self.sender.send(socket=self.socket)
        await asyncio.gather(self._play(), send)

def print_prompt(text: str) -> None:
    """Print a formatted message with a timestamp."""
    now = datetime.datetime.now(tz=datetime.timezone.utc)
    now_str = now.strftime("%H:%M:%S")
    print(f"[{now_str}] {text}")

def extract_top_n_emotions(emotion_scores: dict, n: int) -> dict:
    """
    Extract the top N emotions based on confidence scores.

    Args:
        emotion_scores (dict): A dictionary of emotions and their corresponding confidence scores.
        n (int): The number of top emotions to extract.

    Returns:
        dict: A dictionary containing the top N emotions as keys and their raw scores as values.
    """
    # Convert the dictionary into a list of tuples and sort by the score in descending order
    sorted_emotions = sorted(emotion_scores.items(), key=lambda item: item[1], reverse=True)

    # Extract the top N emotions
    top_n_emotions = {emotion: score for emotion, score in sorted_emotions[:n]}

    return top_n_emotions

def print_emotion_scores(emotion_scores: dict) -> None:
    """
    Print the emotions and their scores in a formatted, single-line manner.

    Args:
        emotion_scores (dict): A dictionary of emotions and their corresponding confidence scores.
    """
    # Format the output string
    formatted_emotions = ' | '.join([f"{emotion} ({score:.2f})" for emotion, score in emotion_scores.items()])
    
    # Print the formatted string
    print(f"|{formatted_emotions}|")

async def sending_handler(socket: ChatWebsocketConnection):
    """Handle sending a message over the socket.

    This method waits 3 seconds and sends a UserInput message, which takes a `text` parameter as input.
    - https://dev.hume.ai/reference/empathic-voice-interface-evi/chat/chat#send.User%20Input.type
    
    See the full list of messages to send [here](https://dev.hume.ai/reference/empathic-voice-interface-evi/chat/chat#send).

    Args:
        socket (ChatWebsocketConnection): The WebSocket connection used to send messages.
    """
    await asyncio.sleep(3)
    user_input_message = UserInput(text="Three seconds have passed.")
    await socket.send_user_input(user_input_message)

async def main() -> None:
    # Retrieve any environment variables stored in the .env file
    load_dotenv()

    # Retrieve the API key, Secret key, and EVI config id from the environment variables
    HUME_API_KEY = os.getenv("HUME_API_KEY")
    HUME_SECRET_KEY = os.getenv("HUME_SECRET_KEY")
    HUME_CONFIG_ID = os.getenv("HUME_CONFIG_ID")

    # Initialize the asynchronous client, authenticating with your API key
    client = AsyncHumeClient(api_key=HUME_API_KEY)

    # Define options for the WebSocket connection, such as an EVI config id and a secret key for token authentication
    # See the full list of query parameters here: https://dev.hume.ai/reference/empathic-voice-interface-evi/chat/chat#request.query
    options = ChatConnectOptions(config_id=HUME_CONFIG_ID, secret_key=HUME_SECRET_KEY)

    # Instantiate the WebSocketInterface
    websocket_interface = WebSocketInterface()

    # Open the WebSocket connection with the configuration options and the interface's handlers
    async with client.empathic_voice.chat.connect_with_callbacks(
        options=options,
        on_open=websocket_interface.on_open,
        on_message=websocket_interface.on_message,
        on_close=websocket_interface.on_close,
        on_error=websocket_interface.on_error
    ) as socket:

        # Set the socket instance in the handler
        websocket_interface.set_socket(socket)

        # Setup and start microphone sender
        with Microphone.context(device=0) as microphone:
            
            # Create a MicrophoneSender to handle audio streaming from the microphone
            sender = MicrophoneSender.new(microphone=microphone, allow_interrupt=True)
            
            # Assign the MicrophoneSender to the WebSocketInterface
            websocket_interface.set_sender(sender)

            # Configure the audio settings, including sample rate, channels, and encoding format
            
            # https://dev.hume.ai/reference/empathic-voice-interface-evi/chat/chat#send.Session%20Settings.audio
            audio_config = AudioConfiguration(sample_rate=microphone.sample_rate,
                                              channels=microphone.num_channels,
                                              encoding="linear16")
            
            # https://dev.hume.ai/reference/empathic-voice-interface-evi/chat/chat#send.Session%20Settings.type
            await socket.send_session_settings(SessionSettings(audio=audio_config))

            # Start the WebSocketInterface to handle audio streaming and playback
            interface_task = asyncio.create_task(websocket_interface.run())
            
            # Create a task to send messages over the WebSocket
            message_sending_task = asyncio.create_task(sending_handler(socket))
        
            # Schedule the coroutines to occur simultaneously
            await asyncio.gather(interface_task, message_sending_task)

# Execute the main asynchronous function using asyncio's event loop
asyncio.run(main())
