"use client";
import Chat from "@/components/Chat";
import ControlsPanel from "@/components/ControlsPanel";
import HumeLogo from "@/components/logos/Hume";
import { VoiceSettingsProvider } from "@/context/VoiceSettingsContext";

export default function Home() {
  return (
    <>
      <HumeLogo className={"absolute left-6 top-6 h-6 w-auto fill-black"} />
      <div className="min-h-screen w-full bg-neutral-100 flex items-center justify-center px-4 py-20">
        <VoiceSettingsProvider>
          <div className="flex h-[80vh] w-full max-w-screen-xl bg-white rounded-3xl shadow-xl overflow-hidden">
            <Chat />
            <ControlsPanel />
          </div>
        </VoiceSettingsProvider>
      </div>
    </>
  );
}
