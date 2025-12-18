"use client";

import React from "react";
import type { ReturnVoice } from "hume/api/resources/tts";
import { AudioClipCard } from "@/components/AudioClipCard";
import type { Clip } from "@/types/clip";

interface AudioGalleryProps {
  clips: Clip[];
  voices: ReturnVoice[];
}

export function AudioGallery({ clips, voices }: AudioGalleryProps) {
  return (
    <div className="md:col-span-2 max-h-[calc(100vh-8rem)] overflow-y-auto space-y-4">
      {clips.map(({ voice, text, instructions, url }, idx) => {
        const voiceName = voices.find((v) => v.id === voice)?.name!;
        return (
          <AudioClipCard
            key={idx}
            voiceName={voiceName}
            text={text}
            instructions={instructions}
            url={url}
          />
        );
      })}
    </div>
  );
}
