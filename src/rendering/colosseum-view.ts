import { Container, Graphics } from 'pixi.js';
import { COLOSSEUM_WALL_T } from '../data/arenas/colosseum';
import { shade } from './iso-draw';
import { iso } from './projection';

/**
 * The Colosseum's look (owner, 25/11/2026). Everything here is drawn once from the round arena's centre and radius:
 * - the weathered floor's dressing: drifts of pale sand and dust, cracks, a shadow where the stone meets the wall;
 * - the tall back wall in golden sand brick: a ground tier of arches, a set-back upper tier of windows and pilasters, a cornice, and
 *   tiers of spectator seating rising behind it to a parapet;
 * - the near wall, kept low (under a metre) so it never hides the fight, with brick courses and a worn top.
 * The ring's collision is `interiorWalls` (see src/data/arenas/colosseum.ts); the pieces are `hidden` and drawn here.
 */
const GOLD = 0xd9ac5c;
const GOLD_LIGHT = 0xe9c680;
const GOLD_DARK = 0xb98b40;
const MORTAR = 0x93702f;
const SAND_STONE = 0xd9c7a1;
const SAND_LIGHT = 0xe6d8b6;
const TERRACOTTA = 0xb7794d;
const OPENING = 0x2b1d14;
const OPENING_DEEP = 0x1a110b;

/** Wall tiers, metres. */
const GROUND_TIER_M = 2.6;
const UPPER_TIER_M = 5.2;
const FRONT_WALL_M = 0.9;
const SEAT_ROWS = 5;
const SEAT_DEPTH_M = 1.5;
const SEAT_RISE_M = 0.85;
/**
 * The camera looks in from the south-east, so a wall on that half of the ring stands between the camera and the floor: drawn tall, its top
 * and ledge would paint over the floor and make fighters look as though they stand on it. That half is drawn low, with its outer face to
 * the camera; only the true back wall (the half away from the camera) is drawn tall with its inner face and arches. `cos + sin` of the
 * wall's angle is how far it lies toward the camera (its ledge, 2.6 m up, covers floor once this passes about 0.25).
 */
const FRONT_FROM = 0.2;
const SEGMENTS = 96;

type Point = { x: number; y: number };

/** A small seeded random generator, so the arena looks the same every time. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface ColosseumLayers {
  /** Floor dressing, in floor metres (the floor layer's own transform). */
  readonly floor: Container;
  /** Tall wall and seating behind the fight (view space, under the fighters). */
  readonly back: Graphics;
  /** The low near wall (view space, over the fighters). */
  readonly front: Graphics;
}

export function buildColosseum(round: { cx: number; cy: number; radiusM: number }): ColosseumLayers {
  const floor = new Container();
  floor.label = 'colosseum-floor';
  floor.addChild(floorDressing(round));
  // Sand and dust never spill past the rim of the stone floor: the dressing is clipped to the circle.
  const clip = new Graphics().circle(round.cx, round.cy, round.radiusM).fill(0xffffff);
  floor.addChild(clip);
  floor.mask = clip;
  const back = new Graphics();
  back.label = 'colosseum-back';
  const front = new Graphics();
  front.label = 'colosseum-front';
  drawWalls(back, front, round);
  return { floor, back, front };
}

// ---------------------------------------------------------------------------------------------------------------- the floor

