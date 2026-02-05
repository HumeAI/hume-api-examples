"use server";

import { experimental_generateSpeech as generateSpeech } from "ai";
import { createHume } from "@ai-sdk/hume";

const hume = createHume({
  apiKey: process.env.HUME_API_KEY!
});

export async function tts(formData: FormData): Promise<{
  voice: string;
  text: string;
  instructions: string;
  uint8Array: Uint8Array;
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

  if (!result.audio?.uint8Array || result.audio.uint8Array.length === 0) {
    throw new Error("No audio returned");
  }

  const { uint8Array, mediaType } = result.audio;
  return {
    voice,
    text,
    instructions,
    uint8Array,
    mimeType: mediaType,
  };
}
