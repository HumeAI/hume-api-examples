"use server";

import { experimental_generateSpeech } from "ai";
import { createHume } from "@ai-sdk/hume";

const hume = createHume({
  headers: {
    "X-Hume-API-Key": process.env.HUME_API_KEY!,
  },
});

export async function generateSpeech(formData: FormData): Promise<{
  voice: string;
  text: string;
  description: string;
  base64: string;
  mimeType: string;
}> {
  const voice = formData.get("voice")?.toString() ?? "";
  const text = formData.get("text")?.toString() ?? "";
  const description = formData.get("description")?.toString() ?? "";

  const providerOptions = {
    hume: {
      description,
    },
  };

  const result = await experimental_generateSpeech({
    model: hume.speech(),
    text,
    voice,
    providerOptions,
  });

  if (!result.audio?.base64) {
    throw new Error("No audio returned");
  }

  const { base64, mimeType } = result.audio;
  return {
    voice,
    text,
    description,
    base64,
    mimeType,
  };
}
