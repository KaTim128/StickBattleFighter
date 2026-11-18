/**
 * The Hide and Seek house as pure data (Phase 2, master plan section A). Metres, +x right, +y down
 * the map. Two floors (0 ground, 1 upper) plus the lot around the house on the ground floor.
 */
export interface Rect {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

export type FloorIndex = 0 | 1;

export type RoomKind = 'room' | 'hall' | 'corridor' | 'bathroom' | 'yard' | 'shed';

export interface RoomDef {
  readonly id: string;
  readonly name: string;
  readonly floor: FloorIndex;
  readonly rect: Rect;
  readonly kind: RoomKind;
  /** 0..1 how well lit the room is when occupied (the yards are moonlit, rooms lamp-lit). */
  readonly light: number;
  /** Outdoors: no ceiling, moonlight, open sky. */
  readonly outdoors?: boolean;
}

export interface WallDef extends Rect {
  readonly floor: FloorIndex;
  /** Blocks sight (every wall does; low fences and hedges do not). */
  readonly blocksSight: boolean;
  /** How much of a sound's loudness gets through (0 = none, 1 = all); a closed wall is quiet but not silent. */
  readonly soundPass: number;
  /** Drawn height, metres. */
  readonly heightM: number;
  readonly kind: 'wall' | 'fence' | 'rail';
}

export type DoorKind = 'door' | 'arch' | 'gate';

export interface DoorDef {
  readonly id: string;
  readonly floor: FloorIndex;
  /** The gap in the wall the door fills. */
  readonly rect: Rect;
  readonly kind: DoorKind;
  /** The rooms on each side. */
  readonly between: readonly [string, string];
  /** Starts open (arches are always open). */
  readonly open: boolean;
  /** An outside door (front, back, gate): louder to open. */
  readonly exterior?: boolean;
}

export type HideKind =
  | 'under-bed'
  | 'wardrobe'
  | 'cupboard'
  | 'chest'
  | 'box'
  | 'behind-sofa'
  | 'under-sofa'
  | 'curtain'
  | 'shower-curtain'
  | 'bush'
  | 'under-table'
  | 'shed-cabinet';

/** A hiding place: a functional object with its own concealment and noise (master plan section B and F). */
export interface HideSpec {
  readonly kind: HideKind;
  /** 0..1: how likely the occupant is to go unseen from a clear line of sight (1 = invisible). */
  readonly concealment: number;
  /** 0..1 loudness of getting in and out (hiding is never silent). */
  readonly noise: number;
  /** How far the occupant can see from inside, metres (the reduced view while hiding). */
  readonly viewM: number;
  /** Where the occupant ends up (inside the object). */
  readonly at: { readonly x: number; readonly y: number };
  /** Which way the hiding place opens (where the occupant steps out, and where it can be seen from). */
  readonly opensToward: 'n' | 's' | 'e' | 'w';
}

export type FurnitureKind =
  | 'sofa'
  | 'armchair'
  | 'coffee-table'
  | 'tv-console'
  | 'rug'
  | 'side-table'
  | 'floor-lamp'
  | 'bookshelf'
  | 'artwork'
  | 'dining-table'
  | 'chair'
  | 'counter'
  | 'fridge'
  | 'stove'
  | 'sink'
  | 'cupboard'
  | 'toilet'
  | 'bathtub'
  | 'basin'
  | 'bed'
  | 'nightstand'
  | 'wardrobe'
  | 'desk'
  | 'chest'
  | 'box'
  | 'shelf'
  | 'curtain'
  | 'shower-curtain'
  | 'bush'
  | 'tree'
  | 'bench'
  | 'garden-table'
  | 'barbecue'
  | 'car'
  | 'path'
  | 'lawn'
  | 'bin'
  | 'shed-cabinet';

export interface FurnitureDef extends Rect {
  readonly id: string;
  readonly kind: FurnitureKind;
  readonly floor: FloorIndex;
  /** Drawn height, metres. */
  readonly heightM: number;
  /** Blocks movement. Rugs, paths and the like do not. */
  readonly solid: boolean;
  /** Blocks sight (a wardrobe does; a coffee table does not). */
  readonly blocksSight: boolean;
  readonly colour: number;
  readonly hide?: HideSpec;
}

export interface StairDef {
  readonly id: string;
  /** The ramp's walkable footprint (the same on both floors). */
  readonly ramp: Rect;
  /** Which way the ramp rises. */
  readonly rises: 'n' | 's' | 'e' | 'w';
  /** Height gained over the run, metres. */
  readonly riseM: number;
  readonly bottomFloor: FloorIndex;
  readonly topFloor: FloorIndex;
}

export type PropKind = 'bottle' | 'can' | 'toy';

export interface ThrowableDef {
  readonly id: string;
  readonly kind: PropKind;
  readonly floor: FloorIndex;
  readonly x: number;
  readonly y: number;
}

export interface HouseDef {
  readonly id: string;
  readonly name: string;
  readonly widthM: number;
  readonly heightM: number;
  readonly rooms: readonly RoomDef[];
  readonly walls: readonly WallDef[];
  readonly doors: readonly DoorDef[];
  readonly stairs: readonly StairDef[];
  readonly furniture: readonly FurnitureDef[];
  readonly throwables: readonly ThrowableDef[];
  /** The player's start (a room with a few hiding places near) and the hunter's (outside, at the front gate). */
  readonly playerStart: { readonly floor: FloorIndex; readonly x: number; readonly y: number };
  readonly hunterStart: { readonly floor: FloorIndex; readonly x: number; readonly y: number };
  /** Where the hunter first looks when the hunt begins (his patrol route). */
  readonly patrol: readonly { readonly floor: FloorIndex; readonly x: number; readonly y: number }[];
}
