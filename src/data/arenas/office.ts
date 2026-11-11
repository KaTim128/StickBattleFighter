import { segmentBox } from '../../core/oriented-rect';
import { PROP_KINDS, type PropPlacement } from '../objects/props';
import type { ArenaLayout, WallRect } from './arena-layout';

/**
 * The office arena (owner layout, 11/11/2026). GREYBOX art. 33 m × 12 m.
 * Owner update (11/11/2026): the 12 cubicles stand in the CENTRE of the main
 * office as six back-to-back pairs (one cubicle opens north, its partner
 * south, sharing the back panel), with walkways between the pairs:
 *
 *   ┌──────────────────────── main office (carpet) ─────────────────────────┬─ boss room (wood) ─┐
 *   │            north aisle (combat)                    water  printer     │ bookshelves        │
 *   │  [N1] [N2] [N3] [N4] [N5] [N6]   cubicles open north                  │                    │
 *   │  ════ ════ ════ ════ ════ ════   shared back panels      open area  DOOR visitor DESK boss │
 *   │  [S1] [S2] [S3] [S4] [S5] [S6]   cubicles open south                  │      (rug)         │
 *   │            south aisle (combat)                                       │ plants, cabinet    │
 *   └────────────────────────────────────────────────────────────────────────┴────────────────────┘
 *
 * Each cubicle: desk against the back panel, a steel drawer pedestal, a
 * chair, monitor, keyboard, mouse (some a coffee cup); all breakable.
 * Owner update (11/11/2026, sketch): the boss-room wall runs DIAGONALLY, from the
 * top wall down to the bottom wall (owner's sketches; now CURVED, see the arc below),
 * so its face and the
 * door in it can be seen. The door is small (1.3 m), in the middle of the wall:
 * walk into it to swing it open, or smash it (src/environment/breakable-door.ts).
 */
const DESK_TOP_M = 0.75;
/** Kitchen counter height: the coffee machine and microwave sit on it. */
const COUNTER_TOP_M = 0.9;
/** Width of one back-to-back pair, the gap (walkway) between pairs, and where the row starts. */
const PAIR_W = 2.6;
const PAIR_GAP = 1.0;
const PAIRS_X0 = 1.3;
/** Depth of one cubicle, from the shared back panel to its open side. */
const CUBE_D = 2.3;
const WALL_THICK_M = 0.4;
/** The curved wall's face shows on the office side: warm white like the outer walls. */
const OFFICE_WALL_FACE = 0xd9d1c4;
const DOOR_LEN_M = 1.3;
const WIDTH = 33;
const HEIGHT = 12;
const MID_Y = HEIGHT / 2;

/**
 * CURVED BOSS-ROOM WALL (owner sketch, 11/11/2026): an arc that meets the top and
 * bottom walls near x 23.6 m and bows out into the boss room to x 26.2 m at its
 * middle, where the door is. Built from short straight pieces along the arc.
 */
const ARC_END_X = 23.65;
const ARC_APEX_X = 26.2;
const ARC_SAG_M = ARC_APEX_X - ARC_END_X;
const ARC_R = (MID_Y * MID_Y + ARC_SAG_M * ARC_SAG_M) / (2 * ARC_SAG_M);
const ARC_CX = ARC_APEX_X - ARC_R;
/** Angle (from the centre, 0 = the apex) where the arc meets the top and bottom walls, plus a little overrun. */
const ARC_HALF_ANGLE = Math.asin(MID_Y / ARC_R) + 0.02;
const DOOR_HALF_ANGLE = DOOR_LEN_M / 2 / ARC_R;
const WALL_PIECES_PER_HALF = 12;

function arcPoint(angle: number): [number, number] {
  return [ARC_CX + ARC_R * Math.cos(angle), MID_Y + ARC_R * Math.sin(angle)];
}

/** x of the curved wall's centre line at height y. */
function wallX(y: number): number {
  const dy = Math.max(-ARC_R, Math.min(ARC_R, y - MID_Y));
  return ARC_CX + Math.sqrt(ARC_R * ARC_R - dy * dy);
}

