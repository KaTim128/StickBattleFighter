import type { PropPlacement } from '../objects/props';
import type { ArenaLayout } from './arena-layout';

/**
 * The office arena (owner layout, 11/11/2026). GREYBOX art. 36 m × 18 m:
 *
 *   ┌─────────────── main office (carpet) ───────────────┬── boss room (wood) ──┐
 *   │ [C1][C2][C3][C4][C5][C6]   6 cubicles along the top │  bookshelf           │
 *   │                                                     │                      │
 *   │            open aisle: the main combat zone        DOOR  [visitor] DESK [boss]
 *   │                                                     │       (rug)          │
 *   │ [C7][C8][C9][C10][C11][C12] 6 cubicles along bottom │  plant               │
 *   └─────────────────────────────────────────────────────┴──────────────────────┘
 *
 * The rooms are joined by a wooden door that starts closed and only breaks
 * from a kick or a heavy knockback impact (src/environment/breakable-door.ts).
 */
const DESK_TOP_M = 0.75;
const CUBE_W = 3.4;
const CUBE_D = 3.0;
const CUBES_X0 = 1.5;
const MAIN_W = 26;
const WALL_X0 = 26;
const WALL_X1 = 26.4;
const HEIGHT = 18;
const DOOR_Y0 = 8;
const DOOR_Y1 = 10;

/** Desk items sit on the desk and draw on top of it. */
function onDesk(kind: PropPlacement['kind'], x: number, y: number, deskFront: number, order: number): PropPlacement {
  return { kind, x, y, elevationM: DESK_TOP_M, sortY: deskFront + 0.001 * order };
}

/**
 * One cubicle: low fabric walls on three sides (open towards the aisle), a
 * desk against the back wall, monitor, keyboard, mouse, and a chair.
 * `top` = in the top row (opening faces down); otherwise opening faces up.
 */
function cubicle(i: number, top: boolean): PropPlacement[] {
  const x0 = CUBES_X0 + i * CUBE_W;
  const cx = x0 + CUBE_W / 2;
  const s = top ? 1 : -1; // direction from the back wall towards the aisle
  const back = top ? 0.15 : HEIGHT - 0.15;
  const deskY = back + s * 0.6;
  const deskFront = top ? deskY + 0.35 : deskY + 0.35;
  const panelLen = CUBE_D - 0.4;
  const sideY = back + s * (panelLen / 2 + 0.05);
  const parts: PropPlacement[] = [
    { kind: 'cubicle-panel', x: cx, y: back, w: CUBE_W - 0.1 },
    { kind: 'desk', x: cx, y: deskY, w: 1.8 },
    { kind: 'office-chair', x: cx, y: deskY + s * 1.0 },
    onDesk('computer', cx, deskY - s * 0.15, deskFront, 1),
    onDesk('keyboard', cx, deskY + s * 0.18, deskFront, 2),
    onDesk('mouse', cx + 0.38, deskY + s * 0.18, deskFront, 3),
  ];
  if (i % 3 === 1) parts.push(onDesk('coffee-cup', cx - 0.65, deskY + s * 0.1, deskFront, 4));
  // Side walls: the left wall of each cubicle (the shared divider) plus the right wall of the last one.
  parts.push({ kind: 'cubicle-panel', x: x0, y: sideY, rotated: true, w: panelLen });
  if (i === 5) parts.push({ kind: 'cubicle-panel', x: x0 + CUBE_W, y: sideY, rotated: true, w: panelLen });
  return parts;
}

const CUBICLES: PropPlacement[] = [0, 1, 2, 3, 4, 5].flatMap((i) => [...cubicle(i, true), ...cubicle(i, false)]);

const MAIN_EXTRAS: PropPlacement[] = [
  { kind: 'water-dispenser', x: 25.4, y: 4.4 },
  { kind: 'bin', x: 25.4, y: 5.2 },
  { kind: 'printer', x: 25.2, y: 13.4 },
  { kind: 'plant', x: 0.6, y: 6.4 },
  { kind: 'plant', x: 0.6, y: 11.6 },
  { kind: 'cabinet', x: 0.5, y: 8.5, rotated: true },
  { kind: 'cabinet', x: 0.5, y: 9.45, rotated: true },
];

const BOSS_X0 = WALL_X1;
const BOSS_ROOM: PropPlacement[] = [
  { kind: 'rug', x: 31.6, y: 9 },
  // Executive desk turned to face the door; boss chair behind it, visitor chair opposite.
  { kind: 'executive-desk', x: 32.6, y: 9, rotated: true },
  { kind: 'boss-chair', x: 33.9, y: 9 },
  { kind: 'visitor-chair', x: 30.9, y: 9 },
  onDesk('computer', 33.0, 8.4, 10.2, 1),
  onDesk('coffee-cup', 32.3, 9.8, 10.2, 2),
  { kind: 'bookshelf', x: 31.4, y: 0.25 },
  { kind: 'bookshelf', x: 34.2, y: 0.25, w: 1.4 },
  { kind: 'plant', x: BOSS_X0 + 0.6, y: 17.3 },
  { kind: 'plant', x: 35.3, y: 17.3 },
  { kind: 'cabinet', x: 35.5, y: 13.5, rotated: true },
];

export const OFFICE: ArenaLayout = {
  id: 'office',
  name: 'Office',
  widthM: 36,
  heightM: HEIGHT,
  wallThicknessM: 0.5,
  props: [...CUBICLES, ...MAIN_EXTRAS, ...BOSS_ROOM],
  playerStart: { x: 13, y: 9 },
  dummyStart: { x: 20, y: 9 },
  windows: [
    { x0: 0.6, x1: MAIN_W - 0.6 },
    { x0: BOSS_X0 + 0.5, x1: 35.5 },
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
      x1: 36,
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
