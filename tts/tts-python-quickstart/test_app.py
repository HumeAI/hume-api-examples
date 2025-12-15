# run tests locally with:
# uv run pytest test_app.py -v

import asyncio
import os
import pytest
import time
from dotenv import load_dotenv
from hume import AsyncHumeClient
from hume.tts import PublishTts, PostedUtteranceVoiceWithName

from app import example1_request_params

load_dotenv()

_example3_stream = None


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


def get_stream():
    """Get the example3 stream instance"""
    return _example3_stream


async def wait_for_stream_open(get_stream_func, max_attempts=100):
    """Wait for the stream to be open (readyState 1)"""
    attempts = 0
    while attempts < max_attempts:
        stream = get_stream_func()
        if stream:
            # Check if stream has ready_state attribute
            if hasattr(stream, "ready_state") and isinstance(stream.ready_state, int):
                if stream.ready_state == 1:  # OPEN
                    return
                if stream.ready_state == 3:  # CLOSED
                    raise RuntimeError(
                        "Stream connection failed (ready_state=CLOSED). "
                        "The stream was created but closed immediately, likely due to authentication failure."
                    )
            elif attempts > 10:
                # After 1 second, assume it's ready if ready_state isn't available
                return
        await asyncio.sleep(0.1)
        attempts += 1

    raise RuntimeError(
        f"Stream was not opened within timeout ({max_attempts * 100}ms). "
        "Stream exists but ready_state never became OPEN (1)."
    )


@pytest.fixture(scope="module")
def hume_client_module(api_key):
    return AsyncHumeClient(api_key=api_key)


@pytest.fixture(scope="module")
async def stream_input_setup(hume_client_module):
    """Set up the stream input connection"""
    global _example3_stream

    async with hume_client_module.tts.stream_input.connect(version="1", no_binary=True, strip_headers=True) as stream:
        _example3_stream = stream
        await wait_for_stream_open(get_stream)
        yield stream
        _example3_stream = None


@pytest.mark.asyncio
async def test_creates_stream_and_connects_successfully(stream_input_setup):
    """
    creates a stream and connects successfully
    """
    stream = get_stream()
    assert stream is not None, "Expected stream to be truthy"
    assert hasattr(stream, "send_publish"), "Expected stream to have 'send_publish' attribute"
    assert callable(stream.send_publish), "Expected send_publish to be a function"
    assert hasattr(stream, "on"), "Expected stream to have 'on' attribute"
    assert callable(stream.on), "Expected on to be a function"

    await asyncio.sleep(1.0)

    stream_after_wait = get_stream()
    assert stream_after_wait is stream, "Expected same stream instance"

    if hasattr(stream, "ready_state") and isinstance(stream.ready_state, int):
        # WebSocket states: 0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED
        assert stream.ready_state == 1, "Expected ready_state to be 1 (OPEN)"


@pytest.mark.asyncio
async def test_sends_messages_and_receives_audio_chunks(hume_client):
    """
    sends messages and receives audio chunks
    """
    audio_chunks = []

    async with hume_client.tts.stream_input.connect(version="2", no_binary=True, strip_headers=True) as stream:

        async def handle_messages():
            async for chunk in stream:
                if chunk.type == "audio":
                    audio_chunks.append(chunk)

        async def send_input():
            await stream.send_publish(
                PublishTts(
                    text="Hello",
                    voice=PostedUtteranceVoiceWithName(name="Ava Song", provider="HUME_AI"),
                )
            )
            await stream.send_publish(PublishTts(flush=True))
            # Wait a bit for audio to arrive
            await asyncio.sleep(1.0)
            await stream.send_publish(PublishTts(close=True))

        # Run both concurrently with gather (exactly like example3)
        await asyncio.gather(handle_messages(), send_input())

    assert len(audio_chunks) > 0, "Expected at least one audio chunk"
    first_chunk = audio_chunks[0]
    assert first_chunk.type == "audio", "Expected chunk type to be 'audio'"
    assert hasattr(first_chunk, "audio"), "Expected chunk to have 'audio' attribute"
    assert isinstance(first_chunk.audio, str), "Expected audio to be a string (base64 encoded)"
