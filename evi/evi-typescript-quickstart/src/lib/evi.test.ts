import { describe, it, expect, vi } from 'vitest';

// Mock audio dependencies (handleOpen calls these)
vi.mock('../lib/audio', () => ({
  startAudioCapture: vi.fn(() =>
    Promise.resolve({ stream: { getTracks: () => [] } }),
  ),
}));

// Mock WebAudioPlayer (to define AudioContext)
vi.mock('hume', async () => {
  const actual = await vi.importActual<any>('hume');
  return {
    ...actual,
    EVIWebAudioPlayer: vi.fn(() => ({
      init: vi.fn(() => Promise.resolve()),
      stop: vi.fn(),
      enqueue: vi.fn(),
      dispose: vi.fn(),
    })),
  };
});

// Minimal DOM mock (main.ts touches document at module load time)
Object.defineProperty(globalThis, 'document', {
  value: { querySelector: vi.fn(() => null) },
  writable: true,
  configurable: true,
});

describe('connect to EVI', () => {
  it('starts a chat, receives a chatId, and stays alive for 2 seconds', async () => {
    await import('../main');

    const connect = (globalThis as any).__connectEVI as () => void;
    const getSocket = (globalThis as any).__getEVISocket as () => any;

    connect();

    const initialSocket = getSocket();
    if (!initialSocket) {
      throw new Error('Socket was not created');
    }

    // Wait for socket to open
    await new Promise<void>((resolve, reject) => {
      if (initialSocket.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      initialSocket.on('open', () => resolve());
      initialSocket.on('error', (err: any) =>
        reject(err instanceof Error ? err : new Error(String(err))),
      );
      initialSocket.on('close', (event: any) =>
        reject(
          new Error(
            `Socket closed before opening. Code: ${event?.code}, Reason: ${event?.reason}`,
          ),
        ),
      );
    });

    const chatId = await waitForChatMetadata(getSocket);

    expect(typeof chatId).toBe('string');
    expect(chatId.length).toBeGreaterThan(0);

    await sleep(2_000);

    const finalSocket = getSocket();
    expect(finalSocket?.readyState).toBe(WebSocket.OPEN);
  }, 5_000);
});

function waitForChatMetadata(getSocket: () => any): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = getSocket();

    if (!socket) {
      reject(new Error('Socket is null'));
      return;
    }

    let resolved = false;

    const onMessage = (msg: any) => {
      if (!resolved && msg.type === 'chat_metadata' && msg.chatId) {
        resolved = true;
        resolve(msg.chatId);
      }
    };

    const onError = (err: any) => {
      if (!resolved) {
        resolved = true;
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };

    const onClose = (event: any) => {
      if (!resolved) {
        resolved = true;
        reject(
          new Error(
            `Socket closed while waiting for chat_metadata. Code: ${event?.code}, Reason: ${event?.reason}, Socket state: ${socket.readyState}`,
          ),
        );
      }
    };

    socket.on('message', onMessage);
    socket.on('error', onError);
    socket.on('close', onClose);
  });
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));
