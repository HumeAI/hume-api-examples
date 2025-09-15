import { HumeClient } from "hume"
import * as readline from "readline"
import dotenv from "dotenv"
import { StreamingTtsClient } from "./streaming";
import { startAudioPlayer } from "./audio_player";
import { SilenceFiller } from "./silence_filler";


dotenv.config()

const hume = new HumeClient({
  apiKey: process.env.HUME_API_KEY!,
})

const promptUserInput = (question: string): Promise<string> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

/** Example 1: Using a pre-existing voice.
 *
 * Use this method if you want to synthesize speech with a high-quality voice from
 * Hume's Voice Library, or specify `provider: 'CUSTOM_VOICE'` to use a voice that
 * you created previously via the Hume Platform or via the API.
 * */
const example1 = async () => {
  const voice = { name: 'Ava Song', provider: 'HUME_AI' } as const;
  const audioPlayer = startAudioPlayer()

  const stream = await hume.tts.synthesizeJsonStreaming({
    utterances: [
      { voice, text: "Dogs became domesticated between 23,000 and 30,000 years ago." },
    ],
    // With `stripHeaders: true`, only the first audio chunk will contain headers in container formats (wav, mp3). This allows you to start a single audio player and
    // stream all audio chunks to it without artifacts.
    stripHeaders: true
  })

  for await (const snippet of stream) {
    const buffer = Buffer.from(snippet.audio, "base64")
    audioPlayer.stdin.write(buffer)
  }
  await audioPlayer.stop()
}

/** Example 2: Voice Design.
 * 
 * This method demonstrates how you can create a custom voice via the API.
 * First, synthesize speech by specifying a `description` prompt and characteristic
 * sample text. Specify the generation_id of the resulting audio in a subsequent
 * call to create a voice. Then, future calls to tts endpoints can specify the
 * voice by name or generation_id.
 */
const example2 = async () => {
  const generationIds: string[] = []
  {
    console.log('Generating two voice options...')
    const stream = await hume.tts.synthesizeJsonStreaming({
      utterances: [{
        description: "Crisp, upper-class British accent with impeccably articulated consonants and perfectly placed vowels. Authoritative and theatrical, as if giving a lecture.",
        text: "The science of speech. That's my profession; also my hobby. Happy is the man who can make a living by his hobby!"
      }],
      numGenerations: 2,
      stripHeaders: true,
      // Voice design is currently only supported when instant mode is disabled.
      instantMode: false,
    })

    // When specifying `numGenerations` > 1, the resulting stream of snippets will
    // contain interleaved audio from different generations. The `collate` helper
    // function (defined below) will reorder the stream so that all snippets from
    // the same generation are contiguous.
    const contiguousStream = collate(
      stream,
      (snippet) => snippet.generationId,
      (snippet) => snippet.isLastChunk
    );

    const audioPlayer = startAudioPlayer()
    for await (const snippet of contiguousStream) {
      const buffer = Buffer.from(snippet.audio, "base64")
      audioPlayer.stdin.write(buffer)

      if (snippet.generationId && !generationIds.includes(snippet.generationId)) {
        generationIds.push(snippet.generationId)
      }
    }
    await audioPlayer.stop()
  }

  // Prompt user to select which voice they prefer
  console.log('\nWhich voice did you prefer?')
  console.log('1. First voice (generation ID:', generationIds[0], ')')
  console.log('2. Second voice (generation ID:', generationIds[1], ')')

  const userChoice = await promptUserInput('Enter your choice (1 or 2): ')
  const selectedIndex = parseInt(userChoice) - 1

  if (selectedIndex !== 0 && selectedIndex !== 1) {
    throw new Error('Invalid choice. Please select 1 or 2.')
  }

  const selectedGenerationId = generationIds[selectedIndex]
  console.log(`Selected voice option ${selectedIndex + 1} (generation ID: ${selectedGenerationId})`)

  // Save the selected voice
  const voiceName = `higgins-${Date.now()}`;
  await hume.tts.voices.create({
    name: voiceName,
    generationId: selectedGenerationId,
  })

  console.log(`Created voice: ${voiceName}`)

  console.log('\nContinuing speech with the selected voice...')

  const stream = await hume.tts.synthesizeJsonStreaming({
    utterances: [{
      voice: { name: voiceName },
      text: "You can spot an Irishman or a Yorkshireman by his brogue. I can place any man within six miles. I can place him within two miles in London. Sometimes within two streets."
    }],
    context: {
      // This demonstrates the "continuation" feature. You can specify the
      // generationId of previous speech that the speech in this request is
      // meant to follow, to make it sound natural when the speech is played
      generationId: selectedGenerationId
    },
    stripHeaders: true
  })

  const audioPlayer = startAudioPlayer()
  for await (const snippet of stream) {
    const buffer = Buffer.from(snippet.audio, "base64")
    audioPlayer.stdin.write(buffer)
  }
  await audioPlayer.stop()
}
/**
 * Takes an async iterator that yields interleaved items from different groups
 * and produces an iterator that yield items in group order.
 *
 * Example
 *   Input:  A1, B1, A2, A3 (final), C1, C2, C3 (final), B2 (final)
 *   Output: A1, A2, A3, B1, B2, C1, C2, C3
 *
 * @param source - The source async iterable producing interleaved items.
 * @param groupBy - Function to determine a "key" that determines the group identity for each item.
 * @param isFinal - Function to determine if an item is the final item in its group.
 */
