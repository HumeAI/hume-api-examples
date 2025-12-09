import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Load VITE_ prefixed env vars from .env files
  const env = loadEnv(mode, process.cwd(), 'VITE_');

  return {
    define: {
      'import.meta.env.VITE_HUME_API_KEY': JSON.stringify(
        process.env.VITE_HUME_API_KEY || env.VITE_HUME_API_KEY || '',
      ),
    },
  };
});
