import fs from 'node:fs';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// scripts/sync-brand.mjs runs before vite (see package.json) and writes this.
const brand = JSON.parse(fs.readFileSync('./src/brand/active.json', 'utf8'));

export default defineConfig({
  base: './',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: brand.name,
        short_name: brand.shortName,
        description: brand.description,
        lang: brand.lang,
        theme_color: brand.colors.navy,
        background_color: brand.colors.navy,
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        runtimeCaching: [
          {
            // The zone data decides what a spot costs, so it has to survive a
            // lost connection — without it the app can only say "tariff
            // unknown". Cached on first use rather than precached: it is
            // several MB and not every session needs it immediately.
            urlPattern: /\.geojson$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'parking-zones',
              expiration: { maxEntries: 2, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
