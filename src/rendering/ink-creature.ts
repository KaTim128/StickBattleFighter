import type { Graphics } from 'pixi.js';
import { type InkDrawState, ribbon, type Skel } from './ink-parts';

type Point = { x: number; y: number };

/**
 * The painted look of Inkmaster's creatures (clones and the monster): wet black ink with dry-brush streaks along every limb, a
 * cold blue-white highlight on the lit side, ribbons of ink that flow off the joints, drips that gather and fall, and a pool at the
 * feet. Presentation only: it reads the solved skeleton and the render clock and touches no gameplay state.
 */
const BLACK = 0x060608;
const STREAK = 0x3a3f52;
const SHEEN = 0xbcd8ff;
const WASH = 0x1c2030;

/** A repeatable pseudo-random number in 0..1 from a seed, so streaks keep their place frame to frame. */
function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Dry-brush streaks along a limb or the trunk, with a blue-white sheen down the lit side. */
function streaks(g: Graphics, a: Point, b: Point, width: number, lx: number, seed: number, sheen = true): void {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l = Math.hypot(dx, dy) || 1;
  const ux = dx / l;
  const uy = dy / l;
  const nx = -uy;
  const ny = ux;
  // Which normal faces the light (up and to the screen's left).
  const side = nx * lx + ny * -0.83 >= 0 ? 1 : -1;
  for (let k = 0; k < 3; k++) {
    const off = (hash(seed + k) - 0.5) * width * 0.7;
    const from = 0.08 + hash(seed + k * 3.1) * 0.3;
    const to = from + 0.3 + hash(seed + k * 5.7) * 0.4;
    g.moveTo(a.x + ux * l * from + nx * off, a.y + uy * l * from + ny * off)
      .lineTo(a.x + ux * l * Math.min(0.96, to) + nx * off * 0.8, a.y + uy * l * Math.min(0.96, to) + ny * off * 0.8)
      .stroke({ width: width * (0.06 + hash(seed + k * 9) * 0.06), color: STREAK, alpha: 0.7, cap: 'round' });
  }
  if (sheen) {
    const off = side * width * 0.32;
    g.moveTo(a.x + ux * l * 0.14 + nx * off, a.y + uy * l * 0.14 + ny * off)
      .lineTo(a.x + ux * l * 0.8 + nx * off, a.y + uy * l * 0.8 + ny * off)
      .stroke({ width: width * 0.07, color: SHEEN, alpha: 0.55, cap: 'round' });
  }
}

/** A ribbon of ink flowing off `from`, trailing down and back, swaying; `reach` is its length in metres. */
function flow(g: Graphics, from: Point, st: InkDrawState, reach: number, width: number, phase: number, rise = 0): void {
  const n = 6;
  const pts: Point[] = [];
  const widths: number[] = [];
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    pts.push({
      x: from.x - st.facing * 0 - u * reach * 0.8 + Math.sin(st.t * 3.2 + phase + u * 3) * 0.05 * u * (reach / 0.3),
      y: from.y + u * reach * (0.55 - rise) + Math.cos(st.t * 2.6 + phase + u * 2.4) * 0.04 * u * (reach / 0.3),
    });
    widths.push(width * (1 - u) ** 0.9 + 0.003);
  }
  ribbon(g, pts, widths, BLACK, 0.95);
}

/** A drop that swells at `at`, lets go and falls; loops every `periodS`. */
function drip(g: Graphics, at: Point, st: InkDrawState, phase: number, size = 0.014, fall = 0.45): void {
  const p = (st.t / 1.3 + phase) % 1;
  if (p < 0.45) {
    // Swelling on the lip.
    g.ellipse(at.x, at.y + p * 0.04, size * (0.5 + p), size * (0.7 + p * 1.4)).fill(BLACK);
    return;
  }
  const q = (p - 0.45) / 0.55;
  g.ellipse(at.x, at.y + q * q * fall, size * 0.8, size * 1.5).fill({ color: BLACK, alpha: 1 - q * 0.7 });
  g.circle(at.x - size * 0.2, at.y + q * q * fall - size * 0.5, size * 0.28).fill({
    color: SHEEN,
    alpha: 0.5 * (1 - q),
  });
}

