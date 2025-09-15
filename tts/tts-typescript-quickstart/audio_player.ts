import { spawn } from "child_process";

const SAMPLE_RATE = 48000;

/**
 * This is a simple audio player that spawns an `ffplay` process and plays audio
 * by writing to it.
 *
 * In 'raw' mode, it plays back PCM in the default format produced by Hume TTS.
 * In 'container' mode, it can play back whole audio files in formats like 'wav' or 'mp3'.
 */
export function startAudioPlayer(mode: 'raw' | 'container' = 'container') {
  const args: string[] = [];
  if (mode === 'raw') {
    args.push(
      "-f", "s16le",
      "-ar", `${SAMPLE_RATE}`,
      "-fflags", "nobuffer", "-flags", "low_delay", "-probesize", "32", "-analyzeduration", "0",
    )
  }
  args.push(
    "-i", "-"
  );

  // Use ffplay for audio playback
  args.push("-nodisp", "-autoexit");
  const ff = spawn("ffplay", args, { stdio: ["pipe", "ignore", "ignore"] });

  ff.stdin.on('error', (err) => {
    if (err.message.includes('ENOENT')) {
      console.error("Could not find `ffplay` binary. Please install ffmpeg to play the audio from this example.");
    } else {
      console.error("ffplay stdin error:", err);
    }
  });

  return {
    stdin: ff.stdin,
    async stop() {
      // Close stdin to signal end of input to ffplay
      try {
        ff.stdin.end();
      } catch (e) {
        console.error(`[AudioPlayer] stdin already closed or error:`, e);
      }

      // Wait for the process to finish
      await new Promise<void>((resolve) => {
        ff.on('exit', () => {
          resolve();
        });
      });
    }
  };
}
