# Import the asyncio library for asynchronous programming
import asyncio
# Import the os library for interacting with the operating system
import os
# Import the load_dotenv function from the dotenv library to load environment variables
from dotenv import load_dotenv 
# Import a custom function to print ASCII art
from helper_functions import print_ascii_art
# Import necessary classes from the Hume library
from hume import HumeVoiceClient, MicrophoneInterface, VoiceSocket

# ================================================
# Global Variables
#
# These can be used to dynamically track application state,
# such as the number of messages, the number of times an emotion was detected,
# the current top emotion, whether or not a user is experiencing
# a specific emotion, or more.
# ================================================

# Global variable to count messages
message_counter = 0

# ================================================
# Event Handlers
#
# These can be used to specify behavior when interfacing with the WebSocket.
#
# They can be synchronous (i.e. def handler: ...)
# or asynchronous (i.e. async def handler: ...) and awaitable.
# Both allow for dynamic updating of application state using global variables.
# Asynchronous handlers enable awaitable actions, such as transmitting data
# to a database.
#
# There are 4 handlers: on_open, on_message, on_error, and on_close.
#
# on_open: what happens when the WebSocket opens.
#
# on_message: what happens when a message is received.
# --> You can create conditional behavior to execute based on the type of message.
# --> Below are the types of messages you can receive, and their data:
# https://dev.hume.ai/reference/empathic-voice-interface-evi/chat/chat#receive
#
# on_error: what happens when an error occurs.
#
# on_close: what happens when the WebSocket closes.
# 
# ================================================

# Handler for when the connection is opened
def on_open():
    # Print a welcome message using ASCII art
    print_ascii_art("Say hello to EVI, Hume AI's Empathic Voice Interface!")

# Handler for incoming messages
def on_message(message):
    global message_counter
    # Increment the message counter for each received message
    message_counter += 1
    msg_type = message["type"]

    # Start the message box with the common header
    message_box = (
        f"\n{'='*60}\n"
        f"Message {message_counter}\n"
        f"{'-'*60}\n"
    )

    # Add role and content for user and assistant messages
    if msg_type in {"user_message", "assistant_message"}:
        role = message["message"]["role"]
        content = message["message"]["content"]
        message_box += (
            f"role: {role}\n"
            f"content: {content}\n"
            f"type: {msg_type}\n"
        )

        # Add top emotions if available
        if "models" in message and "prosody" in message["models"]:
            scores = message["models"]["prosody"]["scores"]
            num = 3
            # Get the top N emotions based on the scores
            top_emotions = get_top_n_emotions(prosody_inferences=scores, number=num)

            message_box += f"{'-'*60}\nTop {num} Emotions:\n"
            for emotion, score in top_emotions:
                message_box += f"{emotion}: {score:.4f}\n"

    # Add all key-value pairs for other message types, excluding audio_output
    elif msg_type != "audio_output":
        for key, value in message.items():
            message_box += f"{key}: {value}\n"
    else:
        message_box += (
            f"type: {msg_type}\n"
        )

    message_box += f"{'='*60}\n"
    # Print the constructed message box
    print(message_box)

# Function to get the top N emotions based on their scores
def get_top_n_emotions(prosody_inferences, number):
    # Sort the inferences by their scores in descending order
    sorted_inferences = sorted(prosody_inferences.items(), key=lambda item: item[1], reverse=True)
    # Return the top N inferences
    return sorted_inferences[:number]

# Handler for when an error occurs
def on_error(error):
    # Print the error message
    print(f"Error: {error}")

# Handler for when the connection is closed
def on_close():
    # Print a closing message using ASCII art
    print_ascii_art("Thank you for using EVI, Hume AI's Empathic Voice Interface!")

# ================================================
# User Input Handler
#
# Using an asynchronous input handler allows the program
# to simultaneously receive user input (such as text to send to EVI)
# and the messages with which EVI responds.
# ================================================

# Asynchronous handler for user input
async def user_input_handler(socket: VoiceSocket):
    while True:
        # Asynchronously get user input to prevent blocking other operations
        user_input = await asyncio.to_thread(input, "Type a message to send or 'Q' to quit: ")
        if user_input.strip().upper() == "Q":
            # If user wants to quit, close the connection
            print("Closing the connection...")
            await socket.close()
            break
        else:
            # Send the user input as text to the socket
            await socket.send_text_input(user_input)

# ================================================
# Main Function
#
# This is the main entry point of the program where
# the client setup and execution occurs.
# ================================================

# Asynchronous main function to set up and run the client
async def main() -> None:
    try:
        # Retrieve any environment variables stored in the .env file
        load_dotenv()

        # Retrieve the Hume API key from the environment variables
        HUME_API_KEY = os.getenv("HUME_API_KEY")
        HUME_SECRET_KEY = os.getenv("HUME_SECRET_KEY")

        # Connect and authenticate with Hume
        client = HumeVoiceClient(HUME_API_KEY, HUME_SECRET_KEY)

        # Start streaming EVI over your device's microphone and speakers
        async with client.connect_with_handlers(
            on_open=on_open,                # Handler for when the connection is opened
            on_message=on_message,          # Handler for when a message is received
            on_error=on_error,              # Handler for when an error occurs
            on_close=on_close,              # Handler for when the connection is closed
            enable_audio=True,              # Flag to enable audio playback (True by default)
        ) as socket:
            # Start the microphone interface in the background; add "device=NUMBER" to specify device
            microphone_task = asyncio.create_task(MicrophoneInterface.start(socket))

            # Start the user input handler
            user_input_task = asyncio.create_task(user_input_handler(socket))

            # The gather function is used to run both async tasks simultaneously
            await asyncio.gather(microphone_task, user_input_task)
    except Exception as e:
        # Catch and print any exceptions that occur
        print(f"Exception occurred: {e}")

# ================================================
# Run the Main Function
#
# This initiates the asynchronous event loop and
# runs the main function.
# ================================================

# Run the main function using asyncio
asyncio.run(main())
