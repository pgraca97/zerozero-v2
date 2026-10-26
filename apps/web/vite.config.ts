import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Root by default (Vercel/Cloudflare Pages); override with VITE_BASE for sub-path hosting.
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
});
