import { scaleHouse } from '../../modes/hide-seek/house-scale';
import type {
  DoorDef,
  FloorIndex,
  FurnitureDef,
  FurnitureKind,
  HideSpec,
  HouseDef,
  Rect,
  RoomDef,
  StairDef,
  ThrowableDef,
  WallDef,
} from '../../modes/hide-seek/house-types';

/**
 * The Hide and Seek house (Phase 2, master plan section A): a two-storey home on a lot, front yard
 * to the south (the entrance door and a gate), back yard to the north (a back door and a shed), the
 * staircase in the hall at the bottom right of the screen. Greybox art: shapes and colours only.
 * Everything is data; the world, visibility and the hunter AI read it.
 */
const T = 0.25; // wall thickness, metres
const WALL_H = 2.6;

/** A horizontal wall along y between x0 and x1, with gaps (door openings) left out. */
function wallH(
  floor: FloorIndex,
  y: number,
  x0: number,
  x1: number,
  gaps: readonly (readonly [number, number])[] = [],
): WallDef[] {
  const out: WallDef[] = [];
  let x = x0;
  for (const [a, b] of [...gaps].sort((p, q) => p[0] - q[0])) {
    if (a > x) out.push(seg(floor, x, y - T / 2, a, y + T / 2));
    x = b;
  }
  if (x1 > x) out.push(seg(floor, x, y - T / 2, x1, y + T / 2));
  return out;
}

/** A vertical wall along x between y0 and y1, with gaps. */
function wallV(
  floor: FloorIndex,
  x: number,
  y0: number,
  y1: number,
  gaps: readonly (readonly [number, number])[] = [],
): WallDef[] {
  const out: WallDef[] = [];
  let y = y0;
  for (const [a, b] of [...gaps].sort((p, q) => p[0] - q[0])) {
    if (a > y) out.push(seg(floor, x - T / 2, y, x + T / 2, a));
    y = b;
  }
  if (y1 > y) out.push(seg(floor, x - T / 2, y, x + T / 2, y1));
  return out;
}

const seg = (
  floor: FloorIndex,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  kind: WallDef['kind'] = 'wall',
): WallDef => ({
  floor,
  x0,
  y0,
  x1,
  y1,
  blocksSight: kind !== 'fence',
  soundPass: kind === 'fence' ? 1 : kind === 'rail' ? 1 : 0.35,
  heightM: kind === 'fence' ? 1.3 : kind === 'rail' ? 0.95 : WALL_H,
  kind,
});

const room = (
  id: string,
  name: string,
  floor: FloorIndex,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  kind: RoomDef['kind'],
  light: number,
  outdoors = false,
): RoomDef => ({
  id,
  name,
  floor,
  rect: { x0, y0, x1, y1 },
  kind,
  light,
  ...(outdoors ? { outdoors: true } : {}),
});

const ROOMS_ALL: readonly RoomDef[] = [
  // Ground floor: a compact home, entered through the hall (owner, 18/11/2026: smaller, no long corridor)
  room('kitchen', 'Kitchen', 0, 15, 9, 20, 14, 'room', 0.9),
  room('dining', 'Dining room', 0, 20, 9, 25, 14, 'room', 0.85),
  room('living', 'Living room', 0, 15, 14, 25, 21, 'room', 0.9),
  room('hall', 'Entrance hall', 0, 25, 9, 29, 21, 'hall', 0.75),
  // Upper floor: the landing and two bedrooms off it
  room('bed1', 'Bedroom 1', 1, 15, 9, 25, 15, 'room', 0.8),
  room('bed2', 'Bedroom 2', 1, 15, 15, 25, 21, 'room', 0.8),
  room('uphall', 'Upstairs hallway', 1, 25, 9, 29, 21, 'hall', 0.65),
  // The lot (ground level, outdoors, scenery only: nobody can get out to it)
  room('frontyard', 'Front yard', 0, 0, 21, 40, 30, 'yard', 0.35, true),
  room('backyard', 'Backyard', 0, 0, 0, 40, 9, 'yard', 0.3, true),
  room('westyard', 'West side yard', 0, 0, 9, 15, 21, 'yard', 0.3, true),
  room('eastyard', 'East side yard', 0, 29, 9, 40, 21, 'yard', 0.3, true),
  room('street', 'Street', 0, 0, 30, 40, 34, 'yard', 0.25, true),
];

