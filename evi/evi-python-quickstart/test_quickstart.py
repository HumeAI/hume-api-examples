# run tests locally with:
# uv run pytest test_quickstart.py -v

import asyncio
import json
import os
import pytest
from dotenv import load_dotenv
from hume import AsyncHumeClient, HumeClient
from hume.empathic_voice.types import ConnectSessionSettings

load_dotenv()


# =============================================================================
# SDK functionality tests
# =============================================================================


@pytest.fixture(scope="module")
def api_key():
    api_key = os.getenv("TEST_HUME_API_KEY") or os.getenv("HUME_API_KEY")
    if not api_key:
        pytest.skip("API key is required. Set TEST_HUME_API_KEY or HUME_API_KEY.")
    return api_key


@pytest.fixture(scope="function")
def hume_client(api_key):
    return AsyncHumeClient(api_key=api_key)


@pytest.fixture(scope="function")
def hume_client_sync(api_key):
    return HumeClient(api_key=api_key)


@pytest.mark.asyncio
async def test_connect_to_evi(hume_client):
    """
    connects w/ API key, starts a chat, receives a chatId, stays alive for 2 seconds
    """
    chat_id = None
    connection_closed = False

    async with hume_client.empathic_voice.chat.connect() as socket:

        async def handle_messages():
            nonlocal chat_id, connection_closed
            try:
                async for message in socket:
                    if message.type == "chat_metadata":
                        chat_id = message.chat_id
            except asyncio.CancelledError:
                pass
            finally:
                connection_closed = True

        message_task = asyncio.create_task(handle_messages())

        # Wait for chat_metadata with chatId (timeout after 10 seconds)
        for _ in range(100):
            if chat_id is not None:
                break
            await asyncio.sleep(0.1)

        assert chat_id is not None, "Expected chat_id from chat_metadata"

        # Stay alive for 2 seconds
        await asyncio.sleep(2)

        # Verify socket is still connected
        assert not connection_closed, "Expected WebSocket to remain open"

        # Clean up
        message_task.cancel()
        try:
            await message_task
        except asyncio.CancelledError:
            pass


@pytest.mark.asyncio
async def test_session_settings_on_connect(hume_client, hume_client_sync):
    """
    connects w/ API key, verifies sessionSettings are passed on connect()
    """
    session_settings = ConnectSessionSettings(
        system_prompt="You are a helpful assistant",
        custom_session_id="my-custom-session-id",
        variables={"userName": "John", "userAge": 30, "isPremium": True},
    )

    chat_id = None

    async with hume_client.empathic_voice.chat.connect(session_settings=session_settings) as socket:

        async def handle_messages():
            nonlocal chat_id
            try:
                async for message in socket:
                    if message.type == "chat_metadata":
                        chat_id = message.chat_id
            except asyncio.CancelledError:
                pass

        message_task = asyncio.create_task(handle_messages())

        # Wait for chat_metadata with chatId (timeout after 10 seconds)
        for _ in range(100):
            if chat_id is not None:
                break
            await asyncio.sleep(0.1)

        assert chat_id is not None, "Expected chat_id from chat_metadata"

        # Clean up
        message_task.cancel()
        try:
            await message_task
        except asyncio.CancelledError:
            pass

    # Fetch chat events and verify session settings
    events = list(
        hume_client_sync.empathic_voice.chats.list_chat_events(
            chat_id,
            page_number=0,
            ascending_order=True,
        )
    )

    session_settings_event = next((e for e in events if e.type == "SESSION_SETTINGS"), None)

    assert session_settings_event is not None, "Expected SESSION_SETTINGS event"
    assert session_settings_event.message_text is not None, "Expected message_text"

    parsed_settings = json.loads(session_settings_event.message_text)
    assert parsed_settings["type"] == "session_settings"

    # Validate session settings
    assert parsed_settings["system_prompt"] == "You are a helpful assistant"
    assert parsed_settings["custom_session_id"] == "my-custom-session-id"

    # Validate variables (all saved as strings on the backend, numbers as floats)
    assert parsed_settings["variables"]["userName"] == "John"
    assert parsed_settings["variables"]["userAge"] == "30.0"
    assert parsed_settings["variables"]["isPremium"] == "True"
