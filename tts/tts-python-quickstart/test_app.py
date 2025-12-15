# run tests locally with:
# uv run pytest test_app.py -v

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


@pytest.fixture(scope="function")
def hume_client(api_key):
    return AsyncHumeClient(api_key=api_key)


@pytest.mark.asyncio
async def test_generates_json_with_octave_1(
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

    audio_chunks[0] = audio_chunks[0]
    assert audio_chunks[0].type == "audio", "Expected chunk type to be 'audio'"
    assert hasattr(audio_chunks[0], "audio"), "Expected chunk to have 'audio' attribute"
    assert isinstance(audio_chunks[0].audio, str), "Expected audio to be a string (base64 encoded)"


@pytest.mark.asyncio
async def test_generates_json_with_octave_2_with_timestamps(
    hume_client,
):
    """
    connects w/ API key, generates JSON stream w/ Octave 2 with timestamps
    """
    stream = hume_client.tts.synthesize_json_streaming(
        **example1_request_params,
        version="2",
        include_timestamp_types=["word", "phoneme"],
    )

    audio_chunks = []
    timestamp_chunks = []

    async for chunk in stream:
        if chunk.type == "audio":
            audio_chunks.append(chunk)
        if chunk.type == "timestamp":
            timestamp_chunks.append(chunk)

    assert len(audio_chunks) > 0, "Expected at least one audio chunk"
    assert audio_chunks[0].type == "audio", "Expected chunk type to be 'audio'"
    assert hasattr(audio_chunks[0], "audio"), "Expected chunk to have 'audio' attribute"
    assert isinstance(audio_chunks[0].audio, str), "Expected audio to be a string (base64 encoded)"

    assert len(timestamp_chunks) > 0, "Expected at least one timestamp chunk"
    assert hasattr(timestamp_chunks[0], "request_id"), "Expected chunk to have 'request_id' attribute"
    assert timestamp_chunks[0].request_id is not None, "Expected request_id to be defined"
    assert hasattr(timestamp_chunks[0], "generation_id"), "Expected chunk to have 'generation_id' attribute"
    assert timestamp_chunks[0].generation_id is not None, "Expected generation_id to be defined"
    assert hasattr(timestamp_chunks[0], "snippet_id"), "Expected chunk to have 'snippet_id' attribute"
    assert timestamp_chunks[0].snippet_id is not None, "Expected snippet_id to be defined"
    assert hasattr(timestamp_chunks[0], "timestamp"), "Expected chunk to have 'timestamp' attribute"
    assert timestamp_chunks[0].timestamp is not None, "Expected timestamp to be defined"
    assert hasattr(timestamp_chunks[0].timestamp, "type"), "Expected timestamp to have 'type' attribute"
    assert timestamp_chunks[0].timestamp.type is not None, "Expected timestamp.type to be defined"
    assert hasattr(timestamp_chunks[0].timestamp, "text"), "Expected timestamp to have 'text' attribute"
    assert timestamp_chunks[0].timestamp.text is not None, "Expected timestamp.text to be defined"
    assert hasattr(timestamp_chunks[0].timestamp, "time"), "Expected timestamp to have 'time' attribute"
    assert timestamp_chunks[0].timestamp.time is not None, "Expected timestamp.time to be defined"
    assert hasattr(timestamp_chunks[0].timestamp.time, "begin"), "Expected timestamp.time to have 'begin' attribute"
    assert timestamp_chunks[0].timestamp.time.begin is not None, "Expected timestamp.time.begin to be defined"
    assert hasattr(timestamp_chunks[0].timestamp.time, "end"), "Expected timestamp.time to have 'end' attribute"
    assert timestamp_chunks[0].timestamp.time.end is not None, "Expected timestamp.time.end to be defined"

    # at least 1 word timestamp
    word_chunk = next((chunk for chunk in timestamp_chunks if chunk.timestamp.type == "word"), None)
    assert word_chunk is not None, "Expected at least one word timestamp"

    # at least 1 phoneme timestamp
    phoneme_chunk = next((chunk for chunk in timestamp_chunks if chunk.timestamp.type == "phoneme"), None)
    assert phoneme_chunk is not None, "Expected at least one phoneme timestamp"
