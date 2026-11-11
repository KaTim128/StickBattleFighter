import { describe, expect, it } from 'vitest';
import { degreeMidi, eventsAt, STEPS_PER_BAR } from '../../../src/audio/music';
import { OFFICE } from '../../../src/data/arenas/office';
import { TRAINING_YARD } from '../../../src/data/arenas/training-yard';
import { MENU_MUSIC_ID, MUSIC_TRACKS } from '../../../src/data/audio/music-tracks';

const ARENAS = [OFFICE, TRAINING_YARD];

describe('background music (owner, 11/11/2026)', () => {
  it('the menu has its own theme and every map has its own, different fight track', () => {
    expect(MUSIC_TRACKS[MENU_MUSIC_ID]).toBeDefined();
    const ids = ARENAS.map((a) => a.music);
    for (const id of ids) {
      expect(id && MUSIC_TRACKS[id], `${id}`).toBeTruthy();
      expect(id).not.toBe(MENU_MUSIC_ID);
    }
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(Object.values(MUSIC_TRACKS))('$id is well formed', (t) => {
    const bars = t.progression.length;
    expect(bars).toBeGreaterThan(0);
    for (const p of [t.kick, t.snare, t.hat]) expect(p).toMatch(/^[xo.]{16}$/);
    expect(t.bass).toHaveLength(STEPS_PER_BAR);
    if (t.lead) expect(t.lead).toHaveLength(bars * STEPS_PER_BAR);
    expect(t.bpm).toBeGreaterThanOrEqual(60);
    expect(t.bpm).toBeLessThanOrEqual(180);
    for (const s of t.arpSteps) expect(s).toBeLessThan(STEPS_PER_BAR);
    // Every note it plays is in a sensible range.
    for (let step = 0; step < bars * STEPS_PER_BAR; step++) {
      for (const e of eventsAt(t, step)) {
        const notes = 'midi' in e ? [e.midi] : 'midis' in e ? e.midis : [];
        for (const m of notes) {
          expect(m).toBeGreaterThanOrEqual(28);
          expect(m).toBeLessThanOrEqual(96);
        }
      }
    }
  });

  it('fight tracks drive: a kick on the downbeat of every bar; the menu theme is slower and calmer', () => {
    const menu = MUSIC_TRACKS[MENU_MUSIC_ID]!;
    for (const a of ARENAS) {
      const t = MUSIC_TRACKS[a.music!]!;
      for (let bar = 0; bar < t.progression.length; bar++) {
        expect(eventsAt(t, bar * STEPS_PER_BAR).some((e) => e.voice === 'kick')).toBe(true);
      }
      expect(t.bpm).toBeGreaterThan(menu.bpm + 25);
    }
    const snares = Array.from({ length: STEPS_PER_BAR }, (_, s) => eventsAt(menu, s)).flat();
    expect(snares.some((e) => e.voice === 'snare')).toBe(false);
  });

  it('scale degrees map to notes and the loop repeats', () => {
    const t = MUSIC_TRACKS['office-fight']!;
    expect(degreeMidi(t, 0)).toBe(t.rootMidi);
    expect(degreeMidi(t, t.scale.length)).toBe(t.rootMidi + 12);
    const loop = t.progression.length * STEPS_PER_BAR;
    expect(eventsAt(t, 5 + loop)).toEqual(eventsAt(t, 5));
  });
});
