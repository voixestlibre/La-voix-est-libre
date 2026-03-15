import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/lavoixestlibre/',
  define: {
    'import.meta.env.VITE_BASENAME': '"/lavoixestlibre"',
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'La voix est libre',
        short_name: 'La voix est libre',
        description: 'WebApp pour les chorales',
        theme_color: '#044C8D',
        scope: '/lavoixestlibre/',
        start_url: '/lavoixestlibre/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ]
});