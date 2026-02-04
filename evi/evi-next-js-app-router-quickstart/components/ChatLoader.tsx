"use client";

import dynamic from "next/dynamic";
import type { Hume } from "hume";

const Chat = dynamic(() => import("@/components/Chat"), {
  ssr: false,
});

type ChatLoaderProps = (
  | { accessToken: string; apiKey?: never }
  | { apiKey: string; accessToken?: never }
) & {
  sessionSettings?: Hume.empathicVoice.SessionSettings;
};

export default function ChatLoader({
  accessToken,
  apiKey,
  sessionSettings,
}: ChatLoaderProps) {
  return (
    <Chat
      {...(apiKey != null ? { apiKey } : { accessToken: accessToken! })}
      sessionSettings={sessionSettings}
    />
  );
}
