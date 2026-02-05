"use client";
import type { ReturnVoice } from "hume/api/resources/tts";

interface Props {
  voices: ReturnVoice[];
  selectedVoice: ReturnVoice | null;
  onSelect(v: ReturnVoice): void;
}

export default function VoiceSelector({
  voices,
  selectedVoice,
  onSelect,
}: Props) {
  if (!voices.length) {
    return (
      <p className="px-3 py-1 text-sm space-y-1 text-gray-500">No voices</p>
    );
  }

  return (
    <ul className="max-h-48 overflow-y-auto space-y-1 text-sm">
      {voices.map((v) => (
        <li key={v.id}>
          <button
            onClick={() => onSelect(v)}
            className={`w-full text-left px-3 py-1 rounded-md hover:bg-gray-100 ${
              selectedVoice?.id === v.id ? "bg-gray-200" : ""
            }`}
          >
            {v.name}
          </button>
        </li>
      ))}
    </ul>
  );
}
