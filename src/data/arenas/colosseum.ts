import { segmentBox } from '../../core/oriented-rect';
import { footprint, type PropPlacement } from '../objects/props';
import type { ArenaLayout, FloorZone, WallRect } from './arena-layout';

/**
 * THE COLOSSEUM (owner, 25/11/2026), the primary arena. A large round Roman gladiatorial arena: a weathered grey stone floor with thin
 * uneven drifts of pale sand and dust, tall curved golden sand-brick walls with arches, columns and tiers of spectator seating, and the
 * ruins of an old fight around the edge: fallen and broken columns, stone blocks, crates, amphorae and barrels (no weapons). The middle
 * stays open for fighting. Its tiered wall is the interior walls laid along the circle (collision only; `src/rendering/colosseum-view.ts`
 * draws it), and the arena is `round`, so the box's own rectangular walls are not drawn.
 */
export const COLOSSEUM_RADIUS_M = 15;
/** How thick the ring wall is, metres (the inner face is at the radius). */
export const COLOSSEUM_WALL_T = 1;
/**
 * The ring's collision stands this far in front of the wall's drawn base, so a body stopped by it never looks as though it stands on or in
 * the wall: it halts a clear step short of the brick (owner, 25/11/2026).
 */
export const COLOSSEUM_KEEP_OUT_M = 1;
/** No ruin or crate reaches closer than this to the wall's base, so nobody standing on one is ever level with the wall. */
export const COLOSSEUM_PROP_CLEARANCE_M = 2.4;
const SIZE = 2 * (COLOSSEUM_RADIUS_M + 1);
const C = SIZE / 2;

const STONE = 0x8c8f93;
const STONE_LINE = 0x777a7f;

/** Short straight pieces along the circle, overlapping a little so no gap shows on the bend. */
function ring(): WallRect[] {
  const n = 96;
  const rMid = COLOSSEUM_RADIUS_M - COLOSSEUM_KEEP_OUT_M + COLOSSEUM_WALL_T / 2;
  const pad = 0.02;
  const pieces: WallRect[] = [];
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2 - pad;
    const a1 = ((i + 1) / n) * Math.PI * 2 + pad;
    pieces.push({
      ...segmentBox(
        C + Math.cos(a0) * rMid,
        C + Math.sin(a0) * rMid,
        C + Math.cos(a1) * rMid,
        C + Math.sin(a1) * rMid,
        COLOSSEUM_WALL_T,
      ),
      hidden: true,
    });
  }
  return pieces;
}

/** The floor's own round outline as a stone zone, so everything outside it is dark ground under the wall. */
function floor(): FloorZone {
  const pts: number[] = [];
  for (let i = 0; i < 96; i++) {
    const a = (i / 96) * Math.PI * 2;
    pts.push(C + Math.cos(a) * (COLOSSEUM_RADIUS_M + 0.05), C + Math.sin(a) * (COLOSSEUM_RADIUS_M + 0.05));
  }
  return {
    x0: 0,
    y0: 0,
    x1: SIZE,
    y1: SIZE,
    polygon: pts,
    floor: STONE,
    lines: STONE_LINE,
    lineSpacingM: 2.4,
  };
}

/** A prop at polar position (angle in degrees, 0 = right, 90 = down the map; radius in metres from the centre). */
function at(
  kind: PropPlacement['kind'],
  deg: number,
  radiusM: number,
  extra: Partial<PropPlacement> = {},
): PropPlacement {
  const a = (deg * Math.PI) / 180;
  return { kind, x: C + Math.cos(a) * radiusM, y: C + Math.sin(a) * radiusM, ...extra };
}

/**
 * Nothing may stand inside, on or through anything else: where two footprints (with a hand's width between them) would touch, the later
 * piece is slid along the wall, a little at a time, until it rests clear.
 */
function settle(list: PropPlacement[]): PropPlacement[] {
  const gap = 0.15;
  const out = list.map((p) => ({ ...p }));
  const hit = (a: PropPlacement, b: PropPlacement): boolean => {
    const fa = footprint(a);
    const fb = footprint(b);
    return Math.abs(a.x - b.x) < (fa.w + fb.w) / 2 + gap && Math.abs(a.y - b.y) < (fa.d + fb.d) / 2 + gap;
  };
  for (let i = 1; i < out.length; i++) {
    for (let step = 0; step < 80 && out.slice(0, i).some((q) => hit(out[i]!, q)); step++) {
      const p = out[i]!;
      const a = Math.atan2(p.y - C, p.x - C) + 0.25 / Math.hypot(p.x - C, p.y - C);
      const r = Math.hypot(p.x - C, p.y - C);
      p.x = C + Math.cos(a) * r;
      p.y = C + Math.sin(a) * r;
    }
  }
  return out;
}

