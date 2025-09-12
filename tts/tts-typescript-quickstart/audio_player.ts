import { spawn } from "child_process";
import { LiveSilenceFiller } from "./silence_filler";

const SAMPLE_RATE = 48000; // 48kHz, s16le mono

export function startAudioPlayer(outputFile?: string) {
  const args = [
    "-f", "s16le",
    "-ar", `${SAMPLE_RATE}`,
    "-fflags", "nobuffer", "-flags", "low_delay", "-probesize", "32", "-analyzeduration", "0", 
    "-i", "-"
  ];

  let ff;
  if (outputFile) {
    // Use ffmpeg to write to file
    args.push("-f", "s16le", "-acodec", "pcm_s16le", outputFile);
    ff = spawn("ffmpeg", args, { stdio: ["pipe", "ignore", "inherit"] });
  } else {
    // Use ffplay for audio playback
    args.push("-nodisp", "-autoexit");
    ff = spawn("ffplay", args, { stdio: ["pipe", "ignore", "inherit"] });
  }

  
  const BYTES_PER_SAMPLE = 2; // 16-bit samples
  const BUFFER_SIZE = Math.floor(SAMPLE_RATE * 0.1 * BYTES_PER_SAMPLE); // 100ms buffer

  // Create live silence filler stream with 10ms interval for smooth playback
  const silenceFiller = new LiveSilenceFiller(BUFFER_SIZE, SAMPLE_RATE, BYTES_PER_SAMPLE, 10);

  // Pipe the silence filler output to ffplay/ffmpeg stdin
  silenceFiller.pipe(ff.stdin);

  // Handle pipe errors
  silenceFiller.on('error', (err) => {
    console.error("LiveSilenceFiller error:", err);
  });

  ff.stdin.on('error', (err) => {
    console.error("ffplay/ffmpeg stdin error:", err);
  });

  return {
    sendAudio(base64: string) {
      const buf = Buffer.from(base64, "base64");
      silenceFiller.writeAudio(buf);
    },
    async stop() {
      
      // Wait for LiveSilenceFiller to finish draining
      await silenceFiller.endStream();
      
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
