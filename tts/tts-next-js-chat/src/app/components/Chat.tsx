"use client";
import React, { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import {
  MicrophoneIcon,
  PaperAirplaneIcon,
  StopIcon,
} from "@heroicons/react/24/solid";
import type { SnippetAudioChunk } from "hume/api/resources/tts";
import AudioPlayer from "@/components/AudioPlayer";
import { useVoiceSettings } from "@/context/VoiceSettingsContext";

type AudioChunks = Record<string, Uint8Array[]>;

export default function Chat() {
  const { instant, voice, voiceProvider } = useVoiceSettings();
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
    onFinish: async (msg) => {
      if (msg.role !== "assistant" || !msg.content) return;

      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: msg.content,
          voiceName: voice?.name || null,
          voiceProvider,
          instant,
        }),
      });

      if (!res.ok || !res.body) {
        console.error("TTS fetch failed:", res.status, await res.text());
        return;
      }

      let buffer = "";
      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop()!;

        for (const line of lines) {
          if (!line.trim()) continue;
          const chunk: SnippetAudioChunk = JSON.parse(line);

          if (chunk?.audio.length) {
            const b64 = chunk.audio;

            const bin = atob(b64);
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

            setAudioChunks((prev) => {
              const existing = prev[msg.id] ?? [];
              if (bytes.length === 0) return prev;
              return { ...prev, [msg.id]: [...existing, bytes] };
            });
          }
        }
      }
    },
  });

  const [audioChunks, setAudioChunks] = useState<AudioChunks>({});
  const [hasOverflow, setHasOverflow] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);

  const audioPartsRef = useRef<BlobPart[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const micButtonRef = useRef<HTMLButtonElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    micButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function checkOverflow() {
      setHasOverflow(el!.scrollHeight > el!.clientHeight);
    }
    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [messages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function onScroll() {
      setHasScrolled(el!.scrollTop > 0);
    }
    el.addEventListener("scroll", onScroll);
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      recorderRef.current = recorder;
      audioPartsRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioPartsRef.current.push(e.data);
        }
      };
      recorder.start();

      setRecording(true);
    } catch (err) {
      console.error("Could not start recording:", err);
    }
  }

  async function stopRecordingAndTranscribe() {
    const recorder = recorderRef.current;
    if (!recorder) return;

    recorder.stop();
    setRecording(false);
    setTranscribing(true);

    recorder.onstop = async () => {
      try {
        const blob = new Blob(audioPartsRef.current, {
          type: recorder.mimeType,
        });
        const arrayBuffer = await blob.arrayBuffer();

        const res = await fetch("/api/transcribe", {
          method: "POST",
          body: arrayBuffer,
        });
        if (!res.ok) {
          console.error("Transcription failed:", res.statusText);
          return;
        }
        const { text } = await res.json();
        append({ role: "user", content: text });
      } catch (err) {
        console.error("Transcription error:", err);
      } finally {
        setTranscribing(false);
      }
    };
  }

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
              <AudioPlayer chunks={audioChunks[m.id]!} />
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
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-white bg-gray-900 disabled:opacity-30 hover:cursor-pointer disabled:cursor-default"
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
            ref={micButtonRef}
            type="button"
            disabled={isLoading || transcribing}
            className={`flex items-center justify-center p-2 rounded-lg p-1 text-white ${
              recording
                ? "bg-red-600 hover:bg-red-700"
                : "bg-gray-900 hover:bg-gray-800"
            }`}
            onMouseDown={() => {
              if (!recording) startRecording();
            }}
            onMouseUp={() => {
              if (recording) stopRecordingAndTranscribe();
            }}
            onMouseLeave={() => {
              if (recording) stopRecordingAndTranscribe();
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              if (!recording) startRecording();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              if (recording) stopRecordingAndTranscribe();
            }}
            onTouchCancel={(e) => {
              e.preventDefault();
              if (recording) stopRecordingAndTranscribe();
            }}
            onKeyDown={(e) => {
              const isTrigger = e.key === "Enter" || e.key === " ";
              if (isTrigger && !e.repeat && !recording) {
                e.preventDefault();
                startRecording();
              }
            }}
            onKeyUp={(e) => {
              const isTrigger = e.key === "Enter" || e.key === " ";
              if (isTrigger && recording) {
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
