import { describe, expect, it } from 'vitest';
import { HOUSE, HOUSE_PLAN, HOUSE_SCALE } from '../../../src/data/arenas/house';
import { HideSeekGame } from '../../../src/modes/hide-seek/game';
import { exitPoint } from '../../../src/modes/hide-seek/hiding';
import { circleHitsRect, HouseWorld } from '../../../src/modes/hide-seek/world';

/** The real house is the authored plan made roomier (owner, 18/11/2026: a bigger, bungalow-sized house). */
describe('the roomier house', () => {
  const world = new HouseWorld(HOUSE);

  it('is the plan scaled up, with the same rooms, doors and hiding places', () => {
    expect(HOUSE_SCALE).toBeGreaterThan(1.3);
    expect(HOUSE.rooms.map((r) => r.id)).toEqual(HOUSE_PLAN.rooms.map((r) => r.id));
    expect(HOUSE.doors).toHaveLength(HOUSE_PLAN.doors.length);
    expect(HOUSE.furniture.filter((f) => f.hide)).toHaveLength(HOUSE_PLAN.furniture.filter((f) => f.hide).length);
    const living = (h: typeof HOUSE) => h.rooms.find((r) => r.id === 'living')!.rect;
    const area = (r: { x0: number; y0: number; x1: number; y1: number }) => (r.x1 - r.x0) * (r.y1 - r.y0);
    expect(area(living(HOUSE)) / area(living(HOUSE_PLAN))).toBeCloseTo(HOUSE_SCALE ** 2, 3);
  });

  it('starts, patrol points and throwables stand in the open', () => {
    for (const p of [HOUSE.playerStart, HOUSE.hunterStart, ...HOUSE.patrol])
      expect(world.fits(p.floor, p.x, p.y), `${p.x},${p.y}`).toBe(true);
    for (const t of HOUSE.throwables) expect(world.roomAt(t.floor, t.x, t.y), t.id).not.toBeNull();
  });

  it('no furniture overlaps a wall, and every hiding place has a free way out', () => {
    for (const f of HOUSE.furniture) {
      if (!f.solid) continue;
      for (const w of HOUSE.walls.filter((x) => x.floor === f.floor))
        expect(f.x0 < w.x1 - 0.01 && f.x1 > w.x0 + 0.01 && f.y0 < w.y1 - 0.01 && f.y1 > w.y0 + 0.01, f.id).toBe(false);
    }
    const g = new HideSeekGame();
    for (const s of g.spots) {
      const out = exitPoint(g.world, s);
      expect(g.world.fits(s.floor, out.x, out.y), s.id).toBe(true);
    }
  });

  it('every room can be walked to from the player start, upstairs included', () => {
    for (const r of HOUSE.rooms) {
      const at = { floor: r.floor, x: (r.rect.x0 + r.rect.x1) / 2, y: (r.rect.y0 + r.rect.y1) / 2 };
      // The middle of a room may be under a table; find any free point in it.
      let spot = at;
      for (let dx = -3; dx <= 3 && !world.fits(spot.floor, spot.x, spot.y, 0.4); dx += 0.5)
        spot = { ...at, x: at.x + dx };
      expect(world.route(HOUSE.playerStart, spot), r.id).not.toBeNull();
    }
    void circleHitsRect;
  });

  it('the hunter searches the real house: both floors, rooms and hiding places', () => {
    const g = new HideSeekGame();
    const ctx = {
      world: g.world,
      spots: g.spots,
      body: { floor: 1 as const, x: -50, y: -50, crouching: false, hiding: null },
      events: [],
      timeS: 0,
      openDoor: (id: string) => g.setDoor(id, true, 'hunter'),
      step: () => {},
    };
    for (let t = 0; t < 119; t += 1 / 30) g.hunter.step(1 / 30, { ...ctx, timeS: t });
    expect(g.hunter.searched.size).toBeGreaterThan(4);
    expect(g.hunter.inspected.size).toBeGreaterThan(2);
  });
});

/** Furniture has its own space (owner, 18/11/2026): nothing is stacked inside, or jammed against, something else. */
describe.each([
  ['the authored plan', HOUSE_PLAN],
  ['the real, roomier house', HOUSE],
])('furniture spacing in %s', (_name, house) => {
  const flat = new Set(['rug', 'lawn', 'path', 'curtain', 'shower-curtain']);
  const pieces = house.furniture.filter((f) => !flat.has(f.kind));

  it("no two pieces overlap or touch (a hand's breadth between them)", () => {
    const k = house.widthM / HOUSE_PLAN.widthM;
    for (let i = 0; i < pieces.length; i++)
      for (let j = i + 1; j < pieces.length; j++) {
        const a = pieces[i]!;
        const b = pieces[j]!;
        if (a.floor !== b.floor) continue;
        const gap = Math.max(Math.max(a.x0 - b.x1, b.x0 - a.x1), Math.max(a.y0 - b.y1, b.y0 - a.y1));
        expect(gap, `${a.id} and ${b.id}`).toBeGreaterThanOrEqual(0.09 * k);
      }
  });

  it('no piece sits in a doorway or on the stairs', () => {
    for (const f of pieces)
      for (const d of house.doors.filter((x) => x.floor === f.floor)) {
        const gap = Math.max(
          Math.max(f.x0 - d.rect.x1, d.rect.x0 - f.x1),
          Math.max(f.y0 - d.rect.y1, d.rect.y0 - f.y1),
        );
        expect(gap, `${f.id} and ${d.id}`).toBeGreaterThan(0);
      }
    for (const f of pieces)
      for (const s of house.stairs)
        if (f.floor === s.bottomFloor || f.floor === s.topFloor) {
          const gap = Math.max(
            Math.max(f.x0 - s.ramp.x1, s.ramp.x0 - f.x1),
            Math.max(f.y0 - s.ramp.y1, s.ramp.y0 - f.y1),
          );
          expect(gap, `${f.id} and the stairs`).toBeGreaterThan(0);
        }
  });
});
