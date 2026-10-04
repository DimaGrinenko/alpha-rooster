import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import { fileURLToPath, URL } from 'node:url';

// This showcase already contains only the selected runtime artwork.
export default defineConfig({
  base: './',
  plugins: [react()],
  css: { postcss: { plugins: [tailwindcss()] } },
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  build: {
    outDir: 'build', emptyOutDir: true, sourcemap: false,
    rollupOptions: { output: { manualChunks(id) {
      if (id.includes('@esotericsoftware')) return 'spine';
      if (id.includes('node_modules')) return 'vendor';
    } } },
  },
});