function floorDressing(round: { cx: number; cy: number; radiusM: number }): Graphics {
  const { cx, cy, radiusM: R } = round;
  const g = new Graphics();
  const rand = rng(1103);
  // Where the worn stone meets the wall: a soft dark rim.
  for (let i = 0; i < 4; i++)
    g.circle(cx, cy, R - 0.25 - i * 0.35).stroke({ width: 0.6, color: 0x000000, alpha: 0.07 });
  // Thin, uneven drifts of pale sand and dust, thicker toward the edge, with a few out on the floor, never a full cover.
  for (let i = 0; i < 26; i++) {
    const edge = rand() < 0.7;
    const a = rand() * Math.PI * 2;
    const rad = edge ? R * (0.74 + rand() * 0.22) : R * (0.25 + rand() * 0.45);
    const bx = cx + Math.cos(a) * rad;
    const by = cy + Math.sin(a) * rad;
    const size = edge ? 1.6 + rand() * 2.6 : 0.9 + rand() * 1.5;
    const pts: number[] = [];
    const n = 11;
    const wob = Array.from({ length: n }, () => 0.55 + rand() * 0.75);
    for (let k = 0; k < n; k++) {
      const t = (k / n) * Math.PI * 2;
      pts.push(bx + Math.cos(t) * size * wob[k]! * 1.25, by + Math.sin(t) * size * wob[k]! * 0.9);
    }
    g.poly(pts).fill({ color: 0xd9c8a0, alpha: 0.3 + rand() * 0.2 });
    g.poly(pts.map((v, k) => (k % 2 === 0 ? bx + (v - bx) * 0.6 : by + (v - by) * 0.6))).fill({
      color: 0xe8dbb8,
      alpha: 0.28,
    });
  }
  // Dust and grit scattered across the stone.
  for (let i = 0; i < 380; i++) {
    const a = rand() * Math.PI * 2;
    const rad = Math.sqrt(rand()) * (R - 0.5);
    g.circle(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, 0.03 + rand() * 0.06).fill({
      color: rand() < 0.5 ? 0xe2d4ae : 0x6e6a62,
      alpha: 0.28 + rand() * 0.25,
    });
  }
  // Cracks running across the slabs, some forking, and chipped slab corners.
  for (let i = 0; i < 20; i++) {
    const a = rand() * Math.PI * 2;
    const rad = Math.sqrt(rand()) * (R - 1.5);
    let x = cx + Math.cos(a) * rad;
    let y = cy + Math.sin(a) * rad;
    let dir = rand() * Math.PI * 2;
    const steps = 4 + Math.floor(rand() * 5);
    g.moveTo(x, y);
    const forks: Point[] = [];
    for (let k = 0; k < steps; k++) {
      dir += (rand() - 0.5) * 1.1;
      x += Math.cos(dir) * (0.35 + rand() * 0.6);
      y += Math.sin(dir) * (0.35 + rand() * 0.6);
      g.lineTo(x, y);
      if (rand() < 0.3) forks.push({ x, y });
    }
    g.stroke({ width: 0.035, color: 0x56595d, alpha: 0.75, join: 'round' });
    for (const f of forks) {
      const d2 = dir + (rand() < 0.5 ? 1 : -1) * (0.6 + rand() * 0.6);
      g.moveTo(f.x, f.y)
        .lineTo(f.x + Math.cos(d2) * (0.3 + rand() * 0.5), f.y + Math.sin(d2) * (0.3 + rand() * 0.5))
        .stroke({ width: 0.025, color: 0x56595d, alpha: 0.65 });
    }
  }
  // A faint, worn ring where the fighters' circle was once marked in the sand.
  g.circle(cx, cy, R * 0.52).stroke({ width: 0.12, color: 0xd9c8a0, alpha: 0.1 });
  return g;
}

// ---------------------------------------------------------------------------------------------------------------- the walls

