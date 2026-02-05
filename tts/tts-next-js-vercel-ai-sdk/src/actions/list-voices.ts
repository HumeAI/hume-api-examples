"use server";

import { HumeClient, Hume } from "hume";

const hume = new HumeClient({
  apiKey: process.env.HUME_API_KEY!,
});

export async function listVoices(): Promise<Hume.tts.ReturnVoice[]> {
  const response = await hume.tts.voices.list({
    pageNumber: 0,
    pageSize: 100,
    provider: Hume.tts.VoiceProvider.HumeAi,
  });

  const voices: Hume.tts.ReturnVoice[] = [];
  for await (const v of response) voices.push(v);

  return voices;
}
