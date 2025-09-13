import { spawn } from "child_process";
import { Readable } from "stream";

const SAMPLE_RATE = 48000; // 48kHz, s16le mono

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
  const ff = spawn("ffplay", args, { stdio: ["pipe", "ignore", "inherit"] });

  ff.stdin.on('error', (err) => {
    console.error("ffplay/ffmpeg stdin error:", err);
  });

  return {
    stdin: ff.stdin,
    async stop() {
      // Close stdin to signal end of input to ffplay/ffmpeg
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
