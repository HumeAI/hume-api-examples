"""
EVI Control Plane Example

This example demonstrates how to use the EVI control plane to control and observe
active EVI chats from a trusted backend. The control plane works alongside the
data plane (the main Chat connection) to allow you to:

1. Post messages to an active Chat - Update session settings, send user input,
   or modify configuration without exposing secrets on the client
2. Connect to an existing Chat - Attach a secondary connection to observe,
   analyze, or moderate a chat session in real-time

For more information, see the Control Plane guide:
https://dev.hume.ai/docs/speech-to-speech-evi/guides/control-plane
"""

import argparse
import asyncio
import base64
import json
import os
from dotenv import load_dotenv
import websockets
from hume import MicrophoneInterface, Stream
from hume import HumeClient
from hume.client import AsyncHumeClient
from hume.empathic_voice.chat.socket_client import ChatConnectOptions
from hume.empathic_voice.control_plane.client import AsyncControlPlaneClient
from hume.empathic_voice.types import SubscribeEvent, UserInput, SessionSettings


async def send_control_message(client: AsyncHumeClient, chat_id: str, message) -> None:
    """Send a control message to an active Chat using the control plane API.

    The control plane allows you to post messages to an active Chat without
    exposing secrets on the client. You can send any message type that the Chat
    accepts, except `audio_input`.

    Args:
        client: AsyncHumeClient instance for authentication
        chat_id: The ID of the active Chat
        message: The message object (UserInput, SessionSettings, etc.)

    See: https://dev.hume.ai/docs/speech-to-speech-evi/guides/control-plane#post-messages-to-an-active-chat
    """
    try:
        # Instantiate the control plane client
        # Note: In future SDK versions, this may be available as client.empathic_voice.control_plane
        control_plane_client = AsyncControlPlaneClient(
            client_wrapper=client._client_wrapper
        )
        await control_plane_client.send(chat_id=chat_id, request=message)
        message_type = getattr(message, "type", "unknown")
        print(f"[CONTROL] Control message sent successfully: {message_type}")
    except Exception as e:
        print(f"[CONTROL] Failed to send control message: {e}")
        raise


async def observe_chat(api_key: str, chat_id: str, on_message_callback) -> None:
    """Connect to an existing Chat using the control plane WebSocket endpoint.

    This connection attaches to a running Chat and receives the full session
    history on connect, then streams new messages live in real-time. The socket
    is bi-directional, except you cannot send `audio_input` messages.

    You can only connect to a Chat that is currently active. Use the chat history
    APIs to fetch transcripts for past sessions.

    Args:
        api_key: Hume API key for authentication
        chat_id: The ID of the active Chat to observe
        on_message_callback: Callback function to handle received messages

    See: https://dev.hume.ai/docs/speech-to-speech-evi/guides/control-plane#connect-to-an-existing-chat
    """
    url = f"wss://api.hume.ai/v0/evi/chat/{chat_id}/connect?api_key={api_key}"

    try:
        async with websockets.connect(url) as websocket:
            print(f"[OBSERVER] Connected to Chat {chat_id} via control plane")

            # Receive messages: full history first, then live updates
            async for message in websocket:
                try:
                    data = json.loads(message)
                    await on_message_callback(data)
                except json.JSONDecodeError:
                    print(f"[OBSERVER] Failed to parse message: {message}")
    except Exception as e:
        print(f"[OBSERVER] Observer connection error: {e}")
        raise


async def observer_message_handler(message: dict) -> None:
    """Handle messages received from the observer connection.

    This callback processes messages received from the control plane observer
    connection. It receives the same event types and shapes as the reference
    Chat socket.
    """
    msg_type = message.get("type", "unknown")

    if msg_type == "chat_metadata":
        print(
            f"[OBSERVER] Chat ID: {message.get('chat_id')}, Chat Group ID: {message.get('chat_group_id')}"
        )
    elif msg_type in ["user_message", "assistant_message"]:
        role = message.get("message", {}).get("role", "unknown").upper()
        content = message.get("message", {}).get("content", "")
        print(f"[OBSERVER] {role}: {content}")
    elif msg_type == "error":
        error_code = message.get("code", "unknown")
        error_msg = message.get("message", "unknown error")
        print(f"[OBSERVER] Error ({error_code}): {error_msg}")
    else:
        print(f"[OBSERVER] <{msg_type}>")


