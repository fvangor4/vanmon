import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves the game from https://fvangor4.github.io/vanmon/
// `mode` (not `command`) so `vite preview` serves the production build at the same base.
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/vanmon/' : '/',
  // Phaser alone is ~1.2 MB minified; one chunk is fine for an offline-cached game.
  build: { chunkSizeWarningLimit: 2000 },
  plugins: [
    VitePWA({
      // New versions install in the background and take over on the next launch.
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'VanMon',
        short_name: 'VanMon',
        description: 'Catch and raise cute creatures!',
        theme_color: '#1d2b3a',
        background_color: '#1d2b3a',
        display: 'fullscreen',
        orientation: 'landscape',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Everything the game needs, so it plays offline (car rides!) after the first visit,
        // including creatures.json and every creature picture.
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,jpeg,webp,json}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
  test: {
    environment: 'node',
  },
}));
