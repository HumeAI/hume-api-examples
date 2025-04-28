"use client";
import { useEffect, useRef } from "react";

export default function AudioPlayer({ chunks }: { chunks: Uint8Array[] }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const sourceBufferRef = useRef<SourceBuffer | null>(null);
  const playInitiatedRef = useRef<boolean>(false);
  const mediaSourceRef = useRef<MediaSource | null>(null);
  const isLastChunkAppendedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!audioRef.current || chunks.length === 0) return;

    if (!sourceBufferRef.current) {
      const ms = new MediaSource();
      mediaSourceRef.current = ms;
      audioRef.current.src = URL.createObjectURL(ms);
      playInitiatedRef.current = false;
      isLastChunkAppendedRef.current = false;

      ms.addEventListener(
        "sourceopen",
        () => {
          sourceBufferRef.current = ms.addSourceBuffer("audio/mpeg");
          sourceBufferRef.current.addEventListener(
            "updateend",
            handleUpdateEnd
          );
          append();
        },
        { once: true }
      );
    } else {
      append();
    }

    function append() {
      const sourceBuffer = sourceBufferRef.current;
      const currentAudio = audioRef.current;

      if (
        !sourceBuffer ||
        !currentAudio ||
        sourceBuffer.updating ||
        chunks.length === 0
      ) {
        return;
      }

      const chunkData = chunks.shift()!;
      const isLast = chunks.length === 0;

      sourceBuffer.appendBuffer(chunkData);

      if (isLast) {
        isLastChunkAppendedRef.current = true;
      }

      if (!playInitiatedRef.current) {
        currentAudio.play().catch(() => {});
        playInitiatedRef.current = true;
      }
    }

    function handleUpdateEnd() {
      const sourceBuffer = sourceBufferRef.current;
      const mediaSrc = mediaSourceRef.current;

      const bufferNotUpdating = !!sourceBuffer && !sourceBuffer.updating;
      const mediaSourceOpen = !!mediaSrc && mediaSrc.readyState === "open";
      const noMoreAudio = isLastChunkAppendedRef.current === true;

      const endOfStream = noMoreAudio && bufferNotUpdating && mediaSourceOpen;

      endOfStream ? mediaSrc.endOfStream() : append();
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
