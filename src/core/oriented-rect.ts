/**
 * Boxes that may be turned (owner, 11/11/2026: an angled office wall so its door
 * can be seen). A box is its unturned extent x0..x1 × y0..y1, turned by
 * `angleRad` about its centre (+ = clockwise on screen, since +y is down).
 * Every overlap test on walls and doors goes through these, so a turned box
 * blocks, gets hit and is navigated exactly where it is drawn.
 */
export interface OrientedRect {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
  readonly angleRad?: number;
}

export interface Point {
  x: number;
  y: number;
}

/** A world point in the box's own unturned frame (the frame x0..y1 is written in). */
export function toBoxFrame(r: OrientedRect, x: number, y: number): Point {
  const a = r.angleRad ?? 0;
  if (a === 0) return { x, y };
  const cx = (r.x0 + r.x1) / 2;
  const cy = (r.y0 + r.y1) / 2;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const dx = x - cx;
  const dy = y - cy;
  return { x: cx + dx * c + dy * s, y: cy - dx * s + dy * c };
}

/** A point given in the box's unturned frame, back in the world. */
export function fromBoxFrame(r: OrientedRect, x: number, y: number): Point {
  const a = r.angleRad ?? 0;
  if (a === 0) return { x, y };
  const cx = (r.x0 + r.x1) / 2;
  const cy = (r.y0 + r.y1) / 2;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const dx = x - cx;
  const dy = y - cy;
  return { x: cx + dx * c - dy * s, y: cy + dx * s + dy * c };
}

/** Squared distance from a world point to the (turned) box; 0 inside. */
export function distanceSqToBox(r: OrientedRect, x: number, y: number): number {
  const p = toBoxFrame(r, x, y);
  const dx = Math.max(r.x0 - p.x, 0, p.x - r.x1);
  const dy = Math.max(r.y0 - p.y, 0, p.y - r.y1);
  return dx * dx + dy * dy;
}

/** The four corners in the world, in order around the box. */
export function boxCorners(r: OrientedRect): Point[] {
  return [
    fromBoxFrame(r, r.x0, r.y0),
    fromBoxFrame(r, r.x1, r.y0),
    fromBoxFrame(r, r.x1, r.y1),
    fromBoxFrame(r, r.x0, r.y1),
  ];
}

/**
 * A wall-like box along the segment a→b (its centre line), `thicknessM` thick,
 * written unturned along y and turned to match the segment.
 */
export function segmentBox(ax: number, ay: number, bx: number, by: number, thicknessM: number): OrientedRect {
  const cx = (ax + bx) / 2;
  const cy = (ay + by) / 2;
  const half = Math.hypot(bx - ax, by - ay) / 2;
  // Unturned, the box runs along +y; turning (0, 1) by a gives (−sin a, cos a) = the segment direction.
  const angleRad = Math.atan2(-(bx - ax), by - ay);
  return { x0: cx - thicknessM / 2, y0: cy - half, x1: cx + thicknessM / 2, y1: cy + half, angleRad };
}
