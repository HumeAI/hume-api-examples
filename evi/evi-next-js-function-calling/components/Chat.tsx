"use client";

import { VoiceProvider, ToolCallHandler } from "@humeai/voice-react";
import Messages from "./Messages";
import Controls from "./Controls";
import StartCall from "./StartCall";
import { ComponentRef, useRef } from "react";

type ToolMeta = {
  endpoint: string;
  error: {
    error: string;
    code: string;
    level: "warn" | "error";
    content: string;
  };
};

const tools: Record<string, ToolMeta> = {
  get_current_weather: {
    endpoint: "/api/fetchWeather",
    error: {
      error: "Weather tool error",
      code: "weather_tool_error",
      level: "warn",
      content: "There was an error with the weather tool",
    },
  },
};

const handleToolCall: ToolCallHandler = async (message, send) => {
  const tool = tools[message.name];
  
  if (!tool) {
    return send.error({
      error: "Tool not found",
      code: "tool_not_found",
      level: "warn",
      content: "The tool you requested was not found",
    });
  }
  
  try {
    const response = await fetch(tool.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parameters: message.parameters }),
    });
    
    const result = await response.json();
    return result.success ? send.success(result.data) : send.error(result.error);
  } catch (err) {
    return send.error(tool.error);
  }
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
