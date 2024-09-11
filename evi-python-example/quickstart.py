import asyncio
import base64
import datetime
import os
from dotenv import load_dotenv
from hume.client import AsyncHumeClient
from hume.empathic_voice.chat.socket_client import ChatConnectOptions, ChatWebsocketConnection
from hume.empathic_voice.chat.types import SubscribeEvent
from hume.empathic_voice.types import UserInput, UserMessage, AssistantMessage
from hume.core.api_error import ApiError
from hume import MicrophoneInterface, Stream

class WebSocketInterface:
    """Interface for containing the EVI WebSocket and associated socket handling behavior."""

    # Queue to hold byte strings representing audio data
    byte_strs = Stream.new()

    def __init__(self):
        """Construct the WebSocketInterface, initially assigning the socket to None."""
        self.socket = None

    def set_socket(self, socket: ChatWebsocketConnection):
        """Set the socket.
        
        This method assigns the provided asynchronous WebSocket connection
        to the instance variable `self.socket`. It is invoked after successfully
        establishing a connection using the client's connect method.

        Args:
            socket (ChatWebsocketConnection): EVI asynchronous WebSocket returned by the client's connect method.
        """
        self.socket = socket

    async def on_open(self):
        """Handle the event when the WebSocket connection is opened.
        
        This asynchronous method is a callback that gets triggered when 
        the WebSocket connection is successfully established. It can be 
        used to perform any setup tasks required immediately after opening 
        the connection, such as logging the event or initializing certain 
        variables.
        """
        print("WebSocket connection opened.")

    async def on_message(self, message: SubscribeEvent):
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

        if message.type == "chat_metadata":
            message_type = message.type.upper()
            chat_id = message.chat_id
            chat_group_id = message.chat_group_id
            text = f"<{message_type}> Chat ID: {chat_id}, Chat Group ID: {chat_group_id}"
        elif message.type in ["user_message", "assistant_message"]:
            role = message.message.role.upper()
            message_text = message.message.content
            text = f"{role}: {message_text}"
        elif message.type == "audio_output":
            message_str: str = message.data
            message_bytes = base64.b64decode(message_str.encode("utf-8"))
            await self.byte_strs.put(message_bytes)
            return
        elif message.type == "error":
            error_message: str = message.message
            error_code: str = message.code
            raise ApiError(f"Error ({error_code}): {error_message}")
        else:
            message_type = message.type.upper()
            text = f"<{message_type}>"
        
        # Print the formatted message to the terminal
        self._print_prompt(text)
        
    async def on_close(self):
        """Logic invoked when the WebSocket connection is closed.
        
        This callback function can be used to perform any cleanup tasks required
        after closing the connection, such as logging the event or resetting certain variables.
        """
        print("WebSocket connection closed.")

    async def on_error(self, error):
        """Logic invoked when an error occurs in the WebSocket connection.
        
        It logs the error message, and can be extended to perform additional 
        error handling such as attempting to reconnect or notifying the user.
        
        See the full list of errors [here](https://dev.hume.ai/docs/resources/errors).

        Args:
            error (Exception): The error that occurred during the WebSocket communication.
        """
        print(f"Error: {error}")
    
    def _print_prompt(self, text: str) -> None:
        """Print a formatted message with a timestamp.
        
        This helper method prints the provided text message with a 
        timestamp. It can be used for logging or displaying messages 
        received through the WebSocket. The timestamp is in UTC and 
        formatted as HH:MM:SS.

        Args:
            text (str): The message text to be printed.
        """
        now = datetime.datetime.now(tz=datetime.timezone.utc)
        now_str = now.strftime("%H:%M:%S")
        print(f"[{now_str}] {text}")

async def sending_handler(socket: ChatWebsocketConnection):
    """Handle sending a message over the socket.

    This method sends a UserInput message, which takes a `text` parameter as input.
    - https://dev.hume.ai/reference/empathic-voice-interface-evi/chat/chat#send.User%20Input.type
    
    See the full list of messages to send [here](https://dev.hume.ai/reference/empathic-voice-interface-evi/chat/chat#send).

    Args:
        socket (ChatWebsocketConnection): The WebSocket connection used to send messages.
    """
    # Wait 3 seconds before executing the rest of the method
    await asyncio.sleep(3)

    # Construct a user input message
    user_input_message = UserInput(text="Hello there!")

    # Send the user input as text to the socket
    await socket.send_user_input(user_input_message)

async def main() -> None:
    # Retrieve any environment variables stored in the .env file
    load_dotenv()

    # Retrieve the Hume API key from the environment variables
    HUME_API_KEY = os.getenv("HUME_API_KEY")
    HUME_SECRET_KEY = os.getenv("HUME_SECRET_KEY")
    HUME_CONFIG_ID = os.getenv("HUME_CONFIG_ID")

    # Connect and authenticate with Hume
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

        # Create an asynchronous task to continuously detect and process input from the microphone
        microphone_task = asyncio.create_task(MicrophoneInterface.start(socket, allow_user_interrupt=True, byte_stream=websocket_interface.byte_strs))
        
        # Create an asynchronous task to send messages over the WebSocket connection
        message_sending_task = asyncio.create_task(sending_handler(socket))
        
        # Schedule the coroutines to occur simultaneously
        await asyncio.gather(microphone_task, message_sending_task)

asyncio.run(main())
