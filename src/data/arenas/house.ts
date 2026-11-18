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

export const HOUSE_ROOMS: readonly RoomDef[] = [
  // Ground floor
  room('toilet', 'Toilet', 0, 10, 9, 13, 14, 'bathroom', 0.8),
  room('dining', 'Dining room', 0, 13, 9, 19, 14, 'room', 0.85),
  room('kitchen', 'Kitchen', 0, 19, 9, 25, 14, 'room', 0.9),
  room('living', 'Living room', 0, 10, 14, 25, 21, 'room', 0.9),
  room('hall', 'Entrance hall', 0, 25, 9, 30, 21, 'hall', 0.75),
  // Upper floor
  room('bed1', 'Bedroom 1', 1, 10, 9, 16, 14, 'room', 0.8),
  room('bath1', 'Bathroom 1', 1, 16, 9, 19, 14, 'bathroom', 0.8),
  room('storage', 'Storage room', 1, 19, 9, 25, 14, 'room', 0.6),
  room('corridor', 'Upstairs corridor', 1, 10, 14, 25, 16, 'corridor', 0.6),
  room('bed2', 'Bedroom 2', 1, 10, 16, 19, 21, 'room', 0.8),
  room('bath2', 'Bathroom 2', 1, 19, 16, 23, 21, 'bathroom', 0.8),
  room('nook', 'Landing nook', 1, 23, 16, 25, 21, 'corridor', 0.5),
  room('uphall', 'Upstairs hallway', 1, 25, 9, 30, 21, 'hall', 0.65),
  // The lot (ground level, outdoors)
  room('frontyard', 'Front yard', 0, 0, 21, 40, 30, 'yard', 0.35, true),
  room('backyard', 'Backyard', 0, 0, 0, 40, 9, 'yard', 0.3, true),
  room('westyard', 'West side yard', 0, 0, 9, 10, 21, 'yard', 0.3, true),
  room('eastyard', 'East side yard', 0, 30, 9, 40, 21, 'yard', 0.3, true),
  room('shed', 'Shed', 0, 3, 2, 7, 6, 'shed', 0.4),
  room('street', 'Street', 0, 0, 30, 40, 34, 'yard', 0.25, true),
];

const STAIR_X0 = 26;
const STAIR_X1 = 28.4;
const STAIR_TOP_Y = 10.5;
const STAIR_BOTTOM_Y = 15;

