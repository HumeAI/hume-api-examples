import { describe, it, expect, vi, beforeAll } from 'vitest';
import { fetchAccessToken, HumeClient } from 'hume';

let apiKey: string;
let secretKey: string;

beforeAll(() => {
  const envApiKey =
    process.env.TEST_HUME_API_KEY || process.env.VITE_HUME_API_KEY;
  const envSecretKey =
    process.env.TEST_HUME_SECRET_KEY || process.env.VITE_HUME_SECRET_KEY;

  if (!envApiKey) {
    throw new Error(
      'API key is required. Set TEST_HUME_API_KEY (CI) or VITE_HUME_API_KEY (local).',
    );
  }
  if (!envSecretKey) {
    throw new Error(
      'Secret key is required. Set TEST_HUME_SECRET_KEY (CI) or VITE_HUME_SECRET_KEY (local).',
    );
  }

  apiKey = envApiKey;
  secretKey = envSecretKey;
});

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

describe('TTS JSON Stream', () => {
  let example1: () => Promise<void>;
  let example1RequestParams: any;
  let humeClient: HumeClient;

  beforeAll(async () => {
    await import('./index');
    example1 = (globalThis as any).__example1 as () => Promise<void>;
    example1RequestParams = (globalThis as any).__example1RequestParams;

    if (!example1) {
      throw new Error('Example 1 was not exported');
    }

    if (!example1RequestParams) {
      throw new Error('example1RequestParams was not exported');
    }

    expect(typeof example1).toBe('function');

    humeClient = new HumeClient({ apiKey });
  });

  it('generates JSON stream with Octave 1', async () => {
    const stream = await humeClient.tts.synthesizeJsonStreaming({
      ...example1RequestParams,
      version: '1',
    });

    const audioChunks: any[] = [];
    for await (const chunk of stream) {
      if (chunk.type === 'audio') {
        audioChunks.push(chunk);
      }
    }

    expect(audioChunks.length).toBeGreaterThan(0);
    const firstChunk = audioChunks[0];
    expect(firstChunk.type).toBe('audio');
    expect(firstChunk.audio).toBeDefined();
    expect(typeof firstChunk.audio).toBe('string'); // base64 encoded audio
  });

  it('generates JSON stream with Octave 2', async () => {
    const stream = await humeClient.tts.synthesizeJsonStreaming({
      ...example1RequestParams,
      version: '2',
    });

    const audioChunks: any[] = [];
    for await (const chunk of stream) {
      if (chunk.type === 'audio') {
        audioChunks.push(chunk);
      }
    }

    expect(audioChunks.length).toBeGreaterThan(0);
    const firstChunk = audioChunks[0];
    expect(firstChunk.type).toBe('audio');
    expect(firstChunk.audio).toBeDefined();
    expect(typeof firstChunk.audio).toBe('string'); // base64 encoded audio
  });
});

describe('TTS Stream Input with API key', () => {
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

describe('TTS Stream Input with Access Token', () => {
  let getStream: () => any;
  let accessTokenStream: any = null;

  beforeAll(async () => {
    const accessToken = await fetchAccessToken({
      apiKey: apiKey,
      secretKey: secretKey,
    });

    const humeWithAccessToken = new HumeClient({
      accessToken: accessToken,
    });

    const stream = await humeWithAccessToken.tts.streamInput.connect({
      accessToken: accessToken,
      noBinary: true,
      instantMode: true,
      stripHeaders: true,
    });

    accessTokenStream = stream;
    getStream = () => accessTokenStream;

    await waitForStreamOpen(getStream);
  });

  it('creates a stream and connects successfully with access token', async () => {
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
