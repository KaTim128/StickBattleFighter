import { Container, Graphics, type Renderer, Sprite } from 'pixi.js';
import type { FloorIndex, HouseDef, Rect, RoomDef, StairDef, WallDef } from '../modes/hide-seek/house-types';
import { FLOOR_HEIGHT_M, type HouseWorld } from '../modes/hide-seek/world';
import { drawDoorFrame, drawDoorLeaf } from './door-draw';
import { BRICK_AGED, floorDecor, PLASTER_AGED, wallDetails } from './house-decor';
import { aged, drawHouseFurniture } from './house-furniture';
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
  /** False for pieces that must stay fully opaque whatever stands behind them (stair rails and the block). */
  readonly fades?: boolean;
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
/** The wall block that fills the space behind the top step is exactly this tall (house.ts), so it is drawn as stair wood. */
const STAIR_BLOCK_M = 3;

/**
 * The draw key of a wall that stands behind a flight of stairs: just behind the flight's lowest tread (the one
 * nearest the back wall), so every tread draws in front of it. Null for other walls. The treads' own keys are lowered
 * by their height, so an ordinary wall key would put the upper steps behind the wall (owner, 18/11/2026: "the back
 * wall should stay at the back behind the stairs").
 */
export function flightBackKey(w: WallDef, house: HouseDef): number | null {
  if (w.kind !== 'wall') return null;
  for (const s of house.stairs) {
    const r = s.ramp;
    if (w.floor !== s.bottomFloor || s.rises !== 'n') continue;
    const behind = w.y1 <= r.y0 + 0.05 && r.y0 - w.y1 <= 2.5;
    const overlaps = w.x0 < r.x1 && w.x1 > r.x0;
    if (behind && overlaps) return iso(r.x1, r.y0, s.riseM).y - 1;
  }
  return null;
}

/** Draw key for a rail beside a flight, or the block at its head, on its lower floor: just behind its highest tread. */
function stairRailKey(w: WallDef, house: HouseDef): number | null {
  if (wallFades(w)) return null; // only the staircase's own rails and the block under its landing
  for (const s of house.stairs) {
    const r = s.ramp;
    if (w.floor !== s.bottomFloor || s.rises !== 'n') continue;
    const beside = w.y1 > r.y0 && w.y0 < r.y1 && (Math.abs(w.x1 - r.x0) < 0.3 || Math.abs(w.x0 - r.x1) < 0.3);
    const atHead = Math.abs(w.y1 - r.y0) < 0.3 && w.x1 > r.x0 && w.x0 < r.x1;
    if (beside || atHead) return iso(r.x1, r.y0, s.riseM).y - 0.05;
  }
  return null;
}

/** The staircase's own barriers (its rails and the block under the landing) stay fully opaque whatever is behind them. */
export const wallFades = (w: { kind: string; heightM: number }): boolean =>
  w.kind !== 'rail' && w.heightM !== STAIR_BLOCK_M;
/** Furniture this tall can hide a person standing behind it, so it fades (gently: a sofa never needs to). */
const FURNITURE_FADE_M = 1.3;
const FURNITURE_FADE_ALPHA = 0.3;
/** Doors stay easy to find while they fade (owner, 18/11/2026): a see-through wall goes to 14%, a door only to half. */
const DOOR_FADE_ALPHA = 0.5;
const WOOD_FLOOR = 0x7a5f44;
const TILE = 0x8a9090;
const BATH_TILE = 0x7c9096;
const HALL_FLOOR = 0x6b5238;
const GRASS = 0x1d3422;
const STREET = 0x2a2a2f;
const SHED_FLOOR = 0x57462f;

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

function drawFloor(room: RoomDef, hasWindow: boolean): Graphics {
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
  floorDecor(g, room, hasWindow);
  return g;
}

/** A wall rectangle cut into short blocks along its length, so people beside it depth-sort correctly. */
function wallChunks(w: WallDef, heightM: number, colour: number, exterior: boolean): { g: Graphics; rect: Rect }[] {
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
    isoBlock(g, rect.x0, rect.y0, rect.x1, rect.y1, 0, heightM, { colour, top: shade(colour, 1.12), edge: 0.3 });
    wallDetails(g, rect, heightM, alongX, exterior);
    out.push({ g, rect });
  }
  return out;
}

