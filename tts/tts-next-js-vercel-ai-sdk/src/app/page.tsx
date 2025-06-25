"use client";

import { useState, useTransition } from "react";
import { tts } from "@/actions/generate-speech";
import { useVoices } from "@/hooks/useVoices";
import { AudioGallery } from "@/components/AudioGallery";
import { TtsForm } from "@/components/TtsForm";
import HumeLogo from "@/components/logos/Hume";
import { Clip } from "@/types/clip";

const DEFAULT_VOICE_ID = "9e068547-5ba4-4c8e-8e03-69282a008f04"; // Male English Actor

export default function Page() {
  const { voices, selectedVoiceId, setSelectedVoiceId } = useVoices(DEFAULT_VOICE_ID);
  const [clips, setClips] = useState<Clip[]>([]);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="relative">
      {isPending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-16 h-16 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
        </div>
      )}

      <div className="max-w-full mx-auto px-6 py-20">
        <HumeLogo className={"absolute left-6 top-6 h-6 w-auto fill-black"} />

        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          <div className="md:col-span-3">
            <TtsForm
              voices={voices}
              selectedVoiceId={selectedVoiceId}
              onVoiceChange={setSelectedVoiceId}
              onGenerate={async (formData) => {
                startTransition(async () => {
                  const { base64, mimeType, text, instructions, voice } = await tts(formData);

                  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
                  const url = URL.createObjectURL(new Blob([bytes], { type: mimeType }));

                  setClips((prev) => [{ voice, instructions, text, url }, ...prev]);
                });
              }}
              loading={isPending}
            />
          </div>
          <div className="md:col-span-2 max-h-[calc(100vh-8rem)] overflow-y-auto space-y-4">
            <AudioGallery clips={clips} voices={voices} />
          </div>
        </div>
      </div>
    </div>
  );
}