/** The pool a creature stands in: a few overlapping dark ellipses with a glint, rippling slowly. */
export function drawInkPool(g: Graphics, s: Skel, st: InkDrawState, scale = 1): void {
  const fy = Math.max(s.legFront[2].y, s.legBack[2].y) + 0.01;
  const cx = (s.legFront[2].x + s.legBack[2].x) / 2;
  const ripple = Math.sin(st.t * 2.2) * 0.03;
  g.ellipse(cx, fy, (0.5 + ripple) * scale, 0.11 * scale).fill({ color: BLACK, alpha: 0.55 });
  g.ellipse(cx - 0.12 * scale, fy, (0.34 - ripple) * scale, 0.075 * scale).fill({ color: BLACK, alpha: 0.7 });
  g.ellipse(cx - 0.22 * scale, fy - 0.01, 0.09 * scale, 0.02 * scale).fill({ color: SHEEN, alpha: 0.35 });
  // Flecks thrown out of the pool.
  for (let i = 0; i < 5; i++) {
    const a = hash(i * 7.3) * 6.28;
    const d = (0.45 + hash(i * 2.1) * 0.3) * scale;
    g.circle(cx + Math.cos(a) * d, fy + Math.sin(a) * 0.05, 0.012 + hash(i) * 0.012).fill({ color: BLACK, alpha: 0.6 });
  }
}

/** Behind the body: ink that flows off the shoulders and trails behind the creature like a torn painted cloak. */
export function drawInkBack(g: Graphics, s: Skel, st: InkDrawState, big: boolean): void {
  const k = big ? 1.7 : 1;
  const top = s.neck ?? s.chest;
  for (let i = 0; i < 3; i++) {
    const from = { x: top.x - 0.05 - i * 0.05, y: top.y + 0.04 + i * 0.1 };
    flow(g, from, st, (0.5 + i * 0.12) * k, 0.07 * k, i * 1.7, -0.1);
  }
}

/** Over the body: dry-brush streaks, sheen, ink ribbons off the elbows, drips and a few motes. */
export function drawInkSurface(g: Graphics, fire: Graphics, s: Skel, st: InkDrawState, big: boolean): void {
  const lx = -0.55 * st.facing;
  const w = st.w;
  const k = big ? 1.5 : 1;
  streaks(g, s.pelvis, s.chest, w * 1.5, lx, 1);
  for (const [i, limb] of [s.armBack, s.armFront, s.legBack, s.legFront].entries()) {
    streaks(g, limb[0], limb[1], w, lx, 10 + i * 4);
    streaks(g, limb[1], limb[2], w * 0.85, lx, 12 + i * 4, i > 1);
  }
  // A calligraphic swirl across the chest: one confident brush-stroke, thick to thin.
  const c = { x: (s.chest.x + s.pelvis.x) / 2, y: (s.chest.y + s.pelvis.y) / 2 };
  const swirl = [0, 1, 2, 3, 4, 5].map((i) => {
    const u = i / 5;
    const a = -0.6 + u * 4.2;
    return { x: c.x + Math.cos(a) * w * 0.9 * (1 - u * 0.4), y: c.y + Math.sin(a) * w * 1.2 * (1 - u * 0.4) };
  });
  ribbon(g, swirl, [w * 0.3, w * 0.28, w * 0.2, w * 0.14, w * 0.08, 0.004], STREAK, 0.65);
  // Ink flowing off the elbows and trailing from the hands.
  flow(g, s.armFront[1], st, 0.32 * k, 0.045 * k, 0.4);
  flow(g, s.armBack[1], st, 0.28 * k, 0.04 * k, 2.1);
  flow(g, s.armFront[2], st, 0.24 * k, 0.035 * k, 3.3);
  // Drips from the hands, the elbow and the belly.
  drip(g, s.armFront[2], st, 0.1, 0.014 * k, 0.4 * k);
  drip(g, s.armBack[2], st, 0.55, 0.012 * k, 0.4 * k);
  drip(g, s.armFront[1], st, 0.8, 0.011 * k, 0.3 * k);
  drip(g, { x: c.x + 0.02, y: c.y + w * 0.9 }, st, 0.3, 0.012 * k, 0.3 * k);
  // A faint cold glow on the shoulders, and motes lifting off the body like spray from a wet brush.
  fire.circle(s.chest.x, s.chest.y, 0.28 * k).fill({ color: 0x6aa0ff, alpha: 0.04 });
  for (let i = 0; i < 5; i++) {
    const p = (st.t * 0.5 + hash(i * 3.3)) % 1;
    const x = c.x + (hash(i * 1.9) - 0.5) * 0.6 * k;
    g.circle(x, c.y + 0.1 - p * 0.9 * k, 0.012 * (1 - p) * k + 0.003).fill({
      color: i % 2 ? SHEEN : WASH,
      alpha: 0.7 * (1 - p),
    });
  }
}
