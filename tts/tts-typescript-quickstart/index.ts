import { HumeClient, createSilenceFiller } from 'hume';
import dotenv from 'dotenv';
import { startAudioPlayer } from './audio_player';

dotenv.config();

const hume = new HumeClient({
  apiKey: process.env.HUME_API_KEY!,
});

/** Example 1: Using a pre-existing voice.
 *
 * Use this method if you want to synthesize speech with a high-quality voice from
 * Hume's Voice Library, or specify `provider: 'CUSTOM_VOICE'` to use a voice that
 * you created previously via the Hume Platform or the API.
 * */
const example1 = async () => {
  const utterance = {
    text: 'Dogs became domesticated between 23,000 and 30,000 years ago.',
    voice: { name: 'Ava Song', provider: 'HUME_AI' as const },
  };

  const stream = await hume.tts.synthesizeJsonStreaming({
    utterances: [utterance],
    // With `stripHeaders: true`, only the first audio chunk will contain
    // headers in container formats (wav, mp3). This allows you to start a
    // single audio player and stream all audio chunks to it without artifacts.
    stripHeaders: true,
  });

  const audioPlayer = startAudioPlayer();
  console.log('Example 1: Synthesizing audio using a pre-existing voice...');
  for await (const chunk of stream) {
    if (chunk.type === 'audio') {
      const buffer = Buffer.from(chunk.audio, 'base64');
      audioPlayer.stdin.write(buffer);
    }
  }
  await audioPlayer.stop();
  console.log('Done!');
};

/** Example 2: Voice Design.
 *
 * This method demonstrates how you can create a custom voice via the API.
 * First, synthesize speech by specifying a `description` prompt and characteristic
 * sample text. Specify the generation_id of the resulting audio in a subsequent
 * call to create a voice. Then, future calls to tts endpoints can specify the
 * voice by name or generation_id.
 */
const example2 = async () => {
  const result1 = await hume.tts.synthesizeJson({
    utterances: [
      {
        description:
          'Crisp, upper-class British accent with impeccably articulated consonants and perfectly placed vowels. Authoritative and theatrical, as if giving a lecture.',
        text: "The science of speech. That's my profession; also my hobby. Happy is the man who can make a living by his hobby!",
      },
    ],
    numGenerations: 2,
    stripHeaders: true,
  });

  console.log('Example 2: Synthesizing voice options for voice creation...');
  let audioPlayer = startAudioPlayer();
  let sampleNumber = 1;
  for (const generation of result1.generations) {
    const buffer = Buffer.from(generation.audio, 'base64');
    audioPlayer.stdin.write(buffer);

    console.log(`Playing option ${sampleNumber}...`);
    sampleNumber++;
  }
  await audioPlayer.stop();

  // Prompt user to select which voice they prefer
  console.log('\nWhich voice did you prefer?');
  console.log(
    '1. First voice (generation ID:',
    result1.generations[0].generationId,
    ')',
  );
  console.log(
    '2. Second voice (generation ID:',
    result1.generations[1].generationId,
    ')',
  );

  const readFromStdin = () =>
    new Promise<string>((resolve) => {
      process.stdin.once('data', (data) => {
        process.stdin.pause(); // Stop reading from stdin
        resolve(data.toString().trim());
      });
    });
  process.stdout.write('Enter your choice (1 or 2): ');
  const userChoice = await readFromStdin();
  const selectedIndex = parseInt(userChoice) - 1;

  if (selectedIndex !== 0 && selectedIndex !== 1) {
    throw new Error('Invalid choice. Please select 1 or 2.');
  }

  const selectedGenerationId = result1.generations[selectedIndex].generationId;
  console.log(
    `Selected voice option ${
      selectedIndex + 1
    } (generation ID: ${selectedGenerationId})`,
  );

  // Save the selected voice
  const voiceName = `higgins-${Date.now()}`;
  await hume.tts.voices.create({
    name: voiceName,
    generationId: selectedGenerationId,
  });

  console.log(`Created voice: ${voiceName}`);

  console.log('\nContinuing speech with the selected voice...');

  audioPlayer = startAudioPlayer();
  const stream = await hume.tts.synthesizeJsonStreaming({
    utterances: [
      {
        voice: { name: voiceName },
        text: 'YOU can spot an Irishman or a Yorkshireman by his brogue. I can place any man within six miles. I can place him within two miles in London. Sometimes within two streets.',
        description: 'Bragging about his abilities',
      },
    ],
    context: {
      // This demonstrates the "continuation" feature. You can specify the
      // generationId of previous speech that the speech in this request is
      // meant to follow, to make it sound natural when the speech is played
      generationId: selectedGenerationId,
    },
    stripHeaders: true,
  });

  for await (const chunk of stream) {
    if (chunk.type === 'audio') {
      const buffer = Buffer.from(chunk.audio, 'base64');
      audioPlayer.stdin.write(buffer);
    }
  }
  console.log('Done!');

  await audioPlayer.stop();
};

// Example 3: Bidirectional streaming
let example3Stream: Awaited<
  ReturnType<typeof hume.tts.streamInput.connect>
> | null = null;

const example3 = async () => {
  const stream = await hume.tts.streamInput.connect({
    apiKey: process.env.HUME_API_KEY!,
    noBinary: true,
    instantMode: true,
    stripHeaders: true,
    formatType: 'pcm',
    version: '2',
  });
  example3Stream = stream;
  await stream.waitForOpen();
  const player = startAudioPlayer('raw');
  const SilenceFiller = await createSilenceFiller();
  const silenceFiller = new SilenceFiller();

  // Pipe silence filler output to audio player stdin
  silenceFiller.pipe(player.stdin);

  // Handle pipe errors
  silenceFiller.on('error', (err) => {
    console.error('LiveSilenceFiller error:', err);
  });

  const sendInput = async () => {
    stream.sendPublish({ text: 'Hello' });
    stream.sendPublish({ text: 'world.' });
    stream.sendPublish({ flush: true });
    console.log('Waiting 8 seconds...');
    await new Promise((r) => setTimeout(r, 8000));
    stream.sendPublish({ text: 'Goodbye, world.' });
    stream.sendPublish({ close: true });
  };

  const handleMessages = new Promise<void>((resolve, reject) => {
    console.log('Playing audio: Example 3 - Bidirectional streaming');
    stream.on('message', (chunk) => {
      if (chunk.type === 'audio') {
        const buf = Buffer.from(chunk.audio, 'base64');
        silenceFiller.writeAudio(buf);
      }
    });
    stream.on('error', reject);
    stream.on('close', async () => {
      await silenceFiller.endStream();
      await player.stop();
      resolve();
    });
  });

  await Promise.all([handleMessages, sendInput()]);
};

// Export for testing
if (
  typeof process !== 'undefined' &&
  (process.env.VITEST ||
    process.env.NODE_ENV === 'test' ||
    process.env.VITE_TEST)
) {
  (globalThis as any).__example3 = example3;
  (globalThis as any).__getExample3Stream = () => example3Stream;
}

const main = async () => {
  await example1();
  await example2();
  await example3();
};

main()
  .then(() => console.log('Done'))
  .catch(console.error);
