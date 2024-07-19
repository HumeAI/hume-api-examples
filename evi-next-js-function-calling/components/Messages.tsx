"use client";
import { useVoice } from "@humeai/voice-react";

export default function Controls() {
  const { messages } = useVoice();

  return (
    <div>
      {messages.map((msg, index) => {
        if (msg.type === "user_message" || msg.type === "assistant_message") {
          return (
            <div key={msg.type + index}>
              <div>{msg.message.role}</div>
              <div>{msg.message.content}</div>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}