/** Short straight wall pieces along the arc from angle a0 to a1 (each overlaps the next a little). */
function arcPieces(a0: number, a1: number): WallRect[] {
  const pieces: WallRect[] = [];
  for (let i = 0; i < WALL_PIECES_PER_HALF; i++) {
    const t0 = a0 + ((a1 - a0) * i) / WALL_PIECES_PER_HALF;
    const t1 = a0 + ((a1 - a0) * (i + 1)) / WALL_PIECES_PER_HALF;
    const pad = 0.012; // overlap so the outside of the bend has no gaps
    pieces.push({
      ...segmentBox(...arcPoint(t0 - pad), ...arcPoint(t1 + pad), WALL_THICK_M),
      colour: OFFICE_WALL_FACE,
    });
  }
  return pieces;
}

/**
 * A prop standing against the curved wall at height y, on the office side
 * (side −1) or the boss-room side (+1), clear of the wall along its whole depth.
 */
function besideWall(kind: PropPlacement['kind'], y: number, side: -1 | 1): PropPlacement {
  const f = PROP_KINDS[kind];
  const xs = [y - f.d / 2, y, y + f.d / 2].map(wallX);
  const edge = side < 0 ? Math.min(...xs) : Math.max(...xs);
  const halfWall = (WALL_THICK_M / 2) * 1.15; // a bend reads a little thicker across x
  return { kind, x: edge + side * (halfWall + 0.06 + f.w / 2), y };
}

/** Desk items sit on the desk and draw on top of it. */
function onDesk(
  kind: PropPlacement['kind'],
  x: number,
  y: number,
  deskFront: number,
  order: number,
  topM = DESK_TOP_M,
): PropPlacement {
  return { kind, x, y, elevationM: topM, sortY: deskFront + 0.001 * order };
}

/**
 * One cubicle of a pair. `s` = -1 opens north (desk on the north side of the
 * shared back panel), +1 opens south.
 */
function cubicle(cx: number, x0: number, s: 1 | -1, index: number): PropPlacement[] {
  const deskY = MID_Y + s * 0.46;
  const deskX = cx - 0.3;
  const deskFront = deskY + 0.4; // its lower (screen-front) edge
  const parts: PropPlacement[] = [
    { kind: 'desk', x: deskX, y: deskY },
    { kind: 'drawer-unit', x: cx + 0.72, y: MID_Y + s * 0.335 },
    { kind: 'office-chair', x: deskX - 0.25, y: MID_Y + s * 1.35 }, // leaves room to step in beside it
    onDesk('computer', deskX, deskY - s * 0.15, deskFront, 1),
    onDesk('keyboard', deskX, deskY + s * 0.18, deskFront, 2),
    onDesk('mouse', deskX + 0.38, deskY + s * 0.18, deskFront, 3),
    // Side walls run from the back panel to the open side.
    { kind: 'cubicle-panel', x: x0, y: MID_Y + s * (CUBE_D / 2), rotated: true, w: CUBE_D - 0.1 },
    { kind: 'cubicle-panel', x: x0 + PAIR_W, y: MID_Y + s * (CUBE_D / 2), rotated: true, w: CUBE_D - 0.1 },
  ];
  if (index % 3 === 1) parts.push(onDesk('coffee-cup', deskX - 0.65, deskY + s * 0.1, deskFront, 4));
  // Something else to grab and throw on every desk (Phase 7, REQ-PHY-9), varied along the row.
  const extra = (['book', 'stapler', 'water-bottle', 'paper-stack'] as const)[index % 4]!;
  parts.push(onDesk(extra, deskX + 0.55, deskY - s * 0.12, deskFront, 5));
  return parts;
}

/** A back-to-back pair: one shared back panel and a cubicle on each side of it. */
function cubiclePair(i: number): PropPlacement[] {
  const x0 = PAIRS_X0 + i * (PAIR_W + PAIR_GAP);
  const cx = x0 + PAIR_W / 2;
  return [
    { kind: 'cubicle-panel', x: cx, y: MID_Y, w: PAIR_W },
    ...cubicle(cx, x0, -1, i * 2),
    ...cubicle(cx, x0, 1, i * 2 + 1),
  ];
}

const CUBICLES: PropPlacement[] = [0, 1, 2, 3, 4, 5].flatMap(cubiclePair);