async def control_plane_demo(
    client: AsyncHumeClient, chat_id: str, api_key: str
) -> None:
    """Demonstrate control plane features: sending messages and observing the Chat.

    This function showcases three main control plane capabilities:
    1. Sending user input messages to an active Chat
    2. Updating session settings (e.g., system prompt, voice) for the current session
    3. Connecting as an observer to monitor the Chat in real-time

    Args:
        client: AsyncHumeClient instance for control plane operations
        chat_id: The ID of the active Chat
        api_key: Hume API key for the observer connection
    """
    # Wait for the Chat to be fully established
    await asyncio.sleep(2)

    print("[CONTROL] Starting control plane demonstrations...")

    # Example 1: Send a user input message via control plane
    # This demonstrates posting messages to an active Chat without exposing
    # secrets on the client. You can send any message type except `audio_input`.
    print("[CONTROL] Example 1: Sending user input message via control plane")
    user_input_message = UserInput(
        text="Hello! This message was sent via the control plane API - say it back to the user."
    )
    await send_control_message(client, chat_id, user_input_message)

    # Wait before next example
    await asyncio.sleep(10)

    # Example 2: Update session settings via control plane
    # This demonstrates updating session settings privately from a trusted backend.
    # Common use cases include setting supplemental LLM API keys or updating
    # system prompts without exposing secrets on the client.
    print("[CONTROL] Example 2: Updating session settings via control plane")
    session_settings_message = SessionSettings(
        system_prompt="You are a helpful assistant. This system prompt was updated via the control plane API.",
        voice_id="ebba4902-69de-4e01-9846-d8feba5a1a3f",  # TikTok Fashion Influencer
    )
    await send_control_message(client, chat_id, session_settings_message)

    # Wait before starting observer
    await asyncio.sleep(2)

    # Example 3: Connect to the Chat as an observer
    # This demonstrates attaching a secondary connection to observe, analyze,
    # or moderate a Chat session in real-time. The observer receives the full
    # session history on connect, then streams new messages live.
    print("[CONTROL] Example 3: Connecting as observer to monitor the Chat")
    observer_task = asyncio.create_task(
        observe_chat(api_key, chat_id, observer_message_handler)
    )

    # Let the observer run for a while to demonstrate live monitoring
    await asyncio.sleep(10)

    # Cancel the observer task (in a production app, you'd handle this more gracefully)
    observer_task.cancel()
    try:
        await observer_task
    except asyncio.CancelledError:
        pass

    print("[CONTROL] Control plane demonstrations completed")


