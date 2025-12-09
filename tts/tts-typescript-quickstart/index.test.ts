import { describe, it, expect, vi, beforeAll } from 'vitest';

// Mock audio dependencies
vi.mock('./audio_player', () => ({
  startAudioPlayer: vi.fn(() => ({
    stdin: {
      write: vi.fn(),
      end: vi.fn(),
      pipe: vi.fn(),
    },
    stop: vi.fn(() => Promise.resolve()),
  })),
}));

// Mock createSilenceFiller
vi.mock('hume', async () => {
  const actual = await vi.importActual<any>('hume');
  return {
    ...actual,
    createSilenceFiller: vi.fn(() =>
      Promise.resolve(
        class SilenceFiller {
          pipe = vi.fn();
          on = vi.fn();
          writeAudio = vi.fn();
          endStream = vi.fn(() => Promise.resolve());
        },
      ),
    ),
  };
});

describe('TTS Stream Input', () => {
  let getStream: () => any;

  beforeAll(async () => {
    await import('./index');

    const example3 = (globalThis as any).__example3 as () => Promise<void>;
    if (!example3) {
      throw new Error('Example 3 was not exported');
    }
    getStream = (globalThis as any).__getExample3Stream as () => any;

    example3().catch((err) => {
      console.error('Example 3 setup error:', err);
    });

    await waitForStreamOpen(getStream);
  });

  it('creates a stream and connects successfully', async () => {
    const stream = getStream();
    expect(stream).toBeTruthy();
    expect(stream.sendPublish).toBeDefined();
    expect(typeof stream.sendPublish).toBe('function');
    expect(stream.on).toBeDefined();
    expect(typeof stream.on).toBe('function');

    await sleep(1_000);

    // Verify the stream is still connected (not just defined)
    const streamAfterWait = getStream();
    expect(streamAfterWait).toBe(stream); // Same instance

    // Verify the stream is connected (readyState 1 = OPEN)
    // If the connection failed (e.g., 401), readyState will be 3 (CLOSED)
    if ('readyState' in stream && typeof stream.readyState === 'number') {
      // WebSocket states: 0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED
      expect(stream.readyState).toBe(1); // WebSocket.OPEN = 1
    }
  });

  it('sends messages and receives audio chunks', async () => {
    const stream = getStream();

    // Collect received audio chunks
    const audioChunks: any[] = [];
    const messageHandler = (chunk: any) => {
      if (chunk.type === 'audio') {
        audioChunks.push(chunk);
      }
    };

    stream.on('message', messageHandler);

    stream.sendPublish({ text: 'Hello' });
    stream.sendPublish({ flush: true });

    // Wait for audio chunks to be received (with timeout)
    const maxWaitTime = 3_000;
    const startTime = Date.now();
    while (audioChunks.length === 0 && Date.now() - startTime < maxWaitTime) {
      await sleep(100);
    }

    expect(audioChunks.length).toBeGreaterThan(0);
    const firstChunk = audioChunks[0];
    expect(firstChunk.type).toBe('audio');
    expect(firstChunk.audio).toBeDefined();
    expect(typeof firstChunk.audio).toBe('string'); // base64 encoded audio
  });
});

function waitForStreamOpen(getStream: () => any): Promise<void> {
  return new Promise((resolve, reject) => {
    const maxAttempts = 100; // Increased timeout for connection
    let attempts = 0;

    const checkStream = () => {
      attempts++;
      const stream = getStream();

      if (stream) {
        // Check if stream is actually open (readyState 1)
        if ('readyState' in stream && typeof stream.readyState === 'number') {
          if (stream.readyState === 1) {
            // OPEN - connection successful
            resolve();
            return;
          }
          if (stream.readyState === 3) {
            // CLOSED - connection failed
            reject(
              new Error(
                'Stream connection failed (readyState=CLOSED). ' +
                  'The stream was created but closed immediately, likely due to authentication failure.',
              ),
            );
            return;
          }
          // CONNECTING (0) or CLOSING (2) - wait a bit more
        } else {
          // Stream exists but readyState not available
          // Wait a bit more to ensure it's actually ready
          if (attempts > 10) {
            // After 1 second, assume it's ready if readyState isn't available
            resolve();
            return;
          }
        }
      }

      if (attempts >= maxAttempts) {
        reject(
          new Error(
            `Stream was not opened within timeout (${maxAttempts * 100}ms). ` +
              'Stream exists but readyState never became OPEN (1).',
          ),
        );
        return;
      }

      setTimeout(checkStream, 100);
    };

    checkStream();
  });
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));
