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
import traceback
from dotenv import load_dotenv
import websockets
from hume import MicrophoneInterface, Stream
from hume import HumeClient
from hume.client import AsyncHumeClient
from hume.empathic_voice.control_plane.client import AsyncControlPlaneClient
from hume.empathic_voice.types import SubscribeEvent, UserInput, SessionSettings


def load_config() -> tuple[str, str]:
    """Load and validate environment variables."""
    load_dotenv()

    api_key = os.getenv("HUME_API_KEY")
    config_id = os.getenv("HUME_CONFIG_ID")

    if not api_key:
        raise ValueError("HUME_API_KEY environment variable is required")
    if not config_id:
        raise ValueError("HUME_CONFIG_ID environment variable is required")

    return api_key, config_id


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
            try:
                async for message in websocket:
                    # Uncomment the line below for detailed raw websocket message logging
                    # print(f"[OBSERVER] Received raw websocket message (length: {len(message)})")
                    try:
                        data = json.loads(message)
                        await on_message_callback(data)
                    except json.JSONDecodeError:
                        print(f"[OBSERVER] Failed to parse message: {message}")
                        print(
                            f"[OBSERVER] Raw message (first 500 chars): {str(message)[:500]}"
                        )
            except asyncio.CancelledError:
                print(f"[OBSERVER] Message receive loop cancelled")
                raise
            except Exception as e:
                print(f"[OBSERVER] Error in message receive loop: {e}")
                traceback.print_exc()
                raise
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
        # Uncomment the line below for full message details
        # print(f"[OBSERVER] Full message: {json.dumps(message, indent=2)}")
    elif msg_type in ["user_message", "assistant_message"]:
        role = message.get("message", {}).get("role", "unknown").upper()
        content = message.get("message", {}).get("content", "")
        print(f"[OBSERVER] {role}: {content}")
    elif msg_type == "audio_output":
        # Audio output messages contain large base64-encoded data
        # Only print a summary to avoid cluttering the terminal
        data_length = len(message.get("data", ""))
        is_final = message.get("is_final_chunk", False)
        print(f"[OBSERVER] Audio output: {data_length} bytes, final_chunk={is_final}")
        # Uncomment the line below to see full audio message (very verbose!)
        # print(f"[OBSERVER] Full message: {json.dumps(message, indent=2)}")
    elif msg_type in ["user_interruption", "assistant_end"]:
        # These are expected message types, just acknowledge them silently
        # Uncomment the line below to see these messages
        # print(f"[OBSERVER] Received: {msg_type}")
        pass
    elif msg_type == "error":
        error_code = message.get("code", "unknown")
        error_msg = message.get("message", "unknown error")
        print(f"[OBSERVER] Error ({error_code}): {error_msg}")
        print(f"[OBSERVER] Full message: {json.dumps(message, indent=2)}")
    else:
        print(f"[OBSERVER] Unknown message type: <{msg_type}>")
        # Uncomment the line below for full message details
        # print(f"[OBSERVER] Full message: {json.dumps(message, indent=2)}")


