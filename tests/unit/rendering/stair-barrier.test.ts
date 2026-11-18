import { describe, expect, it } from 'vitest';
import { HOUSE, HOUSE_PLAN } from '../../../src/data/arenas/house';
import { flightBackKey, wallFades } from '../../../src/rendering/house-view';
import { iso } from '../../../src/rendering/projection';

/** The staircase barrier never goes see-through, however near the player (owner, 18/11/2026). */
describe.each([
  ['the authored plan', HOUSE_PLAN],
  ['the real house', HOUSE],
])('stair barriers in %s', (_name, house) => {
  const ramp = house.stairs[0]!.ramp;
  const near = (w: { x0: number; x1: number; y0: number; y1: number }) =>
    w.x1 > ramp.x0 - 0.5 && w.x0 < ramp.x1 + 0.5 && w.y1 > ramp.y0 - 1.5 && w.y0 < ramp.y1 + 1;

  it('every rail and the block under the landing is opaque (never added to the fader)', () => {
    const barrier = house.walls.filter((w) => w.kind === 'rail' || (w.heightM === 3 && near(w)));
    expect(barrier.length).toBeGreaterThanOrEqual(4);
    for (const w of barrier) expect(wallFades(w), `${w.kind} at ${w.x0},${w.y0}`).toBe(false);
  });

  it('ordinary walls still fade in front of the player', () => {
    const plain = house.walls.filter((w) => w.kind === 'wall' && w.heightM !== 3);
    expect(plain.length).toBeGreaterThan(10);
    for (const w of plain) expect(wallFades(w)).toBe(true);
  });
});

describe.each([
  ['the authored plan', HOUSE_PLAN],
  ['the real house', HOUSE],
])('the back wall behind the stairs in %s (owner, 18/11/2026: it stays at the back)', (_name, house) => {
  const s = house.stairs[0]!;
  const ramp = s.ramp;
  // Every tread of the flight: its draw key as the house view computes it (the back edge of the tread at its top).
  const treadKeys = (): number[] => {
    const keys: number[] = [];
    for (let i = 0; i < 15; i++) {
      const t1 = (i + 1) / 15;
      const y0 = ramp.y1 - (ramp.y1 - ramp.y0) * t1;
      keys.push(iso(ramp.x1, y0, s.riseM * t1).y);
    }
    return keys;
  };

  it('the back wall is full height (not cut into a ledge) and is drawn behind every tread', () => {
    const back = house.walls.filter(
      (w) => w.floor === 0 && w.kind === 'wall' && w.y1 <= ramp.y0 + 0.05 && w.x0 < ramp.x1 && w.x1 > ramp.x0,
    );
    expect(back.length).toBeGreaterThanOrEqual(1);
    for (const w of back) {
      expect(w.heightM).toBeGreaterThan(2);
      const key = flightBackKey(w, house);
      expect(key, 'back wall gets a key').not.toBeNull();
      for (const k of treadKeys()) expect(key!).toBeLessThan(k);
    }
  });

  it('walls elsewhere keep their own key', () => {
    for (const w of house.walls) {
      if (w.floor === 0 && w.kind === 'wall' && w.y1 <= ramp.y0 + 0.05 && w.x0 < ramp.x1 && w.x1 > ramp.x0) continue;
      expect(flightBackKey(w, house), `${w.x0},${w.y0}`).toBeNull();
    }
  });
});
