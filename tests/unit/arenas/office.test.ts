import { describe, expect, it } from 'vitest';
import { buildNavGrid, isWalkable, walkableRegions } from '../../../src/arenas/navigation';
import type { ArenaLayout } from '../../../src/data/arenas/arena-layout';
import { OFFICE } from '../../../src/data/arenas/office';
import { TRAINING_YARD } from '../../../src/data/arenas/training-yard';
import { GREYBOX_STICKMAN } from '../../../src/data/fighters/greybox-stickman';
import { footprint, PROP_KINDS, type PropKindId } from '../../../src/data/objects/props';

const R = GREYBOX_STICKMAN.body.footRadiusM;
const ARENAS: ArenaLayout[] = [OFFICE, TRAINING_YARD];

describe('office arena content (owner layout, 11/11/2026)', () => {
  const desks = OFFICE.props.filter((p) => p.kind === 'desk');

  it('has 12 cubicles: 6 along the top and 6 along the bottom', () => {
    expect(desks).toHaveLength(12);
    expect(desks.filter((d) => d.y < OFFICE.heightM / 2)).toHaveLength(6);
    expect(desks.filter((d) => d.y > OFFICE.heightM / 2)).toHaveLength(6);
    // every cubicle has a chair, a computer, a keyboard and a mouse
    for (const kind of ['office-chair', 'computer', 'keyboard', 'mouse'] as const) {
      expect(OFFICE.props.filter((p) => p.kind === kind && p.x < 21).length, kind).toBeGreaterThanOrEqual(12);
    }
    expect(OFFICE.props.filter((p) => p.kind === 'cubicle-panel').length).toBeGreaterThanOrEqual(12 + 14);
  });

  it('boss room: executive desk with the boss chair behind it and a visitor chair opposite, facing the door', () => {
    const one = (kind: PropKindId) => {
      const found = OFFICE.props.filter((p) => p.kind === kind);
      expect(found, kind).toHaveLength(1);
      return found[0]!;
    };
    const desk = one('executive-desk');
    const boss = one('boss-chair');
    const visitor = one('visitor-chair');
    const door = OFFICE.doors![0]!;
    expect(desk.x).toBeGreaterThan(door.x1); // in the boss room
    expect(boss.x).toBeGreaterThan(desk.x); // behind the desk (far side from the door)
    expect(visitor.x).toBeLessThan(desk.x); // opposite side, nearer the door
    expect(Math.abs(boss.y - desk.y)).toBeLessThan(0.3);
    expect(Math.abs(visitor.y - desk.y)).toBeLessThan(0.3);
  });

  it('the two rooms look different (distinct floor and walls)', () => {
    const zone = OFFICE.floorZones![0]!;
    expect(zone.floor).not.toBe(OFFICE.look.floor);
    expect(zone.wall).toBeDefined();
    expect(zone.wall).not.toBe(OFFICE.look.wall);
    expect(zone.planks).toBe(true);
    expect(OFFICE.props.some((p) => p.kind === 'rug' && p.x > zone.x0)).toBe(true);
  });

  it('records material, mass and durability for every prop kind (for Phase 7)', () => {
    for (const [id, k] of Object.entries(PROP_KINDS)) {
      expect(k.massKg, id).toBeGreaterThan(0);
      expect(k.durability === null || k.durability > 0, id).toBe(true);
    }
    expect(PROP_KINDS['glass-partition'].durability!).toBeLessThan(PROP_KINDS.desk.durability!);
    expect(PROP_KINDS.cabinet.durability).toBeNull();
  });
});

