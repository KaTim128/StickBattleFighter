import { describe, expect, it } from 'vitest';
import { HOUSE, HOUSE_PLAN } from '../../../src/data/arenas/house';
import { splitBehindStairs, wallFades } from '../../../src/rendering/house-view';

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
])('the wall at the head of the stairs in %s (owner, 18/11/2026: no floating wall over the steps)', (_name, house) => {
  const ramp = house.stairs[0]!.ramp;

  it('only the stretch behind the flight (the back wall of the hall) is drawn low; the rest keeps its height', () => {
    const back = house.walls.filter(
      (w) => w.floor === 0 && w.kind === 'wall' && w.y1 <= ramp.y0 && w.x0 < ramp.x0 && w.x1 > ramp.x1,
    );
    expect(back.length).toBeGreaterThanOrEqual(1);
    for (const w of back) {
      const pieces = splitBehindStairs(w, house);
      const low = pieces.filter((p) => p.low);
      expect(low).toHaveLength(1);
      expect(low[0]!.wall.x0).toBeLessThanOrEqual(ramp.x0);
      expect(low[0]!.wall.x1).toBeGreaterThanOrEqual(ramp.x1);
      // The low stretch runs from corner to corner of the room the flight stands in (the hall), no further.
      const hall = house.rooms.find(
        (r) =>
          r.floor === 0 && r.rect.x0 <= ramp.x0 && r.rect.x1 >= ramp.x1 && r.rect.y0 <= ramp.y0 && r.rect.y1 >= ramp.y1,
      )!.rect;
      expect(low[0]!.wall.x0).toBeGreaterThanOrEqual(hall.x0 - 0.01);
      expect(low[0]!.wall.x1).toBeLessThanOrEqual(hall.x1 + 0.5);
      // No full-height sliver is left standing as a post at either end.
      for (const p of pieces.filter((q) => !q.low)) expect(p.wall.x1 - p.wall.x0).toBeGreaterThanOrEqual(0.6);
      // The pieces cover the whole wall with no gap.
      const covered = pieces.reduce((sum, p) => sum + (p.wall.x1 - p.wall.x0), 0);
      expect(covered).toBeCloseTo(w.x1 - w.x0, 6);
    }
  });

  it('no other wall is touched, upstairs or down', () => {
    for (const w of house.walls) {
      if (w.floor === 0 && w.y1 <= ramp.y0 && ramp.y0 - w.y1 <= 2.5 && w.x0 < ramp.x1 && w.x1 > ramp.x0) continue;
      expect(splitBehindStairs(w, house).some((p) => p.low)).toBe(false);
    }
  });
});
