import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Adds <link rel="modulepreload"> for every lazy (dynamic-import) chunk.
 * Phaser is lazy-loaded so React can paint first, but without this the browser
 * only requests it after the entry chunk has downloaded and run, idling the
 * network in between. Preloading starts the download straight from the HTML.
 */
function preloadLazyChunks(): Plugin {
  let base = '/';
  return {
    name: 'preload-lazy-chunks',
    apply: 'build',
    configResolved(config) {
      base = config.base;
    },
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        return Object.values(ctx.bundle ?? {})
          .filter((c) => c.type === 'chunk' && c.isDynamicEntry)
          .map((c) => ({
            tag: 'link',
            attrs: { rel: 'modulepreload', crossorigin: '', href: base + c.fileName },
            injectTo: 'head' as const,
          }));
      },
    },
  };
}

export default defineConfig({
  // Root by default (Vercel/Cloudflare Pages); override with VITE_BASE for sub-path hosting.
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), preloadLazyChunks()],
  build: {
    // Phaser alone is ~1.65 MB minified and can't be split further; it is
    // lazy-loaded (see PhaserGame.tsx), so it doesn't block first paint.
    // Anything else crossing this limit is a real regression.
    chunkSizeWarningLimit: 1700,
  },
});