function drawStairs(s: StairDef, zBase: number, thin = false): { g: Graphics; rect: Rect; sortY: number }[] {
  const r = s.ramp;
  const n = 15;
  const out: { g: Graphics; rect: Rect; sortY: number }[] = [];
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
    // Seen from the upper floor only the treads show, going down into the opening: drawn as solid columns down to the
    // lower floor they hung below the upper floor's edge (owner, 18/11/2026: "distorted and broken").
    const top = zBase + s.riseM * t1;
    isoBlock(g, rect.x0, rect.y0, rect.x1, rect.y1, thin ? Math.max(zBase, top - 0.22) : zBase, top, {
      colour: i % 2 ? 0x4e3b29 : 0x58442f,
      top: 0x6b5238,
      edge: 0.3,
    });
    // A person standing on a tread must be drawn over it: sort by the tread's back edge at its top, not its near corner.
    const zTop = zBase + s.riseM * t1;
    out.push({ g, rect, sortY: s.rises === 'n' ? iso(rect.x1, rect.y0, zTop).y : frontY(rect, zBase) });
  }
  return out;
}

function doorNode(
  d: { id: string; rect: Rect; kind: string; exterior?: boolean },
  g: Graphics,
  lintel: boolean,
): DoorNode {
  const r = d.rect;
  const horizontal = r.x1 - r.x0 >= r.y1 - r.y0;
  let seed = 3;
  for (let i = 0; i < d.id.length; i++) seed = (seed * 31 + d.id.charCodeAt(i)) % 9973;
  const draw = (open: boolean): void => {
    g.clear();
    if (d.kind === 'gate') {
      // A low iron gate: swung wide when open.
      if (!open) isoBlock(g, r.x0, r.y0 - 0.02, r.x1, r.y1 + 0.02, 0, 1.2, { colour: 0x30343a, edge: 0.3 });
      else if (horizontal)
        isoBlock(g, r.x0, r.y0, r.x0 + 0.06, r.y0 + (r.x1 - r.x0), 0, 1.2, { colour: 0x30343a, edge: 0.3 });
      return;
    }
    drawDoorFrame(g, r, lintel);
    if (d.kind === 'arch') return;
    const exterior = d.exterior === true;
    if (!open) drawDoorLeaf(g, r, seed, exterior);
    else if (horizontal)
      // Swung back against the wall on one side.
      drawDoorLeaf(g, { x0: r.x0, y0: r.y0, x1: r.x0 + 0.07, y1: r.y0 + (r.x1 - r.x0) }, seed, exterior);
    else drawDoorLeaf(g, { x0: r.x0, y0: r.y0, x1: r.x0 + (r.y1 - r.y0), y1: r.y0 + 0.07 }, seed, exterior);
  };
  draw(false);
  return { setOpen: draw };
}

/**
 * Static pieces (a wall block, a sofa) never change shape, and the aged finish is hundreds of tiny shapes, so each is
 * drawn once into a texture and the screen then only draws one picture per piece. The result is a node that carries the
 * tint (the lighting), alpha (the wall fade) and visibility, exactly like the drawing it replaces.
 */
export type Baker = (g: Graphics) => Container;

/** A density a little under the usual zoom, so the baked edges stay clean. */
const BAKE_PX_PER_M = 56;

/**
 * Bake with the renderer: draw once into a texture and show it as a sprite at the same place. The renderer rounds a
 * texture's size to whole units, which would crush anything under a metre (a wall block), so the drawing is rendered
 * magnified `BAKE_PX_PER_M` times and the sprite shrunk back.
 */
export function bakerFor(renderer: Renderer): Baker {
  return (g) => {
    const holder = new Container();
    g.scale.set(BAKE_PX_PER_M);
    holder.addChild(g);
    const b = holder.getLocalBounds();
    if (b.width <= 0 || b.height <= 0) {
      g.scale.set(1);
      return g;
    }
    const texture = renderer.generateTexture({ target: holder, resolution: 1, antialias: true });
    const sprite = new Sprite(texture);
    sprite.scale.set(1 / BAKE_PX_PER_M);
    sprite.position.set(b.x / BAKE_PX_PER_M, b.y / BAKE_PX_PER_M);
    holder.destroy({ children: true });
    // The node stays at the origin like the drawing it replaces: the y-sort and the wall fade read its position.
    const node = new Container();
    node.addChild(sprite);
    return node;
  };
}

/** Without a renderer (tests) a piece stays as drawn. */
const noBake: Baker = (g) => g;

/**
 * Is this wall (or door) one of the room's two walls that face the camera, the south and the east ones? These stand
 * between the camera and everything in the room, so they go see-through while the player is inside it.
 */
