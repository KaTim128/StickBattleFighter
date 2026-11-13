import { describe, expect, it } from 'vitest';
import { leadingSilenceS, loopPoints, trackUrl } from '../../../src/audio/music';
import { OFFICE } from '../../../src/data/arenas/office';
import { TRAINING_YARD } from '../../../src/data/arenas/training-yard';
import { BATTLE_MUSIC, COUNTDOWN_WORDS_S, FIGHT_COUNTDOWN } from '../../../src/data/audio/music';

describe('battle music and the fight countdown (owner, 12/11/2026 and 13/11/2026)', () => {
  it("the office fights to the owner's Japanese boss track; the Testing Area stays without music (SUP-22)", () => {
    expect(OFFICE.music).toBe('japanese-boss');
    expect(BATTLE_MUSIC[OFFICE.music!]).toBeDefined();
    expect(TRAINING_YARD.music).toBeUndefined();
  });

  it('loops the body of the track after the intro, before its fade-out', () => {
    const loop = BATTLE_MUSIC['japanese-boss']!.loop!;
    expect(loop.startS).toBeGreaterThan(10); // the intro plays once
    expect(loop.endS - loop.startS).toBeGreaterThan(100); // a long loop, rarely heard twice in a fight
    expect(loop.endS).toBeLessThan(172); // the original fades out from about 172 s
  });

  it('plays Ogg Vorbis where the browser can, MP3 otherwise; the countdown voice rides over the music, words in order', () => {
    const def = BATTLE_MUSIC['japanese-boss']!;
    expect(trackUrl(def, () => 'probably')).toBe(def.ogg);
    expect(trackUrl(def, () => '')).toBe(def.mp3);
    expect(FIGHT_COUNTDOWN.level).toBeGreaterThan(def.level);
    const w = COUNTDOWN_WORDS_S;
    expect(w.three).toBeLessThan(w.two);
    expect(w.two).toBeLessThan(w.one);
    expect(w.one).toBeLessThan(w.fight);
  });

  it("skips an encoder's leading silence, shifting the intro and the loop with it (no gap, no clipped beat)", () => {
    const sr = 1000;
    const samples = new Float32Array(3000);
    samples.fill(0.2, 25); // 25 ms of padding, then sound
    const lead = leadingSilenceS(samples, sr);
    expect(lead).toBeCloseTo(0.025, 6);
    expect(loopPoints(3, lead, { startS: 1, endS: 2.5 })).toEqual({ offset: 0.025, start: 1.025, end: 2.525 });
    expect(loopPoints(3, 0, undefined)).toEqual({ offset: 0, start: 0, end: 3 });
    expect(loopPoints(2.5, 0.1, { startS: 1, endS: 2.5 }).end).toBe(2.5); // never past what was decoded
  });
});

describe('menu and battle music (owner, 13/11/2026)', () => {
  it('menus play the menu music; a started fight plays the battle music; after the battle the menu music returns', async () => {
    const { musicFor } = await import('../../../src/audio/music');
    expect(musicFor({ menusUp: true, fightStarted: false, battleOver: false })).toBe('menu');
    expect(musicFor({ menusUp: false, fightStarted: false, battleOver: false })).toBe('none'); // READY... silent
    expect(musicFor({ menusUp: false, fightStarted: true, battleOver: false })).toBe('battle');
    expect(musicFor({ menusUp: true, fightStarted: true, battleOver: false })).toBe('menu'); // left to the menu
    expect(musicFor({ menusUp: false, fightStarted: true, battleOver: true })).toBe('menu');
  });
});
