import wasm from 'vite-plugin-wasm';
import { defineConfig } from 'vitest/config';

// GitHub Pages serves the game from /<repo>/, so the deploy workflow sets
// BASE_PATH=/StickBattleFighter/ (TD-017). Local dev and preview use '/'.
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  // Rapier ships its engine as a real .wasm module (TD-023).
  plugins: [wasm()],
  build: {
    target: 'es2022',
    sourcemap: true,
    // Engine libraries change rarely, so they get their own long-cacheable
    // chunks. Pixi is a single ~511 kB (145 kB gzipped) vendor chunk; the
    // limit sits just above it so new growth in our own code still warns.
    chunkSizeWarningLimit: 600,
    rolldownOptions: {
      // Two pages: the game, and the admin character editor (TD-039).
      input: { main: 'index.html', admin: 'admin.html' },
      output: {
        codeSplitting: {
          groups: [
            { name: 'vendor-rapier', test: /node_modules[\\/]@dimforge/ },
            { name: 'vendor-pixi', test: /node_modules[\\/](pixi\.js|@pixi)/ },
          ],
        },
      },
    },
  },
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    environment: 'node',
    // @dimforge/rapier2d only declares a browser "module" entry and imports its
    // .wasm as an ES module, so tests resolve the file directly and let Vite
    // (with the wasm plugin) process it instead of Node.
    alias: { '@dimforge/rapier2d': '@dimforge/rapier2d/rapier.js' },
    server: { deps: { inline: ['@dimforge/rapier2d'] } },
  },
});
