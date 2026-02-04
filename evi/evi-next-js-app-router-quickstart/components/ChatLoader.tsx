"use client";

import dynamic from "next/dynamic";

const Chat = dynamic(() => import("@/components/Chat"), {
  ssr: false,
});

type ChatLoaderProps =
  | { accessToken: string; apiKey?: never }
  | { apiKey: string; accessToken?: never };

export default function ChatLoader({ accessToken, apiKey }: ChatLoaderProps) {
  return (
    <Chat
      {...(apiKey != null ? { apiKey } : { accessToken: accessToken! })}
    />
  );
}
