import { defineConfig } from "vitest/config";

export default defineConfig({
  define: {
    "import.meta.env.VITE_HUME_API_KEY": JSON.stringify(
      process.env.TEST_HUME_API_KEY || process.env.VITE_HUME_API_KEY || "",
    ),
    "import.meta.env.VITE_HUME_CONFIG_ID": "",
  },
  test: {
    environment: "node",
    testTimeout: 20_000,
  },
});