async def control_plane_demo(
    client: AsyncHumeClient, chat_id: str, api_key: str, enable_observer: bool = True
) -> None:
    """Demonstrate control plane features: observing, sending messages, and updating settings.

    This function showcases control plane capabilities:
    1. (Optional) Connecting as an observer to monitor the Chat in real-time
    2. Sending user input messages to an active Chat
    3. Updating session settings (e.g., system prompt, voice) for the current session
    """
    # Wait for the Chat to be fully established
    await asyncio.sleep(2)

    print("[CONTROL] Starting control plane demonstrations...")

    observer_task = None
    if enable_observer:
        # Example 1: Connect to the Chat as an observer
        # This demonstrates attaching a secondary connection to observe, analyze,
        # or moderate a Chat session in real-time. The observer receives the full
        # session history on connect, then streams new messages live.
        # Starting it first ensures we can observe all subsequent control plane actions.
        # NOTE: This requires the chat to be started with allow_connection=true
        print("[CONTROL] Example 1: Connecting as observer to monitor the Chat")
        observer_task = asyncio.create_task(
            observe_chat(api_key, chat_id, observer_message_handler)
        )

        # Give observer time to connect and receive initial history
        await asyncio.sleep(3)
    else:
        print(
            "[CONTROL] Observer disabled (chat must be started with allow_connection=true)"
        )
        await asyncio.sleep(1)

    # Example 2: Send a user input message via control plane
    # This demonstrates posting messages to an active Chat without exposing
    # secrets on the client. You can send any message type except `audio_input`.
    print("[CONTROL] Example 2: Sending user input message via control plane")
    await send_control_message(
        client,
        chat_id,
        UserInput(
            text="Hello! This message was sent via the control plane API - say it back to the user."
        ),
    )
    await asyncio.sleep(10)

    # Example 3: Update session settings via control plane
    # This demonstrates updating session settings privately from a trusted backend.
    # Common use cases include setting supplemental LLM API keys or updating
    # system prompts without exposing secrets on the client.
    print("[CONTROL] Example 3: Updating session settings via control plane")
    await send_control_message(
        client,
        chat_id,
        SessionSettings(
            system_prompt="You are a helpful assistant. This system prompt was updated via the control plane API.",
            voice_id="ebba4902-69de-4e01-9846-d8feba5a1a3f",  # TikTok Fashion Influencer
        ),
    )
    await asyncio.sleep(15)

    # Cancel the observer task if it was started (in a production app, you'd handle this more gracefully)
    if observer_task:
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
    api_key, config_id = load_config()
    client = AsyncHumeClient(api_key=api_key)

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
            asyncio.create_task(control_plane_demo(client, chat_id, api_key))
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
    # Set allow_connection=True to enable observer connections via control plane
    # Use connect() method directly (not connect_with_callbacks) to pass allow_connection parameter
    print("[DATA_PLANE] Connecting to EVI Chat (data plane)...")
    print("[DATA_PLANE] Setting allow_connection=True to enable observer connections")

    async with client.empathic_voice.chat.connect(
        config_id=config_id,
        allow_connection=True,
    ) as socket:
        print("[DATA_PLANE] WebSocket connection opened.")
        print("[DATA_PLANE] Starting microphone interface...")
        print(
            "[DATA_PLANE] You can now speak to the assistant. The control plane will demonstrate:"
        )
        print("[DATA_PLANE]   1. Observing the Chat from a separate connection")
        print("[DATA_PLANE]   2. Sending messages to the active Chat")
        print("[DATA_PLANE]   3. Updating session settings")
        print("[DATA_PLANE] Press Ctrl+C to exit.")

        async def handle_messages():
            async for message in socket:
                await on_message(message)

        await asyncio.gather(
            handle_messages(),
            MicrophoneInterface.start(
                socket, allow_user_interrupt=False, byte_stream=stream
            ),
        )


def find_active_chat(client: HumeClient, config_id: str):
    """Find the first active EVI chat for the given config."""
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
    api_key, config_id = load_config()

    sync_client = HumeClient(api_key=api_key)
    active_chat = find_active_chat(sync_client, config_id)

    if not active_chat:
        print("[EXISTING] No active chats found")
        return

    print(f"[EXISTING] Found active chat with ID: {active_chat.id}")

    async_client = AsyncHumeClient(api_key=api_key)
    await control_plane_demo(
        async_client, active_chat.id, api_key, enable_observer=False
    )


async def main() -> None:
    """Main entry point that routes to the appropriate mode based on CLI arguments."""
    parser = argparse.ArgumentParser(
        description="EVI Control Plane Example - Control and observe EVI chats"
    )

    mode_group = parser.add_mutually_exclusive_group(required=True)
    mode_group.add_argument(
        "--new",
        action="store_const",
        dest="mode",
        const="new",
        help="Create a new chat with microphone",
    )
    mode_group.add_argument(
        "--existing",
        action="store_const",
        dest="mode",
        const="existing",
        help="Connect to an existing active chat",
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
