"use client";

import { VoiceProvider } from "@humeai/voice-react";
import Messages from "./Messages";
import Controls from "./Controls";
import StartCall from "./StartCall";
import { ComponentRef, useRef } from "react";
import { setLlmKeyForChat } from "@/app/actions/set-llm-key";
import { recordVoiceEvent } from "@/utils/e2e-hooks";

type ChatProps =
  | { accessToken: string; apiKey?: never }
  | { apiKey: string; accessToken?: never };

export default function ClientComponent({ accessToken, apiKey }: ChatProps) {
  const timeout = useRef<number | null>(null);
  const ref = useRef<ComponentRef<typeof Messages> | null>(null);

  return (
    <div
      className={
        "relative grow flex flex-col mx-auto w-full overflow-hidden h-[0px]"
      }
    >
      <VoiceProvider
        onMessage={async (msg) => {
          recordVoiceEvent(msg);
          if (timeout.current) {
            window.clearTimeout(timeout.current);
          }

          timeout.current = window.setTimeout(() => {
            if (ref.current) {
              const scrollHeight = ref.current.scrollHeight;

              ref.current.scrollTo({
                top: scrollHeight,
                behavior: "smooth",
              });
            }
          }, 200);

          // Securely set your own API key server-side for supplemental LLM (if applicable)
          if (msg.type === "chat_metadata" && msg.chatId) {
            await setLlmKeyForChat(msg.chatId);
          }
        }}
      >
        <Messages ref={ref} />
        <Controls />
        <StartCall
          {...(apiKey != null
            ? { apiKey }
            : { accessToken: accessToken! })}
        />
      </VoiceProvider>
    </div>
  );
}
