import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@styles": path.resolve(__dirname, "src/styles/*"),
      "@lib": path.resolve(__dirname, "src/lib/*"),
    },
  },
});
