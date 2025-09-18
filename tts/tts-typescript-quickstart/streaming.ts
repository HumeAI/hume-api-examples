import WebSocket from "ws";
import {SnippetAudioChunk} from "hume/serialization/resources/tts/types/SnippetAudioChunk";
import { PublishTts } from "hume/api/resources/tts";

export class StreamingTtsClient {
  private constructor(
    private readonly ws: WebSocket,
    private readonly queue: Queue<string>
  ) { }

  static async connect(apiKey: string): Promise<StreamingTtsClient> {
    if (!apiKey) throw new Error("HUME_API_KEY is not set");

    const url = `wss://api.hume.ai/v0/tts/stream/input?api_key=${apiKey}&no_binary=true&instant_mode=true&format_type=pcm`;
    const ws = new WebSocket(url);
    const queue = new Queue<string>();

    ws.onmessage = (event) => {
      queue.push(event.data.toString())
    };
    ws.onclose = (_event) => {
      queue.end();
    };
    ws.onerror = (_error) => {
      queue.end();
    };

    await new Promise<void>((resolve, reject) => {
      ws.onopen = () => {
        resolve();
      };
      ws.onerror = (e) => {
        reject(e);
      };
    });

    return new StreamingTtsClient(ws, queue);
  }

  send(message: PublishTts) {
    if (this.ws.readyState !== WebSocket.OPEN) throw new Error("WebSocket not connected.");
    this.ws.send(JSON.stringify(message));
  }


  disconnect() {
    this.ws.close();
  }

  async *[Symbol.asyncIterator]() {
    for await (const item of this.queue) {
      yield SnippetAudioChunk.parseOrThrow(JSON.parse(item), {
        unrecognizedObjectKeys: "passthrough",
      });
    }
  }
}

// Resolves a promise with T, or null to indicate the stream ended.
type Resolver<T> = (value: T | null) => void;

class Queue<T> {
  private pushed: T[] = [];
  // If non-null, there is a consumer waiting for data, and
  // calling `waiting` with a chunk will resolve a promise that
  // sends the data to the consumer.
  private waiting: Resolver<T> | null = null;
  private ended = false;

  push(x: T) {
    if (this.ended) return;
    if (this.waiting) {
      const w = this.waiting;
      this.waiting = null;
      w(x);
    }
    else this.pushed.push(x);
  }
  end() {
    if (this.ended) return;
    this.ended = true;
    if (this.waiting) { this.waiting(null); this.waiting = null; }
  }
  async *[Symbol.asyncIterator]() {
    while (true) {
      if (this.pushed.length) yield this.pushed.shift()!;
      else {
        const x = await new Promise<T | null>(r => (this.waiting = r));
        if (x === null) break;
        yield x;
      }
    }
  }
}

