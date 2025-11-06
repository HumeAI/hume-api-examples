'use server';

import { HumeClient } from 'hume';

const hume = new HumeClient({
  apiKey: process.env.HUME_API_KEY!,
});

/**
 * Securely set the supplemental LLM API key for an active chat.
 * Call once after you get ChatMetadata with the chat_id.
 */
export async function setLlmKeyForChat(chatId: string) {
  const languageModelApiKey = process.env.SUPPLEMENTAL_LLM_API_KEY!;

  // Only use supplemental LLM API key if provided
  if (!languageModelApiKey) return;

  const message = {
    type: 'session_settings' as const,
    languageModelApiKey,
  };

  await hume.empathicVoice.controlPlane.send(chatId, message);
  console.log("Supplemental API Key is set!")
}