import type { PropPlacement } from '../objects/props';

/**
 * A playable arena as pure data (REQ-ARC-3). The floor spans
 * (0,0)–(widthM, heightM); walls sit just outside it. +x = right, +y = down.
 */
export interface ArenaLayout {
  readonly id: string;
  readonly name: string;
  readonly widthM: number;
  readonly heightM: number;
  readonly wallThicknessM: number;
  readonly props: readonly PropPlacement[];
  readonly playerStart: { readonly x: number; readonly y: number };
  readonly dummyStart: { readonly x: number; readonly y: number };
  /** Window strips along the top wall: start and end x in metres. */
  readonly windows?: readonly { readonly x0: number; readonly x1: number }[];
  readonly look: {
    readonly background: number;
    readonly floor: number;
    /** Floor grid or tile lines; null = none. */
    readonly floorLines: number | null;
    /** Spacing of floor lines in metres. */
    readonly floorLineSpacingM: number;
    readonly wall: number;
    readonly wallEdge: number;
  };
  /** Greybox until final art (REQ-ENV-6). */
  readonly greybox: boolean;
  /** Areas with their own floor (e.g. a room with wood instead of carpet), drawn over the base floor. */
  readonly floorZones?: readonly FloorZone[];
  /** Solid walls inside the arena (rect, metres). Drawn as wall blocks and given colliders. */
  readonly interiorWalls?: readonly WallRect[];
  /** Background fight music: a track id from src/data/audio/music-tracks.ts (each map its own). */
  readonly music?: string;
  /** Doors in gaps of the interior walls. */
  readonly doors?: readonly DoorSpec[];
}

export interface Rect {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
  /** Turned about its centre (walls and doors only; see src/core/oriented-rect.ts). */
  readonly angleRad?: number;
}

/** An interior wall: a (possibly turned) box, optionally in its own colour. */
export interface WallRect extends Rect {
  readonly colour?: number;
  /** A breakable section's hit points (owner, 11/11/2026); none = an unbreakable wall. */
  readonly durability?: number;
}

export interface FloorZone extends Rect {
  readonly floor: number;
  /** Line colour (tiles or planks); null = plain. */
  readonly lines: number | null;
  readonly lineSpacingM: number;
  /** Planks run along x only (wood floor); otherwise a square tile grid. */
  readonly planks?: boolean;
  /** Wall colour for interior walls bordering this zone (rooms look different). */
  readonly wall?: number;
  /** The zone's real outline when it is not the whole rect (x, y pairs, metres); the rect is its bounds. */
  readonly polygon?: readonly number[];
}

/**
 * A breakable door (owner request, 11/11/2026). Closed at the start and blocks
 * the way; only a kick or a heavy knockback impact against it breaks it.
 */
export interface DoorSpec extends Rect {
  readonly id: string;
  /** Impact strength needed to break it (kick ≈ 600, a knocked-back dummy ≈ mass × speed). */
  readonly breakStrength: number;
  /**
   * Frame posts between the leaf and each wall end (owner, 11/11/2026: no clipping into the
   * wall). `corners` is the post's exact floor outline (4 points, metres) filling the gap from
   * the leaf's end to the wall's end face, so the post meets both flush; `rect` is the solid box
   * used for collision and navigation. The posts stay standing when the leaf opens or breaks.
   */
  readonly posts?: readonly DoorPost[];
}

export interface DoorPost {
  readonly corners: readonly { readonly x: number; readonly y: number }[];
  readonly rect: Rect;
}