const STAIR_X0 = 27.3;
const STAIR_X1 = 28.7;
const STAIR_TOP_Y = 10.3;
const STAIR_BOTTOM_Y = 13.8;

const wallsGround: WallDef[] = [
  // Outer walls (the one gap is the front door, which is locked)
  ...wallH(0, 9, 15 - T / 2, 29 + T / 2),
  ...wallH(0, 21, 15 - T / 2, 29 + T / 2, [[26.4, 27.6]]),
  ...wallV(0, 15, 9, 21),
  ...wallV(0, 29, 9, 21),
  // Interior: kitchen and dining above the living room, the hall on the east
  ...wallH(0, 14, 15, 25, [
    [16, 17.6],
    [22, 24.5],
  ]),
  ...wallV(0, 20, 9, 14, [[11.0, 13.0]]),
  ...wallV(0, 25, 9, 21, [
    [10.2, 11.8],
    [15.5, 19.5],
  ]),
  // Staircase rail (ground, west side only: the wall is right there on the east)
  seg(0, STAIR_X0 - 0.15, STAIR_TOP_Y, STAIR_X0, STAIR_BOTTOM_Y, 'rail'),
  // Under the landing: the stairs run right up to the back wall, with no empty floor behind the top step.
  { ...seg(0, STAIR_X0 - 0.15, 9.1, STAIR_X1 + 0.15, STAIR_TOP_Y), heightM: 3 },
  // The fence round the lot (a low picket fence, scenery)
  ...fenceH(0, 0, 40),
  ...fenceH(0, 30, 40),
  ...fenceV(0, 0, 30),
  ...fenceV(40, 0, 30),
];

function fenceH(_y0: number, y: number, x1: number, gaps: readonly (readonly [number, number])[] = []): WallDef[] {
  const out: WallDef[] = [];
  let x = 0;
  for (const [a, b] of gaps) {
    if (a > x) out.push(seg(0, x, y - 0.06, a, y + 0.06, 'fence'));
    x = b;
  }
  if (x1 > x) out.push(seg(0, x, y - 0.06, x1, y + 0.06, 'fence'));
  return out;
}
function fenceV(x: number, y0: number, y1: number): WallDef[] {
  return [seg(0, x - 0.06, y0, x + 0.06, y1, 'fence')];
}

const wallsUpper: WallDef[] = [
  ...wallH(1, 9, 15 - T / 2, 29 + T / 2),
  ...wallH(1, 21, 15 - T / 2, 29 + T / 2),
  ...wallV(1, 15, 9, 21),
  ...wallV(1, 29, 9, 21),
  // Bedrooms: one wall between them, one wall to the landing with a door into each
  ...wallH(1, 15, 15, 25),
  ...wallV(1, 25, 9, 21, [
    [10.3, 11.7],
    [16.5, 17.9],
  ]),
  // The stairwell's railing upstairs (open at the top, where the stairs arrive)
  seg(1, STAIR_X0 - 0.15, STAIR_TOP_Y, STAIR_X0, STAIR_BOTTOM_Y + 0.5, 'rail'),
  // (No rail on the east side: the outer wall stands 0.3 m beyond the stairs, too narrow for anyone to stand in, and a rail
  // there overlapped where the ground-floor lane lets a body walk, so a climber was left stuck inside it at the top.)
  seg(1, STAIR_X0, STAIR_BOTTOM_Y + 0.35, STAIR_X1, STAIR_BOTTOM_Y + 0.5, 'rail'),
];

const WALLS_ALL: readonly WallDef[] = [...wallsGround, ...wallsUpper];

const door = (
  id: string,
  floor: FloorIndex,
  kind: DoorDef['kind'],
  rect: Rect,
  a: string,
  b: string,
  open: boolean,
  exterior = false,
): DoorDef => ({
  id,
  floor,
  kind,
  rect,
  between: [a, b],
  open: kind === 'arch' || open,
  ...(exterior ? { exterior: true } : {}),
});
const gapH = (y: number, x0: number, x1: number): Rect => ({ x0, y0: y - T / 2, x1, y1: y + T / 2 });
const gapV = (x: number, y0: number, y1: number): Rect => ({ x0: x - T / 2, y0, x1: x + T / 2, y1 });