function drawWalls(back: Graphics, front: Graphics, round: { cx: number; cy: number; radiusM: number }): void {
  const { cx, cy, radiusM: R } = round;
  const T = COLOSSEUM_WALL_T;
  const rand = rng(77);
  /** A point on the wall at angle `a`, distance `rad` from the centre and height `z`. */
  const P = (a: number, rad: number, z: number): Point => iso(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, z);
  const quad = (
    g: Graphics,
    a0: number,
    a1: number,
    r0: number,
    r1: number,
    z0: number,
    z1: number,
    c: number,
    alpha = 1,
  ): void => {
    // r0/z0 at the first edge of the strip, r1/z1 at the second (a vertical face uses r0 = r1; a floor ring uses z0 = z1).
    const p = [P(a0, r0, z0), P(a1, r0, z0), P(a1, r1, z1), P(a0, r1, z1)];
    g.poly(p.flatMap((q) => [q.x, q.y])).fill({ color: c, alpha });
  };
  const seg = (i: number): [number, number, number] => {
    const a0 = (i / SEGMENTS) * Math.PI * 2;
    const a1 = ((i + 1) / SEGMENTS) * Math.PI * 2;
    return [a0, a1, (a0 + a1) / 2];
  };
  /** The light falls from the top left: walls facing it are brighter. */
  const lit = (mid: number): number => {
    const nx = -Math.cos(mid);
    const ny = -Math.sin(mid);
    return 0.92 + 0.2 * ((nx + ny) * Math.SQRT1_2) * -1;
  };
  const isFront = (mid: number): boolean => Math.cos(mid) + Math.sin(mid) > FRONT_FROM;
  const backSegs: number[] = [];
  const frontSegs: number[] = [];
  for (let i = 0; i < SEGMENTS; i++) (isFront(seg(i)[2]) ? frontSegs : backSegs).push(i);

  // ----- Spectator tiers, outermost first so nearer rows draw over farther ones.
  const rIn = R + T + 0.9; // the upper tier is set back behind the ground tier's top
  const seatBase = UPPER_TIER_M + 0.15;
  for (let row = SEAT_ROWS - 1; row >= 0; row--) {
    const r0 = rIn + row * SEAT_DEPTH_M;
    const r1 = r0 + SEAT_DEPTH_M;
    const z = seatBase + (row + 1) * SEAT_RISE_M;
    for (const i of backSegs) {
      const [a0, a1, mid] = seg(i);
      const k = lit(mid);
      // The riser (facing the arena) and the seat top: warm sand stone, with a worn aisle stair every few segments.
      const aisle = i % 8 === 0;
      quad(back, a0, a1, r0, r0, z - SEAT_RISE_M, z, shade(aisle ? GOLD_DARK : SAND_STONE, k * 0.9));
      quad(back, a0, a1, r0, r1, z, z, shade(aisle ? 0xc4ab78 : (i + row) % 5 === 0 ? 0xd2bf93 : SAND_LIGHT, k));
      if (!aisle) crowd(back, a0, a1, (r0 + r1) / 2, z, P, i, row, k);
    }
    runLine(back, backSegs, seg, P, r0, z, { width: 0.02, color: MORTAR, alpha: 0.55 });
  }
  // The parapet at the top of the seating: a golden wall with a row of small arched openings.
  const rTop = rIn + SEAT_ROWS * SEAT_DEPTH_M;
  const zTop = seatBase + SEAT_ROWS * SEAT_RISE_M;
  for (const i of backSegs) {
    const [a0, a1, mid] = seg(i);
    quad(back, a0, a1, rTop, rTop, zTop, zTop + 2.1, shade(GOLD, lit(mid) * 0.95));
    quad(back, a0, a1, rTop, rTop + 0.8, zTop + 2.1, zTop + 2.1, shade(SAND_LIGHT, 1.02));
  }
  arches(back, backSegs, seg, P, rTop, zTop, 2.1, 6, 0.4, 0.95, 3, false, 0x9fc9e8);
  // Dark tunnel mouths cut into the front row of seating (vomitoria), every twelfth segment.
  for (const i of backSegs) {
    if (i % 12 !== 6) continue;
    const [a0] = seg(i);
    const a1 = seg(i + 1)[1];
    const zb = seatBase + SEAT_RISE_M;
    quad(back, a0, a1, rIn, rIn, zb - SEAT_RISE_M + 0.02, zb + 0.55, SAND_STONE);
    quad(back, a0 + 0.012, a1 - 0.012, rIn, rIn, zb - SEAT_RISE_M + 0.02, zb + 0.4, OPENING);
    const m = (a0 + a1) / 2;
    ironGate(back, P, rIn, m, (a1 - a0) / 2 - 0.012, zb - SEAT_RISE_M + 0.02, zb + 0.4, false);
  }

  // ----- Upper tier: a set-back golden wall with pilasters and window arches, a cornice above it.
  const upperFace = R + T;
  for (const i of backSegs) {
    const [a0, a1, mid] = seg(i);
    // The ledge the ground tier leaves, then the face above it.
    quad(back, a0, a1, R, upperFace + 0.9, GROUND_TIER_M, GROUND_TIER_M, shade(SAND_LIGHT, 0.98));
    quad(back, a0, a1, upperFace + 0.9, upperFace + 0.9, GROUND_TIER_M, UPPER_TIER_M, shade(GOLD, lit(mid)));
    // The cornice: a projecting band of sand stone with a lit lower lip.
    quad(
      back,
      a0,
      a1,
      upperFace + 0.9,
      upperFace + 0.9,
      UPPER_TIER_M,
      UPPER_TIER_M + 0.3,
      shade(SAND_STONE, lit(mid) * 1.04),
    );
    quad(
      back,
      a0,
      a1,
      upperFace + 0.9,
      upperFace + 1.2,
      UPPER_TIER_M + 0.3,
      UPPER_TIER_M + 0.3,
      shade(SAND_LIGHT, 1.04),
    );
  }
  bricks(back, backSegs, seg, P, upperFace + 0.9, GROUND_TIER_M, UPPER_TIER_M, 0.3, rand);
  arches(
    back,
    backSegs,
    seg,
    P,
    upperFace + 0.9,
    GROUND_TIER_M + 0.15,
    UPPER_TIER_M - GROUND_TIER_M - 0.3,
    3,
    0.58,
    1.05,
    4,
    true,
  );

  // ----- Ground tier: the tall golden wall with its row of deep arches, seen from the arena.
  for (const i of backSegs) {
    const [a0, a1, mid] = seg(i);
    quad(back, a0, a1, R, R, 0, GROUND_TIER_M, shade(GOLD, lit(mid)));
    quad(back, a0, a1, R, R, 0, 0.35, shade(GOLD_DARK, lit(mid) * 0.9)); // a worn, darker footing
  }
  bricks(back, backSegs, seg, P, R, 0, GROUND_TIER_M, 0.3, rand);
  arches(back, backSegs, seg, P, R, 0, GROUND_TIER_M, 3, 0.62, 1.7, 4);
  hangings(back, backSegs, seg, P, R);
  // The cornice line along the top of the ground tier.
  runLine(back, backSegs, seg, P, R, GROUND_TIER_M, { width: 0.06, color: SAND_LIGHT, alpha: 0.9 });
  weather(back, backSegs, seg, P, R, 0, GROUND_TIER_M, rand, 46);

  // ----- The near wall: low, drawn over the fighters, with its outer face to the camera.
  for (const i of frontSegs) {
    const [a0, a1, mid] = seg(i);
    quad(front, a0, a1, R + T, R + T, 0, FRONT_WALL_M, shade(GOLD, 0.95 + 0.12 * Math.sin(mid) * -1 + 0.1));
    quad(front, a0, a1, R, R + T, FRONT_WALL_M, FRONT_WALL_M, shade(SAND_LIGHT, 1.0 + 0.04 * Math.cos(mid)));
  }
  bricks(front, frontSegs, seg, P, R + T, 0, FRONT_WALL_M, 0.3, rand);
  // A worn coping line along the top.
  runLine(front, frontSegs, seg, P, R + T, FRONT_WALL_M, { width: 0.05, color: SAND_LIGHT, alpha: 0.9 });
  weather(front, frontSegs, seg, P, R + T, 0, FRONT_WALL_M, rand, 24);
  // Pilasters on the near wall, every few segments.
  for (const i of frontSegs) {
    if (i % 8 !== 0) continue;
    const [a0, a1] = seg(i);
    quad(front, a0, a1 + 0.012, R + T + 0.04, R + T + 0.04, 0, FRONT_WALL_M + 0.12, SAND_STONE);
  }
}

