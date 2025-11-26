import { defineConfig } from "vitest/config";

export default defineConfig({
  define: {
    "import.meta.env.VITE_HUME_API_KEY": JSON.stringify(
      process.env.TEST_HUME_API_KEY || process.env.VITE_HUME_API_KEY || "",
    ),
  },
  test: {
    environment: "node",
    testTimeout: 20_000,
  },
});