describe.each(ARENAS.map((a) => [a.id, a] as const))('%s layout is valid', (_id, arena) => {
  it('keeps every prop inside the walls', () => {
    for (const p of arena.props) {
      const f = footprint(p);
      expect(p.x - f.w / 2, `${p.kind}@${p.x},${p.y}`).toBeGreaterThanOrEqual(-1e-9);
      expect(p.x + f.w / 2, `${p.kind}@${p.x},${p.y}`).toBeLessThanOrEqual(arena.widthM + 1e-9);
      expect(p.y - f.d / 2, `${p.kind}@${p.x},${p.y}`).toBeGreaterThanOrEqual(-1e-9);
      expect(p.y + f.d / 2, `${p.kind}@${p.x},${p.y}`).toBeLessThanOrEqual(arena.heightM + 1e-9);
    }
  });

  it('has no solid floor props overlapping each other', () => {
    const solids = arena.props.filter((p) => PROP_KINDS[p.kind].solid && (p.elevationM ?? 0) === 0);
    for (let i = 0; i < solids.length; i++) {
      for (let j = i + 1; j < solids.length; j++) {
        const a = solids[i]!;
        const b = solids[j]!;
        const fa = footprint(a);
        const fb = footprint(b);
        const overlapX = Math.abs(a.x - b.x) < (fa.w + fb.w) / 2 - 1e-6;
        const overlapY = Math.abs(a.y - b.y) < (fa.d + fb.d) / 2 - 1e-6;
        expect(overlapX && overlapY, `${a.kind}@${a.x},${a.y} vs ${b.kind}@${b.x},${b.y}`).toBe(false);
      }
    }
  });

  it('starts the player and the dummy on open floor', () => {
    const grid = buildNavGrid(arena, R);
    expect(isWalkable(grid, arena.playerStart.x, arena.playerStart.y)).toBe(true);
    expect(isWalkable(grid, arena.dummyStart.x, arena.dummyStart.y)).toBe(true);
  });

  it('is fully explorable once doors are open: all walkable floor is one connected area', () => {
    const grid = buildNavGrid(arena, R, 0.2, true);
    const { sizes } = walkableRegions(grid);
    // Allow only crumbs (< 0.25 m², e.g. a corner between a plant and a wall); no real rooms cut off.
    const pockets = sizes.filter((s) => s * grid.cellM * grid.cellM >= 0.25);
    expect(pockets, `walkable regions (m²): ${sizes.map((s) => (s * grid.cellM ** 2).toFixed(2))}`).toHaveLength(1);
  });
});

describe('office zones', () => {
  const closed = buildNavGrid(OFFICE, R);
  const open = buildNavGrid(OFFICE, R, 0.2, true);
  const regionOf = (grid: typeof closed) => {
    const { region } = walkableRegions(grid);
    return (x: number, y: number) => region[Math.floor(y / grid.cellM) * grid.cols + Math.floor(x / grid.cellM)];
  };

  it('the closed door seals off the boss room; once broken, the rooms connect', () => {
    const c = regionOf(closed);
    const o = regionOf(open);
    const main = OFFICE.playerStart;
    const boss = { x: 24, y: 9 };
    expect(isWalkable(closed, boss.x, boss.y)).toBe(true);
    expect(c(boss.x, boss.y)).not.toBe(c(main.x, main.y));
    expect(o(boss.x, boss.y)).toBe(o(main.x, main.y));
    const pockets = walkableRegions(closed).sizes.filter((s) => s * closed.cellM ** 2 >= 0.25);
    expect(pockets).toHaveLength(2); // exactly two rooms
  });

  it('every cubicle can be walked into from the aisle', () => {
    const c = regionOf(closed);
    const start = c(OFFICE.playerStart.x, OFFICE.playerStart.y);
    for (const desk of OFFICE.props.filter((p) => p.kind === 'desk')) {
      // a spot beside the chair, inside the cubicle
      const y = desk.y < OFFICE.heightM / 2 ? desk.y + 1.0 : desk.y - 1.0;
      const x = desk.x + 0.9;
      expect(isWalkable(closed, x, y), `cubicle at ${desk.x},${desk.y}`).toBe(true);
      expect(c(x, y), `cubicle at ${desk.x},${desk.y}`).toBe(start);
    }
  });

  it('the central aisle is an open but tight combat zone (clear 14 m × 4 m, at most 7 m tall)', () => {
    for (let x = 4; x <= 18; x += 0.2) {
      for (let y = 4; y <= 8; y += 0.2) expect(isWalkable(closed, x, y), `${x},${y}`).toBe(true);
    }
  });

  it('is compact (owner, 11/11/2026): a short office and a tight aisle between the cubicle rows', () => {
    expect(OFFICE.widthM).toBeLessThanOrEqual(30);
    const panels = OFFICE.props.filter((p) => p.kind === 'cubicle-panel' && p.rotated);
    const topEdge = Math.max(...panels.filter((p) => p.y < OFFICE.heightM / 2).map((p) => p.y + footprint(p).d / 2));
    const bottomEdge = Math.min(...panels.filter((p) => p.y > OFFICE.heightM / 2).map((p) => p.y - footprint(p).d / 2));
    expect(bottomEdge - topEdge).toBeLessThanOrEqual(7.5);
  });
});
