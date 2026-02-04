import { test, expect, Page } from "@playwright/test";
import { HumeClient } from "hume";
import type { Hume } from "hume";
import { E2E_SESSION_SETTINGS } from "../utils/session-settings";

const apiKey = process.env.TEST_HUME_API_KEY || process.env.HUME_API_KEY;
const secretKey =
  process.env.TEST_HUME_SECRET_KEY || process.env.HUME_SECRET_KEY;

if (!apiKey || !apiKey.trim()) {
  throw new Error(
    "API key is required. Set TEST_HUME_API_KEY (CI) or HUME_API_KEY (local)."
  );
}

const sessionSettings = E2E_SESSION_SETTINGS as unknown as {
  systemPrompt: string;
  voiceId: string;
  customSessionId: string;
  eventLimit: number;
  audio: { encoding: string; sampleRate: number; channels: number };
  context: { text: string; type: string };
  variables: {
    userName: string | number;
    userAge: string | number;
    isPremium: boolean;
  };
};

test.describe("connect to EVI with API key", () => {
  test("starts a chat, receives a chatId, and stays alive for 2 seconds", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["microphone"], {
      origin: "http://localhost:3000",
    });

    await page.goto("/api-key", { waitUntil: "networkidle" });

    await page.getByRole("button", { name: "Start Call" }).click();

    const chatId = await waitForChatMetadataFromPage(page);
    expect(chatId).toBeTruthy();

    await page.waitForTimeout(2_000);
    const status = await page.evaluate(() => (window as any).__voiceStatus);
    expect(status).toBe("connected");
  });
});

