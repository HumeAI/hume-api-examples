"""
Test file for TTS Python quickstart.

This test replicates the TypeScript test "connects w/ access token,
generates JSON stream" from tts-typescript-quickstart/index.test.ts

Python Testing Basics:
- pytest is the testing framework (like vitest/jest in TypeScript)
- Test functions start with "test_" or are in classes starting with "Test"
- We use pytest-asyncio to test async functions (like our TTS API calls)
- assert statements are used to verify expected behavior
  (like expect() in TypeScript)
"""

import os
import base64
import pytest
import httpx
from dotenv import load_dotenv
from hume import AsyncHumeClient
from hume.tts import PostedUtterance, PostedUtteranceVoiceWithName

# Load environment variables from .env file
load_dotenv()


def fetch_access_token(api_key: str, secret_key: str) -> str:
    """
    Fetch an access token from Hume's OAuth2 service.

    This replicates the fetchAccessToken function from the TypeScript SDK.
    In TypeScript, this is: fetchAccessToken({ apiKey, secretKey })

    Args:
        api_key: Your Hume API key
        secret_key: Your Hume secret key

    Returns:
        The access token string

    Raises:
        ValueError: If the access token cannot be fetched
    """
    # Create Basic Auth header: base64 encode "api_key:secret_key"
    auth_string = f"{api_key}:{secret_key}"
    encoded = base64.b64encode(auth_string.encode()).decode()

    # Make POST request to OAuth2 token endpoint
    # This is the same endpoint the TypeScript SDK uses
    response = httpx.post(
        "https://api.hume.ai/oauth2-cc/token",
        headers={
            "Authorization": f"Basic {encoded}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        data={"grant_type": "client_credentials"},
        timeout=10.0,
    )

    # Raise an error if the request failed
    response.raise_for_status()

    # Extract access token from JSON response
    data = response.json()
    if "access_token" not in data:
        raise ValueError("Access token not found in response")

    return data["access_token"]


# This is equivalent to the TypeScript test's example1RequestParams
# In TypeScript it's defined as:
# const example1RequestParams = {
#   utterances: [utterance],
#   stripHeaders: true,
# }
EXAMPLE1_REQUEST_PARAMS = {
    "utterances": [
        PostedUtterance(
            text=("Dogs became domesticated between 23,000 " "and 30,000 years ago."),
            voice=PostedUtteranceVoiceWithName(name="Ava Song", provider="HUME_AI"),
        )
    ],
    # Note: Python uses snake_case, TypeScript uses camelCase
    "strip_headers": True,
}


@pytest.fixture(scope="module")
def api_credentials():
    """
    Pytest fixture to get API credentials from environment variables.

    Fixtures are like beforeAll() in TypeScript - they run before tests
    and can provide data to test functions. scope="module" means this
    runs once per test file (not once per test).

    In TypeScript, this is handled by:
    beforeAll(() => {
      apiKey = envApiKey;
      secretKey = envSecretKey;
    })
    """
    api_key = os.getenv("TEST_HUME_API_KEY") or os.getenv("HUME_API_KEY")
    secret_key = os.getenv("TEST_HUME_SECRET_KEY") or os.getenv("HUME_SECRET_KEY")

    if not api_key:
        pytest.skip("API key is required. Set TEST_HUME_API_KEY or HUME_API_KEY.")
    if not secret_key:
        pytest.skip(
            "Secret key is required. " "Set TEST_HUME_SECRET_KEY or HUME_SECRET_KEY."
        )

    return {"api_key": api_key, "secret_key": secret_key}


@pytest.mark.asyncio
async def test_connects_with_access_token_generates_json_stream(
    api_credentials,
):
    """
    connects w/ access token, generates JSON stream

    This replicates the TypeScript test:
    it('connects w/ access token, generates JSON stream', async () => {
      const accessToken = await fetchAccessToken({ apiKey, secretKey });
      const humeWithAccessToken = new HumeClient({ accessToken });
      const stream = await humeWithAccessToken.tts
        .synthesizeJsonStreaming({...});
      // ... collect and assert on audio chunks
    })

    @pytest.mark.asyncio tells pytest this is an async test function.
    The api_credentials parameter is automatically injected by pytest
    from the fixture we defined above.
    """
    # Step 1: Fetch access token
    # (equivalent to TypeScript's fetchAccessToken)
    access_token = fetch_access_token(
        api_key=api_credentials["api_key"],
        secret_key=api_credentials["secret_key"],
    )

    # Verify we got a token (should be a non-empty string)
    assert access_token, "Access token should not be empty"
    assert isinstance(access_token, str), "Access token should be a string"

    # Step 2: Create Hume client with access token
    # In TypeScript: new HumeClient({ accessToken })
    # In Python: AsyncHumeClient doesn't have a direct access_token parameter
    # (unlike stream_input.connect() which does support access_token).
    # Instead, we pass the access token via headers with "Bearer" prefix.
    # This is the standard OAuth2 way to authenticate with access tokens.
    hume_with_access_token = AsyncHumeClient(
        headers={"Authorization": f"Bearer {access_token}"}
    )

    # Step 3: Call synthesize_json_streaming
    # (equivalent to synthesizeJsonStreaming)
    # In TypeScript:
    # humeWithAccessToken.tts.synthesizeJsonStreaming({...example1RequestParams})
    # Note: synthesize_json_streaming returns an async generator, not a coroutine
    stream = hume_with_access_token.tts.synthesize_json_streaming(
        **EXAMPLE1_REQUEST_PARAMS
    )

    # Step 4: Collect audio chunks from the stream
    # In TypeScript:
    # const audioChunks: any[] = [];
    # for await (const chunk of stream) {
    #   if (chunk.type === 'audio') {
    #     audioChunks.push(chunk);
    #   }
    # }
    audio_chunks = []
    async for chunk in stream:
        if chunk.type == "audio":
            audio_chunks.append(chunk)

    # Step 5: Assert that we received audio chunks
    # In TypeScript:
    # expect(audioChunks.length).toBeGreaterThan(0);
    # expect(firstChunk.type).toBe('audio');
    # expect(firstChunk.audio).toBeDefined();
    # expect(typeof firstChunk.audio).toBe('string');
    # // base64 encoded audio

    assert len(audio_chunks) > 0, "Expected at least one audio chunk"

    first_chunk = audio_chunks[0]
    assert first_chunk.type == "audio", "Expected chunk type to be 'audio'"
    assert hasattr(first_chunk, "audio"), "Expected chunk to have 'audio' attribute"
    assert isinstance(
        first_chunk.audio, str
    ), "Expected audio to be a string (base64 encoded)"