/** Index pairs (first, last) of each run of consecutive segment indices. */
function pairs(idx: readonly number[]): [number, number][] {
  const out: [number, number][] = [];
  let start = 0;
  for (let k = 1; k <= idx.length; k++) {
    if (k === idx.length || idx[k] !== idx[k - 1]! + 1) {
      out.push([start, k - 1]);
      start = k;
    }
  }
  return out;
}

type Seg = (i: number) => [number, number, number];
type Proj = (a: number, rad: number, z: number) => Point;

/** A line along the wall at one radius and height, following the curve through every segment of each run. */
function runLine(
  g: Graphics,
  segs: readonly number[],
  seg: Seg,
  P: Proj,
  rad: number,
  z: number,
  style: { width: number; color: number; alpha: number },
): void {
  for (const [k0, k1] of pairs(segs)) {
    const a = P(seg(segs[k0]!)[0], rad, z);
    g.moveTo(a.x, a.y);
    for (let k = k0; k <= k1; k++) {
      const b = P(seg(segs[k]!)[1], rad, z);
      g.lineTo(b.x, b.y);
    }
    g.stroke(style);
  }
}

/** Courses of brick: long mortar lines along the wall and short staggered joints between them. */
function bricks(
  g: Graphics,
  segs: readonly number[],
  seg: Seg,
  P: Proj,
  rad: number,
  z0: number,
  z1: number,
  course: number,
  rand: () => number,
): void {
  const rows = Math.round((z1 - z0) / course);
  for (let r = 1; r < rows; r++) {
    const z = z0 + r * course;
    for (const [k0, k1] of pairs(segs)) {
      const a = P(seg(segs[k0]!)[0], rad, z);
      g.moveTo(a.x, a.y);
      for (let k = k0; k <= k1; k++) {
        const b = P(seg(segs[k]!)[1], rad, z);
        g.lineTo(b.x, b.y);
      }
      g.stroke({ width: 0.014, color: MORTAR, alpha: 0.55 });
    }
  }
  const jointEvery = 0.75 / rad;
  for (let r = 0; r < rows; r++) {
    const za = z0 + r * course;
    const zb = za + course;
    for (const [k0, k1] of pairs(segs)) {
      const aStart = seg(segs[k0]!)[0];
      const aEnd = seg(segs[k1]!)[1];
      for (let a = aStart + (r % 2) * (jointEvery / 2); a < aEnd; a += jointEvery) {
        const p = P(a, rad, za);
        const q = P(a, rad, zb);
        g.moveTo(p.x, p.y).lineTo(q.x, q.y).stroke({ width: 0.012, color: MORTAR, alpha: 0.45 });
      }
    }
  }
  // A scatter of bricks a shade lighter or darker, so the wall is not flat.
  for (let n = 0; n < 150; n++) {
    const idx = segs[Math.floor(rand() * segs.length)]!;
    const [a0, a1] = seg(idx);
    const a = a0 + rand() * (a1 - a0);
    const row = Math.floor(rand() * rows);
    const za = z0 + row * course;
    const w = (0.5 / rad) * (0.7 + rand() * 0.6);
    const p = [
      P(a, rad, za + 0.02),
      P(a + w, rad, za + 0.02),
      P(a + w, rad, za + course - 0.02),
      P(a, rad, za + course - 0.02),
    ];
    g.poly(p.flatMap((q) => [q.x, q.y])).fill({ color: rand() < 0.5 ? 0xf0d28f : 0xa87c36, alpha: 0.28 });
  }
}

