import { defineConfig } from 'vite';

// GitHub Pages serves the game from https://fvangor4.github.io/vanmon/
// `mode` (not `command`) so `vite preview` serves the production build at the same base.
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/vanmon/' : '/',
  // Phaser alone is ~1.2 MB minified; one chunk is fine for an offline-cached game.
  build: { chunkSizeWarningLimit: 2000 },
  test: {
    environment: 'node',
  },
}));
