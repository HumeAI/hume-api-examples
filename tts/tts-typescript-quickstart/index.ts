import { HumeClient } from "hume"
import fs from "fs/promises"
import path from "path"
import * as os from "os"
import * as readline from "readline"
import dotenv from "dotenv"
import { StreamingTtsClient } from "./streaming";
import { startAudioPlayer } from "./audio_player";
import { LiveSilenceFiller } from "./silence_filler";

export async function* deinterleave<T, K>(
  source: AsyncIterable<T>,
  groupBy: (x: T) => K,
  isFinal: (x: T) => boolean
): AsyncIterable<T> {
  const buffers = new Map<K, T[]>();   // items per group, in arrival order
  const order: K[] = [];               // first-seen order of groups
  let current: K | undefined;

  const ensure = (k: K) => {
    if (!buffers.has(k)) {
      buffers.set(k, []);
      order.push(k);
    }
  };

  const flushGroup = function* (k: K) {
    const buf = buffers.get(k);
    if (!buf) return;
    for (const item of buf) yield item;
    buffers.delete(k);
  };

  const nextGroup = (): K | undefined => {
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

dotenv.config()

const hume = new HumeClient({
  apiKey: process.env.HUME_API_KEY!,
})

const outputDir = path.join(os.tmpdir(), `hume-audio-${Date.now()}`)

const writeResultToFile = async (base64EncodedAudio: string, filename: string) => {
  const filePath = path.join(outputDir, `${filename}.wav`)
  await fs.writeFile(filePath, Buffer.from(base64EncodedAudio, "base64"))
  console.log('Wrote', filePath)
}

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


const example0_hume_provided_voice = async () => {
  const voice = {name: 'ava song', provider: 'HUME_AI'} as const;
  const audioPlayer = startAudioPlayer()
  
  // Use deinterleave to handle any interleaved snippets
  const deinterleavedSnippets = deinterleave(
    await hume.tts.synthesizeJsonStreaming({
      utterances: [
        { voice, text: "Dogs became domesticated between 23,000 and 30,000 years ago." }, 
      ],
      stripHeaders: true
    }),
    (snippet) => snippet.generationId || 'default',
    (snippet) => false // Let stream end handle finalization
  );
  
  for await (const snippet of deinterleavedSnippets) {
    const buffer = Buffer.from(snippet.audio, "base64")
    audioPlayer.stdin.write(buffer)
  }
  await audioPlayer.stop()
}

// Example 1: Voice creation using streaming
const example1_voice_design = async () => {
  console.log('\n=== Example 1: Voice creation using streaming ===')
  
  // Generate two voice options using num_generations
  const audioPlayer = startAudioPlayer()
  const generationIds: string[] = [];
  let generationCount = 0;
  
  console.log('Generating two voice options...')

  // Use deinterleave to handle interleaved snippets from multiple generations
  const deinterleavedSnippets = deinterleave(
    await hume.tts.synthesizeJsonStreaming({
      utterances: [{
        description: "crisp, upper-class Received Pronunciation accent with impeccably articulated consonants and perfectly placed vowels. Authoritative and theatrical, as if giving a lecture.",
        text: "The science of speech. That's my profession; also my hobby. Happy is the man who can make a living by his hobby!"
      }],
      numGenerations: 2,
      stripHeaders: true,
      instantMode: false,
    }),
    (snippet) => snippet.generationId || 'default',
    (snippet) => false // Let stream end handle finalization
  );
  
  for await (const snippet of deinterleavedSnippets) {
    const buffer = Buffer.from(snippet.audio, "base64")
    audioPlayer.stdin.write(buffer)
    
    if (snippet.generationId && !generationIds.includes(snippet.generationId)) {
      generationIds.push(snippet.generationId)
      generationCount++
      console.log(`Generated voice option ${generationCount}/2`)
    }
  }
  await audioPlayer.stop()
  
  if (generationIds.length !== 2) {
    throw new Error(`Expected 2 generation IDs, but received ${generationIds.length}`)
  }
  
  console.log(`\nGenerated two voice options with IDs: ${generationIds.join(', ')}`)
  
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
  const voiceName = `henry-higgins-${Date.now()}`;
  await hume.tts.voices.create({
    name: voiceName,
    generationId: selectedGenerationId,
  })
  
  console.log(`Created voice: ${voiceName}`)

  // Continue speech with text2 using the selected voice
  const text2 = "You can spot an Irishman or a Yorkshireman by his brogue. I can place any man within six miles. I can place him within two miles in London. Sometimes within two streets."
  
  console.log('\nContinuing speech with the selected voice...')
  const audioPlayer2 = startAudioPlayer()
  
  // Use deinterleave for continuation speech
  const deinterleavedContinuation = deinterleave(
    await hume.tts.synthesizeJsonStreaming({
      utterances: [{
        voice: { name: voiceName },
        text: text2
      }],
      context: {
        generationId: selectedGenerationId
      },
      stripHeaders: true
    }),
    (snippet) => snippet.generationId || 'default',
    (snippet) => false // Let stream end handle finalization
  );
  
  for await (const snippet of deinterleavedContinuation) {
    const buffer = Buffer.from(snippet.audio, "base64")
    audioPlayer2.stdin.write(buffer)
  }
  await audioPlayer2.stop()
  
  return { voice: { name: voiceName }, lastGenerationId: selectedGenerationId }
}

// Example 2: Continuation using streaming
const example2_Continuation = async (voice: any, lastGenerationId: string) => {
  console.log('\n=== Example 2: Continuation using streaming ===')
  
  const audioPlayer = startAudioPlayer('container')
  
  // Use deinterleave for continuation with emotion
  const deinterleavedEmotion = deinterleave(
    await hume.tts.synthesizeJsonStreaming({
      utterances: [{
        voice: { name: voice.name },
        description: "Murmured softly, with a heavy dose of sarcasm and contempt",
        text: "Does he even know how to use that thing properly?"
      }],
      context: {
        generationId: lastGenerationId
      },
      stripHeaders: true
    }),
    (snippet) => snippet.generationId || 'default',
    (snippet) => false // Let stream end handle finalization
  );
  
  for await (const snippet of deinterleavedEmotion) {
    const buffer = Buffer.from(snippet.audio, "base64")
    audioPlayer.stdin.write(buffer)
  }
  await audioPlayer.stop()
}

// Example 3: Multiple generations using streaming
const example3_MultipleGenerations = async (voice: any) => {
  console.log('\n=== Example 3: Multiple generations using streaming ===')
  
  const audioPlayer = startAudioPlayer('container')
  
  // Use deinterleave for multiple generations
  const deinterleavedMultiple = deinterleave(
    await hume.tts.synthesizeJsonStreaming({
      utterances: [{
        voice: { name: voice.name },
        text: "Now let me demonstrate multiple generations of the same text."
      }],
      numGenerations: 3,
      stripHeaders: true
    }),
    (snippet) => snippet.generationId || 'default',
    (snippet) => false // Let stream end handle finalization
  );
  
  for await (const snippet of deinterleavedMultiple) {
    const buffer = Buffer.from(snippet.audio, "base64")
    audioPlayer.stdin.write(buffer)
  }
  await audioPlayer.stop()
}

// Example 4: Websocket streaming with silence filler
const example4_WebsocketStreaming = async () => {
  console.log('\n=== Example 4: Websocket streaming with silence filler ===')
  
  const streamingClient = await StreamingTtsClient.connect(process.env.HUME_API_KEY!);
  
  // Create audio player and silence filler separately
  const player = startAudioPlayer('raw');
  const BYTES_PER_SAMPLE = 2; // 16-bit samples
  const SAMPLE_RATE = 48000;
  const BUFFER_SIZE = Math.floor(SAMPLE_RATE * 0.1 * BYTES_PER_SAMPLE); // 100ms buffer
  const silenceFiller = new LiveSilenceFiller(BUFFER_SIZE, SAMPLE_RATE, BYTES_PER_SAMPLE, 10);
  
  // Pipe silence filler output to audio player stdin
  silenceFiller.pipe(player.stdin);
  
  // Handle pipe errors
  silenceFiller.on('error', (err) => {
    console.error("LiveSilenceFiller error:", err);
  });

  const sendInput = async () => {
    streamingClient.send({ text: "Hello world." });
    streamingClient.sendFlush();
    await new Promise(r => setTimeout(r, 3000));
    streamingClient.send({ text: "Goodbye, world." });
    streamingClient.sendFlush();
    streamingClient.sendClose();
  };

  const handleMessages = async () => {
    console.log("Waiting for audio chunks...");
    const replacer = (key: string, value: unknown) => {
      if (key === 'audio' && typeof value === 'string') {
        return `(base64 string of length ${value.length})`;
      }
      return value;
    };

    // Use deinterleave to handle interleaved audio snippets
    // Group by generationId to separate different audio streams
    // Consider a chunk final if it has a specific marker or is the last chunk
    const deinterleavedChunks = deinterleave(
      streamingClient,
      (chunk) => chunk.generationId || 'default', // Group by generationId
      (chunk) => {
        // Check if this is a final chunk based on available properties
        // We'll use a simple heuristic: if generationId changes, previous group is complete
        return false; // For now, we'll let the stream end handle finalization
      }
    );

    for await (const chunk of deinterleavedChunks) {
      console.log("Received chunk:", JSON.stringify(chunk, replacer));
      const buf = Buffer.from(chunk.audio, "base64");
      silenceFiller.writeAudio(buf);
    }
    console.log("Audio stream finished.");
    
    // Wait for silence filler to finish draining
    await silenceFiller.endStream();
    
    // Stop the audio player
    await player.stop();
    console.log("Player stopped.");
  };

  await Promise.all([handleMessages(), sendInput()]);
}

const main = async () => {
  await fs.mkdir(outputDir)
  console.log('Writing to', outputDir)

  // Run all examples
  await example0_hume_provided_voice()
  
  // Wait a bit between examples
  await new Promise(r => setTimeout(r, 2000))
  
  const { voice, lastGenerationId } = await example1_voice_design()
  
  // Wait a bit between examples
  await new Promise(r => setTimeout(r, 2000))
  
  await example2_Continuation(voice, lastGenerationId)
  
  // Wait a bit between examples
  await new Promise(r => setTimeout(r, 2000))
  
  await example3_MultipleGenerations(voice)
  
  // Wait a bit between examples
  await new Promise(r => setTimeout(r, 2000))
  
  await example4_WebsocketStreaming()
}

main().then(() => console.log('Done')).catch(console.error)
