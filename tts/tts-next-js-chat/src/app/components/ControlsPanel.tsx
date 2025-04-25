"use client";
import { useEffect, useState, useRef } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/20/solid";
import VoiceSelector from "@/components/VoiceSelector";
import type { ReturnVoice, VoiceProvider } from "hume/api/resources/tts";

export default function ControlsPanel() {
  const [source, setSource] = useState<VoiceProvider>("HUME_AI");
  const [voices, setVoices] = useState<ReturnVoice[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ReturnVoice | null>(null);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function fetchVoices() {
    try {
      const res = await fetch(`/api/voices?provider=${source}`);
      const data = (await res.json()) as { voices: ReturnVoice[] };
      setVoices(data.voices);
    } catch (e) {
      console.error("voice fetch failed", e);
      setVoices([]);
    }
  }

  useEffect(() => {
    fetchVoices();
  }, [source]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!inputRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const filtered = voices.filter((v) =>
    v.name?.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <aside className="flex-shrink-0 basis-64 sm:basis-72 md:basis-80 lg:basis-96 bg-white p-6 md:p-8 border-l border-gray-200 shadow-sm rounded-r-2xl flex flex-col gap-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        Voice
      </h3>

      {selected ? (
        <div className="flex items-center gap-2 text-md font-semibold text-gray-900">
          <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
          {selected.name}
        </div>
      ) : (
        <div className="text-md text-gray-500 italic">No voice selected</div>
      )}

      <div className="flex items-center gap-3">
        {(["HUME_AI", "CUSTOM_VOICE"] as const).map((opt) => (
          <button
            key={opt}
            onClick={() => {
              setSource(opt);
              setQuery("");
            }}
            className={`px-3 py-1 rounded-md text-sm ${source === opt ? "bg-black text-white" : "bg-gray-200"}`}
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
            if (!voices.length) fetchVoices();
          }}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search voices…"
          className="w-full rounded-md border border-gray-300 bg-gray-50 pl-9 pr-3 py-2 text-sm"
        />
        {open && (
          <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
            <VoiceSelector
              voices={filtered}
              selected={selected}
              onSelect={(v) => {
                setSelected(v);
                setOpen(false);
              }}
            />
          </div>
        )}
      </div>

      <hr className="border-gray-200" />

      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        Request
      </h3>
    </aside>
  );
}
