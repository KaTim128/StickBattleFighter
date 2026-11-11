import type { PropPlacement } from '../objects/props';
import type { ArenaLayout } from './arena-layout';

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
 * The rooms are joined by a wooden door that only breaks from a kick or a
 * heavy impact (src/environment/breakable-door.ts).
 */
const DESK_TOP_M = 0.75;
/** Width of one back-to-back pair, the gap (walkway) between pairs, and where the row starts. */
const PAIR_W = 2.6;
const PAIR_GAP = 1.0;
const PAIRS_X0 = 1.3;
/** Depth of one cubicle, from the shared back panel to its open side. */
const CUBE_D = 2.3;
const MAIN_W = 25;
const WALL_X0 = 25;
const WALL_X1 = 25.4;
const WIDTH = 33;
const HEIGHT = 12;
const MID_Y = HEIGHT / 2;
const DOOR_Y0 = MID_Y - 1;
const DOOR_Y1 = MID_Y + 1;

/** Desk items sit on the desk and draw on top of it. */
function onDesk(kind: PropPlacement['kind'], x: number, y: number, deskFront: number, order: number): PropPlacement {
  return { kind, x, y, elevationM: DESK_TOP_M, sortY: deskFront + 0.001 * order };
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
  { kind: 'water-dispenser', x: MAIN_W - 0.6, y: 0.9 },
  { kind: 'bin', x: MAIN_W - 1.3, y: 0.7 },
  { kind: 'printer', x: MAIN_W - 0.6, y: HEIGHT - 0.6 },
  { kind: 'plant', x: 0.6, y: 0.7 },
  { kind: 'plant', x: 0.6, y: HEIGHT - 0.7 },
  { kind: 'cabinet', x: 2.6, y: 0.35 },
  { kind: 'cabinet', x: 3.55, y: 0.35 },
];

const BOSS_X0 = WALL_X1;
const BOSS_ROOM: PropPlacement[] = [
  { kind: 'rug', x: BOSS_X0 + 4, y: MID_Y },
  // Executive desk turned to face the door; boss chair behind it, visitor chair opposite.
  { kind: 'executive-desk', x: BOSS_X0 + 5, y: MID_Y, rotated: true },
  { kind: 'boss-chair', x: BOSS_X0 + 6.3, y: MID_Y },
  { kind: 'visitor-chair', x: BOSS_X0 + 3.3, y: MID_Y },
  onDesk('computer', BOSS_X0 + 5.4, MID_Y - 0.6, MID_Y + 1.2, 1),
  onDesk('coffee-cup', BOSS_X0 + 4.7, MID_Y + 0.8, MID_Y + 1.2, 2),
  { kind: 'bookshelf', x: BOSS_X0 + 2.8, y: 0.25 },
  { kind: 'bookshelf', x: BOSS_X0 + 6.3, y: 0.25, w: 1.4 },
  { kind: 'plant', x: BOSS_X0 + 0.6, y: HEIGHT - 0.7 },
  { kind: 'plant', x: WIDTH - 0.7, y: HEIGHT - 0.7 },
  { kind: 'cabinet', x: WIDTH - 0.5, y: HEIGHT - 3, rotated: true },
];

export const OFFICE: ArenaLayout = {
  id: 'office',
  name: 'Office',
  widthM: WIDTH,
  heightM: HEIGHT,
  wallThicknessM: 0.5,
  props: [...CUBICLES, ...MAIN_EXTRAS, ...BOSS_ROOM],
  // Both start in the north aisle, facing each other.
  playerStart: { x: 7, y: 1.9 },
  dummyStart: { x: 12, y: 1.9 },
  windows: [
    { x0: 0.6, x1: MAIN_W - 0.6 },
    { x0: BOSS_X0 + 0.5, x1: WIDTH - 0.5 },
  ],
  look: {
    background: 0x141922,
    floor: 0x59606e, // main office carpet tiles
    floorLines: 0x626a79,
    floorLineSpacingM: 2,
    wall: 0x2c323d,
    wallEdge: 0x8a94a3,
  },
  floorZones: [
    // Boss room: warm wood planks and darker panelled walls.
    {
      x0: BOSS_X0,
      y0: 0,
      x1: WIDTH,
      y1: HEIGHT,
      floor: 0x7a5236,
      lines: 0x6a4630,
      lineSpacingM: 0.6,
      planks: true,
      wall: 0x3a2a22,
    },
  ],
  interiorWalls: [
    { x0: WALL_X0, y0: 0, x1: WALL_X1, y1: DOOR_Y0 },
    { x0: WALL_X0, y0: DOOR_Y1, x1: WALL_X1, y1: HEIGHT },
  ],
  doors: [{ id: 'boss-door', x0: WALL_X0 + 0.12, y0: DOOR_Y0, x1: WALL_X1 - 0.12, y1: DOOR_Y1, breakStrength: 500 }],
  greybox: true,
};
