"use client";

import { VoiceProvider } from "@humeai/voice-react";
import Messages from "./Messages";
import Controls from "./Controls";
import StartCall from "./StartCall";
import { ComponentRef, useRef } from "react";
import StoryControls from "./StoryControls";

export default function ClientComponent({
  accessToken,
}: {
  accessToken: string;
}) {
  const timeout = useRef<number | null>(null);
  const ref = useRef<ComponentRef<typeof Messages> | null>(null);

  return (
    <div
      className={"relative flex flex-col grow w-full h-full overflow-hidden"}
    >
      <VoiceProvider
        configId="4cefd3dd-70c4-44c6-9579-4e95a9077de6"
        auth={{ type: "accessToken", value: accessToken }}
        onMessage={() => {
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
        }}
      >
        <div className="flex flex-1 overflow-hidden gap-4">
          <Messages ref={ref} />
          <StoryControls />
        </div>
        <Controls />
        <StartCall />
      </VoiceProvider>
    </div>
  );
}