/** Arches in a row (every `slot` segments): a dark recess under a round top, a stone frame, a keystone, and a pier between. */
function arches(
  g: Graphics,
  segs: readonly number[],
  seg: Seg,
  P: Proj,
  rad: number,
  z0: number,
  height: number,
  slot: number,
  widthShare: number,
  heightShare: number,
  detail: number,
  pilasters = false,
  openingColour = OPENING,
): void {
  const set = new Set(segs);
  for (let i = 0; i + slot <= SEGMENTS; i += slot) {
    let whole = true;
    for (let k = 0; k < slot; k++) if (!set.has(i + k)) whole = false;
    if (!whole) continue;
    const aStart = seg(i)[0];
    const aEnd = seg(i + slot - 1)[1];
    const mid = (aStart + aEnd) / 2;
    const half = ((aEnd - aStart) * widthShare) / 2;
    const halfM = half * rad;
    const springZ = z0 + Math.min(height * 0.9, height * heightShare) - halfM;
    const outline = (inset: number): Point[] => {
      const pts: Point[] = [P(mid - half + inset / rad, rad, z0), P(mid - half + inset / rad, rad, springZ)];
      for (let t = 0; t <= detail * 4; t++) {
        const ang = Math.PI - (t / (detail * 4)) * Math.PI;
        pts.push(P(mid + (half - inset / rad) * Math.cos(ang), rad, springZ + (halfM - inset) * Math.sin(ang)));
      }
      pts.push(P(mid + half - inset / rad, rad, z0));
      return pts;
    };
    const frame = outline(0);
    const hole = outline(0.07);
    g.poly(frame.flatMap((q) => [q.x, q.y])).fill({ color: SAND_STONE, alpha: 1 });
    g.poly(hole.flatMap((q) => [q.x, q.y])).fill({ color: openingColour });
    // Depth: a darker core and a lit sill.
    g.poly(outline(0.22).flatMap((q) => [q.x, q.y])).fill({
      color: openingColour === OPENING ? OPENING_DEEP : 0xc8e2f4,
      alpha: 0.9,
    });
    const sillA = P(mid - half, rad, z0);
    const sillB = P(mid + half, rad, z0);
    g.moveTo(sillA.x, sillA.y).lineTo(sillB.x, sillB.y).stroke({ width: 0.05, color: SAND_LIGHT, alpha: 0.9 });
    // Every dark doorway is shut: a heavy iron gate, bolted into the stone round it.
    if (openingColour === OPENING) ironGate(g, P, rad, mid, half, z0, springZ, true);
    // The keystone at the crown.
    const top = P(mid, rad, springZ + halfM);
    g.poly([
      top.x - 0.07,
      top.y + 0.04,
      top.x + 0.07,
      top.y + 0.04,
      top.x + 0.05,
      top.y - 0.14,
      top.x - 0.05,
      top.y - 0.14,
    ]).fill(SAND_LIGHT);
    if (pilasters) {
      // A slim pilaster between this arch and the next, with a capital and base.
      const pa = aEnd - ((aEnd - aStart) * (1 - widthShare)) / 4;
      const pw = ((aEnd - aStart) * (1 - widthShare)) / 3;
      const q = [
        P(pa - pw / 2, rad, z0),
        P(pa + pw / 2, rad, z0),
        P(pa + pw / 2, rad, z0 + height),
        P(pa - pw / 2, rad, z0 + height),
      ];
      g.poly(q.flatMap((p) => [p.x, p.y])).fill({ color: SAND_STONE, alpha: 0.95 });
      const cap = [
        P(pa - pw * 0.8, rad, z0 + height - 0.16),
        P(pa + pw * 0.8, rad, z0 + height - 0.16),
        P(pa + pw * 0.8, rad, z0 + height),
        P(pa - pw * 0.8, rad, z0 + height),
      ];
      g.poly(cap.flatMap((p) => [p.x, p.y])).fill({ color: SAND_LIGHT });
    }
  }
}

