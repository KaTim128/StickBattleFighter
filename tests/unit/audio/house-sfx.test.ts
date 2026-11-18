import { statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { HOUSE_SFX } from '../../../src/data/audio/house-sfx';
import { HIDE_SEEK_MUSIC } from '../../../src/data/audio/music';

describe('recorded Hide and Seek sounds (owner, 19/11/2026)', () => {
  it.each(Object.entries(HOUSE_SFX))('%s has an Ogg with an MP3 fallback, at a sensible level', (_name, def) => {
    expect(def.ogg).toMatch(/\.ogg/);
    expect(def.mp3).toMatch(/\.mp3/);
    expect(def.level).toBeGreaterThan(0);
    expect(def.level).toBeLessThanOrEqual(1);
  });

  it('the background track loops over its whole length, from the start to the seam', () => {
    expect(HIDE_SEEK_MUSIC.loop).toEqual({ startS: 0, endS: 72.866939 });
    expect(HIDE_SEEK_MUSIC.ogg).toMatch(/music-hide-seek-house\.ogg/);
  });

  it('the wooden opening and closing sounds are short cuts, not the whole source recording (owner, 19/11/2026)', () => {
    // The source is 9.4 s (about 150 kB as MP3); the cuts are about 1.1 s and 0.5 s.
    const bytes = (f: string) => statSync(`assets/audio/sfx/hide-seek/wood/${f}`).size;
    expect(bytes('sfx-wood-open.mp3')).toBeLessThan(20_000);
    expect(bytes('sfx-wood-close.mp3')).toBeLessThan(10_000);
    expect(bytes('sfx-wood-close.mp3')).toBeLessThan(bytes('sfx-wood-open.mp3'));
  });
});
