import type { NextApiRequest, NextApiResponse } from 'next';
import { HumeClient } from 'hume';

const hume = new HumeClient({ apiKey: process.env.HUME_API_KEY! });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { chatId } =
      typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as { chatId?: string });

    if (!chatId) return res.status(400).json({ error: 'chatId is required' });

    const languageModelApiKey = process.env.SUPPLEMENTAL_LLM_API_KEY;
    // If no supplemental key is configured, do nothing.
    if (!languageModelApiKey) return res.status(204).end();

    const message = {
      type: 'session_settings' as const,
      languageModelApiKey,
    };

    await hume.empathicVoice.controlPlane.send(chatId, message);
    return res.status(204).end();
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err?.message ?? 'Failed to set LLM key' });
  }
}
