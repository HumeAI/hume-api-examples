"use client";

import { VoiceProvider, ToolCallHandler } from "@humeai/voice-react";
import Messages from "./Messages";
import Controls from "./Controls";
import StartCall from "./StartCall";
import { ComponentRef, useRef } from "react";

const handleToolCall: ToolCallHandler = async (message, send) => {
  if (message.name === "get_current_weather") {
    try {
      const response = await fetch("/api/fetchWeather", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parameters: message.parameters }),
      });

      const result = await response.json();

      if (result.success) {
        return send.success(result.data);
      } else {
        return send.error(result.error);
      }
    } catch (error) {
      return send.error({
        error: "Weather tool error",
        code: "weather_tool_error",
        level: "warn",
        content: "There was an error with the weather tool",
      });
    }
  }

  return send.error({
    error: "Tool not found",
    code: "tool_not_found",
    level: "warn",
    content: "The tool you requested was not found",
  });
};

export default function ClientComponent({
  accessToken,
}: {
  accessToken: string;
}) {
  const timeout = useRef<number | null>(null);
  const ref = useRef<ComponentRef<typeof Messages> | null>(null);

  return (
    <div
      className={
        "relative grow flex flex-col mx-auto w-full overflow-hidden h-[0px]"
      }
    >
      <VoiceProvider
        configId={process.env.NEXT_PUBLIC_HUME_CONFIG_ID}
        auth={{ type: "accessToken", value: accessToken }}
        onToolCall={handleToolCall}
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
        <Messages ref={ref} />
        <Controls />
        <StartCall />
      </VoiceProvider>
    </div>
  );
}
