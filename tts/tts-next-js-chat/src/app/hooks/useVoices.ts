import { useState, useEffect, useRef } from 'react';

export function useVoices(provider: string) {
  const [voices, setVoices] = useState<any[]>([]);
  const initialPickDone = useRef(false);

  useEffect(() => {
    let canceled = false;
    fetch(`/api/voices?provider=${provider}`)
      .then((res) => res.json())
      .then((data) => {
        if (!canceled) setVoices(data.voices ?? []);
      })
      .catch(() => {
        if (!canceled) setVoices([]);
      });
    return () => {
      canceled = true;
    };
  }, [provider]);

  function pickInitial(currentVoice: any, setVoice: (v: any) => void) {
    if (initialPickDone.current || voices.length === 0 || currentVoice) return;
    const rand = voices[Math.floor(Math.random() * voices.length)];
    setVoice(rand);
    initialPickDone.current = true;
  }

  return { voices, pickInitial };
}
