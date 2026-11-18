import { Container, Graphics } from 'pixi.js';
import type {
  FloorIndex,
  FurnitureDef,
  HouseDef,
  Rect,
  RoomDef,
  StairDef,
  WallDef,
} from '../modes/hide-seek/house-types';
import { FLOOR_HEIGHT_M, type HouseWorld } from '../modes/hide-seek/world';
import { isoBlock, shade } from './iso-draw';
import { OcclusionFader } from './occlusion-fader';
import { ISO_C, ISO_T, iso } from './projection';
import { YSortLayer } from './y-sort-layer';

/**
 * The Hide and Seek house drawn as an isometric cutaway (Phase 2, section A): the same 2.5D view as
 * the arenas, one container per floor (the upper one raised a storey), walls, furniture, doors and
 * the staircase y-sorted with the people. Greybox art: shapes and colours only. Every drawn thing is
 * recorded with its floor and room so the visibility system (P2-2) can light and hide it.
 */
export interface FloorLayer {
  readonly container: Container;
  /** Floors and flat decals, drawn first. */
  readonly ground: Container;
  /** Walls, furniture, doors and people, in depth order. */
  readonly actors: YSortLayer;
}

export interface HouseNodeRef {
  readonly node: Container;
  readonly floor: FloorIndex;
  /** The room it belongs to (furniture, floors); null for walls and doors (they belong to two). */
  readonly room: string | null;
  readonly kind: 'wall' | 'furniture' | 'door' | 'stairs' | 'floor';
  readonly id: string;
  /** The footprint in world metres (for visibility tests). */
  readonly rect: Rect;
}

export interface DoorNode {
  setOpen(open: boolean): void;
}

export interface HouseView {
  readonly world: Container;
  readonly floors: readonly [FloorLayer, FloorLayer];
  readonly nodes: readonly HouseNodeRef[];
  readonly doors: ReadonlyMap<string, DoorNode>;
  readonly fader: OcclusionFader;
  destroy(): void;
}

const WALL_CHUNK_M = 0.5;
const LEDGE_M = 0.35;
const PLASTER = 0xd9cfbd;
const BRICK = 0xb39a82;
const WOOD_FLOOR = 0x9a7a55;
const TILE = 0xaeb4b0;
const BATH_TILE = 0x9fb4bc;
const HALL_FLOOR = 0x8a6a4a;
const GRASS = 0x274a2c;
const STREET = 0x35353a;
const SHED_FLOOR = 0x6f5a40;

/** The y on screen of a rectangle's nearest corner: what the y-sort layer sorts by. */
const frontY = (r: Rect, z = 0): number => iso(r.x1, r.y1, z).y;

function floorColour(room: RoomDef): number {
  switch (room.kind) {
    case 'bathroom':
      return BATH_TILE;
    case 'hall':
    case 'corridor':
      return HALL_FLOOR;
    case 'yard':
      return room.id === 'street' ? STREET : GRASS;
    case 'shed':
      return SHED_FLOOR;
    default:
      return room.id === 'kitchen' ? TILE : WOOD_FLOOR;
  }
}

const poly = (r: Rect, z = 0): number[] => [
  ...pair(iso(r.x0, r.y0, z)),
  ...pair(iso(r.x1, r.y0, z)),
  ...pair(iso(r.x1, r.y1, z)),
  ...pair(iso(r.x0, r.y1, z)),
];
const pair = (p: { x: number; y: number }): [number, number] => [p.x, p.y];