async def main_new_chat() -> None:
    """Main function that establishes a new data plane connection and demonstrates control plane features.

    The data plane is the reference Chat connection that carries live audio and
    assistant responses. Once the Chat is established and we have the chatId,
    we can use the control plane to send messages and observe the Chat.
    """
    load_dotenv()

    HUME_API_KEY = os.getenv("HUME_API_KEY")
    HUME_CONFIG_ID = os.getenv("HUME_CONFIG_ID")

    if not HUME_API_KEY:
        raise ValueError("HUME_API_KEY environment variable is required")

    client = AsyncHumeClient(api_key=HUME_API_KEY)

    stream = Stream.new()
    chat_id = None

    async def on_message(message: SubscribeEvent):
        """Handle messages from the data plane connection."""
        nonlocal chat_id

        if message.type == "chat_metadata":
            # Capture the chatId from the chat_metadata event
            # This is required for control plane operations
            chat_id = message.chat_id
            print(
                f"[DATA_PLANE] Chat ID: {message.chat_id}, Chat Group ID: {message.chat_group_id}"
            )
            # Start control plane demo once we have the chatId
            asyncio.create_task(control_plane_demo(client, chat_id, HUME_API_KEY))
        elif message.type == "user_message" or message.type == "assistant_message":
            print(f"[DATA_PLANE] {message.message.role}: {message.message.content}")
        elif message.type == "audio_output":
            # Play audio output through the stream
            await stream.put(base64.b64decode(message.data.encode("utf-8")))
        elif message.type == "error":
            raise RuntimeError(
                f"Received error message from Hume websocket ({message.code}): {message.message}"
            )

    # Establish the data plane connection (the reference Chat connection)
    print("[DATA_PLANE] Connecting to EVI Chat (data plane)...")
    async with client.empathic_voice.chat.connect_with_callbacks(
        options=ChatConnectOptions(config_id=HUME_CONFIG_ID),
        on_open=lambda: print("[DATA_PLANE] WebSocket connection opened."),
        on_message=on_message,
        on_close=lambda: print("[DATA_PLANE] WebSocket connection closed."),
        on_error=lambda err: print(f"[DATA_PLANE] Error: {err}"),
    ) as socket:
        print("[DATA_PLANE] Starting microphone interface...")
        print(
            "[DATA_PLANE] You can now speak to the assistant. The control plane will demonstrate:"
        )
        print("[DATA_PLANE]   1. Sending messages to the active Chat")
        print("[DATA_PLANE]   2. Updating session settings")
        print("[DATA_PLANE]   3. Observing the Chat from a separate connection")
        print("[DATA_PLANE] Press Ctrl+C to exit.")

        await asyncio.create_task(
            MicrophoneInterface.start(
                socket, allow_user_interrupt=False, byte_stream=stream
            )
        )


def evi_get_active_chats(client: HumeClient, config_id: str):
    """List EVI chats and find the first active chat."""
    # List EVI chats
    response = client.empathic_voice.chats.list_chats(
        page_number=0,
        page_size=1,
        ascending_order=True,
        config_id=config_id,  # Filter by config_id
    )

    # Find the first active chat
    # If you have multiple active chats for the same config, please change this to adapt
    for item in response:
        if hasattr(item, "status") and item.status == "ACTIVE":
            return item

    return None


async def main_existing_chat() -> None:
    """Main function that finds an existing active chat and demonstrates control plane features.

    This mode connects to an existing active chat (e.g., from a phone call) and uses
    the control plane to send messages and observe the chat without establishing a
    data plane connection.
    """
    load_dotenv()

    HUME_API_KEY = os.getenv("HUME_API_KEY")
    HUME_CONFIG_ID = os.getenv("HUME_CONFIG_ID")

    if not HUME_API_KEY:
        raise ValueError("HUME_API_KEY environment variable is required")
    if not HUME_CONFIG_ID:
        raise ValueError("HUME_CONFIG_ID environment variable is required")

    # Use synchronous client to find active chats
    sync_client = HumeClient(api_key=HUME_API_KEY)
    active_chat = evi_get_active_chats(sync_client, HUME_CONFIG_ID)

    if not active_chat:
        print("[EXISTING] No active chats found")
        return

    print(f"[EXISTING] Found active chat with ID: {active_chat.id}")
    chat_id = active_chat.id

    # Create async client for control plane operations
    async_client = AsyncHumeClient(api_key=HUME_API_KEY)

    # Run control plane demo
    await control_plane_demo(async_client, chat_id, HUME_API_KEY)


async def main() -> None:
    """Main entry point that routes to the appropriate mode based on CLI arguments."""
    parser = argparse.ArgumentParser(
        description="EVI Control Plane Example - Control and observe EVI chats"
    )
    parser.add_argument(
        "--mode",
        type=str,
        choices=["new", "existing"],
        default="new",
        help="Mode to run: 'new' creates a new chat with microphone, 'existing' connects to an active chat",
    )

    args = parser.parse_args()

    if args.mode == "new":
        await main_new_chat()
    elif args.mode == "existing":
        await main_existing_chat()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nExiting...")
