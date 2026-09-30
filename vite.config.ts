/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
export default defineConfig({
  base: './',
  plugins: [react(), VitePWA({ registerType: 'autoUpdate',
    manifest: { name: 'Attendance Tracker', short_name: 'Attendance', start_url: '.', display: 'standalone',
      background_color: '#f4f6f3', theme_color: '#1f5c4d',
      icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }] },
    workbox: { globPatterns: ['**/*.{js,css,html,svg}'] } })],
  test: { environment: 'node' }
})
