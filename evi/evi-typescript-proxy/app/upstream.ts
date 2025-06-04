import * as p from "@clack/prompts";
import type { Message, WSMessage } from "../shared/types.ts";
import { WebSocket } from "ws";

export abstract class BaseUpstream {
  protected messageHandlers: Array<(message: Message) => void> = [];
  protected connectHandlers: Array<() => void> = [];
  protected disconnectHandlers: Array<() => void> = [];
  abstract connect(args?: any): void;
  abstract close(): void;
  abstract send(message: WSMessage): void;

  public onMessage(handler: (message: Message) => void): void {
    this.messageHandlers.push(handler);
  }

  public onConnect(handler: () => void): void {
    this.connectHandlers.push(handler);
  }

  public onDisconnect(handler: () => void): void {
    this.disconnectHandlers.push(handler);
  }
}

export type ConnectArgs = {
  baseUrl: string;
  apiKey: string;
  configId?: string;
};
export class LiveUpstream extends BaseUpstream {
  private humeWs: WebSocket | null = null;
  private closed?: true;
  private queued: Array<WSMessage> = [];

  public connect(args: ConnectArgs): void {
    if (this.closed) {
      throw new Error(
        "Unexpected: attempted to restart a closed LiveUpstream.",
      );
    }
    const { apiKey, configId, baseUrl } = args;
    const queryParams = {
      api_key: apiKey,
      ...(configId ? { config_id: configId } : {}),
    };
    const humeWsUrl = `${baseUrl}/v0/evi/chat?${new URLSearchParams(queryParams).toString()}`;
    p.log.info(
      `Connecting to Hume WebSocket at ${humeWsUrl.replace(apiKey, "API_KEY_HIDDEN")}`,
    );

    this.humeWs = new WebSocket(humeWsUrl);

    this.humeWs.on("open", () => {
      p.log.info("Connected to Hume WebSocket API");
      for (const handler of this.connectHandlers) {
        handler();
      }
    });

    this.humeWs.on("message", (data) => {
      const parsed = JSON.parse(data.toString()) as Message;
      for (const handler of this.messageHandlers) {
        handler(parsed);
      }
    });

    this.humeWs.on("close", (code: number, reason: Buffer) => {
      p.log.info(
        `Hume WebSocket connection closed with code ${code}. Reason: ${reason.toString("utf-8")}`,
      );
      for (const handler of this.disconnectHandlers) {
        handler();
      }
    });

    this.humeWs.on("error", (error) => {
      p.log.error(`Hume WebSocket error: ${error.message}`);
    });
  }

  public close(): void {
    this.humeWs?.close();
    this.humeWs = null;
    this.closed = true;
  }

  public send(message: WSMessage): void {
    this.queued.push(message);
    if (this.humeWs && this.humeWs.readyState === WebSocket.OPEN) {
      for (const queuedMessage of this.queued) {
        this.humeWs.send(queuedMessage.toString());
      }
      this.queued = [];
    }
  }
}

export class PlaybackUpstream extends BaseUpstream {
  private messages: Message[] = [];
  private index: number = 0;
  private delayMs: number = 200; // Simulate network delay

  public setPlaybackMessages(messages: Message[]): void {
    this.messages = messages;
    this.index = 0;
  }

  public connect(_args?: any): void {
    for (const handler of this.connectHandlers) {
      handler();
    }
  }

  public close(): void {
    for (const handler of this.disconnectHandlers) {
      handler();
    }
  }

  public send(_message: WSMessage): void {
    if (this.index < this.messages.length) {
      const nextMessage = this.messages[this.index];
      this.index++;
      setTimeout(() => {
        for (const handler of this.messageHandlers) {
          handler(nextMessage);
        }
      }, this.delayMs);
    }
  }
}

export class UninitializedUpstream extends BaseUpstream {
  public connect(_args?: any): void {
    throw new Error(
      "UninitializedUpstream cannot connect. Please initialize with LiveUpstream or PlaybackUpstream.",
    );
  }

  public close(): void {
    throw new Error(
      "UninitializedUpstream cannot close. Please initialize with LiveUpstream or PlaybackUpstream.",
    );
  }

  public send(_message: WSMessage): void {
    throw new Error(
      "UninitializedUpstream cannot send messages. Please initialize with LiveUpstream or PlaybackUpstream.",
    );
  }
}
