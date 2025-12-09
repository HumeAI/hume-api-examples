import { describe, it, expect, vi, beforeAll } from "vitest";
import { HumeClient, fetchAccessToken } from "hume";
import type { Hume } from "hume";
import { config } from "dotenv";
import { resolve } from "path";

// Load .env file for local testing
config({ path: resolve(process.cwd(), ".env") });

// Mock audio dependencies (handleOpen calls these)
vi.mock("../lib/audio", () => ({
  startAudioCapture: vi.fn(() =>
    Promise.resolve({ stream: { getTracks: () => [] } }),
  ),
}));

// Mock WebAudioPlayer (to define AudioContext)
vi.mock("hume", async () => {
  const actual = await vi.importActual<any>("hume");
  return {
    ...actual,
    EVIWebAudioPlayer: vi.fn(() => ({
      init: vi.fn(() => Promise.resolve()),
      stop: vi.fn(),
      enqueue: vi.fn(),
      dispose: vi.fn(),
    })),
  };
});

// Minimal DOM mock (main.ts touches document at module load time)
Object.defineProperty(globalThis, "document", {
  value: { querySelector: vi.fn(() => null) },
  writable: true,
  configurable: true,
});

describe("connect to EVI with API key", () => {
  let chatId: string;
  let getSocket: () => any;

  const sessionSettings = {
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
  };

  beforeAll(async () => {
    await import("../main");

    const connect = (globalThis as any).__connectEVI as (
      sessionSettings?: any,
    ) => void;
    getSocket = (globalThis as any).__getEVISocket as () => any;

    connect(sessionSettings);

    const socket = getSocket();
    if (!socket) {
      throw new Error("Socket was not created");
    }

    await waitForSocketOpen(socket);
    chatId = await waitForChatMetadata(getSocket);
    expect(chatId).toBeTruthy();
  });

  it("starts a chat, receives a chatId, and stays alive for 2 seconds", async () => {
    expect(chatId).toBeTruthy();

    await sleep(2_000);

    const socket = getSocket();
    expect(socket?.readyState).toBe(1); // WebSocket.OPEN = 1
  });

  it("verifies sessionSettings are passed on connect()", async () => {
    const events = await fetchChatEvents(chatId);
    const sessionSettingsEvent = events.find(
      (event) => (event.type as string) === "SESSION_SETTINGS",
    );

    expect(sessionSettingsEvent?.messageText).toBeDefined();
    if (!sessionSettingsEvent?.messageText) {
      throw new Error("sessionSettingsEvent.messageText is undefined");
    }

    const parsedSettings = JSON.parse(sessionSettingsEvent.messageText);
    expect(parsedSettings.type).toBe("session_settings");

    // Validate session settings
    const expectations = [
      {
        key: "system_prompt",
        value: sessionSettings.systemPrompt,
        label: "systemPrompt",
      },
      { key: "voice_id", value: sessionSettings.voiceId, label: "voiceId" },
      {
        key: "custom_session_id",
        value: sessionSettings.customSessionId,
        label: "customSessionId",
      },
      {
        key: "event_limit",
        value: sessionSettings.eventLimit,
        label: "eventLimit",
      },
    ];

    for (const { key, value, label } of expectations) {
      console.log(`  ✓ ${label}`);
      expect(parsedSettings[key]).toBe(value);
    }

    // Validate audio settings
    expect(parsedSettings.audio).toBeDefined();
    console.log("  ✓ audio.encoding");
    expect(parsedSettings.audio.encoding).toBe(sessionSettings.audio.encoding);
    console.log("  ✓ audio.sampleRate");
    expect(parsedSettings.audio.sample_rate).toBe(
      sessionSettings.audio.sampleRate,
    );
    console.log("  ✓ audio.channels");
    expect(parsedSettings.audio.channels).toBe(sessionSettings.audio.channels);

    // Validate context settings
    expect(parsedSettings.context).toBeDefined();
    console.log("  ✓ context.text");
    expect(parsedSettings.context.text).toBe(sessionSettings.context.text);
    console.log("  ✓ context.type");
    expect(parsedSettings.context.type).toBe(sessionSettings.context.type);

    // Validate variables (all saved as strings on the backend)
    expect(parsedSettings.variables).toBeDefined();
    console.log("  ✓ variables.userName");
    expect(parsedSettings.variables.userName).toBe(
      String(sessionSettings.variables.userName),
    );
    console.log("  ✓ variables.userAge");
    expect(parsedSettings.variables.userAge).toBe(
      String(sessionSettings.variables.userAge),
    );
    console.log("  ✓ variables.isPremium");
    expect(parsedSettings.variables.isPremium).toBe(
      String(sessionSettings.variables.isPremium),
    );
  });
});

