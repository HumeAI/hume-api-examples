"use client";
import { useVoice } from "@humeai/voice-react";

export default function Controls() {
  const { messages } = useVoice();

  return (
    <div>
      {messages.map((msg, index) => {
        // Don't do anything if the message is not a User or Assistant message
        if (msg.type !== "user_message" && msg.type !== "assistant_message") {
          return null;
        }

        // Render User and Assistant messages
        const { role, content } = msg.message;
        return (
          <div key={msg.type + index}>
            <div><strong>{role}: </strong>{content}</div>
          </div>
        );
      })}
    </div>
  );
}