/** Age: cracks, chipped bricks and darker stains. */
function weather(
  g: Graphics,
  segs: readonly number[],
  seg: Seg,
  P: Proj,
  rad: number,
  z0: number,
  z1: number,
  rand: () => number,
  count: number,
): void {
  for (let n = 0; n < count; n++) {
    const idx = segs[Math.floor(rand() * segs.length)]!;
    const [a0, a1] = seg(idx);
    let a = a0 + rand() * (a1 - a0);
    let z = z0 + rand() * (z1 - z0);
    const p0 = P(a, rad, z);
    g.moveTo(p0.x, p0.y);
    const steps = 3 + Math.floor(rand() * 4);
    for (let k = 0; k < steps; k++) {
      a += (rand() - 0.5) * (0.5 / rad);
      z -= 0.12 + rand() * 0.25;
      const q = P(a, rad, Math.max(z0, z));
      g.lineTo(q.x, q.y);
    }
    g.stroke({ width: 0.02, color: 0x6b4c1c, alpha: 0.7, join: 'round' });
  }
  // Chipped corners: small dark notches along the lower edge and stains.
  for (let n = 0; n < count; n++) {
    const idx = segs[Math.floor(rand() * segs.length)]!;
    const [a0, a1] = seg(idx);
    const a = a0 + rand() * (a1 - a0);
    const z = z0 + rand() * (z1 - z0);
    const w = 0.2 / rad;
    const p = [P(a, rad, z), P(a + w, rad, z), P(a + w * 0.6, rad, z + 0.16)];
    g.poly(p.flatMap((q) => [q.x, q.y])).fill({ color: 0x8a6428, alpha: 0.6 });
  }
}