export function isFrontWallOf(room: Rect, wall: Rect, tol = 0.45): boolean {
  // By position, not by the piece's shape: a short block of a thick wall is nearly square.
  const cx = (wall.x0 + wall.x1) / 2;
  const cy = (wall.y0 + wall.y1) / 2;
  const south = Math.abs(cy - room.y1) <= tol && cx >= room.x0 - tol && cx <= room.x1 + tol;
  const east = Math.abs(cx - room.x1) <= tol && cy >= room.y0 - tol && cy <= room.y1 + tol;
  return south || east;
}

/** The building's outline: every indoor room (not the yards or the shed) on both floors. */
export function buildingBounds(house: HouseDef): Rect {
  const rooms = house.rooms.filter((r) => !r.outdoors && r.kind !== 'shed');
  return {
    x0: Math.min(...rooms.map((r) => r.rect.x0)),
    y0: Math.min(...rooms.map((r) => r.rect.y0)),
    x1: Math.max(...rooms.map((r) => r.rect.x1)),
    y1: Math.max(...rooms.map((r) => r.rect.y1)),
  };
}

const insideRect = (r: Rect, x: number, y: number): boolean => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;

/**
 * Is a wall on the building's outline? 'front' for the south and east sides (they face the camera),
 * 'back' for the north and west ones, null for interior walls and anything off the building.
 */
export function onBuilding(w: Rect, b: Rect): 'front' | 'back' | null {
  const tol = 0.45;
  const alongX = w.x1 - w.x0 >= w.y1 - w.y0;
  const cx = (w.x0 + w.x1) / 2;
  const cy = (w.y0 + w.y1) / 2;
  if (!insideRect({ x0: b.x0 - tol, y0: b.y0 - tol, x1: b.x1 + tol, y1: b.y1 + tol }, cx, cy)) return null;
  if (alongX) {
    if (Math.abs(cy - b.y1) <= tol) return 'front';
    if (Math.abs(cy - b.y0) <= tol) return 'back';
  } else {
    if (Math.abs(cx - b.x1) <= tol) return 'front';
    if (Math.abs(cx - b.x0) <= tol) return 'back';
  }
  return null;
}

