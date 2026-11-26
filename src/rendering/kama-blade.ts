import type { Graphics } from 'pixi.js';

interface Pt {
  readonly x: number;
  readonly y: number;
}

/**
 * Kamaw's chained sickle head (owner, 26/11/2026, after his reference): the chain's ring at the base of a short dark handle, and a crescent
 * blade rising from the top of the handle, thick in the middle and curving to a needle point, dark steel with a bright sharpened inner edge.
 * `base` is where the chain attaches; `dir` points from there up the handle; the crescent curves towards `dir` turned by +90° (`side` flips it).
 * Returns the blade's tip.
 */
export function drawKama(g: Graphics, base: Pt, dir: Pt, side: 1 | -1 = 1, scale = 1, outline = 0.012, handle = true): Pt {
  const nx = -dir.y * side;
  const ny = dir.x * side;
  const P = (a: number, s: number): Pt => ({ x: base.x + (dir.x * a + nx * s) * scale, y: base.y + (dir.y * a + ny * s) * scale });
  const INK = 0x0a0b0e;
  // The ring the chain hangs from, and the dark wrapped handle.
  const h0 = P(0.03, 0);
  const h1 = P(0.21, 0);
  if (handle) {
    g.moveTo(h0.x, h0.y).lineTo(h1.x, h1.y).stroke({ width: 0.046 * scale + outline, color: INK, cap: 'round' });
    g.moveTo(h0.x, h0.y).lineTo(h1.x, h1.y).stroke({ width: 0.036 * scale, color: 0x1e1712, cap: 'round' });
    for (const a of [0.08, 0.13, 0.18]) {
      const w0 = P(a, -0.02);
      const w1 = P(a + 0.015, 0.02);
      g.moveTo(w0.x, w0.y).lineTo(w1.x, w1.y).stroke({ width: 0.006 * scale, color: 0x4a3a2c });
    }
    const ring = P(0, 0);
    g.circle(ring.x, ring.y, 0.014 * scale).stroke({ width: 0.014 * scale, color: INK }).stroke({ width: 0.007 * scale, color: 0xc8ccd8 });
  }
  // The blade is 30% shorter than the first cut (owner, 26/11/2026): every blade point is scaled about the top of the handle.
  const B = (a: number, sd: number): Pt => P(0.2 + (a - 0.2) * 0.7, sd * 0.7);
  // The crescent: the outer (spine) curve and the inner (cutting) curve meet at the point.
  const tip = B(0.62, 0.3);
  const s0 = B(0.2, -0.04);
  const s1 = B(0.47, -0.07);
  const s2 = B(0.6, 0.14);
  const e0 = B(0.44, 0.09);
  const e1 = B(0.22, 0.04);
  g.moveTo(s0.x, s0.y)
    .quadraticCurveTo(s1.x, s1.y, s2.x, s2.y)
    .quadraticCurveTo(B(0.63, 0.22).x, B(0.63, 0.22).y, tip.x, tip.y)
    .quadraticCurveTo(e0.x, e0.y, e1.x, e1.y)
    .closePath()
    .fill(0x2e323c)
    .stroke({ width: outline, color: INK, join: 'round' });
  // A lighter band along the spine and the bright honed edge on the inside of the curve.
  g.moveTo(B(0.24, -0.03).x, B(0.24, -0.03).y)
    .quadraticCurveTo(B(0.46, -0.045).x, B(0.46, -0.045).y, B(0.57, 0.12).x, B(0.57, 0.12).y)
    .stroke({ width: 0.012 * scale, color: 0x5c6272, cap: 'round' });
  g.moveTo(tip.x, tip.y).quadraticCurveTo(e0.x, e0.y, e1.x, e1.y).stroke({ width: 0.009 * scale, color: 0xe8ecf4, cap: 'round' });
  return tip;
}