const wallsGround: WallDef[] = [
  // Outer walls of the house (gaps: back door in the kitchen, front door in the hall)
  ...wallH(0, 9, 10 - T / 2, 30 + T / 2, [[21.2, 22.4]]),
  ...wallH(0, 21, 10 - T / 2, 30 + T / 2, [[26.4, 27.6]]),
  ...wallV(0, 10, 9, 21),
  ...wallV(0, 30, 9, 21),
  // Interior
  ...wallH(0, 14, 10, 25, [
    [11, 12.2],
    [14, 17],
    [20.2, 21.8],
  ]),
  ...wallV(0, 13, 9, 14),
  ...wallV(0, 19, 9, 14, [[11.6, 13.4]]),
  ...wallV(0, 25, 9, 21, [
    [10.2, 11.8],
    [15.5, 19.5],
  ]),
  // Staircase rails (ground): both sides and the top end
  seg(0, STAIR_X0 - 0.15, STAIR_TOP_Y, STAIR_X0, STAIR_BOTTOM_Y, 'rail'),
  seg(0, STAIR_X1, STAIR_TOP_Y, STAIR_X1 + 0.15, STAIR_BOTTOM_Y, 'rail'),
  seg(0, STAIR_X0, STAIR_TOP_Y - 0.15, STAIR_X1, STAIR_TOP_Y, 'rail'),
  // The shed (door on the south side)
  ...wallH(0, 2, 3, 7),
  ...wallH(0, 6, 3, 7, [[4.4, 5.6]]),
  ...wallV(0, 3, 2, 6),
  ...wallV(0, 7, 2, 6),
  // The fence round the lot (a low picket fence: you can see through it); a gate in the south fence
  ...fenceH(0, 0, 40),
  ...fenceH(0, 30, 40, [[24.5, 27.5]]),
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
  ...wallH(1, 9, 10 - T / 2, 30 + T / 2),
  ...wallH(1, 21, 10 - T / 2, 30 + T / 2),
  ...wallV(1, 10, 9, 21),
  ...wallV(1, 30, 9, 21),
  // Corridor walls (doors into both bedrooms and the storage room)
  ...wallH(1, 14, 10, 25, [
    [12, 13.2],
    [21, 22.2],
  ]),
  ...wallH(1, 16, 10, 23, [[12, 13.2]]),
  ...wallV(1, 16, 9, 14, [[10.5, 11.7]]),
  ...wallV(1, 19, 9, 14),
  ...wallV(1, 19, 16, 21, [[17.4, 18.6]]),
  ...wallV(1, 23, 16, 21),
  ...wallV(1, 25, 9, 14),
  ...wallV(1, 25, 16, 21),
  // The stairwell's railing upstairs (open at the top, where the stairs arrive)
  seg(1, STAIR_X0 - 0.15, STAIR_TOP_Y, STAIR_X0, STAIR_BOTTOM_Y + 0.15, 'rail'),
  seg(1, STAIR_X1, STAIR_TOP_Y, STAIR_X1 + 0.15, STAIR_BOTTOM_Y + 0.15, 'rail'),
  seg(1, STAIR_X0, STAIR_BOTTOM_Y, STAIR_X1, STAIR_BOTTOM_Y + 0.15, 'rail'),
];

export const HOUSE_WALLS: readonly WallDef[] = [...wallsGround, ...wallsUpper];

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

export const HOUSE_DOORS: readonly DoorDef[] = [
  door('d-toilet', 0, 'door', gapH(14, 11, 12.2), 'toilet', 'living', false),
  door('a-dining-living', 0, 'arch', gapH(14, 14, 17), 'dining', 'living', true),
  door('d-kitchen-living', 0, 'door', gapH(14, 20.2, 21.8), 'kitchen', 'living', false),
  door('a-dining-kitchen', 0, 'arch', gapV(19, 11.6, 13.4), 'dining', 'kitchen', true),
  door('d-kitchen-hall', 0, 'door', gapV(25, 10.2, 11.8), 'kitchen', 'hall', false),
  door('a-living-hall', 0, 'arch', gapV(25, 15.5, 19.5), 'living', 'hall', true),
  door('d-front', 0, 'door', gapH(21, 26.4, 27.6), 'hall', 'frontyard', false, true),
  door('d-back', 0, 'door', gapH(9, 21.2, 22.4), 'kitchen', 'backyard', false, true),
  door('d-shed', 0, 'door', gapH(6, 4.4, 5.6), 'shed', 'backyard', false, true),
  door('gate', 0, 'gate', gapH(30, 24.5, 27.5), 'frontyard', 'street', true, true),
  door('d-bed1', 1, 'door', gapH(14, 12, 13.2), 'bed1', 'corridor', false),
  door('d-storage', 1, 'door', gapH(14, 21, 22.2), 'storage', 'corridor', false),
  door('d-bed2', 1, 'door', gapH(16, 12, 13.2), 'bed2', 'corridor', false),
  door('d-bath1', 1, 'door', gapV(16, 10.5, 11.7), 'bed1', 'bath1', false),
  door('d-bath2', 1, 'door', gapV(19, 17.4, 18.6), 'bed2', 'bath2', false),
  door('a-corridor-uphall', 1, 'arch', gapV(25, 14, 16), 'corridor', 'uphall', true),
];

