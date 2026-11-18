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
});
