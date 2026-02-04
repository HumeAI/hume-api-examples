import type { Hume } from "hume";

export const E2E_SESSION_SETTINGS = {
  systemPrompt: "You are a helpful assistant",
  voiceId: "5bb7de05-c8fe-426a-8fcc-ba4fc4ce9f9c",
  customSessionId: "my-custom-session-id",
  eventLimit: 100,
  audio: {
    encoding: "linear16",
    sampleRate: 16000,
    channels: 1,
  },
  context: {
    text: "This is not your first conversation with the user, you've talked to them before",
    type: "persistent",
  },
  variables: {
    userName: "John",
    userAge: 30,
    isPremium: true,
  },
} as unknown as Hume.empathicVoice.SessionSettings;
