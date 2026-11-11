import { describe, expect, it } from 'vitest';
import { buildNavGrid, isWalkable, walkableRegions } from '../../../src/arenas/navigation';
import { fromBoxFrame } from '../../../src/core/oriented-rect';
import type { ArenaLayout } from '../../../src/data/arenas/arena-layout';
import { OFFICE } from '../../../src/data/arenas/office';
import { TRAINING_YARD } from '../../../src/data/arenas/training-yard';
import { GREYBOX_STICKMAN } from '../../../src/data/fighters/greybox-stickman';
import { footprint, PROP_KINDS, type PropKindId } from '../../../src/data/objects/props';

const R = GREYBOX_STICKMAN.body.footRadiusM;
const ARENAS: ArenaLayout[] = [OFFICE, TRAINING_YARD];

describe('office arena content (owner layout, 11/11/2026)', () => {
  const desks = OFFICE.props.filter((p) => p.kind === 'desk');

  it('has 12 cubicles in the centre as six back-to-back pairs, one opening north and one south (owner)', () => {
    const mid = OFFICE.heightM / 2;
    expect(desks).toHaveLength(12);
    const north = desks.filter((d) => d.y < mid);
    const south = desks.filter((d) => d.y > mid);
    expect(north).toHaveLength(6);
    expect(south).toHaveLength(6);
    // Each north desk has a partner directly across the shared back panel.
    for (const n of north) expect(south.some((d) => Math.abs(d.x - n.x) < 1e-6)).toBe(true);
    const backs = OFFICE.props.filter((p) => p.kind === 'cubicle-panel' && !p.rotated && Math.abs(p.y - mid) < 1e-6);
    expect(backs).toHaveLength(6);
    for (const n of north) expect(backs.some((b) => Math.abs(b.x - n.x) < 1.4)).toBe(true);
    // In the centre: desks hug the back panels, well away from the outer walls.
    for (const d of desks) {
      expect(Math.abs(d.y - mid)).toBeLessThan(1);
      expect(d.y).toBeGreaterThan(3);
      expect(d.y).toBeLessThan(OFFICE.heightM - 3);
    }
    // Every cubicle has a chair, a computer, a keyboard, a mouse and a steel drawer pedestal.
    const door = OFFICE.doors![0]!;
    for (const kind of ['office-chair', 'computer', 'keyboard', 'mouse', 'drawer-unit'] as const) {
      expect(OFFICE.props.filter((p) => p.kind === kind && p.x < door.x0).length, kind).toBeGreaterThanOrEqual(12);
    }
  });

  it('boss room: executive desk with the boss chair behind it and two visitor chairs opposite, facing the door', () => {
    const one = (kind: PropKindId) => {
      const found = OFFICE.props.filter((p) => p.kind === kind);
      expect(found, kind).toHaveLength(1);
      return found[0]!;
    };
    const desk = one('executive-desk');
    const boss = one('boss-chair');
    const visitors = OFFICE.props.filter((p) => p.kind === 'visitor-chair'); // owner rearrangement, 11/11/2026
    expect(visitors).toHaveLength(2);
    const door = OFFICE.doors![0]!;
    expect(desk.x).toBeGreaterThan(door.x1); // in the boss room
    expect(boss.x).toBeGreaterThan(desk.x); // behind the desk (far side from the door)
    expect(Math.abs(boss.y - desk.y)).toBeLessThan(0.3);
    for (const v of visitors) {
      expect(v.x).toBeLessThan(desk.x); // opposite side, nearer the door
      expect(Math.abs(v.y - desk.y)).toBeLessThan(1); // either side of the desk's centre
    }
  });

  it('the two rooms look different (distinct floor and walls)', () => {
    const zone = OFFICE.floorZones!.find((z) => z.wall !== undefined)!; // the boss room
    const main = OFFICE.floorZones![0]!; // the main office's light-wood planks (TD-045)
    expect(zone.floor).not.toBe(main.floor);
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
  });

  it('computers and drawers break; steel drawers and office tables take far more damage (owner)', () => {
    expect(PROP_KINDS.computer.durability).toBeGreaterThan(0);
    expect(PROP_KINDS['drawer-unit'].material).toBe('metal');
    for (const tough of ['drawer-unit', 'cabinet', 'desk', 'executive-desk'] as const) {
      expect(PROP_KINDS[tough].durability, tough).toBeGreaterThanOrEqual(250);
      expect(PROP_KINDS[tough].durability!, tough).toBeGreaterThan(PROP_KINDS['office-chair'].durability! * 4);
    }
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
    const boss = { x: OFFICE.doors![0]!.x1 + 3, y: OFFICE.heightM / 2 }; // the open floor kept clear in front of the door
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
      // beside the chair, inside the cubicle (cubicles open away from the shared back panel)
      const y = desk.y < OFFICE.heightM / 2 ? desk.y - 1.05 : desk.y + 1.05;
      const x = desk.x + 0.55;
      expect(isWalkable(closed, x, y), `cubicle at ${desk.x},${desk.y}`).toBe(true);
      expect(c(x, y), `cubicle at ${desk.x},${desk.y}`).toBe(start);
    }
  });

  it('open aisles run along the north and south of the cubicle block, joined by walkways between the pairs', () => {
    const c = regionOf(closed);
    const start = c(OFFICE.playerStart.x, OFFICE.playerStart.y);
    for (let x = 2; x <= 21; x += 0.25) {
      for (const y of [1.6, 2.4, OFFICE.heightM - 1.6, OFFICE.heightM - 2.4]) {
        expect(isWalkable(closed, x, y), `${x},${y}`).toBe(true);
        expect(c(x, y), `${x},${y}`).toBe(start);
      }
    }
    // Walkways between the pairs cross from the north aisle to the south aisle.
    const mid = OFFICE.heightM / 2;
    const backs = OFFICE.props
      .filter((p) => p.kind === 'cubicle-panel' && !p.rotated && Math.abs(p.y - mid) < 1e-6)
      .sort((a, b) => a.x - b.x);
    for (let i = 0; i < backs.length - 1; i++) {
      const gapX = (backs[i]!.x + backs[i + 1]!.x) / 2;
      for (let y = 3; y <= OFFICE.heightM - 3; y += 0.25) {
        expect(isWalkable(closed, gapX, y), `walkway ${i} at ${gapX},${y}`).toBe(true);
        expect(c(gapX, y)).toBe(start);
      }
    }
  });

  it('stays compact: the cubicles take the centre and the office is at most 33 m long', () => {
    expect(OFFICE.widthM).toBeLessThanOrEqual(33);
    expect(OFFICE.heightM).toBeLessThanOrEqual(12);
  });
});

