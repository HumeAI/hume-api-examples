"use server";

import { experimental_generateSpeech as generateSpeech } from "ai";
import { createHume } from "@ai-sdk/hume";

const hume = createHume({
  headers: {
    "X-Hume-API-Key": process.env.HUME_API_KEY!,
  },
});

export async function tts(formData: FormData): Promise<{
  voice: string;
  text: string;
  instructions: string;
  base64: string;
  mimeType: string;
}> {
  const voice = formData.get("voice")?.toString() ?? "";
  const text = formData.get("text")?.toString() ?? "";
  const instructions = formData.get("instructions")?.toString() ?? "";

  const result = await generateSpeech({
    model: hume.speech(),
    text,
    voice,
    instructions,
  });

  if (!result.audio?.base64) {
    throw new Error("No audio returned");
  }

  const { base64, mimeType } = result.audio;
  return {
    voice,
    text,
    instructions,
    base64,
    mimeType,
  };
}
