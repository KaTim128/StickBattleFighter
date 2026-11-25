import type { Graphics } from 'pixi.js';

/**
 * An arc that starts a path of its own. Pixi's `arc` joins the pen's current position to the arc's start, so an arc drawn straight
 * after another shape leaves a stray straight line back to wherever the pen last was (often the world origin: owner, 25/11/2026,
 * the orange line under Geargrind's mine). Moving to the arc's start first makes it a clean stroke.
 */
export function arcPath(
  g: Graphics,
  cx: number,
  cy: number,
  r: number,
  from: number,
  to: number,
  counterClockwise?: boolean,
): Graphics {
  return g.moveTo(cx + Math.cos(from) * r, cy + Math.sin(from) * r).arc(cx, cy, r, from, to, counterClockwise);
}
