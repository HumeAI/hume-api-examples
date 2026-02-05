import { NextRequest, NextResponse } from 'next/server';
import { humeClient } from '@/lib/humeClient';

export async function POST(req: NextRequest) {
  const { text, voiceName, voiceProvider, instant } = (await req.json()) as any;

  if (!text?.trim()) {
    return NextResponse.json(
      { error: 'Missing or invalid text' },
      { status: 400 },
    );
  }
  if (typeof instant !== 'boolean') {
    return NextResponse.json(
      { error: 'Must specify instant mode' },
      { status: 400 },
    );
  }
  if (!voiceName && instant) {
    return NextResponse.json(
      { error: 'Voice required for instant mode' },
      { status: 400 },
    );
  }

  let upstreamHumeStream: any;

  try {
    const cleanText = (text || '').replace(/```[\s\S]*?```/g, '').trim();
    const utterances = voiceName
      ? [
          {
            text: cleanText,
            voice: { name: voiceName, provider: voiceProvider },
          },
        ]
      : [{ text: cleanText }];

    upstreamHumeStream = await humeClient.tts.synthesizeJsonStreaming({
      utterances,
      stripHeaders: true,
      instantMode: instant,
    });
  } catch (error: any) {
    console.error('[HUME_TTS_PROXY] Hume API call failed:', error);
    const errorMessage = error?.message || 'Failed to initiate TTS stream';
    const errorDetails = error?.error?.message || error?.error || errorMessage;
    return NextResponse.json(
      { error: 'Hume API Error', details: errorDetails },
      { status: 502 },
    );
  }

  const encoder = new TextEncoder();
  const readableStream = new ReadableStream({
    async start(controller) {
      for await (const chunk of upstreamHumeStream) {
        const jsonString = JSON.stringify(chunk);
        const ndjsonLine = jsonString + '\n';
        const chunkBytes = encoder.encode(ndjsonLine);
        controller.enqueue(chunkBytes);
      }
      controller.close();
    },
    cancel() {
      if (typeof upstreamHumeStream?.abort === 'function') {
        upstreamHumeStream.abort();
      }
    },
  });

  return new NextResponse(readableStream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
