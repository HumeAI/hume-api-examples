"use client";

import { VoiceProvider } from "@humeai/voice-react";
import { Call } from "./Call";
import Messages from "./Message";
import { Cosine } from "../Cosine";

export default function ClientComponent({ accessToken }) {
  return (
    <VoiceProvider
      configId={process.env.NEXT_PUBLIC_HUME_CONFIG_ID}
      auth={{ type: "accessToken", value: accessToken }}
      onToolCall={handleToolCall}
    >
      <div className="w-[100lvw-2rem] flex flex-col justify-between min-h-[85lvh] m-4">
        <Messages />
        <Call />
      </div>
    </VoiceProvider>
  );
}

const handleToolCall = async (message, socket) => {
  console.log("handleToolCall called with message:", message);
  if (message.name === "retrieve_data") {
    try {
      const { query } = JSON.parse(message.parameters);
      console.log("Parsed query:", query);

      const data = await Cosine({ userText: query });
      console.log("Cosine function returned data:", data);

      const toolResponseMessage = {
        type: "tool_response",
        toolCallId: message.toolCallId,
        content: data,
      };
      console.log("Tool response message:", toolResponseMessage);

      return socket.success(toolResponseMessage);
    } catch (error) {
      console.error("Error in handleToolCall:", error);
      return socket.error({
        error: "Embeddings retrieval error",
        code: 400,
      });
    }
  }

  console.log("Tool not found for message:", message);
  return socket.error({
    error: "Tool not found",
    code: 401,
  });
};