import type { Graphics } from 'pixi.js';
import type { Point } from '../core/oriented-rect';

export interface PrismLook {
  /** Faces turned towards the camera (south). */
  readonly front: number;
  readonly top: number;
  readonly edge: number;
  readonly edgeWidth?: number;
}

/**
 * Draw a block standing on the floor: its footprint `corners` (relative to the
 * graphics' origin, in order around it) raised `heightM` up the screen. Only the
 * sides facing the camera (+y) and the top are drawn, so any footprint works,
 * turned walls included.
 */
export function drawPrism(g: Graphics, corners: readonly Point[], heightM: number, look: PrismLook): Graphics {
  const n = corners.length;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const p = corners[i]!;
    const q = corners[(i + 1) % n]!;
    area += p.x * q.y - q.x * p.y;
  }
  const outward = area > 0 ? 1 : -1; // y-down screen: positive area = clockwise
  for (let i = 0; i < n; i++) {
    const p = corners[i]!;
    const q = corners[(i + 1) % n]!;
    // Outward normal of edge p→q.
    const ny = -(q.x - p.x) * outward;
    if (ny <= 1e-6) continue;
    g.poly([p.x, p.y, q.x, q.y, q.x, q.y - heightM, p.x, p.y - heightM])
      .fill(look.front)
      .stroke({ width: look.edgeWidth ?? 0.02, color: look.edge, alpha: 0.7 });
  }
  const top = corners.flatMap((p) => [p.x, p.y - heightM]);
  return g
    .poly(top)
    .fill(look.top)
    .stroke({ width: look.edgeWidth ?? 0.02, color: look.edge, alpha: 0.8 });
}
