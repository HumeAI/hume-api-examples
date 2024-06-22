import asyncio
import os

from dotenv import load_dotenv
from helper_functions import print_ascii_art

from hume import HumeVoiceClient, MicrophoneInterface, VoiceSocket

## Global variables.
messageCounter = 0

def on_open():
    print_ascii_art("Say hello to EVI, Hume AI's Empathic Voice Interface!")


# Define a global variable for message counter
message_counter = 0

async def on_message(message):
    global message_counter
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
    print(message_box)

def get_top_n_emotions(prosody_inferences, number):
    sorted_inferences = sorted(prosody_inferences.items(), key=lambda item: item[1], reverse=True)
    return sorted_inferences[:number]


async def on_error(error):
    print(f"Error: {error}")


async def on_close():
    print_ascii_art("Thank you for using EVI, Hume AI's Empathic Voice Interface!")


async def user_input_handler(socket: VoiceSocket):
    while True:
        user_input = await asyncio.to_thread(input, "Type a message to send or 'Q' to quit: ")
        if user_input.strip().upper() == "Q":
            print("Closing the connection...")
            await socket.close()
            break
        else:
            await socket.send_text_input(user_input)


async def send_input(socket: VoiceSocket):
    """Send a sample input message to test the connection."""
    await socket.send_text_input("Hello, this is a test message")

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
            on_open=on_open,
            on_message=on_message,
            on_error=on_error,
            on_close=on_close,
            enable_audio=True,
        ) as socket:
            # Set the desired audio device index (replace with your device index)
            # device_index = 0  # For example, use device index 0
            # sounddevice.default.device = device_index

            # Start the microphone interface in the background
            microphone_task = asyncio.create_task(MicrophoneInterface.start(socket))

            # Start the user input handler
            user_input_task = asyncio.create_task(user_input_handler(socket))

            # Wait for the microphone interface and user input handler to complete
            await asyncio.gather(microphone_task, user_input_task)
    except Exception as e:
        print(f"Exception occurred: {e}")


asyncio.run(main())