describe("connect to EVI with Access Token", () => {
  let chatId: string;
  let getSocket: () => any;
  let socket: any = null;

  beforeAll(async () => {
    // Use TEST_HUME_API_KEY for CI, VITE_HUME_API_KEY for local
    const apiKey =
      process.env.TEST_HUME_API_KEY || process.env.VITE_HUME_API_KEY;
    // Use TEST_HUME_SECRET_KEY for CI, VITE_HUME_SECRET_KEY for local
    const secretKey =
      process.env.TEST_HUME_SECRET_KEY || process.env.VITE_HUME_SECRET_KEY;
    if (!apiKey || !apiKey.trim()) {
      throw new Error(
        "API key is required. Set TEST_HUME_API_KEY (CI) or VITE_HUME_API_KEY (local).",
      );
    }
    if (!secretKey || !secretKey.trim()) {
      throw new Error(
        "Secret key is required. Set TEST_HUME_SECRET_KEY (CI) or VITE_HUME_SECRET_KEY (local).",
      );
    }

    try {
      let accessToken: string;
      try {
        accessToken = await fetchAccessToken({
          apiKey: apiKey,
          secretKey: secretKey,
        });
      } catch (fetchError) {
        throw new Error(
          `Failed to fetch access token. This usually means your API key and secret key don't match or are invalid. ` +
            `Original error: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`,
        );
      }

      const humeWithAccessToken = new HumeClient({
        accessToken: accessToken,
      });

      socket = humeWithAccessToken.empathicVoice.chat.connect();

      getSocket = () => socket;

      if (!socket) {
        throw new Error("Socket was not created");
      }

      await waitForSocketOpen(socket);
      chatId = await waitForChatMetadata(getSocket);
      expect(chatId).toBeTruthy();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorDetails =
        error instanceof Error && "cause" in error
          ? ` Cause: ${JSON.stringify(error.cause)}`
          : "";
      throw new Error(
        `Failed to fetch access token or connect: ${errorMessage}${errorDetails}. ` +
          `API Key present: ${!!apiKey && apiKey.trim().length > 0}, Secret Key present: ${!!secretKey && secretKey.trim().length > 0}`,
      );
    }
  });

  it("starts a chat, receives a chatId, and stays alive for 2 seconds", async () => {
    expect(chatId).toBeTruthy();

    await sleep(2_000);

    const socket = getSocket();
    expect(socket?.readyState).toBe(1); // WebSocket.OPEN = 1
  });
});

function waitForSocketOpen(socket: any): Promise<void> {
  return new Promise((resolve, reject) => {
    if (socket.readyState === 1) {
      // WebSocket.OPEN = 1
      resolve();
      return;
    }

    socket.on("open", () => resolve());
    socket.on("error", (err: any) =>
      reject(err instanceof Error ? err : new Error(String(err))),
    );
    socket.on("close", (event: any) =>
      reject(
        new Error(
          `Socket closed before opening. Code: ${event?.code}, Reason: ${event?.reason}`,
        ),
      ),
    );
  });
}

function waitForChatMetadata(getSocket: () => any): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = getSocket();

    if (!socket) {
      reject(new Error("Socket is null"));
      return;
    }

    let resolved = false;

    const onMessage = (msg: any) => {
      if (!resolved && msg.type === "chat_metadata" && msg.chatId) {
        resolved = true;
        resolve(msg.chatId);
      }
    };

    const onError = (err: any) => {
      if (!resolved) {
        resolved = true;
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };

    const onClose = (event: any) => {
      if (!resolved) {
        resolved = true;
        reject(
          new Error(
            `Socket closed while waiting for chat_metadata. Code: ${event?.code}, Reason: ${event?.reason}, Socket state: ${socket.readyState}`,
          ),
        );
      }
    };

    socket.on("message", onMessage);
    socket.on("error", onError);
    socket.on("close", onClose);
  });
}

async function fetchChatEvents(
  chatId: string,
): Promise<Hume.empathicVoice.ReturnChatEvent[]> {
  const apiKey = process.env.TEST_HUME_API_KEY || process.env.VITE_HUME_API_KEY;
  if (!apiKey) {
    throw new Error("TEST_HUME_API_KEY or VITE_HUME_API_KEY must be set");
  }
  const client = new HumeClient({ apiKey });
  const page = await client.empathicVoice.chats.listChatEvents(chatId, {
    pageNumber: 0,
    ascendingOrder: true,
  });

  const events: Hume.empathicVoice.ReturnChatEvent[] = [];
  for await (const event of page) {
    events.push(event);
  }
  return events;
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));
