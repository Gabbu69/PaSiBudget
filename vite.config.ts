import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [react(), VitePWA({
    registerType: 'prompt',
    includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
    manifest: {
      name: 'PaSiBudget — Farm Budget Planner', short_name: 'PaSiBudget',
      description: 'Plan your rice farm budget and explore break-even scenarios, offline.',
      theme_color: '#174f3c', background_color: '#f5f5ef', display: 'standalone',
      start_url: '/', scope: '/',
      icons: [
        { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }
      ]
    },
    workbox: { globPatterns: ['**/*.{js,css,html,svg,png,woff2}'], navigateFallback: 'index.html' }
  })],
  test: { include: ['src/**/*.test.ts'], environment: 'node' }
})
