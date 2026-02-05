import { useState, useEffect, useRef } from "react";
import type { ReturnVoice, VoiceProvider } from "hume/api/resources/tts";

export function useVoices(provider: VoiceProvider) {
  const [voices, setVoices] = useState<ReturnVoice[]>([]);
  const initialPickDone = useRef(false);

  useEffect(() => {
    let canceled = false;

    async function fetchVoices() {
      try {
        const res = await fetch(`/api/voices?provider=${provider}`);
        const { voices: list } = (await res.json()) as {
          voices: ReturnVoice[];
        };
        if (canceled) return;
        setVoices(list);
      } catch (e) {
        console.error("voice fetch failed", e);
        if (!canceled) setVoices([]);
      }
    }

    fetchVoices();
    return () => {
      canceled = true;
    };
  }, [provider]);

  function pickInitial(
    currentVoice: ReturnVoice | null,
    setVoice: (v: ReturnVoice | null) => void
  ) {
    if (initialPickDone.current || voices.length === 0 || currentVoice) return;
    const rand = voices[Math.floor(Math.random() * voices.length)];
    setVoice(rand);
    initialPickDone.current = true;
  }

  return { voices, pickInitial };
}
