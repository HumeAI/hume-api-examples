# run with:
# uv run pytest test_main.py -v

import io
import os
import sys
from unittest.mock import patch

import pytest
from dotenv import load_dotenv

load_dotenv()

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


@pytest.fixture(scope="module")
def api_key():
    key = os.getenv("TEST_HUME_API_KEY") or os.getenv("HUME_API_KEY")
    if not key:
        pytest.skip("API key required. Set TEST_HUME_API_KEY or HUME_API_KEY.")
    return key


@pytest.mark.asyncio
async def test_send_hello_world_returns_non_empty_emotion_analysis(api_key):
    """
    Exp. Measurement Stream: send "hello world", expect a non-empty emotion analysis.
    """
    input_calls = ["hello world", "exit"]
    input_iter = iter(input_calls)

    def fake_input(prompt=""):
        return next(input_iter)

    with patch.dict(os.environ, {"HUME_API_KEY": api_key}, clear=False):
        with patch("main.input", side_effect=fake_input):
            from main import streaming_example

            stdout_capture = io.StringIO()
            with patch("sys.stdout", stdout_capture):
                await streaming_example()

    output = stdout_capture.getvalue()
    assert output, "Expected non-empty output"
    assert "Emotion Analysis" in output, "Expected 'Emotion Analysis' in output"
    # Should contain at least one emotion score line (e.g. "Enthusiasm     : 0.5783")
    assert ":" in output and any(c.isdigit() for c in output), "Expected emotion scores in output"
