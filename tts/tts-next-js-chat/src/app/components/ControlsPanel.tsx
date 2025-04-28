"use client";
import { useEffect, useState, useRef } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/20/solid";
import VoiceSelector from "@/components/VoiceSelector";
import { useVoiceSettings } from "@/context/VoiceSettingsContext";
import { useVoices } from "@/hooks/useVoices";

export default function ControlsPanel() {
  const {
    instant,
    setInstant,
    voice,
    setVoice,
    voiceProvider,
    setVoiceProvider,
  } = useVoiceSettings();

  const { voices, pickInitial } = useVoices(voiceProvider);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Once voices load the first time, select an initial, random voice
  useEffect(() => {
    pickInitial(voice, setVoice);
  }, [voices, voice, pickInitial, setVoice]);

  // Close dropdown on outside click
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!inputRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const filteredVoices = voices.filter((v) =>
    v.name?.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <aside className="flex-shrink-0 basis-64 sm:basis-72 md:basis-80 lg:basis-96 bg-white p-6 md:p-8 border-l border-gray-200 shadow-sm rounded-r-2xl flex flex-col gap-6 text-gray-900">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        Voice
      </h3>

      {voice ? (
        <div className="flex items-center justify-between text-md font-semibold text-gray-900">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
            {voice.name}
          </div>
          <button
            onClick={() => setVoice(null)}
            className="text-gray-400 hover:cursor-pointer hover:text-gray-600"
            aria-label="Clear voice"
          >
            ✕
          </button>
        </div>
      ) : (
        <div className="text-md text-gray-500 italic">No voice selected</div>
      )}

      <div className="flex items-center gap-3">
        {(["HUME_AI", "CUSTOM_VOICE"] as const).map((opt) => (
          <button
            key={opt}
            onClick={() => {
              setVoiceProvider(opt);
              setQuery("");
            }}
            className={`font-semibold px-3 py-2 rounded-md text-sm hover:cursor-pointer ${
              voiceProvider === opt
                ? "bg-gray-900 hover:bg-gray-700 text-white"
                : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            {opt === "HUME_AI" ? "Voice Library" : "My Voices"}
          </button>
        ))}
      </div>

      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          ref={inputRef}
          onFocus={() => {
            setOpen(true);
          }}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search voices…"
          className="w-full rounded-xl border border-gray-300 bg-gray-50 pl-9 pr-3 py-3 text-sm"
        />
        {open && (
          <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
            <VoiceSelector
              voices={filteredVoices}
              selectedVoice={voice}
              onSelect={(v) => {
                setVoice(v);
                setOpen(false);
                setQuery("");
              }}
            />
          </div>
        )}
      </div>

      <hr className="border-gray-200" />

      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        Request
      </h3>

      <div>
        <label className="flex items-center gap-3 text-sm">
          <span className="flex-1 font-semibold">Instant Mode</span>
          <button
            type="button"
            onClick={() => setInstant(!instant)}
            className={`h-5 w-10 rounded-full transition-colors duration-200 hover:cursor-pointer ${
              instant ? "bg-black" : "bg-gray-300"
            }`}
          >
            <span
              className={`block h-5 w-5 rounded-full bg-white transform transition-transform duration-200 ${
                instant ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </label>
        <a
          href="https://dev.hume.ai/docs/text-to-speech-tts/overview#ultra-low-latency-streaming-instant-mode"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:underline"
        >
          What is instant mode?
        </a>
      </div>
    </aside>
  );
}