const DOORS_ALL: readonly DoorDef[] = [
  door('d-kitchen-living', 0, 'door', gapH(14, 16, 17.6), 'kitchen', 'living', false),
  door('a-kitchen-dining', 0, 'arch', gapV(20, 11.0, 13.0), 'kitchen', 'dining', true),
  door('a-dining-living', 0, 'arch', gapH(14, 22, 24.5), 'dining', 'living', true),
  door('d-dining-hall', 0, 'door', gapV(25, 10.2, 11.8), 'dining', 'hall', false),
  door('a-living-hall', 0, 'arch', gapV(25, 15.5, 19.5), 'living', 'hall', true),
  // The front door is part of the house but locked for good: nobody leaves (owner, 18/11/2026).
  { ...door('d-front', 0, 'door', gapH(21, 26.4, 27.6), 'hall', 'frontyard', false, true), locked: true },
  door('d-bed1', 1, 'door', gapV(25, 10.3, 11.7), 'bed1', 'uphall', false),
  door('d-bed2', 1, 'door', gapV(25, 16.5, 17.9), 'bed2', 'uphall', false),
];

let n = 0;
function item(
  kind: FurnitureKind,
  floor: FloorIndex,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  heightM: number,
  colour: number,
  opts: { solid?: boolean; blocksSight?: boolean; hide?: HideSpec } = {},
): FurnitureDef {
  n++;
  return {
    id: `${kind}-${n}`,
    kind,
    floor,
    x0,
    y0,
    x1,
    y1,
    heightM,
    colour,
    solid: opts.solid ?? true,
    blocksSight: opts.blocksSight ?? false,
    ...(opts.hide ? { hide: opts.hide } : {}),
  };
}

const hide = (
  kind: HideSpec['kind'],
  concealment: number,
  noise: number,
  viewM: number,
  x: number,
  y: number,
  opensToward: HideSpec['opensToward'],
): HideSpec => ({ kind, concealment, noise, viewM, at: { x, y }, opensToward });

/** A bed's mattress top: the frame stands on four legs with 0.45 m clear underneath, enough to crawl under. */
const BED_TOP_M = 0.78;
const WOOD = 0x8a6a48;
const DARK_WOOD = 0x5a4430;
const FABRIC = 0x7d6b9c;
const WHITE = 0xd9d6cf;

