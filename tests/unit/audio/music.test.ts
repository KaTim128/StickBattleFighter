import { describe, expect, it } from 'vitest';
import { leadingSilenceS, loopPoints, trackUrl } from '../../../src/audio/music';
import { OFFICE } from '../../../src/data/arenas/office';
import { TRAINING_YARD } from '../../../src/data/arenas/training-yard';
import { BATTLE_MUSIC, FIGHT_STINGER } from '../../../src/data/audio/music';

describe('battle music and the fight stinger (owner, 12/11/2026)', () => {
  it('the office fights to "Steel Rain"; the Testing Area stays without music (SUP-22)', () => {
    expect(OFFICE.music).toBe('steel-rain');
    expect(BATTLE_MUSIC[OFFICE.music!]).toBeDefined();
    expect(TRAINING_YARD.music).toBeUndefined();
  });

  it('loops on the bar: 32 bars of 4 beats at 92 BPM', () => {
    expect(BATTLE_MUSIC['steel-rain']!.loopS).toBeCloseTo(83.478, 3);
  });

  it('plays Ogg Vorbis where the browser can, MP3 otherwise', () => {
    const def = BATTLE_MUSIC['steel-rain']!;
    expect(trackUrl(def, () => 'probably')).toBe(def.ogg);
    expect(trackUrl(def, () => '')).toBe(def.mp3);
    expect(FIGHT_STINGER.level).toBeGreaterThan(BATTLE_MUSIC['steel-rain']!.level); // the stinger rides over the music
  });

  it('skips an encoder’s leading silence, then loops exactly the musical length (no gap, no clipped bar)', () => {
    const sr = 1000;
    const samples = new Float32Array(3000);
    samples.fill(0.2, 25); // 25 ms of padding, then sound
    const lead = leadingSilenceS(samples, sr);
    expect(lead).toBeCloseTo(0.025, 6);
    expect(loopPoints(3, lead, 2.5)).toEqual({ start: 0.025, end: 2.525 });
    expect(loopPoints(3, 0, undefined)).toEqual({ start: 0, end: 3 }); // no length given: the whole buffer
    expect(loopPoints(2.5, 0.1, 2.5).end).toBe(2.5); // never past the end of what was decoded
  });
});