const MAIN_EXTRAS: PropPlacement[] = [
  // Pantry corner: the water dispenser, bin and a plant step down along the diagonal wall.
  besideWall('water-dispenser', 0.9, -1),
  besideWall('bin', 1.6, -1),
  besideWall('plant', 2.6, -1),
  // Copy corner, tucked into the angle by the bottom wall.
  besideWall('printer', HEIGHT - 0.4, -1),
  { kind: 'cabinet', x: wallX(HEIGHT) - 1.9, y: HEIGHT - 0.35 },
  besideWall('plant', HEIGHT - 1.9, -1),
  { kind: 'plant', x: 0.6, y: 0.7 },
  { kind: 'plant', x: 0.6, y: HEIGHT - 0.7 },
  // ---- Filling the walls (owner, 11/11/2026), leaving both combat aisles clear. ----
  // North wall: file cabinets, a bookshelf, a print station, the kitchenette, then shelves.
  { kind: 'cabinet', x: 2.6, y: 0.35 },
  { kind: 'cabinet', x: 3.55, y: 0.35 },
  { kind: 'cabinet', x: 4.5, y: 0.35 },
  { kind: 'fire-extinguisher', x: 5.3, y: 0.25 },
  { kind: 'bookshelf', x: 6.6, y: 0.25 },
  { kind: 'printer', x: 8.6, y: 0.35 },
  { kind: 'bin', x: 9.35, y: 0.3 },
  // Kitchenette: a counter with the coffee machine and microwave, a snack shelf and a vending machine.
  { kind: 'kitchen-counter', x: 12.2, y: 0.32 },
  onDesk('coffee-machine', 11.5, 0.3, 0.62, 1, COUNTER_TOP_M),
  onDesk('microwave', 12.6, 0.3, 0.62, 2, COUNTER_TOP_M),
  onDesk('coffee-cup', 11.9, 0.42, 0.62, 3, COUNTER_TOP_M),
  { kind: 'snack-shelf', x: 14.3, y: 0.25 },
  { kind: 'vending-machine', x: 15.6, y: 0.4 },
  { kind: 'plant', x: 16.7, y: 0.6 },
  { kind: 'bookshelf', x: 18.6, y: 0.25, w: 1.6 },
  // South wall: the calling room (two phone booths), file cabinets, a second print station,
  // a small lounge, and shelves.
  { kind: 'phone-booth', x: 2.1, y: HEIGHT - 0.52 },
  { kind: 'phone-booth', x: 3.3, y: HEIGHT - 0.52 },
  { kind: 'cabinet', x: 5.1, y: HEIGHT - 0.35 },
  { kind: 'cabinet', x: 6.05, y: HEIGHT - 0.35 },
  { kind: 'fire-extinguisher', x: 7.0, y: HEIGHT - 0.25 },
  { kind: 'bookshelf', x: 8.2, y: HEIGHT - 0.25 },
  { kind: 'printer', x: 10.4, y: HEIGHT - 0.35 },
  { kind: 'bin', x: 11.15, y: HEIGHT - 0.3 },
  { kind: 'plant', x: 13.1, y: HEIGHT - 0.6 },
  { kind: 'sofa', x: 14.8, y: HEIGHT - 0.48 },
  { kind: 'plant', x: 16.5, y: HEIGHT - 0.6 },
  { kind: 'bookshelf', x: 18.6, y: HEIGHT - 0.25, w: 1.6 },
];

/**
 * Boss room (owner, 11/11/2026: "the desk and chairs look too close to the door,
 * make sure it's arranged well"). Three zones, with the floor in front of the
 * door left open:
 *  - top right: the executive desk on its rug, set back in the corner, boss chair
 *    against the far wall, two visitor chairs facing it;
 *  - bottom right: a meeting table with four chairs;
 *  - along the walls: bookshelves on the top wall, cabinets on the far wall
 *    between the two zones, plants in the corners and against the curve.
 */
