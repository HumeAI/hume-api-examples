"use client";

import { VoiceProvider } from "@humeai/voice-react";
import Messages from "./Messages";
import Controls from "./Controls";
import StartCall from "./StartCall";
import { ComponentRef, useRef } from "react";
import { setLlmKeyForChat } from "@/app/actions/set-llm-key";
import { recordVoiceEvent } from "@/utils/e2e-hooks";
import type { Hume } from "hume";

type ChatProps = (
  | { accessToken: string; apiKey?: never }
  | { apiKey: string; accessToken?: never }
) & {
  sessionSettings?: Hume.empathicVoice.SessionSettings;
};

export default function ClientComponent({
  accessToken,
  apiKey,
  sessionSettings,
}: ChatProps) {
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
              ref.current.scrollTo({
                top: ref.current.scrollHeight,
                behavior: "smooth",
              });
            }
          }, 200);

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
          sessionSettings={sessionSettings}
        />
      </VoiceProvider>
    </div>
  );
}
