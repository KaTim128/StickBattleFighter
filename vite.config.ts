import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { Plugin } from 'vite';
import wasm from 'vite-plugin-wasm';
import { defineConfig } from 'vitest/config';

// GitHub Pages serves the game from /<repo>/, so the deploy workflow sets
// BASE_PATH=/StickBattleFighter/ (TD-017). Local dev and preview use '/'.
const base = process.env.BASE_PATH ?? '/';

const filesUnder = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });

/**
 * Offline play (owner, 21/11/2026): after the build, writes `sw.js` from `pwa/sw.template.js` with the list of every
 * built file (source maps left out) and a version made from their names and sizes, so a new build replaces the old cache.
 */
function offlineServiceWorker(): Plugin {
  let outDir = 'dist';
  return {
    name: 'offline-service-worker',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    writeBundle() {
      const files = filesUnder(outDir)
        .map((f) => relative(outDir, f).split('\\').join('/'))
        .filter((f) => !f.endsWith('.map') && f !== 'sw.js' && f !== 'README.md')
        .sort();
      const version = createHash('sha256')
        .update(files.map((f) => `${f}:${statSync(join(outDir, f)).size}`).join('|'))
        .digest('hex')
        .slice(0, 12);
      const template = readFileSync('pwa/sw.template.js', 'utf8');
      writeFileSync(
        join(outDir, 'sw.js'),
        template.replace('__VERSION__', version).replace('__PRECACHE__', JSON.stringify(['./', ...files], null, 1)),
      );
    },
  };
}

export default defineConfig({
  base,
  // Rapier ships its engine as a real .wasm module (TD-023).
  plugins: [wasm(), offlineServiceWorker()],
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
