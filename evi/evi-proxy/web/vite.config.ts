import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: path.resolve(__dirname, '../out'),
    emptyOutDir: true,
    commonjsOptions: { transformMixedEsModules: true } // Change
  },
});
