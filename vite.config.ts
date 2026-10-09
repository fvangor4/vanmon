import { defineConfig } from 'vite';

// GitHub Pages serves the game from https://fvangor4.github.io/vanmon/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/vanmon/' : '/',
  // Phaser alone is ~1.2 MB minified; one chunk is fine for an offline-cached game.
  build: { chunkSizeWarningLimit: 2000 },
  test: {
    environment: 'node',
  },
}));