export function buildHouseView(house: HouseDef, world: HouseWorld, bake: Baker = noBake): HouseView {
  const root = new Container();
  root.label = 'house';
  const floors: FloorLayer[] = [];
  const nodes: HouseNodeRef[] = [];
  const doors = new Map<string, DoorNode>();
  // In a house every wall that stands between the camera and a person fades much further than in an arena
  // (owner, 18/11/2026: walls must never hide the player), and a little before the person is covered.
  const fader = new OcclusionFader({ occludedAlpha: 0.14, grow: 0.22 });
  const building = buildingBounds(house);

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
    // The rooms along the back wall have a window: a slant of cold moonlight lies across their floor.
    const g = drawFloor(room, room.rect.y0 <= building.y0 + 0.3);
    const node = room.outdoors ? g : bake(g);
    floors[room.floor]!.ground.addChild(node);
    nodes.push({ node, floor: room.floor, room: room.id, kind: 'floor', id: `floor-${room.id}`, rect: room.rect });
  }
  // The stairwell upstairs is a hole: paint it dark over the floor.
  for (const s of house.stairs) {
    const hole = new Graphics().poly(poly(s.ramp)).fill(0x08080b);
    floors[s.topFloor]!.ground.addChild(hole);
  }
  for (const f of house.furniture) {
    if (f.kind !== 'rug' && f.kind !== 'path') continue; // the yards' grass is their room floor
    const g = new Graphics().poly(poly(f)).fill(aged(f.colour));
    if (f.kind === 'rug') {
      // A worn rug: a darker border, a frayed edge, a stain and a bald patch.
      g.poly(poly({ x0: f.x0 + 0.25, y0: f.y0 + 0.25, x1: f.x1 - 0.25, y1: f.y1 - 0.25 })).stroke({
        width: 0.05,
        color: aged(0xc9a96a, 0.7),
        alpha: 0.7,
      });
      g.poly(poly({ x0: f.x0 + 0.5, y0: f.y0 + 0.5, x1: f.x1 - 0.5, y1: f.y1 - 0.5 })).stroke({
        width: 0.02,
        color: 0x000000,
        alpha: 0.3,
      });
      const c = iso((f.x0 + f.x1) / 2 + 0.8, (f.y0 + f.y1) / 2 - 0.3);
      g.ellipse(c.x, c.y, 0.55, 0.28).fill({ color: 0x120a08, alpha: 0.35 });
      const bald = iso((f.x0 + f.x1) / 2 - 0.9, (f.y0 + f.y1) / 2 + 0.4);
      g.ellipse(bald.x, bald.y, 0.7, 0.35).fill({ color: 0x1d1612, alpha: 0.25 });
    }
    floors[f.floor]!.ground.addChild(g);
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
    // The walls on the building's outline: the south and east ones face the camera, so they stand low.
    const inside = onBuilding(w, building);
    const front = inside === 'front';
    const heightM = w.kind === 'wall' && front ? LEDGE_M : w.heightM;
    const exterior = w.kind === 'wall' && inside !== null;
    const outbuilding =
      w.kind === 'wall' && inside === null && !insideRect(building, (w.x0 + w.x1) / 2, (w.y0 + w.y1) / 2);
    const colour =
      w.kind === 'fence'
        ? 0x6f695c
        : w.kind === 'rail'
          ? 0x4a3a2a
          : exterior || outbuilding
            ? BRICK_AGED
            : PLASTER_AGED;
    // The railing round the stairwell upstairs is collision only: drawn, it cut across the steps going down (owner,
    // 18/11/2026: "remove the barrier going through the stairs"). It still stops anyone stepping into the opening.
    if (house.stairs.some((s) => w.kind === 'rail' && w.floor === s.topFloor && w.floor !== s.bottomFloor)) continue;
    // The block under the landing only stops anyone walking into the gap behind the top step; drawn, it stood over
    // the arriving steps like a floating wall (owner, 18/11/2026), so it is collision only too.
    if (w.heightM === STAIR_BLOCK_M) continue;
    for (const c of wallChunks(w, heightM, colour, exterior || outbuilding)) {
      const node = bake(c.g);
      // A rail beside a flight stands behind its treads on the camera's side (the treads rise above it), so it is drawn
      // before every tread; sorted by its own corner it cut across the upper steps (owner, 18/11/2026: "distorted").
      const behindStairs = stairRailKey(w, house);
      layer.actors.add(node, flightBackKey(w, house) ?? behindStairs ?? frontY(c.rect));
      // The stairs' rails and the block under their landing are part of the staircase: always opaque (owner, 18/11/2026).
      const fades = wallFades(w);
      nodes.push({ node, floor: w.floor, room: null, kind: 'wall', id: `wall-${w.x0}-${w.y0}`, rect: c.rect, fades });
      if (fades) fader.add(node);
    }
  }

  // ---- furniture
  for (const f of house.furniture) {
    if (f.kind === 'rug' || f.kind === 'lawn' || f.kind === 'path') continue;
    const g = drawHouseFurniture(
      f,
      house.furniture,
      house.walls.filter((w) => w.floor === f.floor),
    );
    const layer = floors[f.floor]!;
    const node = bake(g);
    layer.actors.add(node, frontY(f));
    nodes.push({
      node,
      floor: f.floor,
      room: world.roomAt(f.floor, (f.x0 + f.x1) / 2, (f.y0 + f.y1) / 2)?.id ?? null,
      kind: 'furniture',
      id: f.id,
      rect: f,
    });
    // Tall pieces (a wardrobe, a bookshelf) fade when they stand in front of the player; low ones (a sofa) never hide anyone.
    if (f.heightM >= FURNITURE_FADE_M) fader.add(node, FURNITURE_FADE_ALPHA);
  }

  // ---- doors
  for (const d of house.doors) {
    const g = new Graphics();
    const node = doorNode(d, g, onBuilding(d.rect, building) !== 'front');
    node.setOpen(world.isOpen(d.id));
    doors.set(d.id, node);
    floors[d.floor]!.actors.add(g, frontY(d.rect));
    fader.add(g, DOOR_FADE_ALPHA);
    nodes.push({ node: g, floor: d.floor, room: null, kind: 'door', id: d.id, rect: d.rect });
  }

  // ---- stairs (the same treads on both floors: the upper copy shows through the stairwell)
  for (const s of house.stairs) {
    for (const [floor, zBase] of [
      [s.bottomFloor, 0],
      [s.topFloor, -s.riseM],
    ] as const) {
      const treads = drawStairs(s, zBase, floor === s.topFloor);
      // Upstairs only the top steps going down are drawn: the rest are far below the floor, in the dark pit (drawn deeper
      // they floated over the floor in front of the stairwell).
      // Every tread shows: they are thin now, so the upper flight reads as the steps going down into the opening, and
      // the figure on them is never over empty air (owner, 19/11/2026: "stuck between the stairs and the void").
      const shown = treads;
      for (const t of treads.filter((x) => shown.includes(x))) {
        const node = bake(t.g);
        floors[floor]!.actors.add(node, t.sortY);
        nodes.push({ node, floor, room: null, kind: 'stairs', id: s.id, rect: t.rect });
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
