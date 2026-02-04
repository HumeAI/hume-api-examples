"use server";

import { HumeClient } from "hume";

const hume = new HumeClient({
  apiKey: process.env.HUME_API_KEY!,
});

export async function setLlmKeyForChat(chatId: string) {
  const languageModelApiKey = process.env.SUPPLEMENTAL_LLM_API_KEY;
  if (!languageModelApiKey) return;

  await hume.empathicVoice.controlPlane.send(chatId, {
    type: "session_settings",
    languageModelApiKey,
  });
}
