import type { FloorIndex, FurnitureDef, HouseDef, Rect, WallDef } from './house-types';

/**
 * Make a house layout roomier (owner, 18/11/2026: a bigger, bungalow-sized house with bigger rooms and more
 * furniture, narrower doors). The authored plan is stretched by `roomScale`; furniture only grows by
 * `furnitureScale` (a sofa should not become a ballroom bench), so each room has more floor to put things on:
 *  - a piece that stood against a wall stays against that wall (the gap to it scales with the furniture);
 *  - a piece that belongs with a larger piece beside it (chairs round a table, a nightstand by a bed) keeps its
 *    place relative to that piece;
 *  - anything else is centred where the stretched plan puts it;
 *  - doors become `doorFraction` of their width, and the wall on either side closes the rest of the opening.
 */
export interface ScaleOptions {
  readonly roomScale: number;
  readonly furnitureScale: number;
  readonly doorFraction: number;
}

type MutableWall = { -readonly [K in keyof WallDef]: WallDef[K] };

/** Pieces that are floor covering or hang from a wall: they are never the anchor another piece is placed against. */
const NOT_ANCHORS = new Set(['rug', 'lawn', 'path', 'curtain', 'shower-curtain']);
/** A piece this close (plan metres) to a wall counts as standing against it. */
const AGAINST_WALL_M = 0.35;
/** A smaller piece this close to a larger one belongs with it. */
const BELONGS_M = 0.75;

const area = (r: Rect): number => (r.x1 - r.x0) * (r.y1 - r.y0);
const gapBetween = (a: Rect, b: Rect): number =>
  Math.max(Math.max(a.x0 - b.x1, b.x0 - a.x1), Math.max(a.y0 - b.y1, b.y0 - a.y1));

export function scaleHouse(base: HouseDef, opts: ScaleOptions): HouseDef {
  const k = opts.roomScale;
  const fk = opts.furnitureScale;
  const r = <T extends Rect>(v: T): T => ({ ...v, x0: v.x0 * k, y0: v.y0 * k, x1: v.x1 * k, y1: v.y1 * k });
  const pt = <T extends { x: number; y: number }>(p: T): T => ({ ...p, x: p.x * k, y: p.y * k });

  const walls: MutableWall[] = base.walls.map((w) => ({ ...r(w) }));
  const doors = base.doors.map((d) => ({ ...d, rect: r(d.rect) }));
  narrowDoors(doors, walls, opts.doorFraction);

  const placed = placeFurniture(base, walls, k, fk);

  const out: HouseDef = {
    ...base,
    widthM: base.widthM * k,
    heightM: base.heightM * k,
    rooms: base.rooms.map((v) => ({ ...v, rect: r(v.rect) })),
    walls,
    doors,
    stairs: base.stairs.map((s) => ({ ...s, ramp: r(s.ramp) })),
    furniture: placed,
    throwables: base.throwables.map(pt),
    playerStart: pt(base.playerStart),
    hunterStart: pt(base.hunterStart),
    patrol: base.patrol.map(pt),
  };
  // Starts, patrol points and objects must not land inside the furniture that moved.
  const solids = (floor: FloorIndex) => placed.filter((f) => f.floor === floor && f.solid);
  const free = <T extends { floor: FloorIndex; x: number; y: number }>(p: T): T => nudgeClear(p, solids(p.floor), 0.45);
  return {
    ...out,
    throwables: out.throwables.map(free),
    playerStart: free(out.playerStart),
    hunterStart: free(out.hunterStart),
    patrol: out.patrol.map(free),
  };
}

