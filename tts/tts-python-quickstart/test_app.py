# run tests locally with:
# uv run pytest test_app.py -v

import asyncio
import os
import pytest
from unittest.mock import patch
from dotenv import load_dotenv
from hume import AsyncHumeClient
from hume.tts import PublishTts, PostedUtteranceVoiceWithName

from app import example1_request_params

load_dotenv()


# =============================================================================
# Helpers
# =============================================================================


def create_audio_collector():
    """Create a mock that collects audio bytes"""
    collected = []

    async def mock_play_audio_streaming(audio_generator):
        async for audio_bytes in audio_generator:
            collected.append(audio_bytes)

    return collected, mock_play_audio_streaming


def assert_valid_audio_bytes(chunks: list, *, min_chunks: int = 1):
    """Assert that collected audio chunks are valid bytes."""
    assert len(chunks) >= min_chunks, f"Expected at least {min_chunks} audio chunk(s)"
    assert all(isinstance(c, bytes) for c in chunks), "Expected byte chunks"
    assert any(len(c) > 0 for c in chunks), "Expected at least one non-empty chunk"


def assert_valid_audio_chunk(chunk):
    """Assert that a streaming audio chunk is a base64 string."""
    assert chunk.type == "audio", "Expected chunk type to be 'audio'"
    assert isinstance(chunk.audio, str), "Expected audio to be a base64 string"


# =============================================================================
# Tests for actual app.py TTS examples (goal: catch breaking changes in examples)
# =============================================================================


@pytest.mark.asyncio
async def test_example1_runs_successfully():
    """
    TTS Example 1 (pre-existing voice) runs without errors and produces audio
    """
    collected, mock_play = create_audio_collector()

    with patch("app.play_audio_streaming", side_effect=mock_play):
        from app import example1

        await example1()

    assert_valid_audio_bytes(collected)


@pytest.mark.asyncio
async def test_example2_runs_successfully(hume_client):
    """
    TTS Example 2 (Voice Design) runs without errors and produces audio
    """
    import base64
    from hume.tts import PostedUtterance

    result = await hume_client.tts.synthesize_json(
        utterances=[
            PostedUtterance(
                description="Crisp British accent",
                text="The science of speech.",
            )
        ],
        num_generations=2,
    )

    assert len(result.generations) == 2, "Expected 2 voice generations"

    for gen in result.generations:
        assert gen.generation_id is not None, "Expected generation_id"
        assert gen.audio is not None, "Expected audio data"
        audio_bytes = base64.b64decode(gen.audio)
        assert len(audio_bytes) > 0, "Expected non-empty audio"


@pytest.mark.asyncio
async def test_example3_runs_successfully():
    """
    TTS Example 3 (bidirectional streaming) runs without errors and produces audio
    """
    collected, mock_play = create_audio_collector()
    original_sleep = asyncio.sleep

    async def fast_sleep(seconds):
        await original_sleep(0.5 if seconds >= 1 else seconds)

    with patch("app.play_audio_streaming", side_effect=mock_play):
        with patch("app.asyncio.sleep", side_effect=fast_sleep):
            from app import example3

            await example3()

    assert_valid_audio_bytes(collected)


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
async def test_generates_json_with_octave_1(hume_client):
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
    assert_valid_audio_chunk(audio_chunks[0])


@pytest.mark.asyncio
async def test_generates_json_with_octave_2_with_timestamps(hume_client):
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
        elif chunk.type == "timestamp":
            timestamp_chunks.append(chunk)

    assert len(audio_chunks) > 0, "Expected at least one audio chunk"
    assert_valid_audio_chunk(audio_chunks[0])

    assert len(timestamp_chunks) > 0, "Expected at least one timestamp chunk"
    ts = timestamp_chunks[0]
    assert ts.request_id is not None
    assert ts.generation_id is not None
    assert ts.snippet_id is not None
    assert ts.timestamp.type is not None
    assert ts.timestamp.text is not None
    assert ts.timestamp.time.begin is not None
    assert ts.timestamp.time.end is not None

    # Verify both timestamp types present
    types_found = {chunk.timestamp.type for chunk in timestamp_chunks}
    assert "word" in types_found, "Expected at least one word timestamp"
    assert "phoneme" in types_found, "Expected at least one phoneme timestamp"


@pytest.mark.asyncio
async def test_creates_stream_and_connects_successfully(hume_client):
    """
    creates a stream and connects successfully
    """
    async with hume_client.tts.stream_input.connect(no_binary=True, strip_headers=True) as stream:
        assert stream is not None
        assert callable(stream.send_publish)
        assert callable(stream.on)


@pytest.mark.asyncio
async def test_sends_messages_and_receives_audio_chunks(hume_client):
    """
    sends messages and receives audio chunks
    """
    audio_chunks = []

    async with hume_client.tts.stream_input.connect(no_binary=True, strip_headers=True) as stream:

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
            await asyncio.sleep(1.0)
            await stream.send_publish(PublishTts(close=True))

        await asyncio.gather(handle_messages(), send_input())

    assert len(audio_chunks) > 0, "Expected at least one audio chunk"
    assert_valid_audio_chunk(audio_chunks[0])