/** Red banners with a gold emblem and wall torches on the piers between the ground-tier arches (decoration only). */
function hangings(g: Graphics, segs: readonly number[], seg: Seg, P: Proj, rad: number): void {
  const set = new Set(segs);
  const slot = 3;
  let n = 0;
  for (let i = 0; i + slot <= SEGMENTS; i += slot) {
    let whole = true;
    for (let k = 0; k < slot; k++) if (!set.has(i + k)) whole = false;
    if (!whole) continue;
    n++;
    const aEnd = seg(i + slot - 1)[1];
    const pier = aEnd - ((aEnd - seg(i)[0]) * 0.38) / 2;
    const w = 0.34 / rad;
    if (n % 2 === 0) {
      // A banner hanging from a bar, with a forked tail, a gold border and a gold crest.
      const top = 2.25;
      const bottom = 1.05;
      const body = [
        P(pier - w, rad, top),
        P(pier + w, rad, top),
        P(pier + w, rad, bottom),
        P(pier, rad, bottom + 0.2),
        P(pier - w, rad, bottom),
      ];
      g.poly(body.flatMap((q) => [q.x, q.y])).fill(0xa8232a);
      g.poly(body.flatMap((q) => [q.x, q.y])).stroke({ width: 0.025, color: 0xd9a63a, alpha: 0.95 });
      const c = P(pier, rad, 1.65);
      g.poly([c.x, c.y - 0.16, c.x + 0.11, c.y, c.x, c.y + 0.16, c.x - 0.11, c.y]).fill(0xe0b341);
      const bar0 = P(pier - w * 1.2, rad, top + 0.04);
      const bar1 = P(pier + w * 1.2, rad, top + 0.04);
      g.moveTo(bar0.x, bar0.y).lineTo(bar1.x, bar1.y).stroke({ width: 0.04, color: 0x4a3318 });
    } else {
      // A torch in an iron bracket, its flame glowing warm on the stone.
      const t = P(pier, rad, 1.7);
      g.circle(t.x, t.y - 0.1, 0.55).fill({ color: 0xffb347, alpha: 0.12 });
      g.circle(t.x, t.y - 0.1, 0.3).fill({ color: 0xffc766, alpha: 0.16 });
      g.moveTo(t.x, t.y + 0.28)
        .lineTo(t.x, t.y)
        .stroke({ width: 0.05, color: 0x3a2c1c, cap: 'round' });
      g.poly([
        t.x - 0.08,
        t.y,
        t.x - 0.03,
        t.y - 0.22,
        t.x + 0.01,
        t.y - 0.1,
        t.x + 0.04,
        t.y - 0.28,
        t.x + 0.09,
        t.y,
      ]).fill(0xff8a1f);
      g.poly([t.x - 0.04, t.y, t.x, t.y - 0.14, t.x + 0.05, t.y]).fill(0xffe08a);
    }
  }
}

/** The spectators' clothes: muted, earthy Roman-era colours (beige, brown, cream, faded red, dusty gold). */
const CLOTHES = [0xb9a27a, 0x8a6a4a, 0xd8c9a6, 0x9b5a4a, 0xc2a15a, 0x7d6a55, 0xcdbf9d, 0xa88a62, 0x8c4f42];
const SKIN = [0xc9a98a, 0xb58e6c, 0xd2b595, 0x9d7b5c];

/**
 * A few people on a segment of seating, small and still, in muted colours so they read as a soft texture behind the fight rather than
 * as individuals. Which seats are taken and who wears what come from the position alone (the same crowd every time); some seats are empty.
 */
function crowd(
  g: Graphics,
  a0: number,
  a1: number,
  rad: number,
  z: number,
  P: Proj,
  i: number,
  row: number,
  light: number,
): void {
  const people = 3;
  for (let n = 0; n < people; n++) {
    const h = (Math.imul(i + 1, 73856093) ^ Math.imul(row + 7, 19349663) ^ Math.imul(n + 3, 83492791)) >>> 0;
    if (h % 7 === 0) continue; // an empty seat
    const a = a0 + ((a1 - a0) * (n + 0.5 + ((h % 5) - 2) * 0.04)) / people;
    const b = P(a, rad, z);
    const cloth = shade(CLOTHES[h % CLOTHES.length]!, 0.8 * light);
    const skin = shade(SKIN[(h >>> 4) % SKIN.length]!, 0.82 * light);
    const tall = 0.46 + ((h >>> 8) % 4) * 0.03;
    g.roundRect(b.x - 0.16, b.y - tall, 0.32, tall, 0.09).fill({ color: cloth, alpha: 0.92 });
    g.circle(b.x, b.y - tall - 0.1, 0.1).fill({ color: skin, alpha: 0.92 });
  }
}

