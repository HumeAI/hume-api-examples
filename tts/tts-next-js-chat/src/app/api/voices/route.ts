import { NextRequest, NextResponse } from "next/server";
import { humeClient } from "@/lib/humeClient";

const VOICE_PROVIDERS = ["HUME_AI", "CUSTOM_VOICE"] as const;
type VoiceProvider = (typeof VOICE_PROVIDERS)[number];

function toVoiceProvider(value: string | null): VoiceProvider {
  const p = value ?? "HUME_AI";
  return VOICE_PROVIDERS.includes(p as VoiceProvider) ? (p as VoiceProvider) : "HUME_AI";
}

export async function GET(req: NextRequest) {
  const provider = toVoiceProvider(req.nextUrl.searchParams.get("provider"));
  const response = await humeClient.tts.voices.list({
    pageNumber: 0,
    pageSize: 100,
    provider,
  });
  const voices: any[] = [];
  for await (const v of response) voices.push(v);
  return NextResponse.json({ voices });
}
