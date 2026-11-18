import { describe, expect, it } from 'vitest';
import { HOUSE, HOUSE_PLAN } from '../../../src/data/arenas/house';
import { wallFades } from '../../../src/rendering/house-view';

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
