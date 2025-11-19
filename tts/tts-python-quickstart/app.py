import asyncio
import base64
import os
import time
from hume import AsyncHumeClient
from hume.tts import (
    PostedUtterance,
    PostedUtteranceVoiceWithName,
    PostedContextWithGenerationId,
    PublishTts,
)
from hume.empathic_voice.chat.audio.audio_utilities import play_audio_streaming, play_audio
from dotenv import load_dotenv

load_dotenv()

# Initialize the Hume client
api_key = os.getenv("HUME_API_KEY")
if not api_key:
    raise EnvironmentError("HUME_API_KEY not found in environment variables.")

hume = AsyncHumeClient(api_key=api_key)


# Example 1: Using a pre-existing voice.
#
# Use this method if you want to synthesize speech with a high-quality voice from
# Hume's Voice Library, or specify `provider: 'CUSTOM_VOICE'` to use a voice that
# you created previously via the Hume Platform or the API.
async def example1():
    utterance = PostedUtterance(
        text="Dogs became domesticated between 23,000 and 30,000 years ago.",
        voice=PostedUtteranceVoiceWithName(name='Ava Song', provider='HUME_AI')
    )
    
    print('Example 1: Synthesizing audio using a pre-existing voice...')
    
    stream = hume.tts.synthesize_json_streaming(
        utterances=[utterance],
        strip_headers=True
    )

    await play_audio_streaming(base64.b64decode(chunk.audio) async for chunk in stream if chunk.type == 'audio')


# Example 2: Voice Design.
#
# This method demonstrates how you can create a custom voice via the API.
# First, synthesize speech by specifying a `description` prompt and characteristic
# sample text. Specify the generation_id of the resulting audio in a subsequent
# call to create a voice. Then, future calls to tts endpoints can specify the
# voice by name or generation_id.
async def example2():
    result1 = await hume.tts.synthesize_json(
        utterances=[PostedUtterance(
            description="Crisp, upper-class British accent with impeccably articulated consonants and perfectly placed vowels. Authoritative and theatrical, as if giving a lecture.",
            text="The science of speech. That's my profession; also my hobby. Happy is the man who can make a living by his hobby!"
        )],
        num_generations=2,
    )
    
    print('Example 2: Synthesizing voice options for voice creation...')
    sample_number = 1
    
    for generation in result1.generations:
        print(f'Playing option {sample_number}...')
        audio_data = base64.b64decode(generation.audio)
        
        await play_audio(audio_data)
        sample_number += 1
    
    # Prompt user to select which voice they prefer
    print('\nWhich voice did you prefer?')
    print('1. First voice (generation ID:', result1.generations[0].generation_id, ')')
    print('2. Second voice (generation ID:', result1.generations[1].generation_id, ')')
    
    # For automated testing, select option 1
    try:
        user_choice = input('Enter your choice (1 or 2): ').strip()
    except EOFError:
        # If no input available (like in automated testing), default to option 1
        user_choice = '1'
        print('No input available, selecting option 1')
    
    selected_index = int(user_choice) - 1
    
    if selected_index not in [0, 1]:
        raise ValueError('Invalid choice. Please select 1 or 2.')
    
    selected_generation_id = result1.generations[selected_index].generation_id
    print(f'Selected voice option {selected_index + 1} (generation ID: {selected_generation_id})')
    
    # Save the selected voice
    voice_name = f'higgins-{int(time.time() * 1000)}'
    await hume.tts.voices.create(
        name=voice_name,
        generation_id=selected_generation_id,
    )
    
    print(f'Created voice: {voice_name}')
    print('\nContinuing speech with the selected voice...')
    
    stream = hume.tts.synthesize_json_streaming(
        utterances=[PostedUtterance(
            voice=PostedUtteranceVoiceWithName(name=voice_name),
            text="YOU can spot an Irishman or a Yorkshireman by his brogue. I can place any man within six miles. I can place him within two miles in London. Sometimes within two streets.",
            description="Bragging about his abilities"
        )],
        context=PostedContextWithGenerationId(
            # This demonstrates the "continuation" feature. You can specify the
            # generationId of previous speech that the speech in this request is
            # meant to follow, to make it sound natural when the speech is played
            generation_id=selected_generation_id
        ),
        strip_headers=True
    )
    
    await play_audio_streaming(base64.b64decode(chunk.audio) async for chunk in stream if chunk.type == 'audio')


# Example 3: Bidirectional streaming
# This example uses the SDK's stream_input.connect() method to
# connect to the /v0/tts/stream/input endpoint.
async def example3():
    assert api_key, "HUME_API_KEY not found in environment variables."
    async with hume.tts.stream_input.connect(version="1", no_binary=True, strip_headers=True) as stream:
        async def send_input():
            print("Sending TTS messages...")
            await stream.send_publish(PublishTts(text="Hello", voice=PostedUtteranceVoiceWithName(name="Ava Song", provider="HUME_AI")))
            await stream.send_publish(PublishTts(text=" world."))
            # The whitespace             ^ is important
            # Otherwise the model would see "Helloworld." and not "Hello world."
            await stream.send_publish(PublishTts(flush=True))
            print('Waiting 8 seconds...')
            await asyncio.sleep(8)
            await stream.send_publish(PublishTts(text="Goodbye, world."))
            await stream.send_publish(PublishTts(flush=True))
            print("Closing stream...")
            await stream.send_publish(PublishTts(close=True))

        async def handle_messages():
            await play_audio_streaming(base64.b64decode(chunk.audio) async for chunk in stream)

        await asyncio.gather(handle_messages(), send_input())

async def main():
    await example1()
    await example2()
    await example3()


if __name__ == "__main__":
    asyncio.run(main())
