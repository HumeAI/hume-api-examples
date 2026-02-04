import { defineConfig } from "@playwright/test";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env") });

const apiKey = process.env.TEST_HUME_API_KEY || process.env.HUME_API_KEY;
const secretKey =
  process.env.TEST_HUME_SECRET_KEY || process.env.HUME_SECRET_KEY;

export default defineConfig({
  testDir: "./tests",
  timeout: 90_000,
  expect: { timeout: 20_000 },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
  use: {
    baseURL: "http://localhost:3000",
    permissions: ["microphone"],
    launchOptions: {
      args: [
        "--use-fake-ui-for-media-stream",
        "--use-fake-device-for-media-stream",
      ],
    },
  },
  webServer: {
    command: "npm run build && PORT=3000 npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    env: {
      HUME_API_KEY: apiKey || "",
      HUME_SECRET_KEY: secretKey || "",
      SUPPLEMENTAL_LLM_API_KEY: process.env.SUPPLEMENTAL_LLM_API_KEY || "",
      NEXT_PUBLIC_ENABLE_E2E_HOOKS: "true",
    },
  },
});