function drawFloor(room: RoomDef): Graphics {
  const g = new Graphics();
  g.poly(poly(room.rect)).fill(floorColour(room));
  const r = room.rect;
  if (room.kind === 'room' || room.kind === 'hall' || room.kind === 'corridor') {
    const kitchen = room.id === 'kitchen';
    const step = kitchen ? 0.9 : 0.55;
    for (let y = r.y0 + step; y < r.y1; y += step) {
      const a = iso(r.x0, y);
      const b = iso(r.x1, y);
      g.moveTo(a.x, a.y).lineTo(b.x, b.y);
    }
    if (kitchen)
      for (let x = r.x0 + step; x < r.x1; x += step) {
        const a = iso(x, r.y0);
        const b = iso(x, r.y1);
        g.moveTo(a.x, a.y).lineTo(b.x, b.y);
      }
    g.stroke({ width: 0.02, color: shade(floorColour(room), 0.78), alpha: 0.7 });
  } else if (room.kind === 'bathroom') {
    for (let y = r.y0 + 0.6; y < r.y1; y += 0.6) {
      const a = iso(r.x0, y);
      const b = iso(r.x1, y);
      g.moveTo(a.x, a.y).lineTo(b.x, b.y);
    }
    for (let x = r.x0 + 0.6; x < r.x1; x += 0.6) {
      const a = iso(x, r.y0);
      const b = iso(x, r.y1);
      g.moveTo(a.x, a.y).lineTo(b.x, b.y);
    }
    g.stroke({ width: 0.02, color: shade(BATH_TILE, 0.75), alpha: 0.6 });
  }
  return g;
}

/** A wall rectangle cut into short blocks along its length, so people beside it depth-sort correctly. */
function wallChunks(w: WallDef, heightM: number, colour: number): { g: Graphics; rect: Rect }[] {
  const alongX = w.x1 - w.x0 >= w.y1 - w.y0;
  const length = alongX ? w.x1 - w.x0 : w.y1 - w.y0;
  const n = Math.max(1, Math.ceil(length / WALL_CHUNK_M));
  const out: { g: Graphics; rect: Rect }[] = [];
  for (let i = 0; i < n; i++) {
    const a = (length * i) / n;
    const b = (length * (i + 1)) / n;
    const rect: Rect = alongX
      ? { x0: w.x0 + a, y0: w.y0, x1: w.x0 + b, y1: w.y1 }
      : { x0: w.x0, y0: w.y0 + a, x1: w.x1, y1: w.y0 + b };
    const g = new Graphics();
    isoBlock(g, rect.x0, rect.y0, rect.x1, rect.y1, 0, heightM, { colour, top: shade(colour, 1.15), edge: 0.3 });
    out.push({ g, rect });
  }
  return out;
}

function drawFurniture(f: FurnitureDef): { g: Graphics; z: number } {
  const g = new Graphics();
  const cx = (f.x0 + f.x1) / 2;
  const cy = (f.y0 + f.y1) / 2;
  switch (f.kind) {
    case 'tree': {
      isoBlock(g, f.x0, f.y0, f.x1, f.y1, 0, 2.2, { colour: f.colour, edge: 0.3 });
      const top = iso(cx, cy, f.heightM);
      for (const [dx, dy, r, k] of [
        [0, 0, 1.7, 0.85],
        [-0.9, 0.2, 1.2, 0.95],
        [0.9, 0.1, 1.2, 1.0],
        [0, -0.6, 1.1, 1.1],
      ] as const) {
        g.ellipse(top.x + dx, top.y + dy * 0.6, r, r * 0.8).fill({ color: shade(0x2f5d33, k), alpha: 0.97 });
      }
      return { g, z: 0 };
    }
    case 'bush': {
      isoBlock(g, f.x0, f.y0, f.x1, f.y1, 0, f.heightM * 0.7, {
        colour: f.colour,
        top: shade(f.colour, 1.35),
        edge: 0.2,
      });
      const top = iso(cx, cy, f.heightM * 0.7);
      g.ellipse(top.x, top.y, (f.x1 - f.x0) * 0.55, (f.y1 - f.y0) * 0.45).fill({
        color: shade(f.colour, 1.4),
        alpha: 0.9,
      });
      return { g, z: 0 };
    }
    case 'shower-curtain':
    case 'curtain':
      isoBlock(g, f.x0, f.y0, f.x1, f.y1, 0, f.heightM, {
        colour: f.colour,
        top: shade(f.colour, 1.2),
        alpha: 0.92,
        edge: 0.25,
      });
      return { g, z: 0 };
    case 'bed': {
      isoBlock(g, f.x0, f.y0, f.x1, f.y1, 0, f.heightM, { colour: f.colour, top: shade(f.colour, 1.25), edge: 0.35 });
      isoBlock(g, f.x0 + 0.1, f.y0 + 0.1, f.x0 + 0.7, f.y1 - 0.1, f.heightM, f.heightM + 0.12, {
        colour: 0xe6e2d8,
        edge: 0.2,
      });
      return { g, z: 0 };
    }
    default:
      isoBlock(g, f.x0, f.y0, f.x1, f.y1, 0, f.heightM, { colour: f.colour, top: shade(f.colour, 1.2), edge: 0.35 });
      return { g, z: 0 };
  }
}