const FURNITURE_ALL: readonly FurnitureDef[] = [
  // ---------------------------------------------------------------- Hall (no staircase: wardrobes and a box to hide in)
  item('wardrobe', 0, 27.4, 9.3, 28.7, 10.2, 2.0, DARK_WOOD, {
    blocksSight: true,
    hide: hide('wardrobe', 0.9, 0.45, 0.9, 28.05, 9.9, 's'),
  }),
  item('wardrobe', 0, 27.6, 12.9, 28.8, 13.8, 2.0, DARK_WOOD, {
    blocksSight: true,
    hide: hide('wardrobe', 0.9, 0.45, 0.9, 28.2, 13.5, 'w'),
  }),
  item('box', 0, 28.2, 15.6, 28.8, 16.3, 0.6, WOOD, { hide: hide('box', 0.8, 0.4, 0.6, 28.5, 15.95, 'w') }),
  item('box', 0, 20.0, 20.1, 20.7, 20.8, 0.6, WOOD, { hide: hide('box', 0.8, 0.4, 0.6, 20.35, 20.45, 'n') }),
  // ---------------------------------------------------------------- Living room
  item('rug', 0, 16.6, 15.5, 21.6, 19.5, 0.02, 0x7a3a3a, { solid: false }),
  item('sofa', 0, 17.3, 18.0, 20.0, 19.2, 0.9, FABRIC),
  item('armchair', 0, 15.35, 16.1, 16.5, 17.5, 0.9, FABRIC),
  item('armchair', 0, 20.9, 16.1, 22.05, 17.5, 0.9, FABRIC),
  item('coffee-table', 0, 17.3, 16.3, 20.1, 17.5, 0.45, WOOD),
  item('side-table', 0, 21.0, 18.6, 21.7, 19.3, 0.55, WOOD),
  item('floor-lamp', 0, 22.6, 15.3, 23.1, 15.8, 1.6, 0xe8d28a),
  item('bookshelf', 0, 18.2, 14.25, 20.4, 14.85, 2.0, DARK_WOOD, { blocksSight: true }),
  item('cupboard', 0, 15.3, 19.1, 16.0, 20.4, 1.9, DARK_WOOD, {
    blocksSight: true,
    hide: hide('cupboard', 0.85, 0.3, 0.9, 15.65, 19.75, 'e'),
  }),
  item('chest', 0, 23, 20.05, 24.4, 20.75, 0.5, DARK_WOOD, { hide: hide('chest', 0.85, 0.4, 0.7, 23.7, 20.4, 'n') }),
  item('curtain', 0, 19, 20.55, 21.6, 20.85, 2.2, 0x7a5a6a, {
    hide: hide('curtain', 0.65, 0.3, 1.2, 20.3, 20.62, 'n'),
  }),
  // ---------------------------------------------------------------- Kitchen
  item('sink', 0, 15.3, 9.25, 16.4, 10.1, 0.95, 0xaab4bc),
  item('stove', 0, 17.4, 9.25, 18.4, 10.1, 0.95, 0x444a52),
  item('fridge', 0, 18.7, 9.25, 19.45, 10.0, 1.8, 0xc9ced3, { blocksSight: true }),
  item('counter', 0, 16.8, 11.7, 18.4, 12.6, 0.9, WHITE),
  item('chair', 0, 16.9, 10.75, 17.5, 11.25, 0.5, DARK_WOOD),
  item('chair', 0, 17.7, 10.75, 18.3, 11.25, 0.5, DARK_WOOD),
  // ---------------------------------------------------------------- Dining room
  item('dining-table', 0, 22.4, 11.0, 23.9, 12.6, 0.75, WOOD, {
    hide: hide('under-table', 0.45, 0.25, 1.8, 23.15, 11.8, 's'),
  }),
  item('chair', 0, 21.3, 11.4, 21.9, 12.0, 0.5, DARK_WOOD),
  item('chair', 0, 21.3, 12.2, 21.9, 12.8, 0.5, DARK_WOOD),
  item('cupboard', 0, 21.9, 9.3, 23.2, 9.9, 1.0, DARK_WOOD),
  item('side-table', 0, 24.1, 9.3, 24.7, 9.9, 0.6, WOOD),
  // ---------------------------------------------------------------- Entrance hall
  item('cupboard', 0, 28.3, 19.2, 28.85, 20.4, 2.0, DARK_WOOD, {
    blocksSight: true,
    hide: hide('cupboard', 0.85, 0.3, 0.9, 28.6, 19.8, 'w'),
  }),
  // ---------------------------------------------------------------- Bedroom 1
  item('bed', 1, 16.4, 9.4, 18.6, 11.8, BED_TOP_M, 0x8a8aa0, {
    hide: hide('under-bed', 0.9, 0.4, 1.3, 17.5, 10.6, 's'),
  }),
  item('nightstand', 1, 15.35, 9.4, 15.95, 10, 0.5, WOOD),
  item('wardrobe', 1, 20.6, 9.3, 21.8, 10.2, 2.0, DARK_WOOD, {
    blocksSight: true,
    hide: hide('wardrobe', 0.9, 0.45, 0.9, 21.2, 9.9, 's'),
  }),
  item('desk', 1, 15.4, 12.8, 16.6, 14.0, 0.75, WOOD),
  item('chest', 1, 19.0, 14.1, 20.4, 14.7, 0.5, DARK_WOOD, { hide: hide('chest', 0.85, 0.4, 0.7, 19.7, 14.4, 'n') }),
  item('shelf', 1, 24.35, 12.6, 24.75, 13.8, 1.6, DARK_WOOD, { blocksSight: true }),
  item('floor-lamp', 1, 23.3, 9.4, 23.8, 9.9, 1.6, 0xe8d28a),
  // ---------------------------------------------------------------- Bedroom 2
  item('bed', 1, 16.4, 19.2, 18.9, 20.8, BED_TOP_M, 0x8aa08a, {
    hide: hide('under-bed', 0.9, 0.4, 1.3, 17.65, 20.0, 'n'),
  }),
  item('nightstand', 1, 15.35, 20.2, 15.95, 20.8, 0.5, WOOD),
  item('wardrobe', 1, 15.4, 15.3, 16.6, 16.4, 2.0, DARK_WOOD, {
    blocksSight: true,
    hide: hide('wardrobe', 0.9, 0.45, 0.9, 16, 16.1, 's'),
  }),
  item('curtain', 1, 20.0, 20.55, 22.5, 20.85, 2.2, 0x6a7a8a, {
    hide: hide('curtain', 0.65, 0.3, 1.2, 21.25, 20.62, 'n'),
  }),
  item('chest', 1, 19.4, 15.3, 20.8, 15.9, 0.5, DARK_WOOD, { hide: hide('chest', 0.85, 0.4, 0.7, 20.1, 15.6, 's') }),
  item('bookshelf', 1, 22.6, 15.2, 24.4, 15.8, 2.0, DARK_WOOD, { blocksSight: true }),
  item('floor-lamp', 1, 23.5, 19.5, 24.0, 20.0, 1.6, 0xe8d28a),
  // ---------------------------------------------------------------- Upstairs hall
  item('cupboard', 1, 28.3, 17, 28.85, 18.4, 2.0, DARK_WOOD, {
    blocksSight: true,
    hide: hide('cupboard', 0.85, 0.3, 0.9, 28.65, 17.7, 'w'),
  }),
  item('chest', 1, 27.4, 20, 28.7, 20.7, 0.5, DARK_WOOD, { hide: hide('chest', 0.85, 0.4, 0.7, 28, 20.35, 'n') }),
  item('bench', 1, 25.6, 19.2, 27.2, 19.8, 0.5, DARK_WOOD),
  item('floor-lamp', 1, 28.3, 15.8, 28.8, 16.3, 1.6, 0xe8d28a),
  // ---------------------------------------------------------------- The lot (scenery behind the fence: the house cannot be left)
  item('lawn', 0, 0, 21, 40, 30, 0.02, 0x2a4a2c, { solid: false }),
  item('path', 0, 26.4, 21.1, 27.6, 30, 0.03, 0x6a6a64, { solid: false }),
  item('path', 0, 31, 21, 40, 30, 0.03, 0x4c4c50, { solid: false }),
  item('bush', 0, 16, 21.5, 18.4, 22.9, 1.1, 0x244a2a),
  item('bush', 0, 22.6, 21.5, 24.8, 22.9, 1.1, 0x244a2a),
  item('tree', 0, 4, 24, 5, 25, 3.4, 0x4a3a2a, { blocksSight: false }),
  item('tree', 0, 18.5, 26, 19.5, 27, 3.4, 0x4a3a2a, { blocksSight: false }),
  item('car', 0, 32, 23, 37.5, 25.6, 1.4, 0x3a4a6a, { blocksSight: true }),
  item('bin', 0, 30.6, 21.7, 31.3, 22.4, 1.0, 0x2a2a2e),
  item('lawn', 0, 0, 0, 40, 9, 0.02, 0x233f26, { solid: false }),
  item('bush', 0, 17, 7.2, 19.6, 8.5, 1.1, 0x244a2a),
  item('bush', 0, 24, 7.2, 26.6, 8.5, 1.1, 0x244a2a),
  item('tree', 0, 34, 3, 35, 4, 3.6, 0x4a3a2a),
  item('garden-table', 0, 16, 3, 19, 5, 0.75, WOOD),
  item('chair', 0, 15.2, 3.6, 15.8, 4.2, 0.5, DARK_WOOD),
  item('chair', 0, 19.2, 3.6, 19.8, 4.2, 0.5, DARK_WOOD),
  item('barbecue', 0, 22, 4, 23.2, 5, 1.0, 0x2a2a2e),
  item('bush', 0, 2, 12, 3.4, 13.6, 1.1, 0x244a2a),
  item('tree', 0, 5, 16, 6, 17, 3.4, 0x4a3a2a),
  item('bench', 0, 33, 12, 34.8, 12.8, 0.5, DARK_WOOD),
  item('bush', 0, 34, 16, 35.6, 17.6, 1.1, 0x244a2a),
  item('bush', 0, 30, 7.2, 32.6, 8.5, 1.1, 0x244a2a),
  item('tree', 0, 30, 27, 31, 28, 3.4, 0x4a3a2a),
  item('tree', 0, 10, 5, 11, 6, 3.6, 0x4a3a2a),
];

