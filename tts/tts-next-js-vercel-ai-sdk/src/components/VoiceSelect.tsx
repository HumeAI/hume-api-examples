"use client";

import React from "react";
import type { Hume } from "hume";

interface VoiceSelectProps {
  voices: Hume.tts.ReturnVoice[];
  selectedVoiceId: string;
  onChange: (newId: string) => void;
}

export function VoiceSelect({ voices, selectedVoiceId, onChange }: VoiceSelectProps) {
  return (
    <div className="space-y-1">
      <label htmlFor="voice" className="block text-md font-medium text-gray-800 mb-2">
        Voice Library
      </label>
      <select
        id="voice"
        name="voice"
        value={selectedVoiceId}
        onChange={(e) => onChange(e.currentTarget.value)}
        className="mt-1 block w-full p-2 text-gray-900 cursor-pointer border focus:outline-none focus:ring-2 focus:ring-gray-600 rounded-md border-r-16 border-transparent shadow-sm"
      >
        {voices.map(({ id, name }) => (
          <option key={id} value={id}>
            {name}
          </option>
        ))}
      </select>
    </div>
  );
}
