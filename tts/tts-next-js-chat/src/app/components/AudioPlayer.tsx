"use client";
import { useEffect, useRef } from "react";

export default function AudioPlayer({ chunks }: { chunks: Uint8Array[] }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const sbRef = useRef<SourceBuffer | null>(null);
  const playInitiatedRef = useRef<boolean>(false);
  const mediaSourceRef = useRef<MediaSource | null>(null);
  const isLastChunkAppendedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!audioRef.current || chunks.length === 0) return;

    if (!sbRef.current) {
      const ms = new MediaSource();
      mediaSourceRef.current = ms;
      audioRef.current.src = URL.createObjectURL(ms);
      playInitiatedRef.current = false;
      isLastChunkAppendedRef.current = false;

      ms.addEventListener(
        "sourceopen",
        () => {
          sbRef.current = ms.addSourceBuffer("audio/mpeg");
          sbRef.current.addEventListener("updateend", handleUpdateEnd);
          append();
        },
        { once: true }
      );
    } else {
      append();
    }

    function append() {
      const sb = sbRef.current;
      const currentAudio = audioRef.current;
      if (!sb || !currentAudio || sb.updating || chunks.length === 0) return;

      const chunkData = chunks.shift()!;
      const isLast = chunks.length === 0;

      sb.appendBuffer(chunkData);

      if (isLast) {
        isLastChunkAppendedRef.current = true;
      }

      if (!playInitiatedRef.current) {
        currentAudio.play().catch(() => {});
        playInitiatedRef.current = true;
      }
    }

    function handleUpdateEnd() {
      const sb = sbRef.current;
      const ms = mediaSourceRef.current;

      if (
        isLastChunkAppendedRef.current &&
        sb &&
        !sb.updating &&
        ms &&
        ms.readyState === "open"
      ) {
        ms.endOfStream();
      } else {
        append();
      }
    }
  }, [chunks]);

  return (
    <audio
      ref={audioRef}
      controls
      className="w-full max-w-md rounded-4xl shadow-md"
    />
  );
}
