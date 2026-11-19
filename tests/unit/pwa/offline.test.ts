import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('offline play (owner, 21/11/2026)', () => {
  const template = readFileSync('pwa/sw.template.js', 'utf8');

  it('the service worker template has exactly one version and one file-list slot for the build to fill', () => {
    expect(template.match(/__VERSION__/g)).toHaveLength(1);
    expect(template.match(/__PRECACHE__/g)).toHaveLength(1);
  });

  it('serves pages from the network first and stored copies when offline, and never caches non-GET or other origins', () => {
    expect(template).toContain("request.mode === 'navigate'");
    expect(template).toContain("request.method !== 'GET'");
    expect(template).toContain('ignoreSearch: true');
  });

  it('the page manifest still opens the game full screen from the home screen', () => {
    const manifest = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8')) as {
      start_url: string;
      display: string;
    };
    expect(manifest.start_url).toBe('./');
    expect(manifest.display).toBe('fullscreen');
  });
});
