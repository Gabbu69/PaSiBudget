import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [react(), VitePWA({
    registerType: 'prompt',
    includeAssets: ['brand/pasibudget-logo.png'],
    manifest: {
      name: 'PaSiBudget — Farm Budget Planner', short_name: 'PaSiBudget',
      description: 'Plan your rice farm budget and explore break-even scenarios, offline.',
      theme_color: '#174f3c', background_color: '#f5f5ef', display: 'standalone',
      start_url: '/', scope: '/',
      icons: [
        { src: 'brand/pasibudget-logo.png', sizes: '1254x1254', type: 'image/png', purpose: 'any' }
      ]
    },
    workbox: { globPatterns: ['**/*.{js,css,html,svg,png,woff2}'], navigateFallback: 'index.html' }
  })],
  test: { include: ['src/**/*.test.ts'], environment: 'node' }
})