function drawStairs(s: StairDef, zBase: number): { g: Graphics; rect: Rect }[] {
  const r = s.ramp;
  const n = 15;
  const out: { g: Graphics; rect: Rect }[] = [];
  for (let i = 0; i < n; i++) {
    const t0 = i / n;
    const t1 = (i + 1) / n;
    let rect: Rect;
    switch (s.rises) {
      case 'n':
        rect = { x0: r.x0, x1: r.x1, y0: r.y1 - (r.y1 - r.y0) * t1, y1: r.y1 - (r.y1 - r.y0) * t0 };
        break;
      case 's':
        rect = { x0: r.x0, x1: r.x1, y0: r.y0 + (r.y1 - r.y0) * t0, y1: r.y0 + (r.y1 - r.y0) * t1 };
        break;
      case 'w':
        rect = { y0: r.y0, y1: r.y1, x0: r.x1 - (r.x1 - r.x0) * t1, x1: r.x1 - (r.x1 - r.x0) * t0 };
        break;
      default:
        rect = { y0: r.y0, y1: r.y1, x0: r.x0 + (r.x1 - r.x0) * t0, x1: r.x0 + (r.x1 - r.x0) * t1 };
    }
    const g = new Graphics();
    isoBlock(g, rect.x0, rect.y0, rect.x1, rect.y1, zBase, zBase + s.riseM * t1, {
      colour: i % 2 ? 0x8a6a48 : 0x9a7a55,
      top: 0xb08a5c,
      edge: 0.3,
    });
    out.push({ g, rect });
  }
  return out;
}

function doorNode(d: { rect: Rect; kind: string }, g: Graphics): DoorNode {
  const r = d.rect;
  const horizontal = r.x1 - r.x0 >= r.y1 - r.y0;
  const draw = (open: boolean): void => {
    g.clear();
    if (d.kind === 'arch') return;
    if (d.kind === 'gate') {
      // A low iron gate: swung wide when open.
      if (!open) isoBlock(g, r.x0, r.y0 - 0.02, r.x1, r.y1 + 0.02, 0, 1.2, { colour: 0x30343a, edge: 0.3 });
      else if (horizontal)
        isoBlock(g, r.x0, r.y0, r.x0 + 0.06, r.y0 + (r.x1 - r.x0), 0, 1.2, { colour: 0x30343a, edge: 0.3 });
      return;
    }
    if (!open) {
      isoBlock(g, r.x0, r.y0, r.x1, r.y1, 0, 2.1, { colour: 0x6b4a2e, top: 0x80593a, edge: 0.4 });
    } else if (horizontal) {
      // Swung back against the wall on one side.
      isoBlock(g, r.x0, r.y0, r.x0 + 0.07, r.y0 + (r.x1 - r.x0), 0, 2.1, {
        colour: 0x6b4a2e,
        top: 0x80593a,
        edge: 0.4,
      });
    } else {
      isoBlock(g, r.x0, r.y0, r.x0 + (r.y1 - r.y0), r.y0 + 0.07, 0, 2.1, {
        colour: 0x6b4a2e,
        top: 0x80593a,
        edge: 0.4,
      });
    }
  };
  draw(false);
  return { setOpen: draw };
}

