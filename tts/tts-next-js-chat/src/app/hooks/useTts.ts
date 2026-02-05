import { useState } from "react";
import type { Message } from "@ai-sdk/react";

export function useTts(options: { voice?: any; voiceProvider: string; instant: boolean }) {
  const { voice, voiceProvider, instant } = options;
  const [audioChunks, setAudioChunks] = useState<Record<string, Uint8Array[]>>({});

  async function onTtsFinish(msg: Message) {
    if (msg.role !== "assistant" || !msg.content) return;

    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: msg.content,
        voiceName: voice?.name ?? null,
        voiceProvider: voice?.provider ?? voiceProvider,
        instant,
      }),
    });
    if (!res.ok || !res.body) return;

    let buffer = "";
    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop()!;

      for (const line of lines) {
        if (!line.trim()) continue;
        const chunk = JSON.parse(line) as any;
        if (chunk?.audio?.length) {
          const bin = atob(chunk.audio);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

          setAudioChunks((prev) => {
            const existing = prev[msg.id] ?? [];
            return { ...prev, [msg.id]: [...existing, bytes] };
          });
        }
      }
    }
  }

  return { audioChunks, onTtsFinish };
}
