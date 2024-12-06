"use client";
import { useVoice } from "@humeai/voice-react";
import { useEffect, useRef } from "react";

export default function Messages() {
  const { messages } = useVoice();
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-2xl mx-4">
        <div className="h-[calc(95vh-8rem)] overflow-y-auto p-4 bg-slate-800/50 backdrop-blur-sm rounded-lg shadow-xl border border-slate-700/30">
          {" "}
          {messages.length === 0 && (
            <p className="text-center mt-8 text-slate-100">
              Press Start Call to start the conversation With Prana-Bot!!
            </p>
          )}
          {messages.map((msg, index) => {
            if (msg.type !== "user_message" && msg.type !== "assistant_message")
              return null;

            const { role, content } = msg.message;
            return (
              <div
                key={msg.type + index}
                className={`mb-1 ${
                  role === "assistant" ? "justify-start" : "justify-end"
                } flex`}
              >
                <div
                  className={`chat-bubble max-w-[80%] break-words ${
                    role === "assistant"
                      ? "bg-base-200 text-primary"
                      : "bg-primary text-white"
                  }`}
                >
                  {content}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
}
