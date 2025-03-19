import os
import time
import asyncio
import base64
import tempfile
from pathlib import Path
from hume import AsyncHumeClient
from hume.tts import (
    PostedContextWithGenerationId,
    PostedUtterance,
    PostedUtteranceVoiceWithName,
    ReturnGeneration,
)

import aiofiles

from dotenv import load_dotenv

load_dotenv()

# Initialize the Hume client using your API key and the test environment URL.
api_key = os.getenv("HUME_API_KEY")
if not api_key:
    raise EnvironmentError("HUME_API_KEY not found in environment variables.")

hume = AsyncHumeClient(api_key=api_key)

# Create an output directory in the temporary folder.
timestamp = int(time.time() * 1000)  # similar to Date.now() in JavaScript
output_dir = Path(tempfile.gettempdir()) / f"hume-audio-{timestamp}"


async def write_result_to_file(base64_encoded_audio: str, filename: str) -> None:
    """
    Writes the base64-decoded audio from a generation to a .wav file.
    """
    file_path = output_dir / f"{filename}.wav"
    # Decode the base64-encoded audio data (similar to Buffer.from(..., "base64"))
    audio_data = base64.b64decode(base64_encoded_audio)
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(audio_data)
    print("Wrote", file_path)


async def main() -> None:
    output_dir.mkdir(parents=True, exist_ok=True)

    print("Results will be written to", output_dir)

    # Synthesizing speech with a new voice
    speech1 = await hume.tts.synthesize_json(
        utterances=[
            PostedUtterance(
                description="A refined, British aristocrat",
                text="Take an arrow from the quiver.",
            )
        ]
    )
    await write_result_to_file(speech1.generations[0].audio, "speech1_0")

    name = f"aristocrat-{int(time.time())}"
    # Naming the voice and saving it to your voice library
    # for later use
    generation_id = speech1.generations[0].generation_id
    await hume.tts.voices.create(
        name=name, generation_id=generation_id
    )

    # Continuing previously-generated speech
    speech2 = await hume.tts.synthesize_json(
        utterances=[
            PostedUtterance(
                # Using a voice from your voice library
                voice=PostedUtteranceVoiceWithName(name=name),
                text="Now take a bow.",
            )
        ],
        # Providing previous context to maintain consistency.
        # This should cause "bow" to rhyme with "toe" and not "cow".
        context=PostedContextWithGenerationId(generation_id=generation_id),
        num_generations=2,
    )

    await write_result_to_file(speech2.generations[0].audio, "speech2_0")
    await write_result_to_file(speech2.generations[1].audio, "speech2_1")

    # Acting instructions: modulating the speech from a previously-generated voice
    speech3 = await hume.tts.synthesize_json(
        utterances=[
            PostedUtterance(
                voice=PostedUtteranceVoiceWithName(name=name),
                description="Murmured softly, with a heavy dose of sarcasm and contempt",
                text="Does he even know how to use that thing?",
            )
        ],
        context=PostedContextWithGenerationId(
            generation_id=speech2.generations[0].generation_id
        ),
        num_generations=1,
    )
    await write_result_to_file(speech3.generations[0].audio, "speech3_0")


if __name__ == "__main__":
    asyncio.run(main())
    print("Done")