/** How far a prop's footprint reaches from the centre (its farthest corner), metres. */
function extentM(p: PropPlacement): number {
  const { w, d } = footprint(p);
  let m = 0;
  for (const sx of [-1, 1])
    for (const sy of [-1, 1]) m = Math.max(m, Math.hypot(p.x + (sx * w) / 2 - C, p.y + (sy * d) / 2 - C));
  return m;
}

/** Every piece is brought in until it stands clear of the wall, then settled so nothing overlaps (repeated, as one nudges the other). */
function clearOfWall(list: PropPlacement[]): PropPlacement[] {
  let out = list;
  for (let pass = 0; pass < 6; pass++) {
    out = out.map((p) => {
      const q = { ...p };
      for (let i = 0; i < 60 && extentM(q) > COLOSSEUM_RADIUS_M - COLOSSEUM_PROP_CLEARANCE_M; i++) {
        const r = Math.hypot(q.x - C, q.y - C);
        const a = Math.atan2(q.y - C, q.x - C);
        q.x = C + Math.cos(a) * (r - 0.1);
        q.y = C + Math.sin(a) * (r - 0.1);
      }
      return q;
    });
    out = settle(out);
    if (out.every((p) => extentM(p) <= COLOSSEUM_RADIUS_M - COLOSSEUM_PROP_CLEARANCE_M + 1e-6)) break;
  }
  return out;
}

/** Ruins, crates, jars and barrels along the edge of the floor; nothing within 8 m of the middle. */
function props(): PropPlacement[] {
  return clearOfWall([
    // Fallen and broken Roman columns and cracked marble pieces.
    at('roman-column-fallen', 200, 12.2),
    at('roman-column-fallen', 322, 12.6, { rotated: true }),
    at('roman-column-fallen', 78, 12.4),
    at('column-stub', 250, 12.8),
    at('column-stub', 30, 12.6),
    at('column-stub', 146, 12.9),
    at('column-piece', 214, 11.1),
    at('column-piece', 296, 12.2),
    at('column-piece', 100, 11.4),
    at('column-piece', 352, 11.2),
    at('broken-arch', 270, 13),
    at('broken-arch', 120, 13),
    at('broken-arch', 0, 13.2, { rotated: true }),
    // Stone blocks and rubble.
    at('stone-block', 188, 12.1),
    at('stone-block', 228, 12.4),
    at('stone-block', 338, 11.8),
    at('stone-block', 62, 12.7),
    at('stone-block', 20, 11.9),
    at('rubble', 206, 10.4),
    at('rubble', 262, 11.2),
    at('rubble', 312, 10.8),
    at('rubble', 44, 10.9),
    at('rubble', 160, 11),
    at('rubble', 108, 10.6),
    // Wooden crates, ceramic amphorae and barrels.
    at('crate', 236, 12.6),
    at('crate', 240.5, 12.7, { rotated: true }),
    at('crate', 304, 12.9),
    at('crate', 130, 12.5),
    at('crate', 134, 12.55),
    at('barrel', 184, 12.7),
    at('barrel', 189, 13.2),
    at('barrel', 330, 12.7),
    at('barrel', 88, 12.9),
    at('barrel', 12, 12.8),
    at('amphora', 242, 11.5),
    at('amphora', 300, 11.7),
    at('amphora', 307, 12.1),
    at('amphora', 126, 11.6),
    at('amphora', 52, 12.4),
    at('amphora', 358, 12.4),
    at('amphora', 170, 12.4),
  ]);
}

export const COLOSSEUM: ArenaLayout = {
  id: 'colosseum',
  name: 'Colosseum',
  widthM: SIZE,
  heightM: SIZE,
  wallThicknessM: 0.5,
  props: props(),
  playerStart: { x: C - 5, y: C + 1.5 },
  dummyStart: { x: C + 5, y: C - 1.5 },
  look: {
    // Dark earth under and outside the wall; the stone floor is the round zone above it.
    background: 0x1b1713,
    floor: 0x2a241d,
    floorLines: null,
    floorLineSpacingM: 1,
    wall: 0xd9ac5c,
    wallEdge: 0xe9c680,
  },
  greybox: false,
  floorZones: [floor()],
  interiorWalls: ring(),
  round: { cx: C, cy: C, radiusM: COLOSSEUM_RADIUS_M },
  ambience: 'colosseum',
  music: 'japanese-boss',
};
