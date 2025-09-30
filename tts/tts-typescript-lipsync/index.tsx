import { HumeClient } from "hume";
import { EVIWebAudioPlayer } from "hume";
import { Mouth, MouthAnimation } from "./mouth";

// ⚠️ WARNING: HUME_API_KEY is a sensitive secret! The VITE_HUME_API_KEY
// environment variable is for DEVELOPMENT ONLY.
//
// DO NOT use this approach in a production web app. Since VITE_ prefixed
// environment variables are bundled into your client-side JavaScript, your
// API key will be exposed in the browser where anyone can extract and misuse it.
//
// For production, implement token authentication instead: your frontend should
// request access tokens from your own backend server, which securely exchanges
// your API key for short-lived tokens.
//
// Learn more: https://dev.hume.ai/docs/introduction/api-key#token-authentication
if (!import.meta.env.VITE_HUME_API_KEY) {
  throw new Error("VITE_HUME_API_KEY environment variable is required");
}

const player = new EVIWebAudioPlayer();
let currentAnimation: MouthAnimation | null = null;

player.on("error", (e) => {
  console.error("Audio player error:", e.detail.message);
});

async function synthesize() {
  const textarea = document.getElementById("text-input") as HTMLTextAreaElement;
  const text = textarea.value;

  currentAnimation?.stop();
  currentAnimation = null;

  const client = new HumeClient({ apiKey: import.meta.env.VITE_HUME_API_KEY! });

  try {
    await player.init();

    const stream = await client.tts.synthesizeJsonStreaming({
      version: "2",
      utterances: [{
        text,
        voice: { name: "ava song", provider: "HUME_AI" },
        speed: 1,
      }],
      includeTimestampTypes: ["word", "phoneme"],
    });


    const mouth = new Mouth();
    const animation = new MouthAnimation(mouth, 400, 300);
    currentAnimation = animation;

    const canvasContainer = document.getElementById("canvas-container")!;
    canvasContainer.innerHTML = '';
    canvasContainer.appendChild(animation.canvas);

    animation.start(performance.now());

    for await (const message of stream) {
      console.log("Message received:", message);

      if (message.type === "audio") {
        await player.enqueue({
          type: "audio_output",
          data: message.audio,
        });

      }

      if (message.type === "timestamp") {
        if (message.timestamp.type === "phoneme") {
          const phonemeText = message.timestamp.text;
          const phonemeTime = message.timestamp.time.begin;
          mouth.addPhoneme(phonemeText, phonemeTime);
        }
      }
    }
    console.log("Stream complete");
  } catch (error) {
    console.error("Error:", error);
  }
}

document.getElementById("synthesize-btn")!.addEventListener("click", synthesize);