async function* collate<TItem, TKey>(
  source: AsyncIterable<TItem>,
  groupBy: (x: TItem) => TKey,
  isFinal: (x: TItem) => boolean
): AsyncIterable<TItem> {
  const buffers = new Map<TKey, TItem[]>();
  const order: TKey[] = [];
  let current: TKey | undefined;

  const ensure = (k: TKey) => {
    if (!buffers.has(k)) {
      buffers.set(k, []);
      order.push(k);
    }
  };

  const flushGroup = function*(k: TKey) {
    const buf = buffers.get(k);
    if (!buf) return;
    for (const item of buf) yield item;
    buffers.delete(k);
  };

  const nextGroup = (): TKey | undefined => {
    // pop the next group in first-seen order that still has a buffer
    while (order.length && !buffers.has(order[0])) order.shift();
    return order.shift();
  };

  for await (const item of source) {
    const k = groupBy(item);

    if (current === undefined) current = k;
    ensure(k);
    buffers.get(k)!.push(item);

    // if we just saw the final item for the current group, flush it and advance
    if (k === current && isFinal(item)) {
      yield* flushGroup(current);
      current = nextGroup();
    }
  }

  // stream ended; flush remaining groups in first-seen order
  if (current !== undefined) {
    if (buffers.has(current)) yield* flushGroup(current);
    while (true) {
      const k = nextGroup();
      if (k === undefined) break;
      yield* flushGroup(k);
    }
  }
}

// Example 3: Bidirectional streaming
const example3 = async () => {
  const stream = await StreamingTtsClient.connect(process.env.HUME_API_KEY!);
  const player = startAudioPlayer('raw');
  const BYTES_PER_SAMPLE = 2; // 16-bit samples
  const SAMPLE_RATE = 48000;
  const BUFFER_SIZE = Math.floor(SAMPLE_RATE * 0.1 * BYTES_PER_SAMPLE); // 100ms buffer
  const silenceFiller = new SilenceFiller(BUFFER_SIZE, SAMPLE_RATE, BYTES_PER_SAMPLE, 10);

  // Pipe silence filler output to audio player stdin
  silenceFiller.pipe(player.stdin);

  // Handle pipe errors
  silenceFiller.on('error', (err) => {
    console.error("LiveSilenceFiller error:", err);
  });

  const sendInput = async () => {
    stream.send({ text: "Hello world." });
    stream.sendFlush();
    await new Promise(r => setTimeout(r, 3000));
    stream.send({ text: "Goodbye, world." });
    stream.sendFlush();
    stream.sendClose();
  };

  const handleMessages = async () => {
    for await (const chunk of stream) {
      const buf = Buffer.from(chunk.audio, "base64");
      silenceFiller.writeAudio(buf);
    }

    await silenceFiller.endStream();

    await player.stop();
  };

  await Promise.all([handleMessages(), sendInput()]);
}

const main = async () => {
  await example1()
  await example2()
  await example3()
}

main().then(() => console.log('Done')).catch(console.error)
