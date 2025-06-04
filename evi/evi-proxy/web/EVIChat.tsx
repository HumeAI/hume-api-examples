import React, { useRef, type ComponentRef } from "react";
import { useVoice, VoiceProvider } from "@humeai/voice-react";
import ChatMessages from "./ChatMessages";
import ChatControls from "./ChatControls";

const StartCall = () => {
  const { status, connect, disconnect } = useVoice();

  if (status.value === "connected") {
    return null;
  }

  return (
    <button
      onClick={() => {
        disconnect();
        connect()
          .catch((error) => console.error("Failed to connect:", error));
      }}
    >
      Start Call
    </button>
  );
};

export default function EVIChat({ accessToken }: { accessToken?: string }) {
  const timeout = useRef<number | null>(null);
  const ref = useRef<ComponentRef<typeof ChatMessages> | null>(null);

  return (
    <div>
      <h1>EVI Chat</h1>
      <VoiceProvider
        auth={{ type: "apiKey", value: accessToken || "dummy" }}
        hostname={window.origin}
        onMessage={() => {
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
        }}
      >
        <ChatMessages ref={ref} />
        <ChatControls />
        <StartCall />
      </VoiceProvider>
    </div>
  );
}
