"use client";

import React, { FormEvent } from "react";
import type { ReturnVoice } from "hume/api/resources/tts";
import { TextAreaField } from "@/components/TextAreaField";
import { VoiceSelect } from "@/components/VoiceSelect";

interface TtsFormProps {
  voices: ReturnVoice[];
  selectedVoiceId: string;
  onVoiceChange: (id: string) => void;
  onGenerate: (formData: FormData) => Promise<void>;
  loading: boolean;
}

export function TtsForm({
  voices,
  selectedVoiceId,
  onVoiceChange,
  onGenerate,
  loading,
}: TtsFormProps) {
  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("voice", selectedVoiceId);
    await onGenerate(formData);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 bg-white p-6 rounded-lg shadow-lg md:col-span-3"
    >
      <VoiceSelect
        voices={voices.map(({ id, name }) => ({ id, name }))}
        selectedVoiceId={selectedVoiceId}
        onChange={onVoiceChange}
      />
      <TextAreaField
        id="text"
        name="text"
        label="Text"
        maxLength={1500}
        placeholder="Enter text to synthesize..."
        required
        rows={4}
      />
      <TextAreaField
        id="instructions"
        name="instructions"
        label="Acting Instructions"
        maxLength={1000}
        placeholder="Provide acting instructions to guide performance..."
        rows={4}
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full flex justify-center py-2 px-4 bg-gray-900 text-white font-semibold cursor-pointer rounded-md shadow focus:outline-none hover:bg-gray-700 disabled:opacity-50"
      >
        {loading ? "Generating…" : "Generate"}
      </button>
    </form>
  );
}
