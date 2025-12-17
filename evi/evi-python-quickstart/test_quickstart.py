# run tests locally with:
# uv run pytest test_quickstart.py -v

import asyncio
import os
import pytest
from dotenv import load_dotenv
from hume import AsyncHumeClient

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


@pytest.mark.asyncio
async def test_connect_to_evi_receives_chat_id_and_stays_alive(hume_client):
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