const THROWABLES_ALL: readonly ThrowableDef[] = [
  { id: 't1', kind: 'bottle', floor: 0, x: 20.6, y: 17.9 },
  { id: 't2', kind: 'can', floor: 0, x: 18.9, y: 13.1 },
  { id: 't3', kind: 'toy', floor: 0, x: 18.6, y: 15.2 },
  { id: 't4', kind: 'bottle', floor: 0, x: 17.6, y: 12.2 },
  { id: 't5', kind: 'can', floor: 0, x: 27.6, y: 17 },
  { id: 't6', kind: 'toy', floor: 1, x: 17, y: 13.2 },
  { id: 't7', kind: 'bottle', floor: 1, x: 21.6, y: 13.0 },
  { id: 't8', kind: 'can', floor: 1, x: 22.4, y: 18.3 },
  { id: 't9', kind: 'toy', floor: 1, x: 26.4, y: 15.5 },
];

/**
 * Owner, 25/11/2026: no staircase and no curtains. The house is the ground floor only (the upper floor was reached by the stairs), and the
 * curtains are gone from the furniture. The upper floor, the stairs and the curtains stay in the authored lists above (the engine still
 * supports stairs), but nothing of them is part of the playable house.
 */
export const HOUSE_ROOMS: readonly RoomDef[] = ROOMS_ALL.filter((r) => r.floor === 0);
export const HOUSE_WALLS: readonly WallDef[] = WALLS_ALL.filter(
  (w) => w.floor === 0 && !(w.kind === 'rail') && w.heightM !== 3,
);
export const HOUSE_DOORS: readonly DoorDef[] = DOORS_ALL.filter((d) => d.floor === 0);
export const HOUSE_STAIRS: readonly StairDef[] = [];
export const HOUSE_FURNITURE: readonly FurnitureDef[] = FURNITURE_ALL.filter(
  (f) => f.floor === 0 && f.kind !== 'curtain',
);
export const HOUSE_THROWABLES: readonly ThrowableDef[] = THROWABLES_ALL.filter((t) => t.floor === 0);