describe('Phase 7 throwables in the office (REQ-PHY-9)', () => {
  it('every cubicle desk has something extra to grab, and extinguishers stand by the walls', () => {
    const desks = OFFICE.props.filter((p) => p.kind === 'desk');
    const extras = OFFICE.props.filter((p) => ['book', 'stapler', 'water-bottle', 'paper-stack'].includes(p.kind));
    expect(extras.length).toBe(desks.length);
    for (const e of extras) expect(PROP_KINDS[e.kind].throwable).toBe(true);
    expect(OFFICE.props.filter((p) => p.kind === 'fire-extinguisher').length).toBeGreaterThanOrEqual(3);
  });
});

describe('boss-room doorway fits the curved wall (owner, 11/11/2026: no clipping)', () => {
  const door = OFFICE.doors![0]!;
  const corners = (r: Parameters<typeof fromBoxFrame>[0]) => [
    fromBoxFrame(r, r.x0, r.y0),
    fromBoxFrame(r, r.x1, r.y0),
    fromBoxFrame(r, r.x1, r.y1),
    fromBoxFrame(r, r.x0, r.y1),
  ];
  const near = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y) < 1e-6;

  it('each frame post meets the leaf end and the wall end face flush, at full wall thickness', () => {
    const walls = OFFICE.interiorWalls ?? [];
    expect(door.posts).toHaveLength(2);
    for (const post of door.posts!) {
      const [l0, l1, w0, w1] = post.corners;
      // Leaf side: straight across the doorway at the leaf's end, as thick as the wall (0.4 m).
      expect(Math.abs(l0!.y - l1!.y)).toBeLessThan(1e-9);
      expect(Math.hypot(l1!.x - l0!.x, l1!.y - l0!.y)).toBeCloseTo(0.4, 6);
      const leafEnd = Math.abs(l0!.y - door.y0) < 1e-6 ? door.y0 : door.y1;
      expect(Math.abs(l0!.y - leafEnd)).toBeLessThan(1e-6);
      // Wall side: exactly the two end corners of one curved wall piece.
      const owner = walls.find((w) => {
        const c = corners(w);
        return c.some((p) => near(p, w0!)) && c.some((p) => near(p, w1!));
      });
      expect(owner).toBeDefined();
    }
  });

  it('no wall piece reaches into the doorway', () => {
    for (const w of OFFICE.interiorWalls ?? []) {
      for (const p of corners(w)) {
        const inGap = p.y > door.y0 - 0.05 && p.y < door.y1 + 0.05; // the leaf's span (the posts fill the rest, tested above)
        const inWall = Math.abs(p.x - (door.x0 + door.x1) / 2) < 0.5;
        expect(inGap && inWall, `${p.x.toFixed(3)}, ${p.y.toFixed(3)}`).toBe(false);
      }
    }
  });
});
