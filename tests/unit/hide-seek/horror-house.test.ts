import { describe, expect, it } from 'vitest';
import { COMPLETE_COVER, lampLevel } from '../../../src/app/scenes/hide-seek-scene';
import { DOOR_FRACTION, FURNITURE_SCALE, HOUSE, HOUSE_PLAN, HOUSE_SCALE } from '../../../src/data/arenas/house';
import { HideSeekGame } from '../../../src/modes/hide-seek/game';
import { HIDE_CUE_M, hideCues } from '../../../src/modes/hide-seek/hiding';
import { BED_RAIL_TOP_M, hash2 } from '../../../src/rendering/house-furniture';
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

  it("picks walls along the room's south and east edges, and never its north or west ones", () => {
    const front = walls.filter((w) => isFrontWallOf(kitchen, w));
    expect(front.length).toBeGreaterThan(1);
    const mid = (w: { x0: number; x1: number; y0: number; y1: number }) => ({
      x: (w.x0 + w.x1) / 2,
      y: (w.y0 + w.y1) / 2,
    });
    for (const w of front) {
      const c = mid(w);
      expect(Math.abs(c.y - kitchen.y1) <= 0.45 || Math.abs(c.x - kitchen.x1) <= 0.45).toBe(true);
    }
    // The back (north) wall of the kitchen runs along y = 9: none of it is picked.
    const north = walls.filter((w) => Math.abs(mid(w).y - kitchen.y0) < 0.2 && w.x1 > kitchen.x0 && w.x0 < kitchen.x1);
    expect(north.length).toBeGreaterThan(0);
    expect(north.some((w) => isFrontWallOf(kitchen, w))).toBe(false);
  });
});

describe('hiding under a bed (owner, 18/11/2026): the whole body fits and is out of sight', () => {
  it.each([
    ['the authored plan', HOUSE_PLAN, 1],
    ['the real, roomier house', HOUSE, 1.8],
  ])('every bed in %s is a four-legged frame with room to crawl under', (_n, house, minLongSide) => {
    const beds = house.furniture.filter((f) => f.kind === 'bed');
    expect(beds.length).toBeGreaterThanOrEqual(2);
    for (const bed of beds) {
      // Four legs lift the rails to BED_RAIL_TOP_M: a body lying flat (about 0.3 m) fits with room to spare.
      expect(BED_RAIL_TOP_M, bed.id).toBeGreaterThanOrEqual(0.4);
      expect(bed.heightM, bed.id).toBeGreaterThan(BED_RAIL_TOP_M + 0.2);
      // The footprint is longer than a body, and the hiding point is well inside it (never at an edge, where legs would show).
      const long = Math.max(bed.x1 - bed.x0, bed.y1 - bed.y0);
      const wide = Math.min(bed.x1 - bed.x0, bed.y1 - bed.y0);
      expect(long, bed.id).toBeGreaterThanOrEqual(minLongSide + 0.3);
      expect(wide, bed.id).toBeGreaterThanOrEqual(0.9);
      const at = bed.hide!.at;
      const margin = Math.min(at.x - bed.x0, bed.x1 - at.x, at.y - bed.y0, bed.y1 - at.y);
      expect(margin, bed.id).toBeGreaterThanOrEqual(wide * 0.3);
      expect(bed.hide!.kind).toBe('under-bed');
      expect(bed.hide!.concealment).toBeGreaterThanOrEqual(0.85);
    }
  });

  it('the player figure is not drawn at all inside an under-bed hiding place', () => {
    expect(COMPLETE_COVER.has('under-bed')).toBe(true);
    // Partial cover (a curtain, a bush) leaves the figure dimly there; a closed place hides all of it.
    expect(COMPLETE_COVER.has('curtain')).toBe(false);
    expect(COMPLETE_COVER.has('bush')).toBe(false);
  });
});

