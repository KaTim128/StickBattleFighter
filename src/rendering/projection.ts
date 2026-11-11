import { Matrix } from 'pixi.js';

/**
 * 2.5D PSEUDO-ISOMETRIC VIEW (owner approved the mockups, 11/11/2026; TD-045).
 *
 * The simulation stays top-down in metres (x right, y down the map, z up). Only the
 * presentation changes: a world point is drawn at
 *
 *   X = (x − y) · C          Y = (x + y) · C · T − z
 *
 * so the floor becomes a 2:1 diamond grid (about 26.6°) and height rises straight up the
 * screen, one unit per metre. Floors are drawn through `FLOOR_MATRIX` (exact for z = 0);
 * standing things are drawn upright at their projected feet; y-sorting by the projected Y
 * equals sorting by x + y (nearer the viewer draws in front).
 */
export const ISO_C = Math.SQRT1_2;
export const ISO_T = 0.5;

export interface ScreenPoint {
  x: number;
  y: number;
}

/** World (metres, z up) to view space (the world container's units). */
export function iso(x: number, y: number, z = 0): ScreenPoint {
  return { x: (x - y) * ISO_C, y: (x + y) * ISO_C * ISO_T - z };
}

/** View-space point on the floor (z = 0) back to the world. */
export function isoToWorld(sx: number, sy: number): ScreenPoint {
  const a = sx / ISO_C; // x − y
  const b = sy / (ISO_C * ISO_T); // x + y
  return { x: (a + b) / 2, y: (b - a) / 2 };
}

/**
 * A direction on screen (+x right, +y down: keyboard and joystick) as a world direction of the
 * same length, so W walks up the screen whatever the projection.
 */
export function screenDirToWorld(dx: number, dy: number): ScreenPoint {
  if (dx === 0 && dy === 0) return { x: 0, y: 0 };
  const w = isoToWorld(dx, dy);
  const len = Math.hypot(w.x, w.y) || 1;
  const mag = Math.min(1, Math.hypot(dx, dy));
  return { x: (w.x / len) * mag, y: (w.y / len) * mag };
}

/**
 * A world offset that moves a point `sx` straight sideways on screen (no change in depth):
 * effects on a billboarded fighter (fists, dust) sit beside it on screen, not along a world axis.
 */
export function screenSideToWorld(sx: number): ScreenPoint {
  return { x: sx / (2 * ISO_C), y: -sx / (2 * ISO_C) };
}

/** The floor plane's affine transform: draw floors in world metres inside a container with this matrix. */
export const FLOOR_MATRIX = new Matrix(ISO_C, ISO_C * ISO_T, -ISO_C, ISO_C * ISO_T, 0, 0);

/** The view-space box around a world rectangle (with heights from zLow to zHigh). */
export function isoBounds(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  zLow = 0,
  zHigh = 0,
): { minX: number; minY: number; maxX: number; maxY: number } {
  const pts = [iso(x0, y0, zHigh), iso(x1, y0, zHigh), iso(x0, y1, zLow), iso(x1, y1, zLow), iso(x0, y1, zHigh)];
  return {
    minX: Math.min(...pts.map((p) => p.x)),
    maxX: Math.max(...pts.map((p) => p.x)),
    minY: Math.min(...pts.map((p) => p.y)),
    maxY: Math.max(...pts.map((p) => p.y)),
  };
}