/** Who is in the house: the standard dummy as the player, the masked slasher as the one hunter (Phase 2). */
export const HOUSE_CAST = { player: 'training-dummy', hunter: 'shroud' } as const;

/** The authored plan, before the roomier scale: what the rule tests place bodies in by coordinates. */
export const HOUSE_PLAN: HouseDef = {
  id: 'house',
  name: 'The house',
  widthM: 40,
  heightM: 34,
  rooms: HOUSE_ROOMS,
  walls: HOUSE_WALLS,
  doors: HOUSE_DOORS,
  stairs: HOUSE_STAIRS,
  furniture: HOUSE_FURNITURE,
  throwables: HOUSE_THROWABLES,
  playerStart: { floor: 0, x: 26.8, y: 18.9 }, // in the hall, just inside the front door
  // Shroud waits outside the front door; when the hunt begins it opens and he walks in (owner, 19/11/2026).
  hunterStart: { floor: 0, x: 27, y: 27.5 },
  hunterEntry: { doorId: 'd-front', to: { floor: 0, x: 27, y: 19.4 } },

  patrol: [
    { floor: 0, x: 22.8, y: 17.6 },
    { floor: 0, x: 23.3, y: 10.5 },
    { floor: 0, x: 18.9, y: 11.3 },
    { floor: 0, x: 18.2, y: 15.45 },
  ],
};

/** The rooms are made this much roomier than the authored plan (owner, 18/11/2026: a bigger, bungalow-sized house). */
export const HOUSE_SCALE = 1.35;
/** Furniture keeps closer to its natural size, so the bigger rooms have space for more of it. */
export const FURNITURE_SCALE = 1.45;
/** Doors are two thirds as wide as they were (owner, 18/11/2026). */
export const DOOR_FRACTION = 2 / 3;

export const HOUSE: HouseDef = scaleHouse(HOUSE_PLAN, {
  roomScale: HOUSE_SCALE,
  furnitureScale: FURNITURE_SCALE,
  doorFraction: DOOR_FRACTION,
});
