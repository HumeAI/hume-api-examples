import { useState, useEffect } from "react";
import { listVoices } from "@/actions/list-voices";
import type { Hume } from "hume";

export function useVoices(defaultId: string) {
  const [voices, setVoices] = useState<Hume.tts.ReturnVoice[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(defaultId);

  useEffect(() => {
    let active = true;
    listVoices()
      .then((list) => {
        if (!active) return;

        list.sort((a, b) => a.name!.localeCompare(b.name!));
        setVoices(list);

        const found = list.find((v) => v.id === defaultId);
        setSelectedVoiceId(found?.id ?? list[0]?.id!);
      })
      .catch((err) => {
        console.error("Failed to load voices", err);
      });
    return () => {
      active = false;
    };
  }, [defaultId]);

  return { voices, selectedVoiceId, setSelectedVoiceId };
}
