import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const arrayBuffer = await req.arrayBuffer();
    const webmBlob = new Blob([arrayBuffer], { type: "audio/webm" });
    const form = new FormData();

    form.append("model", "whisper-large-v3-turbo");
    form.append("file", webmBlob, "audio.webm");

    const res = await fetch(
      "https://api.groq.com/openai/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: form,
      }
    );

    if (!res.ok) {
      const bodyText = await res.text();
      console.error("Groq transcription failed:", res.status, bodyText);
      return NextResponse.error();
    }

    const { text } = await res.json();
    return NextResponse.json({ text });
  } catch (err) {
    console.error("Transcription error:", err);
    return NextResponse.error();
  }
}