export const HOUSE_STAIRS: readonly StairDef[] = [
  {
    id: 'main',
    ramp: { x0: STAIR_X0, y0: STAIR_TOP_Y, x1: STAIR_X1, y1: STAIR_BOTTOM_Y },
    rises: 'n',
    riseM: 3,
    bottomFloor: 0,
    topFloor: 1,
  },
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

export const HOUSE_FURNITURE: readonly FurnitureDef[] = [
  // ---------------------------------------------------------------- Living room
  item('rug', 0, 13, 15.5, 20, 19.5, 0.02, 0x7a3a3a, { solid: false }),
  item('sofa', 0, 14.2, 17.9, 17, 19.1, 0.9, FABRIC, { hide: hide('under-sofa', 0.9, 0.4, 1.3, 15.6, 18.5, 'n') }),
  item('armchair', 0, 12.85, 16, 14.1, 17.4, 0.9, FABRIC),
  item('armchair', 0, 17.1, 16, 18.35, 17.4, 0.9, FABRIC),
  item('coffee-table', 0, 14.2, 16.2, 17, 17.4, 0.45, WOOD),
  item('tv-console', 0, 10.25, 16, 11, 18.5, 0.6, DARK_WOOD),
  item('side-table', 0, 17.8, 18.4, 18.5, 19.1, 0.55, WOOD),
  item('floor-lamp', 0, 19.3, 17.9, 19.8, 18.4, 1.6, 0xe8d28a),
  item('floor-lamp', 0, 10.5, 20.2, 11, 20.7, 1.6, 0xe8d28a),
  item('bookshelf', 0, 17.4, 14.25, 19.8, 14.85, 2.0, DARK_WOOD, { blocksSight: true }),
  item('bookshelf', 0, 22.3, 14.25, 24.5, 14.85, 2.0, DARK_WOOD, { blocksSight: true }),
  item('cupboard', 0, 10.25, 18.75, 10.95, 20.05, 1.9, DARK_WOOD, {
    blocksSight: true,
    hide: hide('cupboard', 0.85, 0.3, 0.9, 10.6, 19.4, 'e'),
  }),
  item('chest', 0, 23, 20.05, 24.4, 20.8, 0.5, DARK_WOOD, { hide: hide('chest', 0.85, 0.4, 0.7, 23.7, 20.4, 'n') }),
  item('curtain', 0, 19, 20.55, 21.6, 20.85, 2.2, 0x7a5a6a, {
    hide: hide('curtain', 0.65, 0.3, 1.2, 20.3, 20.62, 'n'),
  }),
  // ---------------------------------------------------------------- Dining room
  item('dining-table', 0, 14.9, 10.8, 17.1, 12.6, 0.75, WOOD, {
    hide: hide('under-table', 0.45, 0.25, 1.8, 16, 11.7, 's'),
  }),
  item('chair', 0, 14.2, 11.4, 14.8, 12, 0.5, DARK_WOOD),
  item('chair', 0, 17.2, 11.4, 17.8, 12, 0.5, DARK_WOOD),
  item('cupboard', 0, 13.3, 9.3, 14.6, 9.9, 1.0, DARK_WOOD, {
    hide: hide('cupboard', 0.8, 0.3, 0.9, 13.95, 9.62, 's'),
  }),
  // ---------------------------------------------------------------- Kitchen
  item('sink', 0, 19.3, 9.25, 20.4, 10.1, 0.95, 0xaab4bc),
  item('counter', 0, 20.5, 9.25, 21.0, 10.1, 0.9, WHITE),
  item('stove', 0, 22.6, 9.25, 23.6, 10.1, 0.95, 0x444a52),
  item('counter', 0, 23.7, 9.25, 24.8, 10.1, 0.9, WHITE),
  item('fridge', 0, 24.0, 12.6, 24.75, 13.8, 1.8, 0xc9ced3, { blocksSight: true }),
  item('counter', 0, 20.5, 11.5, 22.9, 12.6, 0.9, WHITE),
  item('cupboard', 0, 22.8, 13, 23.7, 13.8, 2.0, DARK_WOOD, {
    blocksSight: true,
    hide: hide('cupboard', 0.85, 0.3, 0.9, 23.25, 13.4, 'n'),
  }),
  // ---------------------------------------------------------------- Toilet
  item('toilet', 0, 10.3, 9.3, 11.0, 10.1, 0.45, WHITE),
  item('basin', 0, 11.7, 9.3, 12.5, 9.8, 0.85, WHITE),
  // ---------------------------------------------------------------- Entrance hall
  item('side-table', 0, 29.2, 16, 29.75, 18, 0.8, WOOD),
  item('cupboard', 0, 29.3, 19.2, 29.85, 20.4, 2.0, DARK_WOOD, {
    blocksSight: true,
    hide: hide('cupboard', 0.85, 0.3, 0.9, 29.6, 19.8, 'w'),
  }),
  // ---------------------------------------------------------------- Bedroom 1
  item('bed', 1, 11.4, 9.4, 13.6, 11.8, BED_TOP_M, 0x8a8aa0, {
    hide: hide('under-bed', 0.9, 0.4, 1.3, 12.5, 10.6, 's'),
  }),
  item('nightstand', 1, 10.4, 9.4, 11, 10, 0.5, WOOD),
  item('wardrobe', 1, 14.6, 9.3, 15.8, 10.2, 2.0, DARK_WOOD, {
    blocksSight: true,
    hide: hide('wardrobe', 0.9, 0.45, 0.9, 15.2, 9.9, 's'),
  }),
  item('desk', 1, 10.4, 12.6, 11.6, 13.8, 0.75, WOOD),
  // ---------------------------------------------------------------- Bathroom 1
  item('bathtub', 1, 17.05, 9.3, 18.8, 10.4, 0.6, WHITE),
  item('shower-curtain', 1, 17.05, 10.4, 18.8, 10.6, 2.0, 0x9ab8c8, {
    hide: hide('shower-curtain', 0.7, 0.25, 1.0, 17.9, 10.0, 's'),
  }),
  item('toilet', 1, 18.2, 12.6, 18.8, 13.4, 0.45, WHITE),
  item('basin', 1, 16.3, 12.8, 17.1, 13.5, 0.85, WHITE),
  // ---------------------------------------------------------------- Storage room
  item('shelf', 1, 19.3, 9.3, 20, 11.5, 1.8, DARK_WOOD, { blocksSight: true }),
  item('box', 1, 21, 11, 22.4, 12.4, 0.5, 0xb59a6a, { hide: hide('box', 0.8, 0.2, 0.8, 21.7, 11.7, 'w') }),
  item('chest', 1, 23.3, 9.4, 24.7, 10.2, 0.5, DARK_WOOD, { hide: hide('chest', 0.85, 0.4, 0.7, 24, 9.8, 's') }),
  item('box', 1, 19.4, 12.6, 20.6, 13.8, 0.5, 0xb59a6a, { hide: hide('box', 0.8, 0.2, 0.8, 20, 13.2, 'e') }),
  item('box', 1, 23.4, 12.4, 24.6, 13.6, 0.5, 0xb59a6a, { hide: hide('box', 0.8, 0.2, 0.8, 24, 13, 'w') }),
  // ---------------------------------------------------------------- Bedroom 2
  item('bed', 1, 11.4, 19.2, 13.9, 20.8, BED_TOP_M, 0x8aa08a, {
    hide: hide('under-bed', 0.9, 0.4, 1.3, 12.65, 20.0, 'n'),
  }),
  item('wardrobe', 1, 10.4, 16.3, 11.6, 17.4, 2.0, DARK_WOOD, {
    blocksSight: true,
    hide: hide('wardrobe', 0.9, 0.45, 0.9, 11, 17.0, 's'),
  }),
  item('curtain', 1, 14.4, 20.55, 16.9, 20.85, 2.2, 0x6a7a8a, {
    hide: hide('curtain', 0.65, 0.3, 1.2, 15.6, 20.62, 'n'),
  }),
  item('nightstand', 1, 10.4, 20.2, 11, 20.8, 0.5, WOOD),
  // ---------------------------------------------------------------- Bathroom 2
  item('bathtub', 1, 19.3, 19.5, 22.7, 20.6, 0.6, WHITE),
  item('shower-curtain', 1, 19.3, 19.3, 22.7, 19.5, 2.0, 0xc8b89a, {
    hide: hide('shower-curtain', 0.7, 0.25, 1.0, 21, 20.1, 'n'),
  }),
  item('toilet', 1, 22.1, 16.3, 22.7, 17.1, 0.45, WHITE),
  item('basin', 1, 19.4, 16.3, 20.2, 16.8, 0.85, WHITE),
  // ---------------------------------------------------------------- Landing nook, upstairs hall
  item('chest', 1, 23.3, 19.4, 24.7, 20.6, 0.5, DARK_WOOD, { hide: hide('chest', 0.85, 0.4, 0.7, 24, 20, 'n') }),
  item('cupboard', 1, 29.3, 17, 29.85, 18.4, 2.0, DARK_WOOD, {
    blocksSight: true,
    hide: hide('cupboard', 0.85, 0.3, 0.9, 29.65, 17.7, 'w'),
  }),
  // ---------------------------------------------------------------- Front yard
  item('lawn', 0, 0, 21, 40, 30, 0.02, 0x2a4a2c, { solid: false }),
  item('path', 0, 26.4, 21.1, 27.6, 30, 0.03, 0x6a6a64, { solid: false }),
  item('path', 0, 31, 21, 40, 30, 0.03, 0x4c4c50, { solid: false }),
  item('bush', 0, 12, 21.5, 14.4, 22.9, 1.1, 0x244a2a, { hide: hide('bush', 0.8, 0.4, 1.4, 13.2, 22.2, 's') }),
  item('bush', 0, 16, 21.5, 18.4, 22.9, 1.1, 0x244a2a, { hide: hide('bush', 0.8, 0.4, 1.4, 17.2, 22.2, 's') }),
  item('bush', 0, 22.6, 21.5, 24.8, 22.9, 1.1, 0x244a2a, { hide: hide('bush', 0.8, 0.4, 1.4, 23.7, 22.2, 's') }),
  item('tree', 0, 4, 24, 5, 25, 3.4, 0x4a3a2a, { blocksSight: false }),
  item('tree', 0, 18.5, 26, 19.5, 27, 3.4, 0x4a3a2a, { blocksSight: false }),
  item('car', 0, 32, 23, 37.5, 25.6, 1.4, 0x3a4a6a, { blocksSight: true }),
  item('bin', 0, 30.6, 21.7, 31.3, 22.4, 1.0, 0x2a2a2e),
  // ---------------------------------------------------------------- Backyard
  item('lawn', 0, 0, 0, 40, 9, 0.02, 0x233f26, { solid: false }),
  item('bush', 0, 14, 7.2, 16.6, 8.5, 1.1, 0x244a2a, { hide: hide('bush', 0.8, 0.4, 1.4, 15.3, 7.8, 'n') }),
  item('bush', 0, 24, 7.2, 26.6, 8.5, 1.1, 0x244a2a, { hide: hide('bush', 0.8, 0.4, 1.4, 25.3, 7.8, 'n') }),
  item('tree', 0, 34, 3, 35, 4, 3.6, 0x4a3a2a),
  item('garden-table', 0, 16, 3, 19, 5, 0.75, WOOD),
  item('chair', 0, 15.2, 3.6, 15.8, 4.2, 0.5, DARK_WOOD),
  item('chair', 0, 19.2, 3.6, 19.8, 4.2, 0.5, DARK_WOOD),
  item('barbecue', 0, 22, 4, 23.2, 5, 1.0, 0x2a2a2e),
  // ---------------------------------------------------------------- Shed
  item('shed-cabinet', 0, 5.8, 2.3, 6.8, 3.2, 1.9, DARK_WOOD, {
    blocksSight: true,
    hide: hide('shed-cabinet', 0.85, 0.4, 0.8, 6.3, 2.8, 's'),
  }),
  item('box', 0, 3.3, 2.3, 4.5, 3.4, 0.5, 0xb59a6a, { hide: hide('box', 0.8, 0.2, 0.8, 3.9, 2.85, 's') }),
  // ---------------------------------------------------------------- Side yards
  item('bush', 0, 2, 12, 3.4, 13.6, 1.1, 0x244a2a, { hide: hide('bush', 0.8, 0.4, 1.4, 2.7, 12.8, 'e') }),
  item('tree', 0, 5, 16, 6, 17, 3.4, 0x4a3a2a),
  item('bench', 0, 33, 12, 34.8, 12.8, 0.5, DARK_WOOD),
  item('bush', 0, 34, 16, 35.6, 17.6, 1.1, 0x244a2a, { hide: hide('bush', 0.8, 0.4, 1.4, 34.8, 16.8, 'w') }),
  // ---------------------------------------------------------------- More furniture and hiding places (owner, 18/11/2026)
  item('bin', 0, 12.3, 12.6, 12.8, 13.1, 0.5, 0x4a5a4a),
  item('side-table', 0, 18.2, 9.3, 18.8, 9.9, 0.6, WOOD),
  item('chair', 0, 20.8, 10.9, 21.4, 11.4, 0.5, DARK_WOOD),
  item('chair', 0, 22, 10.9, 22.6, 11.4, 0.5, DARK_WOOD),
  item('bookshelf', 0, 12.4, 14.25, 13.6, 14.85, 2.0, DARK_WOOD, { blocksSight: true }),
  item('sofa', 0, 21, 18.7, 23.4, 19.7, 0.9, FABRIC),
  item('coffee-table', 0, 21.4, 17.3, 22.9, 18.2, 0.45, WOOD),
  item('cupboard', 0, 11.8, 20.1, 13, 20.8, 1.9, DARK_WOOD, {
    blocksSight: true,
    hide: hide('cupboard', 0.85, 0.3, 0.9, 12.4, 20.45, 'n'),
  }),
  item('chest', 1, 12.6, 12, 13.8, 12.6, 0.5, DARK_WOOD, { hide: hide('chest', 0.85, 0.4, 0.7, 13.2, 12.3, 's') }),
  item('nightstand', 1, 13.85, 9.4, 14.45, 10, 0.5, WOOD),
  item('wardrobe', 1, 20.6, 9.3, 21.8, 10.2, 2.0, DARK_WOOD, {
    blocksSight: true,
    hide: hide('wardrobe', 0.9, 0.45, 0.9, 21.2, 9.9, 's'),
  }),
  item('shelf', 1, 24.4, 10.5, 24.8, 12.2, 1.8, DARK_WOOD, { blocksSight: true }),
  item('bookshelf', 1, 16.6, 16.25, 18.4, 16.85, 2.0, DARK_WOOD, { blocksSight: true }),
  item('chest', 1, 11.5, 18.3, 12.9, 18.9, 0.5, DARK_WOOD, { hide: hide('chest', 0.85, 0.4, 0.7, 12.2, 18.6, 'n') }),
  item('shelf', 1, 23.2, 16.3, 23.8, 17.9, 1.8, DARK_WOOD, { blocksSight: true }),
  item('chest', 1, 28.6, 19, 29.8, 19.8, 0.5, DARK_WOOD, { hide: hide('chest', 0.85, 0.4, 0.7, 29.2, 19.4, 'w') }),
  item('bush', 0, 7.5, 25, 9.9, 26.3, 1.1, 0x244a2a, { hide: hide('bush', 0.8, 0.4, 1.4, 8.7, 25.65, 's') }),
  item('bush', 0, 30, 7.2, 32.6, 8.5, 1.1, 0x244a2a, { hide: hide('bush', 0.8, 0.4, 1.4, 31.3, 7.8, 'n') }),
  item('bush', 0, 36, 12, 37.6, 13.6, 1.1, 0x244a2a, { hide: hide('bush', 0.8, 0.4, 1.4, 36.8, 12.8, 'w') }),
  item('bench', 0, 28, 3, 29.8, 3.8, 0.5, DARK_WOOD),
  item('tree', 0, 30, 27, 31, 28, 3.4, 0x4a3a2a),
  item('tree', 0, 10, 5, 11, 6, 3.6, 0x4a3a2a),
  item('shelf', 0, 10.25, 11.3, 10.7, 12.5, 1.6, DARK_WOOD, { blocksSight: true }),
  item('bookshelf', 0, 14.2, 20.25, 15.8, 20.85, 2.0, DARK_WOOD, { blocksSight: true }),
  item('floor-lamp', 0, 23.5, 15.3, 24, 15.8, 1.6, 0xe8d28a),
  item('floor-lamp', 0, 29.3, 10, 29.8, 10.5, 1.6, 0xe8d28a),
  item('bin', 0, 29.35, 14.3, 29.8, 14.75, 0.5, 0x4a5a4a),
  item('shelf', 1, 15.45, 12.6, 15.85, 13.8, 1.6, DARK_WOOD, { blocksSight: true }),
  item('bin', 1, 18.4, 11.4, 18.8, 11.8, 0.5, 0x4a5a4a),
  item('floor-lamp', 1, 14.2, 19.5, 14.7, 20, 1.6, 0xe8d28a),
  item('bench', 1, 26.3, 19.2, 28.1, 19.8, 0.5, DARK_WOOD),
  item('floor-lamp', 1, 29.3, 15.2, 29.8, 15.7, 1.6, 0xe8d28a),
  item('bench', 0, 20, 22.8, 21.8, 23.6, 0.5, DARK_WOOD),
  item('tree', 0, 36, 5, 37, 6, 3.6, 0x4a3a2a),
  item('tree', 0, 1, 19, 2, 20, 3.4, 0x4a3a2a),
  item('bin', 0, 36.5, 19, 37.2, 19.7, 1, 0x4a5a4a),
];

export const HOUSE_THROWABLES: readonly ThrowableDef[] = [
  { id: 't1', kind: 'bottle', floor: 0, x: 18.1, y: 18.7 },
  { id: 't2', kind: 'can', floor: 0, x: 21.5, y: 12.0 },
  { id: 't3', kind: 'toy', floor: 0, x: 16, y: 17.4 },
  { id: 't4', kind: 'bottle', floor: 0, x: 15, y: 11.8 },
  { id: 't5', kind: 'can', floor: 0, x: 29.5, y: 17 },
  { id: 't6', kind: 'toy', floor: 1, x: 12, y: 15 },
  { id: 't7', kind: 'bottle', floor: 1, x: 14.6, y: 12.8 },
  { id: 't8', kind: 'can', floor: 1, x: 22, y: 12.8 },
  { id: 't9', kind: 'toy', floor: 1, x: 27, y: 18 },
  { id: 't10', kind: 'bottle', floor: 0, x: 8, y: 14 },
  { id: 't11', kind: 'can', floor: 0, x: 20, y: 26 },
  { id: 't12', kind: 'toy', floor: 0, x: 24, y: 6 },
];

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
  playerStart: { floor: 0, x: 14, y: 15 },
  hunterStart: { floor: 0, x: 26, y: 32 },
  patrol: [
    { floor: 0, x: 26, y: 24 },
    { floor: 0, x: 27.5, y: 19 },
    { floor: 0, x: 20.6, y: 16.6 },
  ],
};

/** The rooms are made this much roomier than the authored plan (owner, 18/11/2026: a bigger, bungalow-sized house). */
export const HOUSE_SCALE = 1.9;
/** Furniture keeps closer to its natural size, so the bigger rooms have space for more of it. */
export const FURNITURE_SCALE = 1.45;
/** Doors are two thirds as wide as they were (owner, 18/11/2026). */
export const DOOR_FRACTION = 2 / 3;

export const HOUSE: HouseDef = scaleHouse(HOUSE_PLAN, {
  roomScale: HOUSE_SCALE,
  furnitureScale: FURNITURE_SCALE,
  doorFraction: DOOR_FRACTION,
});