export function buildHouseView(house: HouseDef, world: HouseWorld): HouseView {
  const root = new Container();
  root.label = 'house';
  const floors: FloorLayer[] = [];
  const nodes: HouseNodeRef[] = [];
  const doors = new Map<string, DoorNode>();
  const fader = new OcclusionFader();

  for (const f of [0, 1] as const) {
    const container = new Container();
    container.label = `floor-${f}`;
    container.position.set(0, -f * FLOOR_HEIGHT_M);
    const ground = new Container();
    const actors = new YSortLayer();
    container.addChild(ground, actors.container);
    root.addChild(container);
    floors.push({ container, ground, actors });
  }

  // ---- floors and decals
  for (const room of house.rooms) {
    const g = drawFloor(room);
    floors[room.floor]!.ground.addChild(g);
    nodes.push({ node: g, floor: room.floor, room: room.id, kind: 'floor', id: `floor-${room.id}`, rect: room.rect });
  }
  // The stairwell upstairs is a hole: paint it dark over the floor.
  for (const s of house.stairs) {
    const hole = new Graphics().poly(poly(s.ramp)).fill(0x08080b);
    floors[s.topFloor]!.ground.addChild(hole);
  }
  for (const f of house.furniture) {
    if (f.kind !== 'rug' && f.kind !== 'lawn' && f.kind !== 'path') continue;
    const g = new Graphics().poly(poly(f)).fill(f.colour);
    floors[f.floor]!.ground.addChild(g);
    if (f.kind !== 'lawn')
      nodes.push({
        node: g,
        floor: f.floor,
        room: world.roomAt(f.floor, (f.x0 + f.x1) / 2, (f.y0 + f.y1) / 2)?.id ?? null,
        kind: 'floor',
        id: f.id,
        rect: f,
      });
  }

  // ---- walls
  for (const w of house.walls) {
    const layer = floors[w.floor]!;
    const exteriorFront =
      w.kind === 'wall' && (w.y0 >= 20.8 || w.x0 >= 29.8) && (w.x1 - w.x0 > 0.2 ? w.y0 >= 20.8 : w.x0 >= 29.8);
    const heightM = w.kind === 'wall' && exteriorFront ? LEDGE_M : w.heightM;
    const exterior = w.x0 < 10.2 || w.x1 > 29.8 || w.y0 < 9.2 || w.y1 > 20.8;
    const colour = w.kind === 'fence' ? 0xd8d0c0 : w.kind === 'rail' ? 0x7a5a3a : exterior ? BRICK : PLASTER;
    for (const c of wallChunks(w, heightM, colour)) {
      layer.actors.add(c.g, frontY(c.rect));
      nodes.push({ node: c.g, floor: w.floor, room: null, kind: 'wall', id: `wall-${w.x0}-${w.y0}`, rect: c.rect });
      if (w.kind === 'wall') fader.add(c.g);
    }
  }

  // ---- furniture
  for (const f of house.furniture) {
    if (f.kind === 'rug' || f.kind === 'lawn' || f.kind === 'path') continue;
    const { g } = drawFurniture(f);
    const layer = floors[f.floor]!;
    layer.actors.add(g, frontY(f));
    nodes.push({
      node: g,
      floor: f.floor,
      room: world.roomAt(f.floor, (f.x0 + f.x1) / 2, (f.y0 + f.y1) / 2)?.id ?? null,
      kind: 'furniture',
      id: f.id,
      rect: f,
    });
    if (f.heightM >= 1.5 && f.kind !== 'tree') fader.add(g);
  }

  // ---- doors
  for (const d of house.doors) {
    const g = new Graphics();
    const node = doorNode(d, g);
    node.setOpen(world.isOpen(d.id));
    doors.set(d.id, node);
    floors[d.floor]!.actors.add(g, frontY(d.rect));
    nodes.push({ node: g, floor: d.floor, room: null, kind: 'door', id: d.id, rect: d.rect });
  }

  // ---- stairs (the same treads on both floors: the upper copy shows through the stairwell)
  for (const s of house.stairs) {
    for (const [floor, zBase] of [
      [s.bottomFloor, 0],
      [s.topFloor, -s.riseM],
    ] as const) {
      for (const t of drawStairs(s, zBase)) {
        floors[floor]!.actors.add(t.g, frontY(t.rect, zBase));
        nodes.push({ node: t.g, floor, room: null, kind: 'stairs', id: s.id, rect: t.rect });
      }
    }
  }

  return {
    world: root,
    floors: [floors[0]!, floors[1]!],
    nodes,
    doors,
    fader,
    destroy() {
      for (const f of floors) f.actors.destroy();
      root.destroy({ children: true });
    },
  };
}

export const HOUSE_ISO = { C: ISO_C, T: ISO_T };
