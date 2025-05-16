import "@styles";
import { EVIWebAudioPlayer, getBrowserSupportedMimeType, MimeType } from "hume";
import type { ChatSocket, SubscribeEvent } from "hume/api/resources/empathicVoice/resources/chat";
import type { CloseEvent } from "hume/core/websocket/events";

import { connectEVI } from "@lib/evi";
import { startAudioCapture } from "@lib/audioCapture";
import { appendChat } from "@lib/ui";

(async () => {
  const apiKey = import.meta.env.VITE_HUME_API_KEY!;
  const configId = import.meta.env.VITE_HUME_CONFIG_ID;

  const startBtn = document.querySelector<HTMLButtonElement>("button#start-btn");
  const stopBtn = document.querySelector<HTMLButtonElement>("button#stop-btn");
  const chatContainer = document.querySelector<HTMLElement>("section#chat");

  let socket: ChatSocket | null = null;
  let recorder: MediaRecorder | null = null;
  let player = new EVIWebAudioPlayer();

  function setConnected(on: boolean): void {
    if (startBtn) startBtn.disabled = on;
    if (stopBtn) stopBtn.disabled = !on;
  }

  async function handleOpen() {
    console.log("Socket opened");
    const mimeTypeResult = getBrowserSupportedMimeType();
    const mimeType = mimeTypeResult.success ? mimeTypeResult.mimeType : MimeType.WEBM;
    recorder = await startAudioCapture(socket!, mimeType);
    player.init();
  }

  async function handleMessage(msg: SubscribeEvent) {
    switch (msg.type) {
      case "chat_metadata":
        console.log(msg);
        break;
      case "user_message":
      case "assistant_message":
        if (msg.type === "user_message") {
          await player.stop(); // stop playback when user speech detected
        }
        appendChat(chatContainer, msg);
        break;
      case "audio_output":
        await player.enqueue(msg);
        break;
      case "user_interruption":
        console.log("User interruption detected.");
        await player.stop();
        break;
      case "error":
        console.error(`EVI Error: Code=${msg.code}, Slug=${msg.slug}, Message=${msg.message}`);
        break;
    }
  }

  function handleError(err: Event | Error) {
    console.error("Socket error:", err);
  }

  function handleClose(e: CloseEvent) {
    console.log("Socket closed:", e);
    disconnect();
  }

  function connect() {
    if (socket && socket.readyState < WebSocket.CLOSING) return;
    setConnected(true);
    try {
      const handlers = {
        open: handleOpen,
        message: handleMessage,
        error: handleError,
        close: handleClose,
      };
      socket = connectEVI(apiKey, handlers, configId);
    } catch (err) {
      console.error("Failed to connect EVI:", err);
      socket = null;
      setConnected(false);
    }
  }

  function disconnect() {
    if (socket && socket.readyState < WebSocket.CLOSING) socket.close();
    socket = null;
    recorder?.stream.getTracks().forEach((t) => t.stop());
    recorder = null;
    player?.dispose();
    setConnected(false);
  }

  startBtn?.addEventListener("click", connect);
  stopBtn?.addEventListener("click", disconnect);
  setConnected(false);
})();
