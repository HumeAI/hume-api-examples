"use server";

import { HumeClient } from "hume";
import { VoiceProvider, type ReturnVoice } from "hume/api/resources/tts";

const hume = new HumeClient({
  apiKey: process.env.HUME_API_KEY!,
});

export async function listVoices(): Promise<ReturnVoice[]> {
  const response = await hume.tts.voices.list({
    pageNumber: 0,
    pageSize: 100,
    provider: VoiceProvider.HumeAi,
  });

  const voices: ReturnVoice[] = [];
  for await (const v of response) voices.push(v);

  return voices;
}