/** Narrow every door, and let the walls beside it grow to meet the narrower leaf. */
function narrowDoors(
  doors: { id: string; floor: FloorIndex; kind: string; rect: Rect }[],
  walls: MutableWall[],
  fraction: number,
): void {
  for (const d of doors) {
    if (d.kind !== 'door') continue;
    const old = d.rect;
    const alongX = old.x1 - old.x0 >= old.y1 - old.y0;
    const len = alongX ? old.x1 - old.x0 : old.y1 - old.y0;
    const cut = (len * (1 - fraction)) / 2;
    d.rect = alongX ? { ...old, x0: old.x0 + cut, x1: old.x1 - cut } : { ...old, y0: old.y0 + cut, y1: old.y1 - cut };
    for (const w of walls) {
      if (w.floor !== d.floor) continue;
      const near = 0.05;
      if (alongX && w.y0 < old.y1 && w.y1 > old.y0) {
        if (Math.abs(w.x1 - old.x0) < near) w.x1 += cut;
        else if (Math.abs(w.x0 - old.x1) < near) w.x0 -= cut;
      } else if (!alongX && w.x0 < old.x1 && w.x1 > old.x0) {
        if (Math.abs(w.y1 - old.y0) < near) w.y1 += cut;
        else if (Math.abs(w.y0 - old.y1) < near) w.y0 -= cut;
      }
    }
  }
}

/** Where each piece goes in the roomier house (see the module comment for the rules). */
function placeFurniture(base: HouseDef, walls: readonly WallDef[], k: number, fk: number): FurnitureDef[] {
  // Largest first, so the piece something belongs with is already placed when it comes up.
  const order = base.furniture.map((f, i) => ({ f, i })).sort((a, b) => area(b.f) - area(a.f) || a.i - b.i);
  const result = new Map<number, FurnitureDef>();
  const planWalls = base.walls;

  for (const { f, i } of order) {
    const w = f.x1 - f.x0;
    const d = f.y1 - f.y0;
    let rect: Rect;
    if (f.kind === 'rug' || f.kind === 'lawn' || f.kind === 'path') {
      rect = { x0: f.x0 * k, y0: f.y0 * k, x1: f.x1 * k, y1: f.y1 * k };
    } else {
      const parent = NOT_ANCHORS.has(f.kind) ? null : belongsTo(f, i, order, result, base.furniture);
      if (parent) {
        const pf = parent.plan;
        const pr = parent.placed;
        rect = {
          x0: pr.x0 + (f.x0 - pf.x0) * fk,
          y0: pr.y0 + (f.y0 - pf.y0) * fk,
          x1: pr.x0 + (f.x1 - pf.x0) * fk,
          y1: pr.y0 + (f.y1 - pf.y0) * fk,
        };
      } else {
        const x = axis(f, 'x', f.floor, planWalls, walls, k, fk);
        const y = axis(f, 'y', f.floor, planWalls, walls, k, fk);
        rect = { x0: x[0], x1: x[1], y0: y[0], y1: y[1] };
      }
    }
    const scale = f.kind === 'rug' || f.kind === 'lawn' || f.kind === 'path' ? k : fk;
    const origin = { x: f.x0, y: f.y0 };
    const hide = f.hide
      ? {
          ...f.hide,
          at: { x: rect.x0 + (f.hide.at.x - origin.x) * scale, y: rect.y0 + (f.hide.at.y - origin.y) * scale },
        }
      : undefined;
    // A piece placed relative to its parent may have sizes off by rounding: take the sizes from the scale.
    const fixed: Rect = { x0: rect.x0, y0: rect.y0, x1: rect.x0 + w * scale, y1: rect.y0 + d * scale };
    result.set(i, { ...f, ...fixed, ...(hide ? { hide } : {}) });
  }
  return base.furniture.map((_, i) => result.get(i)!);
}

/** The already-placed larger piece this one belongs with (the nearest within `BELONGS_M`), if any. */
function belongsTo(
  f: FurnitureDef,
  index: number,
  order: readonly { f: FurnitureDef; i: number }[],
  placed: ReadonlyMap<number, FurnitureDef>,
  all: readonly FurnitureDef[],
): { plan: FurnitureDef; placed: FurnitureDef } | null {
  let best: { plan: FurnitureDef; placed: FurnitureDef; gap: number } | null = null;
  for (const { i } of order) {
    if (i === index) continue;
    const parent = placed.get(i);
    const plan = all[i]!;
    if (!parent || NOT_ANCHORS.has(plan.kind) || plan.floor !== f.floor) continue;
    if (area(plan) <= area(f)) continue;
    // A piece only belongs with the thing it is used with: not with a big wardrobe it happens to stand beside.
    if (!USED_WITH[f.kind]?.includes(plan.kind)) continue;
    const gap = gapBetween(f, plan);
    if (gap <= BELONGS_M && (!best || gap < best.gap)) best = { plan, placed: parent, gap };
  }
  return best;
}

