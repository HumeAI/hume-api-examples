"use client";
import { useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { PaperAirplaneIcon, StopIcon } from "@heroicons/react/24/solid";

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit, status } = useChat({
    api: "/api/chat",
    streamProtocol: "text",
  });
  const isLoading = status === "submitted" || status === "streaming";

  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <section className="flex flex-col flex-1 basis-0 rounded-l-2xl h-full min-w-[840px]">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`rounded-lg px-4 py-3 shadow-md whitespace-pre-wrap max-w-prose ${m.role === "user" ? "bg-black text-white" : "bg-white text-gray-900"}`}
            >
              {m.content}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (isLoading) return;
          handleSubmit(e);
        }}
        className="border-t border-gray-200 bg-white p-4"
      >
        <div className="relative flex">
          <input
            className="flex-1 rounded-md border border-gray-200 px-4 py-2 pr-12" /* extra right padding */
            placeholder="Type your message…"
            value={input}
            onChange={handleInputChange}
            disabled={isLoading}
          />

          {/* button overlaid inside input */}
          <button
            type={isLoading ? "button" : "submit"}
            onClick={() => {
              if (isLoading) stop();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-white bg-black disabled:opacity-50"
            disabled={!input.trim() && !isLoading}
          >
            {isLoading ? (
              <StopIcon className="h-5 w-5" />
            ) : (
              <PaperAirplaneIcon className="h-5 w-5" />
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
