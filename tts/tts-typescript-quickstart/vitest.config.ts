import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');

  return {
    define: {
      'import.meta.env.VITE_HUME_API_KEY': JSON.stringify(
        process.env.TEST_HUME_API_KEY ||
          process.env.VITE_HUME_API_KEY ||
          env.VITE_HUME_API_KEY ||
          '',
      ),
      'import.meta.env.VITE_HUME_CONFIG_ID': JSON.stringify(''),
    },
    test: {
      environment: 'node',
      testTimeout: 20_000,
    },
  };
});