/** What a piece of furniture is placed together with (it keeps its place beside the first of these it stands by). */
const USED_WITH: Partial<Record<FurnitureDef['kind'], readonly FurnitureDef['kind'][]>> = {
  chair: ['dining-table', 'desk', 'garden-table', 'counter'],
  nightstand: ['bed'],
  armchair: ['coffee-table', 'sofa'],
  sofa: ['coffee-table'],
  'side-table': ['sofa', 'armchair', 'bed'],
  'coffee-table': ['sofa'],
  sink: ['counter'],
  stove: ['counter'],
  counter: ['counter'],
  'floor-lamp': ['sofa', 'armchair'],
  chest: ['bed'],
  bench: ['garden-table'],
  box: ['box'],
};

/**
 * One axis of a free piece: against a wall it stays against it (the gap scales with the furniture); otherwise it
 * is centred where the stretched plan puts its centre. `f` is the piece in plan metres.
 */
function axis(
  f: Rect,
  which: 'x' | 'y',
  floor: FloorIndex,
  planWalls: readonly WallDef[],
  walls: readonly WallDef[],
  k: number,
  fk: number,
): [number, number] {
  const lo = which === 'x' ? f.x0 : f.y0;
  const hi = which === 'x' ? f.x1 : f.y1;
  const size = (hi - lo) * fk;
  let best: { gap: number; edge: number; side: 'lo' | 'hi' } | null = null;
  for (let wi = 0; wi < planWalls.length; wi++) {
    const w = planWalls[wi]!;
    if (w.floor !== floor) continue;
    // A wall that stands across this axis: thin along it, and long enough to run beside the piece on the other one.
    const thin = which === 'x' ? w.x1 - w.x0 < w.y1 - w.y0 : w.y1 - w.y0 < w.x1 - w.x0;
    if (!thin) continue;
    const overlap =
      which === 'x' ? Math.min(w.y1, f.y1) - Math.max(w.y0, f.y0) : Math.min(w.x1, f.x1) - Math.max(w.x0, f.x0);
    if (overlap < 0.05) continue;
    const wLo = which === 'x' ? w.x0 : w.y0;
    const wHi = which === 'x' ? w.x1 : w.y1;
    const sw = walls[wi]!;
    const sLo = which === 'x' ? sw.x0 : sw.y0;
    const sHi = which === 'x' ? sw.x1 : sw.y1;
    const gapLo = lo - wHi; // the wall is on the low side
    const gapHi = wLo - hi; // the wall is on the high side
    if (gapLo >= -0.08 && gapLo <= AGAINST_WALL_M && (!best || gapLo < best.gap))
      best = { gap: gapLo, edge: sHi, side: 'lo' };
    if (gapHi >= -0.08 && gapHi <= AGAINST_WALL_M && (!best || gapHi < best.gap))
      best = { gap: gapHi, edge: sLo, side: 'hi' };
  }
  if (!best) return centred(lo, hi, k, fk);
  const gap = Math.max(0, best.gap) * fk;
  return best.side === 'lo' ? [best.edge + gap, best.edge + gap + size] : [best.edge - gap - size, best.edge - gap];
}

const centred = (lo: number, hi: number, k: number, fk: number): [number, number] => {
  const c = ((lo + hi) / 2) * k;
  const s = ((hi - lo) * fk) / 2;
  return [c - s, c + s];
};

/** Nudge a point out of any solid furniture (and a margin round it) by the shortest step found. */
function nudgeClear<T extends { x: number; y: number }>(p: T, solids: readonly Rect[], margin: number): T {
  const inside = (x: number, y: number) =>
    solids.some((s) => x > s.x0 - margin && x < s.x1 + margin && y > s.y0 - margin && y < s.y1 + margin);
  if (!inside(p.x, p.y)) return p;
  for (let r = 0.25; r <= 4; r += 0.25)
    for (let a = 0; a < 24; a++) {
      const x = p.x + Math.cos((a / 24) * Math.PI * 2) * r;
      const y = p.y + Math.sin((a / 24) * Math.PI * 2) * r;
      if (!inside(x, y)) return { ...p, x, y };
    }
  return p;
}
