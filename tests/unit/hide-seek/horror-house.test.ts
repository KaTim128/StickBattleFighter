import { describe, expect, it } from 'vitest';
import { lampLevel } from '../../../src/app/scenes/hide-seek-scene';
import { HOUSE, HOUSE_PLAN } from '../../../src/data/arenas/house';
import { HideSeekGame } from '../../../src/modes/hide-seek/game';
import { HIDE_CUE_M, hideCues } from '../../../src/modes/hide-seek/hiding';
import { hash2 } from '../../../src/rendering/house-furniture';
import { buildingBounds, isFrontWallOf, onBuilding } from '../../../src/rendering/house-view';

describe('floating HIDE bubbles (owner, 18/11/2026)', () => {
  const g = new HideSeekGame(HOUSE_PLAN);
  const bed = g.spots.find((s) => s.spec.kind === 'under-bed' && s.floor === 1)!;

  it('shows near a hiding place and not far from it', () => {
    const near = hideCues(g.spots, bed.floor, { x: bed.spec.at.x, y: bed.spec.at.y + 1 }, true);
    expect(near.some((c) => c.spot.id === bed.id)).toBe(true);
    const far = hideCues(g.spots, bed.floor, { x: bed.spec.at.x + 30, y: bed.spec.at.y }, true);
    expect(far).toEqual([]);
    for (const c of near) expect(c.distM).toBeLessThanOrEqual(HIDE_CUE_M);
  });

  it('marks exactly the place the act key would use, nearest first', () => {
    const cues = hideCues(g.spots, bed.floor, { x: bed.spec.at.x, y: bed.spec.at.y + 0.9 }, true);
    expect(cues.filter((c) => c.inReach)).toHaveLength(1);
    expect(cues[0]!.distM).toBeLessThanOrEqual(cues[cues.length - 1]!.distM);
  });

  it('only shows places on the player floor, and nothing while hidden or carrying', () => {
    const upstairs = hideCues(g.spots, 1, { x: bed.spec.at.x, y: bed.spec.at.y }, true);
    expect(upstairs.every((c) => c.spot.floor === 1)).toBe(true);
    expect(hideCues(g.spots, 1, { x: bed.spec.at.x, y: bed.spec.at.y }, false)).toEqual([]);
  });

  it('every hiding place in the real house can show its bubble', () => {
    const real = new HideSeekGame();
    for (const s of real.spots) {
      const cues = hideCues(real.spots, s.floor, { x: s.spec.at.x, y: s.spec.at.y }, true);
      expect(
        cues.some((c) => c.spot.id === s.id && c.inReach),
        s.id,
      ).toBe(true);
    }
  });
});

describe('the building outline (walls the camera sees stand low)', () => {
  it('finds the outline of the real, scaled house and classifies its walls', () => {
    const b = buildingBounds(HOUSE);
    const plan = buildingBounds(HOUSE_PLAN);
    expect(b.x1 - b.x0).toBeCloseTo((plan.x1 - plan.x0) * (HOUSE.widthM / HOUSE_PLAN.widthM), 3);
    const outer = HOUSE.walls.filter((w) => w.kind === 'wall' && onBuilding(w, b) !== null);
    const inner = HOUSE.walls.filter((w) => w.kind === 'wall' && onBuilding(w, b) === null);
    expect(outer.some((w) => onBuilding(w, b) === 'front')).toBe(true);
    expect(outer.some((w) => onBuilding(w, b) === 'back')).toBe(true);
    // Interior walls are the majority of the wall segments in a house this size.
    expect(inner.length).toBeGreaterThan(5);
  });
});

describe('the flickering lamps', () => {
  it('are steady most of the time, dip now and then, and dip oftener when the hunter is close', () => {
    const dips = (threat: number) => {
      let n = 0;
      for (let t = 0; t < 60; t += 0.05) if (lampLevel(t, threat) < 0.95) n++;
      return n;
    };
    expect(lampLevel(3, 0)).toBe(1);
    expect(dips(0)).toBeGreaterThan(0);
    expect(dips(1)).toBeGreaterThan(dips(0));
    for (let t = 0; t < 60; t += 0.05) {
      const l = lampLevel(t, 1);
      expect(l).toBeGreaterThan(0.1);
      expect(l).toBeLessThanOrEqual(1);
    }
  });

  it('is deterministic, and the wear hash is stable', () => {
    expect(lampLevel(12.3, 0.4)).toBe(lampLevel(12.3, 0.4));
    expect(hash2(3, 4)).toBe(hash2(3, 4));
  });
});

describe('the front walls of the occupied room are see-through (owner, 18/11/2026)', () => {
  const kitchen = HOUSE_PLAN.rooms.find((r) => r.id === 'kitchen')!.rect;
  const walls = HOUSE_PLAN.walls.filter((w) => w.floor === 0);

  it("picks the room's south and east walls and no others", () => {
    const front = walls.filter((w) => isFrontWallOf(kitchen, w));
    expect(front.length).toBeGreaterThan(1);
    for (const w of front) {
      const south = Math.abs((w.y0 + w.y1) / 2 - kitchen.y1) <= 0.45 && w.x1 - w.x0 >= w.y1 - w.y0;
      const east = Math.abs((w.x0 + w.x1) / 2 - kitchen.x1) <= 0.45 && w.x1 - w.x0 < w.y1 - w.y0;
      expect(south || east).toBe(true);
    }
    // The north wall (y = 9) and the west wall (x = 19) are behind the room: they stay solid.
    expect(walls.some((w) => !isFrontWallOf(kitchen, w) && Math.abs((w.y0 + w.y1) / 2 - kitchen.y0) < 0.2)).toBe(true);
    expect(
      walls
        .filter((w) => isFrontWallOf(kitchen, w))
        .every((w) => (w.y0 + w.y1) / 2 > kitchen.y0 + 1 || (w.x0 + w.x1) / 2 > kitchen.x0 + 1),
    ).toBe(true);
  });
});
