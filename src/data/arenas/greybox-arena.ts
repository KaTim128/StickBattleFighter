/**
 * Shape of a greybox test arena (2D top-down, TD-021). World units are metres;
 * the floor spans (0,0)–(arenaWidthM, arenaHeightM), +x = right, +y = down.
 */
export interface GreyboxArena {
  readonly arenaWidthM: number;
  readonly arenaHeightM: number;
  readonly wallThicknessM: number;
  /** Upright pillars: a collider footprint on the floor, drawn rising "up" the screen. */
  readonly pillars: readonly { readonly x: number; readonly y: number }[];
  readonly pillarFootprintHalf: { readonly x: number; readonly y: number };
  readonly pillarHeightM: number;
  readonly colours: {
    readonly background: number;
    readonly floor: number;
    readonly grid: number;
    readonly wall: number;
    readonly wallEdge: number;
    readonly shadow: number;
    readonly pillarFront: number;
    readonly pillarTop: number;
    readonly pillarEdge: number;
  };
}

export const GREYBOX_COLOURS = {
  background: 0x141922,
  floor: 0x4c5563,
  grid: 0x5f6977,
  wall: 0x2a303b,
  wallEdge: 0x7b8594,
  shadow: 0x000000,
  pillarFront: 0x8b93a1,
  pillarTop: 0xb5bdc9,
  pillarEdge: 0x2a303b,
} as const;
