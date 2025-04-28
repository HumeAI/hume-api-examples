import { NextRequest, NextResponse } from "next/server";
import type { ReturnVoice, VoiceProvider } from "hume/api/resources/tts";
import { humeClient } from "@/lib/humeClient";

export async function GET(req: NextRequest) {
  const provider = (req.nextUrl.searchParams.get("provider") ??
    "HUME_AI") as VoiceProvider;

  const response = await humeClient.tts.voices.list({
    pageNumber: 0,
    pageSize: 100,
    provider,
  });

  const voices: ReturnVoice[] = [];
  for await (const v of response) voices.push(v);

  return NextResponse.json({ voices });
}
