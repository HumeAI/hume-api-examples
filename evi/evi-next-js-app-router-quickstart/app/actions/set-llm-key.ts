'use server';

import { HumeClient } from 'hume';

const hume = new HumeClient({
  apiKey: process.env.HUME_API_KEY!,
});

/**
 * Securely set the supplemental LLM API key for an active chat.
 * Call once after you get ChatMetadata with the chat_id.
 */
export async function setLlmKeyForChat(opts: {
  chatId: string;
}) {

  const { chatId } = opts;
  const providerApiKey = process.env.SUPPLEMENTAL_LLM_API_KEY!;

  // Only use supplemental LLM API key if provided
  if (!providerApiKey) return;

  const message = {
    type: 'session_settings' as const,
    session_settings: {
      language_model_api_key: providerApiKey,
    },
  };

  await hume.empathicVoice.controlPlane.send(chatId, message);
}