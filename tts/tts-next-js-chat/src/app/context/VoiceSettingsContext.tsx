"use client";
import { createContext, useContext, useState, ReactNode } from "react";
import type { ReturnVoice, VoiceProvider } from "hume/api/resources/tts";

interface VoiceSettings {
  instant: boolean;
  setInstant(v: boolean): void;
  voice: ReturnVoice | null;
  setVoice(v: ReturnVoice | null): void;
  voiceProvider: VoiceProvider;
  setVoiceProvider(p: VoiceProvider): void;
}
const Ctx = createContext<VoiceSettings | null>(null);

export function VoiceSettingsProvider({ children }: { children: ReactNode }) {
  const [instant, setInstant] = useState(true);
  const [voice, setVoice] = useState<ReturnVoice | null>(null);
  const [voiceProvider, setVoiceProvider] = useState<VoiceProvider>("HUME_AI");
  return (
    <Ctx.Provider
      value={{
        instant,
        setInstant,
        voice,
        setVoice,
        voiceProvider,
        setVoiceProvider,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useVoiceSettings() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("VoiceSettingsProvider missing");
  return ctx;
}
