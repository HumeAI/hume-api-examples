import { NextRequest, NextResponse } from "next/server";
import { humeClient } from "@/lib/humeClient";
import type { Stream } from "hume/core";
import type {
  PostedUtterance,
  SnippetAudioChunk,
  VoiceProvider,
} from "hume/api/resources/tts";

export async function POST(req: NextRequest) {
  const { text, voiceName, voiceProvider, instant } = (await req.json()) as {
    text: string;
    voiceName: string;
    voiceProvider: VoiceProvider;
    instant: boolean;
  };

  if (!text || text.trim() === "") {
    return NextResponse.json(
      { error: "Missing or invalid text" },
      { status: 400 }
    );
  }

  if (typeof instant !== "boolean") {
    return NextResponse.json(
      { error: "Must specify whether to use instant mode" },
      { status: 400 }
    );
  }

  if (!voiceName && instant) {
    return NextResponse.json(
      { error: "If using instant mode, a voice must be specified" },
      { status: 400 }
    );
  }

  let upstreamHumeStream: Stream<SnippetAudioChunk>;

  try {
    console.log(
      `[HUME_TTS_PROXY] Requesting TTS stream for voice: ${voiceName}, instant: ${instant}`
    );
    const utterances: PostedUtterance[] = voiceName
      ? [{ text, voice: { name: voiceName, provider: voiceProvider } }]
      : [{ text }];

    upstreamHumeStream = await humeClient.tts.synthesizeJsonStreaming({
      utterances: utterances,
      stripHeaders: true,
      instantMode: instant,
    });
    console.log("[HUME_TTS_PROXY] Successfully initiated Hume stream.");
  } catch (error: any) {
    console.error("[HUME_TTS_PROXY] Hume API call failed:", error);
    const errorMessage = error?.message || "Failed to initiate TTS stream";
    const errorDetails = error?.error?.message || error?.error || errorMessage;
    return NextResponse.json(
      { error: "Hume API Error", details: errorDetails },
      { status: 502 }
    );
  }

  const encoder = new TextEncoder();
  const readableStream = new ReadableStream({
    async start(controller) {
      console.log("[HUME_TTS_PROXY] Client connected, forwarding stream...");

      for await (const chunk of upstreamHumeStream) {
        const jsonString = JSON.stringify(chunk);
        const ndjsonLine = jsonString + "\n";
        const chunkBytes = encoder.encode(ndjsonLine);
        controller.enqueue(chunkBytes);
      }
      console.log("[HUME_TTS_PROXY] Upstream Hume stream finished.");
      controller.close();
    },
    cancel(reason) {
      console.log(
        "[HUME_TTS_PROXY] Client disconnected, cancelling upstream Hume stream.",
        reason
      );
      if (typeof (upstreamHumeStream as any)?.abort === "function") {
        (upstreamHumeStream as any).abort();
        console.log("[HUME_TTS_PROXY] Upstream Hume stream abort() called.");
      } else {
        console.warn(
          "[HUME_TTS_PROXY] Upstream stream object does not expose an abort() method directly. Cancellation might rely on AbortSignal propagation."
        );
      }
    },
  });

  return new NextResponse(readableStream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
