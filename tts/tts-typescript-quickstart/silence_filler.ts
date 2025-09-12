import { Readable } from "stream";

export class SilenceFiller {
  private audioQueue: Buffer[] = [];
  private totalBufferedBytes: number = 0;
  private startTimestamp: number | null = null;
  private totalBytesSent: number = 0;
  public donePrebuffering: boolean = false;
  private bufferSize: number;
  private sampleRate: number;
  private bytesPerSample: number;

  constructor(
    bufferSize: number,
    sampleRate: number,
    bytesPerSample: number
  ) {
    this.bufferSize = bufferSize;
    this.sampleRate = sampleRate;
    this.bytesPerSample = bytesPerSample;
  }

  writeAudio(audioBuffer: Buffer, timestamp: number): void {
    this.audioQueue.push(audioBuffer);
    this.totalBufferedBytes += audioBuffer.length;

    if (this.startTimestamp === null) {
      this.startTimestamp = timestamp;
    }

    if (!this.donePrebuffering && this.totalBufferedBytes >= this.bufferSize) {
      this.donePrebuffering = true;
    }
  }

  readAudio(timestamp: number): Buffer | null {
    if (this.startTimestamp === null || !this.donePrebuffering) {
      return null;
    }

    const elapsedMs = timestamp - this.startTimestamp;

    const targetBytesSent = Math.floor((this.sampleRate * elapsedMs / 1000) * this.bytesPerSample);

    const bytesNeeded = targetBytesSent - this.totalBytesSent;

    if (bytesNeeded <= 0) {
      return null;
    }

    // Ensure bytesNeeded is a multiple of bytesPerSample
    const alignedBytesNeeded = Math.floor(bytesNeeded / this.bytesPerSample) * this.bytesPerSample;

    if (alignedBytesNeeded <= 0) {
      return null;
    }

    let chunk = Buffer.alloc(0);

    // Drain from queue until we have enough bytes
    while (chunk.length < alignedBytesNeeded && this.audioQueue.length > 0) {
      const nextBuffer = this.audioQueue.shift()!;
      chunk = Buffer.concat([chunk, nextBuffer]);
      this.totalBufferedBytes -= nextBuffer.length;
    }

    // If we have more than needed, put the excess back
    if (chunk.length > alignedBytesNeeded) {
      const excess = chunk.subarray(alignedBytesNeeded);
      this.audioQueue.unshift(excess);
      this.totalBufferedBytes += excess.length;
      chunk = chunk.subarray(0, alignedBytesNeeded);
    }

    // Fill remaining with silence if needed
    if (chunk.length < alignedBytesNeeded) {
      const silenceNeeded = Buffer.alloc(alignedBytesNeeded - chunk.length, 0);
      chunk = Buffer.concat([chunk, silenceNeeded]);
    }

    // Update total bytes sent
    this.totalBytesSent += chunk.length;

    return chunk;
  }
}

export class LiveSilenceFiller extends Readable {
  private silenceFiller: SilenceFiller;
  private isStarted: boolean = false;
  private pushInterval: NodeJS.Timeout | null = null;
  private bytesPerSample: number;
  private pushIntervalMs: number;

  constructor(
    bufferSize: number,
    sampleRate: number,
    bytesPerSample: number,
    pushIntervalMs: number = 5
  ) {
    super({ objectMode: false });
    this.silenceFiller = new SilenceFiller(bufferSize, sampleRate, bytesPerSample);
    this.bytesPerSample = bytesPerSample;
    this.pushIntervalMs = pushIntervalMs;
  }

  writeAudio(audioBuffer: Buffer): void {
    const now = performance.now();
    try {
      this.silenceFiller.writeAudio(audioBuffer, now);
      if (!this.isStarted && this.silenceFiller.donePrebuffering) {
        this.isStarted = true;
        this.startPushInterval();
      }
    } catch (error) {
      console.error(`[LiveSilenceFiller] Error writing audio:`, error);
      this.emit('error', error);
    }
  }

  private startPushInterval(): void {
    this.pushInterval = setInterval(() => {
      this.pushData();
    }, this.pushIntervalMs);
  }

  private pushData(): void {
    if (!this.isStarted) return;

    try {
      const now = performance.now();
      const audioChunk = this.silenceFiller.readAudio(now);

      if (audioChunk && audioChunk.length > 0) {
        // Ensure chunk size is aligned to bytesPerSample
        const alignedChunkSize = Math.floor(audioChunk.length / this.bytesPerSample) * this.bytesPerSample;

        if (alignedChunkSize > 0) {
          const chunk = audioChunk.subarray(0, alignedChunkSize);
          this.push(chunk);
        }
      }
    } catch (error) {
      console.error(`[LiveSilenceFiller] Error pushing data:`, error);
      this.emit('error', error);
    }
  }

  _read(): void { }

  _destroy(error: Error | null, callback: (error?: Error | null) => void): void {
    super._destroy(error, callback);
  }

  endStream(): Promise<void> {
    return new Promise((resolve) => {
      // Stop pushing data
      if (this.pushInterval) {
        clearInterval(this.pushInterval);
        this.pushInterval = null;
      }

      // Drain all remaining audio from SilenceFiller
      const now = performance.now();

      // Keep reading until no more audio is available
      while (true) {
        const remainingChunk = this.silenceFiller.readAudio(now);

        if (!remainingChunk || remainingChunk.length === 0) {
          break;
        }

        const alignedChunkSize = Math.floor(remainingChunk.length / this.bytesPerSample) * this.bytesPerSample;
        if (alignedChunkSize > 0) {
          const chunk = remainingChunk.subarray(0, alignedChunkSize);
          this.push(chunk);
        }
      }


      this.push(null); // Signal end of stream

      this.once('end', () => {
        resolve();
      });
    });
  }
}
