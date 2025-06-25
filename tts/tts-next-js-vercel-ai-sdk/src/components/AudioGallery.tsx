"use client";

import React from "react";
import type { ReturnVoice } from "hume/api/resources/tts";
import { AudioClipCard } from "./AudioClipCard";

interface Clip {
  voice: string;
  description: string;
  text: string;
  url: string;
}

interface AudioGalleryProps {
  clips: Clip[];
  voices: ReturnVoice[];
}

export function AudioGallery({ clips, voices }: AudioGalleryProps) {
  return (
    <div className="md:col-span-2 max-h-[calc(100vh-8rem)] overflow-y-auto space-y-4">
      {clips.map((clip, idx) => {
        const voiceName = voices.find((v) => v.id === clip.voice)?.name ?? clip.voice;
        return (
          <AudioClipCard
            key={idx}
            voiceName={voiceName}
            text={clip.text}
            description={clip.description}
            url={clip.url}
          />
        );
      })}
    </div>
  );
}
