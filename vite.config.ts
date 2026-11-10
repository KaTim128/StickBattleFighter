import { defineConfig } from 'vitest/config';

// GitHub Pages serves the game from /<repo>/, so the deploy workflow sets
// BASE_PATH=/StickBattleFighter/ (TD-017). Local dev and preview use '/'.
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  build: {
    target: 'es2022',
    sourcemap: true,
    // Engine libraries change rarely, so they get their own long-cacheable
    // chunks. Rapier 2D's compat build embeds its WASM as base64: about 3.4 MB
    // raw / 1.3 MB gzipped. Accepted for Phase 0; switching to the non-compat
    // build with a separate .wasm file is a Phase 1 performance item (see
    // DEVELOPMENT_PROGRESS.md), hence the raised warning limit.
    chunkSizeWarningLimit: 3600,
    rolldownOptions: {
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
  },
});
