import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Root by default (Vercel/Cloudflare Pages); override with VITE_BASE for sub-path hosting.
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  build: {
    // Phaser alone is ~1.65 MB minified and can't be split further; it is
    // lazy-loaded (see PhaserGame.tsx), so it doesn't block first paint.
    // Anything else crossing this limit is a real regression.
    chunkSizeWarningLimit: 1700,
  },
});
