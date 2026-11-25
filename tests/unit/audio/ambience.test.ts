import { describe, expect, it } from 'vitest';
import { nextDelayS } from '../../../src/audio/ambience';
import { COLOSSEUM } from '../../../src/data/arenas/colosseum';
import { OFFICE } from '../../../src/data/arenas/office';
import { TRAINING_YARD } from '../../../src/data/arenas/training-yard';
import { AMBIENCES, AMBIENT_EVENTS } from '../../../src/data/audio/ambiences';

const ARENAS = [OFFICE, TRAINING_YARD];

it('the Colosseum uses the same quiet ambience as the Office, plus its battle music (owner, 25/11/2026)', () => {
  expect(COLOSSEUM.ambience).toBe(OFFICE.ambience);
  expect(COLOSSEUM.music).toBeDefined();
});

describe('background ambience, never music (owner, 12/11/2026)', () => {
  it('every map with a soundscape has its own, (the testing area has none, SUP-22)', () => {
    const ids = ARENAS.filter((a) => a.id !== 'training-yard').map((a) => a.ambience);
    expect(ARENAS.find((a) => a.id === 'training-yard')?.ambience).toBeUndefined();
    for (const id of ids) {
      expect(id && AMBIENCES[id], `${id}`).toBeTruthy();
    }
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(Object.values(AMBIENCES))('$id is well formed: beds and events only, sensible timings', (a) => {
    expect(a.beds.length).toBeGreaterThan(0);
    expect(a.level).toBeGreaterThan(0);
    expect(a.level).toBeLessThanOrEqual(1);
    expect(a.reverb.seconds).toBeGreaterThan(0.5);
    for (const bed of a.beds) {
      expect(['noise', 'hum']).toContain(bed.kind); // no note, melody or beat layers exist
      expect(bed.gain).toBeGreaterThan(0);
      expect(bed.gain).toBeLessThanOrEqual(1);
    }
    for (const e of a.events) {
      expect(AMBIENT_EVENTS).toContain(e.id);
      expect(e.everyS[0]).toBeGreaterThan(1); // occasional, never a steady pulse
      expect(e.everyS[1]).toBeGreaterThan(e.everyS[0]); // irregular: no fixed tempo
    }
  });

  it('the empty office is still: air, hum and the building settling; no people at all', () => {
    const office = AMBIENCES[OFFICE.ambience!]!;
    expect(office.events.map((e) => e.id)).toEqual(expect.arrayContaining(['creak', 'thump', 'tick']));
    expect(office.beds.some((b) => b.kind === 'hum')).toBe(true); // ventilation and mains hum
  });

  it('event timing is random within its range', () => {
    let s = 1;
    const rand = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    const seen = Array.from({ length: 200 }, () => nextDelayS([5, 12], rand));
    for (const d of seen) {
      expect(d).toBeGreaterThanOrEqual(5);
      expect(d).toBeLessThanOrEqual(12);
    }
    expect(Math.max(...seen) - Math.min(...seen)).toBeGreaterThan(5);
  });
});
