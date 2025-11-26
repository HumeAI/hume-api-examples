import { HumeClient } from "hume";
import type { Hume } from "hume";

let client: HumeClient | null = null;

function getClient(apiKey: string): HumeClient {
  if (!client) {
    client = new HumeClient({ apiKey });
  }
  return client;
}

/**
 * Initializes and opens an Empathic Voice Interface (EVI) ChatSocket.
 *
 * This function ensures a singleton HumeClient is created using the provided API key,
 * then connects to the EVI WebSocket endpoint (optionally with a specific config ID),
 * and registers your event handlers for the socket's lifecycle events.
 *
 * @param apiKey Your Hume API key. Must be a non-empty string.
 * @param handlers Callback handlers for socket events:
 *                 - open:    Invoked when the connection is successfully established.
 *                 - message: Invoked for each incoming SubscribeEvent.
 *                 - error:   Invoked on transport or protocol errors.
 *                 - close:   Invoked when the socket is closed.
 * @param configId (Optional) EVI configuration ID to apply; if omitted, default EVI configuration is used.
 * @param sessionSettings (Optional) Session settings to apply at connection time (e.g., voiceId, audio settings, etc.).
 *
 * @returns The connected ChatSocket instance, ready for sending and receiving audio/text messages.
 *
 * @throws {Error} If `apiKey` is falsy or an empty string.
 */
export function connectEVI(
  apiKey: string,
  handlers: Hume.empathicVoice.chat.ChatSocket.EventHandlers,
  configId?: string,
  sessionSettings?: Hume.empathicVoice.ConnectSessionSettings,
): Hume.empathicVoice.chat.ChatSocket {
  if (!apiKey) {
    throw new Error("VITE_HUME_API_KEY is not set.");
  }

  const client = getClient(apiKey);
  const socket = client.empathicVoice.chat.connect({
    ...(configId && { configId }),
    ...(sessionSettings && { sessionSettings }),
  });

  socket.on("open", handlers.open);
  socket.on("message", handlers.message);
  socket.on("error", handlers.error);
  socket.on("close", handlers.close);

  return socket;
}
