import * as p from "@clack/prompts";
import { WebSocketError } from "hume/serialization/resources/empathicVoice";

import { EventEmitter } from "events";
import { Server } from "http";
import { WebSocket, WebSocketServer } from "ws";
import type { Message } from "../shared/types.ts";
import { truncateDataReplacer } from "./util";

export class Downstream extends EventEmitter {
  private client: WebSocket | null = null;
  private cachedClientMetadata: Message | null = null;

  private constructor(
    private maybeRejectConnectionWithMessage: () => string | undefined,
  ) {
    super();
    this.maybeRejectConnectionWithMessage = maybeRejectConnectionWithMessage;
  }

  static connect({
    server,
    path,
    maybeRejectConnectionWithMessage,
  }: {
    server: Server;
    path: string;
    port?: number;
    maybeRejectConnectionWithMessage: () => string | undefined;
  }): Downstream {
    const wss = new WebSocketServer({ server });
    wss.path = path;
    const downstream = new Downstream(maybeRejectConnectionWithMessage);

    wss.on("connection", (ws: WebSocket) => {
      downstream.handleConnection(ws);
    });

    return downstream;
  }

  broadcast(message: Message) {
    if (message.type === "chat_metadata") {
      this.cachedClientMetadata = message;
    }
    if (this.client && this.client.readyState === WebSocket.OPEN) {
      this.client.send(JSON.stringify(message));
    }
  }

  close() {
    if (this.client) {
      this.client.close();
      this.client = null;
    }
  }

  closeWithError(code: number, reason: string) {
    if (this.client && this.client.readyState === WebSocket.OPEN) {
      p.log.warn(`Closing websocket with code ${code}: ${reason}`);
      if (code === 1006) {
        // Force abnormal closure by terminating the connection
        this.client.terminate();
      } else {
        this.client.close(code, reason);
      }
    }
  }

  sendError(error: WebSocketError.Raw) {
    if (this.client && this.client.readyState === WebSocket.OPEN) {
      p.log.info(`Sending error to client: ${JSON.stringify(error)}`);
      this.client.send(JSON.stringify(error));
    }
  }

  private audioTimeout: NodeJS.Timeout | null = null;
  /**
   * Logs messages but throttles audio messages
   */
  private logMessage(message: { toString: () => string }) {
    let parsedMessage;
    try {
      parsedMessage = JSON.parse(message.toString());
    } catch (e) {
      parsedMessage = null;
    }
    if (!parsedMessage || parsedMessage.type === "audio_input") {
      if (!this.audioTimeout) {
        p.log.info(`Audio stream started.`);
      } else {
        clearTimeout(this.audioTimeout);
      }
      this.audioTimeout = setTimeout(() => {
        p.log.info(`Audio stream ended.`);
        this.audioTimeout = null;
      }, 1000);
      return;
    }
    p.log.info(
      `Received message from client: ${JSON.stringify(parsedMessage, truncateDataReplacer)}`,
    );
  }

  handleConnection(ws: WebSocket): void {
    const rejectMessage = this.maybeRejectConnectionWithMessage();
    if (rejectMessage) {
      p.log.error(rejectMessage);
      ws.close();
      return;
    }
    if (this.client) {
      p.log.error(
        "A downstream client is already connected. Only one client is allowed at a time.",
      );
      ws.close(4000, "Only one downstream client allowed");
      return;
    }
    p.log.info("New client connected");
    this.client = ws;

    // Send cached chat_metadata to new client if available
    if (this.cachedClientMetadata) {
      ws.send(JSON.stringify(this.cachedClientMetadata));
      p.log.info("Sent cached chat_metadata to new client");
    }

    ws.on("close", () => {
      p.log.info("Client disconnected");
      if (this.client === ws) {
        this.client = null;
        this.emit("disconnect");
      }
    });

    ws.on("error", (error) => {
      p.log.error(`WebSocket error: ${error.message}`);
      if (this.client === ws) {
        this.client = null;
      }
    });

    this.emit("connect");

    ws.on("message", (message, isBinary) => {
      if (!isBinary) {
        this.logMessage(message);
      }

      this.emit("message", message, isBinary);
    });
  }
}
