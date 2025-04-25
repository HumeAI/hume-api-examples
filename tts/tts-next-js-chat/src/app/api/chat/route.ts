import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

export async function POST(req: Request) {
  const { messages } = (await req.json()) as {
    messages: Array<{ role: string; content: string }>;
  };

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response("`messages` array is required", { status: 400 });
  }

  const result = streamText({
    model: anthropic("claude-3-5-sonnet-latest"),
    messages: messages.map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    })),
  });

  return result.toTextStreamResponse();
}
