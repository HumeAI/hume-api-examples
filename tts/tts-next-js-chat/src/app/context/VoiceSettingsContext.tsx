"use client";
import { createContext, useContext, useState, ReactNode } from "react";

const Ctx = createContext<{
  instant: boolean;
  setInstant: (v: boolean) => void;
  voice: any;
  setVoice: (v: any) => void;
  voiceProvider: string;
  setVoiceProvider: (p: string) => void;
} | null>(null);

export function VoiceSettingsProvider({ children }: { children: ReactNode }) {
  const [instant, setInstant] = useState(true);
  const [voice, setVoice] = useState<any>(null);
  const [voiceProvider, setVoiceProvider] = useState("HUME_AI");
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
