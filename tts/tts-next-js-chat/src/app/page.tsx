"use client";
import Chat from "@/components/Chat";
import ControlsPanel from "@/components/ControlsPanel";

export default function Home() {
  return (
    <div className="min-h-screen w-full bg-neutral-200 flex items-center justify-center px-4 py-20">
      <div className="flex h-[80vh] w-full max-w-screen-xl bg-white rounded-3xl shadow-xl overflow-hidden">
        <Chat />
        <ControlsPanel />
      </div>
    </div>
  );
}
