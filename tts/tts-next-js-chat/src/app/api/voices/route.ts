import { NextRequest, NextResponse } from "next/server";
import { HumeClient } from "hume";
import type { ReturnVoice, VoiceProvider } from "hume/api/resources/tts";

const client = new HumeClient({ apiKey: process.env.HUME_API_KEY! });

export async function GET(req: NextRequest) {
  const provider = (req.nextUrl.searchParams.get("provider") ??
    "HUME_AI") as VoiceProvider;

  const response = await client.tts.voices.list({
    pageNumber: 0,
    pageSize: 100,
    provider,
  });

  const voices: ReturnVoice[] = [];
  for await (const v of response) voices.push(v);

  return NextResponse.json({ voices });
}
