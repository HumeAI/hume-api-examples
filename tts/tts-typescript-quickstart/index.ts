import { HumeClient } from "hume"
import fs from "fs/promises"
import path from "path"
import * as os from "os"
import * as child_process from "child_process"
import dotenv from "dotenv"

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

const startAudioPlayer = () => {
  const proc = child_process.spawn('ffplay', ['-nodisp', '-autoexit', '-infbuf', '-i', '-'], {
    detached: true,
    stdio: ['pipe', 'ignore', 'ignore'],
  })

  proc.on('error', (err) => {
    if ((err as any).code === 'ENOENT') {
      console.error('ffplay not found. Please install ffmpeg to play audio.')
    }
  })

  return {
    sendAudio: (audio: string) => {
      const buffer = Buffer.from(audio, "base64")
      proc.stdin.write(buffer)
    },
    stop: () => {
      proc.stdin.end()
      proc.unref()
    }
  }

}

const main = async () => {
  await fs.mkdir(outputDir)
  console.log('Writing to', outputDir)

  const speech1 = await hume.tts.synthesizeJson({
    utterances: [{
      description: "A refined, British aristocrat",
      text: "Take an arrow from the quiver."
    }]
  })
  await writeResultToFile(speech1.generations[0].audio, "speech1_0")

  const name = `aristocrat-${Date.now()}`;
  await hume.tts.voices.create({
    name,
    generationId: speech1.generations[0].generationId,
  })

  const speech2 = await hume.tts.synthesizeJson({
    utterances: [{
      voice: { name },
      text: "Now take a bow."
    }],
    context: {
      generationId: speech1.generations[0].generationId
    },
    numGenerations: 2,
  })
  await writeResultToFile(speech2.generations[0].audio, "speech2_0")
  await writeResultToFile(speech2.generations[1].audio, "speech2_1")

  const voice = { name }
  const speech3 = await hume.tts.synthesizeJson({
    utterances: [{
      voice: { name },
      description: "Murmured softly, with a heavy dose of sarcasm and contempt",
      text: "Does he even know how to use that thing?"
    }],
    context: {
      generationId: speech2.generations[0].generationId
    },
    numGenerations: 1
  })
  await writeResultToFile(speech3.generations[0].audio, "speech3_0")

  const audioPlayer = startAudioPlayer()
  for await (const snippet of await hume.tts.synthesizeJsonStreaming({
    context: {
      generationId: speech3.generations[0].generationId,
    },
    utterances: [{ voice, text: "He's drawn the bow..." }, { voice, text: "he's fired the arrow..." }, { voice, text: "I can't believe it! A perfect bullseye!" }],

    stripHeaders: true
  })) {
    audioPlayer.sendAudio(snippet.audio)
  }
  audioPlayer.stop()
}

main().then(() => console.log('Done')).catch(console.error)