/**
 * A heavy Roman gate of dark, aged iron: thick upright bars, two cross rails, and an iron strap round the opening riveted to the stone
 * (nothing hangs loose: every bar runs from the sill into the strap). `arched` follows a round top; otherwise the top is flat.
 */
function ironGate(
  g: Graphics,
  P: Proj,
  rad: number,
  mid: number,
  half: number,
  z0: number,
  topZ: number,
  arched: boolean,
): void {
  const halfM = half * rad;
  const springZ = topZ;
  const bars = Math.max(4, Math.round((2 * halfM) / 0.24));
  const topAt = (dx: number): number =>
    arched ? springZ + Math.sqrt(Math.max(0, (halfM - 0.07) ** 2 - dx * dx)) : topZ;
  for (let k = 0; k < bars; k++) {
    const dx = -halfM + 0.07 + ((k + 0.5) * (2 * halfM - 0.14)) / bars;
    const a = mid + dx / rad;
    const top = topAt(dx) - 0.02;
    const b0 = P(a, rad, z0 + 0.02);
    const b1 = P(a, rad, top);
    g.moveTo(b0.x, b0.y).lineTo(b1.x, b1.y).stroke({ width: 0.06, color: 0x1d1a18, cap: 'round' });
    g.moveTo(b0.x - 0.014, b0.y)
      .lineTo(b1.x - 0.014, b1.y)
      .stroke({ width: 0.014, color: 0x5d544b, alpha: 0.85 });
    // Rust bleeding down a bar here and there.
    if (k % 3 === 1) {
      const r0 = P(a, rad, z0 + (top - z0) * 0.55);
      const r1 = P(a, rad, z0 + (top - z0) * 0.25);
      g.moveTo(r0.x, r0.y).lineTo(r1.x, r1.y).stroke({ width: 0.03, color: 0x7a4a2a, alpha: 0.55 });
    }
  }
  // Two cross rails, riveted where they meet each bar.
  for (const z of [z0 + (springZ - z0) * 0.3, z0 + (springZ - z0) * 0.78]) {
    const l = P(mid - half + 0.07 / rad, rad, z);
    const r = P(mid + half - 0.07 / rad, rad, z);
    g.moveTo(l.x, l.y).lineTo(r.x, r.y).stroke({ width: 0.07, color: 0x1a1816, cap: 'round' });
    g.moveTo(l.x, l.y - 0.02)
      .lineTo(r.x, r.y - 0.02)
      .stroke({ width: 0.012, color: 0x5d544b, alpha: 0.7 });
    for (let k = 0; k < bars; k++) {
      const dx = -halfM + 0.07 + ((k + 0.5) * (2 * halfM - 0.14)) / bars;
      const q = P(mid + dx / rad, rad, z);
      g.circle(q.x, q.y, 0.028).fill(0x6e6254);
    }
  }
  // The strap round the opening, bolted to the stone.
  const pts: Point[] = [P(mid - half + 0.03 / rad, rad, z0), P(mid - half + 0.03 / rad, rad, springZ)];
  if (arched) {
    for (let t = 1; t < 12; t++) {
      const ang = Math.PI - (t / 12) * Math.PI;
      pts.push(P(mid + (half - 0.03 / rad) * Math.cos(ang), rad, springZ + (halfM - 0.03) * Math.sin(ang)));
    }
  } else pts.push(P(mid + half - 0.03 / rad, rad, topZ));
  pts.push(P(mid + half - 0.03 / rad, rad, arched ? springZ : topZ), P(mid + half - 0.03 / rad, rad, z0));
  g.moveTo(pts[0]!.x, pts[0]!.y);
  for (const q of pts.slice(1)) g.lineTo(q.x, q.y);
  g.stroke({ width: 0.09, color: 0x161412, join: 'round' });
  pts.forEach((q, i) => {
    if (i % 2 === 0) g.circle(q.x, q.y, 0.032).fill(0x7a6e60);
  });
  // A heavy lock plate on the middle rail.
  const lock = P(mid, rad, z0 + (springZ - z0) * 0.3);
  g.roundRect(lock.x - 0.09, lock.y - 0.07, 0.18, 0.14, 0.03)
    .fill(0x2a2623)
    .stroke({ width: 0.015, color: 0x6e6254 });
  g.circle(lock.x, lock.y, 0.025).fill(0x0e0c0b);
}