const DESK_X = 31;
const DESK_Y = 3.1;
const TABLE_X = 30.2;
const TABLE_Y = 9.6;
const BOSS_ROOM: PropPlacement[] = [
  { kind: 'rug', x: DESK_X - 0.9, y: DESK_Y },
  { kind: 'executive-desk', x: DESK_X, y: DESK_Y, rotated: true },
  { kind: 'boss-chair', x: DESK_X + 1.25, y: DESK_Y },
  { kind: 'visitor-chair', x: DESK_X - 1.6, y: DESK_Y - 0.65 },
  { kind: 'visitor-chair', x: DESK_X - 1.6, y: DESK_Y + 0.65 },
  onDesk('computer', DESK_X + 0.4, DESK_Y - 0.6, DESK_Y + 1.2, 1),
  onDesk('coffee-cup', DESK_X - 0.3, DESK_Y + 0.8, DESK_Y + 1.2, 2),
  { kind: 'meeting-table', x: TABLE_X, y: TABLE_Y, w: 3 },
  { kind: 'office-chair', x: TABLE_X - 0.8, y: TABLE_Y - 1.2 },
  { kind: 'office-chair', x: TABLE_X + 0.8, y: TABLE_Y - 1.2 },
  { kind: 'office-chair', x: TABLE_X - 0.8, y: TABLE_Y + 1.2 },
  { kind: 'office-chair', x: TABLE_X + 0.8, y: TABLE_Y + 1.2 },
  { kind: 'bookshelf', x: 25.8, y: 0.25 },
  { kind: 'bookshelf', x: 27.9, y: 0.25 },
  { kind: 'plant', x: WIDTH - 0.6, y: 0.7 },
  { kind: 'fire-extinguisher', x: WIDTH - 0.25, y: 4.6 },
  { kind: 'cabinet', x: WIDTH - 0.32, y: 5.6, rotated: true },
  { kind: 'cabinet', x: WIDTH - 0.32, y: 6.6, rotated: true },
  besideWall('plant', 2.6, 1),
  besideWall('plant', HEIGHT - 1.4, 1),
  { kind: 'plant', x: WIDTH - 0.6, y: HEIGHT - 0.7 },
];

/** The boss room's floor edge along the wall, bottom to top. */
const ARC_OUTLINE: number[] = Array.from({ length: 33 }, (_, i) => {
  const y = HEIGHT - (HEIGHT * i) / 32;
  return [wallX(y), y];
}).flat();

export const OFFICE: ArenaLayout = {
  id: 'office',
  music: 'office-fight',
  name: 'Office',
  widthM: WIDTH,
  heightM: HEIGHT,
  wallThicknessM: 0.5,
  props: [...CUBICLES, ...MAIN_EXTRAS, ...BOSS_ROOM],
  // Both start in the north aisle, facing each other.
  playerStart: { x: 7, y: 1.9 },
  dummyStart: { x: 12, y: 1.9 },
  windows: [
    { x0: 0.6, x1: ARC_END_X - 0.6 },
    { x0: ARC_END_X + 0.6, x1: WIDTH - 0.5 },
  ],
  look: {
    background: 0x141922,
    // 2.5D look (owner-approved mockups, TD-045): light-wood planks and warm white walls.
    floor: 0xe2bf8a,
    floorLines: null,
    floorLineSpacingM: 2,
    wall: 0xe9e2d6,
    wallEdge: 0xfbf8f3,
  },
  floorZones: [
    // Main office: light-wood planks.
    {
      x0: 0,
      y0: 0,
      x1: WIDTH,
      y1: HEIGHT,
      floor: 0xe2bf8a,
      lines: 0xc9a26c,
      lineSpacingM: 0.25,
      planks: true,
    },
    // Boss room: warm wood planks and darker panelled walls.
    {
      x0: ARC_END_X,
      y0: 0,
      x1: WIDTH,
      y1: HEIGHT,
      floor: 0x7a5236,
      lines: 0x6a4630,
      lineSpacingM: 0.6,
      planks: true,
      wall: 0x3a2a22,
      polygon: [WIDTH, 0, WIDTH, HEIGHT, ...ARC_OUTLINE],
    },
  ],
  interiorWalls: [...arcPieces(-ARC_HALF_ANGLE, -DOOR_HALF_ANGLE), ...arcPieces(DOOR_HALF_ANGLE, ARC_HALF_ANGLE)],
  doors: [
    {
      id: 'boss-door',
      ...segmentBox(...arcPoint(-DOOR_HALF_ANGLE), ...arcPoint(DOOR_HALF_ANGLE), 0.16),
      breakStrength: 500,
    },
  ],
  greybox: true,
};