test.describe("connect to EVI with Access Token", () => {
  test("starts a chat, receives a chatId, and stays alive for 2 seconds", async ({
    page,
    context,
  }) => {
    if (!secretKey || !secretKey.trim()) {
      throw new Error(
        "Secret key is required. Set TEST_HUME_SECRET_KEY (CI) or HUME_SECRET_KEY (local)."
      );
    }

    await context.grantPermissions(["microphone"], {
      origin: "http://localhost:3000",
    });

    await page.goto("/", { waitUntil: "networkidle" });

    await page.getByRole("button", { name: "Start Call" }).click();

    const chatId = await waitForChatMetadataFromPage(page);
    expect(chatId).toBeTruthy();

    await page.waitForTimeout(2_000);
    const status = await page.evaluate(() => (window as any).__voiceStatus);
    expect(status).toBe("connected");
  });

  test("verifies sessionSettings are passed on connect()", async ({
    page,
    context,
  }) => {
    if (!secretKey || !secretKey.trim()) {
      throw new Error(
        "Secret key is required. Set TEST_HUME_SECRET_KEY (CI) or HUME_SECRET_KEY (local)."
      );
    }

    await context.grantPermissions(["microphone"], {
      origin: "http://localhost:3000",
    });

    await page.goto("/session-settings", { waitUntil: "networkidle" });

    await page.getByRole("button", { name: "Start Call" }).click();

    const chatId = await waitForChatMetadataFromPage(page);
    expect(chatId).toBeTruthy();

    await page.waitForTimeout(3_000);

    const events = await fetchChatEvents(chatId);
    const sessionSettingsEvent = events.find(
      (event) => (event.type as string) === "SESSION_SETTINGS"
    );

    expect(sessionSettingsEvent?.messageText).toBeDefined();
    if (!sessionSettingsEvent?.messageText) {
      throw new Error("sessionSettingsEvent.messageText is undefined");
    }

    const parsedSettings = JSON.parse(sessionSettingsEvent.messageText);
    expect(parsedSettings.type).toBe("session_settings");

    const expectations = [
      { key: "system_prompt", value: sessionSettings.systemPrompt },
      { key: "voice_id", value: sessionSettings.voiceId },
      { key: "custom_session_id", value: sessionSettings.customSessionId },
      { key: "event_limit", value: sessionSettings.eventLimit },
    ];

    for (const { key, value } of expectations) {
      if (!(key in parsedSettings)) {
        throw new Error(
          `SESSION_SETTINGS event missing "${key}". Keys received: ${Object.keys(
            parsedSettings
          ).join(", ")}`
        );
      }
      expect(parsedSettings[key]).toBe(value);
    }

    expect(parsedSettings.audio).toBeDefined();
    expect(parsedSettings.audio.encoding).toBe(sessionSettings.audio.encoding);
    expect(parsedSettings.audio.sample_rate).toBe(
      sessionSettings.audio.sampleRate
    );
    expect(parsedSettings.audio.channels).toBe(sessionSettings.audio.channels);

    expect(parsedSettings.context).toBeDefined();
    expect(parsedSettings.context.text).toBe(sessionSettings.context.text);
    expect(parsedSettings.context.type).toBe(sessionSettings.context.type);

    expect(parsedSettings.variables).toBeDefined();
    expect(parsedSettings.variables.userName).toBe(
      String(sessionSettings.variables.userName)
    );
    expect(parsedSettings.variables.userAge).toBe(
      String(sessionSettings.variables.userAge)
    );
    expect(parsedSettings.variables.isPremium).toBe(
      String(sessionSettings.variables.isPremium)
    );
  });

  test("verifies sessionSettings can be updated after connect() as a message", async ({
    page,
    context,
  }) => {
    if (!secretKey || !secretKey.trim()) {
      throw new Error(
        "Secret key is required. Set TEST_HUME_SECRET_KEY (CI) or HUME_SECRET_KEY (local)."
      );
    }

    await context.grantPermissions(["microphone"], {
      origin: "http://localhost:3000",
    });

    await page.goto("/session-settings", { waitUntil: "networkidle" });

    await page.getByRole("button", { name: "Start Call" }).click();

    const chatId = await waitForChatMetadataFromPage(page);
    expect(chatId).toBeTruthy();

    await page.waitForTimeout(2_000);

    const updatedSessionSettings = {
      systemPrompt:
        "You are a helpful test assistant with updated system prompt",
    };

    await page.evaluate((payload) => {
      const send = (window as any).__sendSessionSettings;
      if (typeof send !== "function") {
        throw new Error("__sendSessionSettings not available");
      }
      send(payload);
    }, updatedSessionSettings);

    await page.waitForTimeout(2_000);

    const events = await fetchChatEvents(chatId);
    const sessionSettingsEvents = events.filter(
      (event) => (event.type as string) === "SESSION_SETTINGS"
    );

    expect(sessionSettingsEvents.length).toBeGreaterThanOrEqual(2);

    const updatedSessionSettingsEvent =
      sessionSettingsEvents[sessionSettingsEvents.length - 1];

    expect(updatedSessionSettingsEvent?.messageText).toBeDefined();
    if (!updatedSessionSettingsEvent?.messageText) {
      throw new Error("updatedSessionSettingsEvent.messageText is undefined");
    }

    const parsedSettings = JSON.parse(updatedSessionSettingsEvent.messageText);
    expect(parsedSettings.type).toBe("session_settings");
    expect(parsedSettings.system_prompt).toBe(
      updatedSessionSettings.systemPrompt
    );
  });
});

async function waitForChatMetadataFromPage(page: Page, timeoutMs = 30_000) {
  const handle = await page.waitForFunction(
    () => {
      const events = (window as any).__voiceEvents ?? [];
      const metadata = events.find(
        (event: any) => event?.type === "chat_metadata" && event?.chatId
      );
      return metadata?.chatId ?? null;
    },
    { timeout: timeoutMs }
  );
  const chatId = (await handle.jsonValue()) as string | null;
  if (!chatId) {
    throw new Error("chat_metadata event was not received");
  }
  return chatId;
}

async function fetchChatEvents(
  chatId: string
): Promise<Hume.empathicVoice.ReturnChatEvent[]> {
  const key = process.env.TEST_HUME_API_KEY || process.env.HUME_API_KEY;
  if (!key?.trim()) {
    throw new Error("TEST_HUME_API_KEY or HUME_API_KEY must be set");
  }
  const client = new HumeClient({ apiKey: key });
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
