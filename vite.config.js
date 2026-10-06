import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'BankBank – Deutschlands schönste Bänke',
        short_name: 'BankBank',
        description: 'Entdecke, bewerte und teile die schönsten Sitzbänke in Deutschland',
        theme_color: '#2D5016',
        background_color: '#F7F3ED',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          // Kartenkacheln: bereits angesehene Gebiete sind auch ohne Empfang sichtbar
          {
            urlPattern: /^https:\/\/[a-c]\.tile\.opentopomap\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles',
              expiration: { maxEntries: 1000, maxAgeSeconds: 60 * 60 * 24 * 30, purgeOnQuotaError: true },
              cacheableResponse: { statuses: [200] },
            },
          },
          // Bank- und Kommentarfotos: einmal angesehen, auch offline verfügbar
          {
            urlPattern: /\/storage\/v1\/object\/public\/bench-photos\//i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'bench-photos',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 60, purgeOnQuotaError: true },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
})
