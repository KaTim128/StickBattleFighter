import type { Container } from 'pixi.js';
import type { YSortLayer } from './y-sort-layer';

/**
 * The wall occlusion rules, one set for every arena and game mode (owner, 20/11/2026). The camera looks in from the
 * south-east, so only walls to the south or east of a person can stand between the camera and them:
 * - a wall BEHIND a person (an east-west wall lying north of them, or a north-south wall lying west of them) never
 *   becomes transparent, and is always drawn behind them, never over them;
 * - a wall in front of them may fade (the `OcclusionFader`) when it hides them.
 * Presentation only; the arenas and the house feed their wall pieces through the same two functions.
 */
export interface WallRect {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

/**
 * How far past a person's position a wall piece may reach before it no longer counts as behind them, metres. None:
 * someone standing in a doorway is level with the wall's line, and the sections beside them are not behind them.
 */
export const BEHIND_M = 0;

/** Does this wall piece lie behind the person at `at`: it can never be between them and the camera. */
export function isBehindViewer(r: WallRect, at: { readonly x: number; readonly y: number }): boolean {
  const alongX = r.x1 - r.x0 >= r.y1 - r.y0;
  return alongX ? r.y1 <= at.y + BEHIND_M : r.x1 <= at.x + BEHIND_M;
}

export interface DepthViewer {
  readonly x: number;
  readonly y: number;
  /** The person's own depth key in the layer (their zIndex). */
  readonly z: number;
}

export interface WallPiece {
  readonly node: Container;
  readonly rect: WallRect;
}

/**
 * Holds wall pieces that lie behind a person just behind them in depth, every frame, so an opaque back wall is never
 * drawn over them (the sort keys of a long wall's far pieces can exceed a person's standing beside it). Pieces the
 * caller manages itself (the house's lifted front walls) are skipped.
 */
export class BackWallDepth {
  private readonly held = new Map<Container, YSortLayer>();

  /** Call every frame before the layer's own `update`... after it is fine too: it reads unbiased keys. */
  apply(
    layer: YSortLayer,
    pieces: readonly WallPiece[],
    viewers: readonly DepthViewer[],
    skip?: ReadonlySet<Container>,
  ): void {
    for (const [node, l] of this.held) l.setBias(node, 0);
    this.held.clear();
    for (const piece of pieces) {
      if (skip?.has(piece.node)) continue;
      const key = layer.keyOf(piece.node);
      // Held behind the people only when it is behind every one of them: a piece that is in front of someone must keep
      // its depth (and may fade for them), whatever it is behind for somebody else.
      if (viewers.length === 0 || !viewers.every((v) => isBehindViewer(piece.rect, v))) continue;
      const ceiling = Math.min(...viewers.map((v) => v.z)) - 0.01;
      if (key <= ceiling) continue;
      layer.setBias(piece.node, ceiling - key);
      this.held.set(piece.node, layer);
    }
  }

  clear(): void {
    for (const [node, l] of this.held) l.setBias(node, 0);
    this.held.clear();
  }
}
