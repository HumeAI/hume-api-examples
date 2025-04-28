"use client";
import React, { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import {
  MicrophoneIcon,
  PaperAirplaneIcon,
  StopIcon,
} from "@heroicons/react/24/solid";
import AudioPlayer from "@/components/AudioPlayer";
import { useVoiceSettings } from "@/context/VoiceSettingsContext";
import { useTts } from "@/hooks/useTts";
import { useRecording } from "@/hooks/useRecording";

export default function Chat() {
  const { instant, voice, voiceProvider } = useVoiceSettings();

  const { audioChunks, onTtsFinish } = useTts({
    voice,
    voiceProvider,
    instant,
  });

  const {
    input,
    messages,
    status,
    append,
    handleInputChange,
    handleSubmit,
    stop,
  } = useChat({
    api: "/api/chat",
    streamProtocol: "text",
    onFinish: onTtsFinish,
  });

  const {
    recording,
    transcribing,
    startRecording,
    stopRecordingAndTranscribe,
  } = useRecording((text) => {
    append({ role: "user", content: text });
  });

  const [hasOverflow, setHasOverflow] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isLoading = status === "submitted" || status === "streaming";

  // Scroll to bottom whenever messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Check if chat content overflows the container to toggle shadow availability
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const checkOverflow = () =>
      setHasOverflow(el.scrollHeight > el.clientHeight);
    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [messages]);

  // Track scroll position to show/hide the top shadow when not at the top
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setHasScrolled(el.scrollTop > 0);
    el.addEventListener("scroll", onScroll);
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section className="flex flex-col flex-1 basis-0 rounded-l-2xl h-full relative overflow-hidden">
      <div
        className={`
          absolute inset-x-0 top-0 h-12 pointer-events-none z-20
          bg-gradient-to-b from-black/20 to-transparent
          transition-opacity duration-900 ease-in-out
          ${hasOverflow && hasScrolled ? "opacity-100" : "opacity-30"}
        `}
      />
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((m) => (
          <React.Fragment key={m.id}>
            <div
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`rounded-lg px-4 py-3 shadow-md whitespace-pre-wrap max-w-prose ${
                  m.role === "user"
                    ? "bg-black text-white"
                    : "bg-white text-gray-900"
                }`}
              >
                {m.content}
              </div>
            </div>
            {m.role === "assistant" && audioChunks[m.id] && (
              <AudioPlayer chunks={audioChunks[m.id]} />
            )}
          </React.Fragment>
        ))}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (isLoading || recording || transcribing) return;
          handleSubmit(e);
        }}
        className="border-t border-gray-200 bg-white p-4"
      >
        <div className="flex items-center gap-3">
          <div className="relative flex flex-grow">
            <input
              className="flex-grow rounded-xl border border-gray-200 px-4 py-2 text-gray-900 placeholder-gray-500"
              placeholder="Type your message…"
              value={input}
              onChange={handleInputChange}
              disabled={isLoading || recording || transcribing}
            />

            <button
              type={isLoading ? "button" : "submit"}
              onClick={() => isLoading && stop()}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-white bg-gray-900 disabled:opacity-30"
              disabled={!input.trim() && !isLoading}
            >
              {isLoading ? (
                <StopIcon className="h-5 w-5" />
              ) : (
                <PaperAirplaneIcon className="h-5 w-5" />
              )}
            </button>
          </div>
          <button
            type="button"
            disabled={isLoading || transcribing}
            className={`flex items-center justify-center p-2 rounded-lg p-1 text-white ${
              recording
                ? "bg-red-600 hover:bg-red-700"
                : "bg-gray-900 hover:bg-gray-800"
            }`}
            onMouseDown={() => !recording && startRecording()}
            onMouseUp={() => recording && stopRecordingAndTranscribe()}
            onMouseLeave={() => recording && stopRecordingAndTranscribe()}
            onTouchStart={(e) => {
              e.preventDefault();
              startRecording();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              stopRecordingAndTranscribe();
            }}
            onKeyDown={(e) => {
              const trigger = e.key === "Enter" || e.key === " ";
              if (trigger && !e.repeat && !recording) {
                e.preventDefault();
                startRecording();
              }
            }}
            onKeyUp={(e) => {
              const trigger = e.key === "Enter" || e.key === " ";
              if (trigger && recording) {
                e.preventDefault();
                stopRecordingAndTranscribe();
              }
            }}
          >
            <MicrophoneIcon className="h-5 w-6 hover:cursor-pointer" />
          </button>
        </div>
      </form>
    </section>
  );
}
