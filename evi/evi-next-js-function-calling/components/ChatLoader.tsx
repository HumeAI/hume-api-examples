"use client";

import dynamic from "next/dynamic";

const Chat = dynamic(() => import("@/components/Chat"), {
  ssr: false,
});

export default function ChatLoader({ accessToken }: { accessToken: string }) {
  return <Chat accessToken={accessToken} />;
}
