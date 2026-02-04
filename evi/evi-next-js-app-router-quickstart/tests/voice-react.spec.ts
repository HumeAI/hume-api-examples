import { test, expect, Page } from "@playwright/test";

const apiKey = process.env.TEST_HUME_API_KEY || process.env.HUME_API_KEY;
const secretKey =
  process.env.TEST_HUME_SECRET_KEY || process.env.HUME_SECRET_KEY;

if (!apiKey || !apiKey.trim()) {
  throw new Error(
    "API key is required. Set TEST_HUME_API_KEY (CI) or HUME_API_KEY (local)."
  );
}

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