describe('the bigger house has more to hide in', () => {
  it('has a fair number of hiding places (fewer after the rooms were reduced), spread over both floors (none outdoors)', () => {
    const spots = HOUSE.furniture.filter((f) => f.hide);
    expect(spots.length).toBeGreaterThanOrEqual(18);
    expect(spots.filter((f) => f.floor === 1).length).toBeGreaterThanOrEqual(6);
    expect(spots.filter((f) => f.floor === 0 && world(f)).length).toBe(0);
  });

  it('doors are two thirds of the width they were', () => {
    const scale = HOUSE_SCALE;
    for (const d of HOUSE.doors.filter((x) => x.kind === 'door')) {
      const plan = HOUSE_PLAN.doors.find((p) => p.id === d.id)!;
      const was = Math.max(plan.rect.x1 - plan.rect.x0, plan.rect.y1 - plan.rect.y0) * scale;
      const now = Math.max(d.rect.x1 - d.rect.x0, d.rect.y1 - d.rect.y0);
      expect(now / was, d.id).toBeCloseTo(DOOR_FRACTION, 2);
      // The walls beside it closed the rest of the opening: nothing but the door is left in the gap.
      const horiz = d.rect.x1 - d.rect.x0 >= d.rect.y1 - d.rect.y0;
      const mid = { x: (d.rect.x0 + d.rect.x1) / 2, y: (d.rect.y0 + d.rect.y1) / 2 };
      const probe = horiz ? { x: d.rect.x0 - 0.1, y: mid.y } : { x: mid.x, y: d.rect.y0 - 0.1 };
      expect(
        HOUSE.walls.some(
          (w) => w.floor === d.floor && probe.x >= w.x0 && probe.x <= w.x1 && probe.y >= w.y0 && probe.y <= w.y1,
        ),
        `${d.id}: wall closes beside the door`,
      ).toBe(true);
    }
  });

  it('rooms are bigger than before, and furniture is not (it keeps its natural size)', () => {
    const living = (h: typeof HOUSE) => h.rooms.find((r) => r.id === 'living')!.rect;
    const a = (r: { x0: number; x1: number; y0: number; y1: number }) => (r.x1 - r.x0) * (r.y1 - r.y0);
    expect(a(living(HOUSE)) / a(living(HOUSE_PLAN))).toBeCloseTo(HOUSE_SCALE ** 2, 2);
    const sofa = (h: typeof HOUSE) => h.furniture.find((f) => f.kind === 'sofa')!;
    const ratio = (sofa(HOUSE).x1 - sofa(HOUSE).x0) / (sofa(HOUSE_PLAN).x1 - sofa(HOUSE_PLAN).x0);
    expect(ratio).toBeCloseTo(FURNITURE_SCALE, 2);
    expect(HOUSE.furniture.length).toBeGreaterThanOrEqual(100);
  });
});

/** Indoors or in a yard (anything on the ground floor that is not a hall, toilet and so on): a place to hide outside is a bonus. */
const world = (f: { hide?: { kind: string } }): boolean =>
  f.hide?.kind === 'bush' || f.hide?.kind === 'shed-cabinet' || f.hide?.kind === 'box';

describe('front walls of the occupied room in the real, thick-walled house', () => {
  it("every block of the kitchen's south and east walls is picked, whatever its shape", () => {
    const kitchen = HOUSE.rooms.find((r) => r.id === 'kitchen')!.rect;
    // The real walls are thick, so a half-metre block of one is nearly square: its shape says nothing about its direction.
    const south = { x0: kitchen.x0 + 1, x1: kitchen.x0 + 1.47, y0: kitchen.y1 - 0.24, y1: kitchen.y1 + 0.24 };
    const east = { x0: kitchen.x1 - 0.24, x1: kitchen.x1 + 0.24, y0: kitchen.y0 + 1, y1: kitchen.y0 + 1.47 };
    const north = { x0: kitchen.x0 + 1, x1: kitchen.x0 + 1.47, y0: kitchen.y0 - 0.24, y1: kitchen.y0 + 0.24 };
    expect(isFrontWallOf(kitchen, south)).toBe(true);
    expect(isFrontWallOf(kitchen, east)).toBe(true);
    expect(isFrontWallOf(kitchen, north)).toBe(false);
  });
});

describe("the sofa to hide under, and Shroud's pace (owner, 18/11/2026)", () => {
  it('the sofa stands on legs with room to crawl under, and its hiding place is fully covered', async () => {
    const { SOFA_LIFT_M } = await import('../../../src/rendering/house-furniture');
    const { COMPLETE_COVER } = await import('../../../src/app/scenes/hide-seek-scene');
    expect(SOFA_LIFT_M).toBeGreaterThanOrEqual(0.35);
    const sofaSpot = HOUSE.furniture.find((f) => f.hide?.kind === 'under-sofa')!;
    expect(sofaSpot.kind).toBe('sofa');
    expect(COMPLETE_COVER.has('under-sofa')).toBe(true);
    // The spot sits well inside the sofa, not at an edge where legs would show.
    const at = sofaSpot.hide!.at;
    expect(
      Math.min(at.x - sofaSpot.x0, sofaSpot.x1 - at.x, at.y - sofaSpot.y0, sofaSpot.y1 - at.y),
    ).toBeGreaterThanOrEqual(0.3);
  });

  it('Shroud walks faster than a player can run', async () => {
    const { HUNTER_SPEED_MPS } = await import('../../../src/modes/hide-seek/hunter');
    const { RUN_MPS } = await import('../../../src/modes/hide-seek/game');
    expect(HUNTER_SPEED_MPS.walk).toBeGreaterThan(RUN_MPS);
    expect(HUNTER_SPEED_MPS.run).toBeGreaterThan(HUNTER_SPEED_MPS.walk);
  });
});
