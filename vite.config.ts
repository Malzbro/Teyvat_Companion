/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Game icons come from these CDNs; cache them so the app works offline once seen.
const iconCache = (host: string, name: string) => ({
  urlPattern: ({ url }: { url: URL }) => url.host === host,
  handler: 'CacheFirst' as const,
  options: {
    cacheName: name,
    expiration: { maxEntries: 2000, maxAgeSeconds: 60 * 60 * 24 * 90 },
    cacheableResponse: { statuses: [0, 200] },
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Teyvat Companion',
        short_name: 'Teyvat',
        description: 'Given what you own, what should you do next?',
        theme_color: '#13101f',
        background_color: '#13101f',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // The game-data bundle is large; precache it so everything works offline.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          iconCache('enka.network', 'enka-icons'),
          iconCache('gi.yatta.moe', 'yatta-icons'),
        ],
      },
    }),
  ],
  build: {
    // Game data (~1 MB) ships with the app on purpose so it works offline.
    chunkSizeWarningLimit: 1600,
  },
  server: {
    // In dev, stand in for the Vercel function api/enka/[uid].ts.
    proxy: {
      '/api/enka': {
        target: 'https://enka.network',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/enka/, '/api/uid'),
        headers: { 'user-agent': 'teyvat-companion/1.0 (personal gift app; dev)' },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
