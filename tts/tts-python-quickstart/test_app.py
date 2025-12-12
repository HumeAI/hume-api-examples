import os
import pytest
from dotenv import load_dotenv
from hume import AsyncHumeClient

from app import example1_request_params

load_dotenv()


@pytest.fixture(scope="module")
def api_key():
    api_key = os.getenv("TEST_HUME_API_KEY") or os.getenv("HUME_API_KEY")
    if not api_key:
        pytest.skip("API key is required. Set TEST_HUME_API_KEY or HUME_API_KEY.")
    return api_key


@pytest.fixture(scope="module")
def hume_client(api_key):
    return AsyncHumeClient(api_key=api_key)


@pytest.mark.asyncio
async def test_connects_with_api_key_generates_json_stream_with_octave_1(
    hume_client,
):
    """
    connects w/ API key, generates JSON stream w/ Octave 1
    """
    stream = hume_client.tts.synthesize_json_streaming(
        **example1_request_params,
        version="1",
    )

    audio_chunks = []
    async for chunk in stream:
        if chunk.type == "audio":
            audio_chunks.append(chunk)

    assert len(audio_chunks) > 0, "Expected at least one audio chunk"

    first_chunk = audio_chunks[0]
    assert first_chunk.type == "audio", "Expected chunk type to be 'audio'"
    assert hasattr(first_chunk, "audio"), "Expected chunk to have 'audio' attribute"
    assert isinstance(first_chunk.audio, str), "Expected audio to be a string (base64 encoded)"
