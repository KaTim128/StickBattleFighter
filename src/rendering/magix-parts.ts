import type { Graphics } from 'pixi.js';
import type { Skel } from './ink-parts';

type Point = { x: number; y: number };

/** What the parts need to know about this frame (a subset of the premium model's draw state). */
export interface MagixDrawState {
  readonly t: number;
  readonly w: number;
  readonly headRadius: number;
  readonly facing: 1 | -1;
}

const BLACK = 0x0b0b10;
const BLACK_LIT = 0x2b2b36;
const BAND = 0xb3263a;
const WHITE = 0xf6f3ee;
const GOLD = 0xe3b94a;
const PINK = 0xf2a6b6;

/**
 * Magix's head: a tall black top hat with a red band, a pale face with a mischievous one-sided smile and a raised eyebrow, and the
 * red bow tie at his throat. Drawn in the model's local frame (x forward).
 */
export function drawMagixHead(g: Graphics, s: Skel, st: MagixDrawState): void {
  const r = st.headRadius;
  const h = s.head;
  // The face: a pale mask over the front of the head with a crooked grin.
  g.ellipse(h.x + r * 0.3, h.y + r * 0.1, r * 0.62, r * 0.78).fill({ color: WHITE, alpha: 0.95 });
  g.circle(h.x + r * 0.45, h.y - r * 0.1, r * 0.1).fill(BLACK);
  g.moveTo(h.x + r * 0.2, h.y - r * 0.3)
    .lineTo(h.x + r * 0.7, h.y - r * 0.42)
    .stroke({ width: 0.012, color: BLACK, cap: 'round' });
  g.moveTo(h.x + r * 0.1, h.y + r * 0.4)
    .quadraticCurveTo(h.x + r * 0.5, h.y + r * 0.72, h.x + r * 0.85, h.y + r * 0.3)
    .stroke({ width: 0.016, color: BAND, cap: 'round' });
  // The hat: a wide brim, then a tall crown that tips a little with his movement.
  const tip = Math.sin(st.t * 2.2) * 0.012;
  const brimY = h.y - r * 0.78;
  g.ellipse(h.x, brimY, r * 1.45, r * 0.3).fill(BLACK);
  g.poly([
    h.x - r * 0.88,
    brimY,
    h.x - r * 0.8 + tip,
    brimY - r * 2.05,
    h.x + r * 0.8 + tip,
    brimY - r * 2.05,
    h.x + r * 0.88,
    brimY,
  ]).fill(BLACK);
  g.ellipse(h.x + tip, brimY - r * 2.05, r * 0.8, r * 0.2).fill(BLACK_LIT);
  g.poly([
    h.x - r * 0.87,
    brimY - r * 0.1,
    h.x + r * 0.87,
    brimY - r * 0.1,
    h.x + r * 0.84,
    brimY - r * 0.55,
    h.x - r * 0.84,
    brimY - r * 0.55,
  ]).fill(BAND);
  g.moveTo(h.x - r * 0.55, brimY - r * 0.7)
    .lineTo(h.x - r * 0.5 + tip, brimY - r * 1.9)
    .stroke({ width: 0.012, color: BLACK_LIT, alpha: 0.9, cap: 'round' });
  // The bow tie, at the base of the neck.
  const n = { x: h.x + r * 0.05, y: h.y + r * 1.25 };
  g.poly([n.x, n.y, n.x - r * 0.42, n.y - r * 0.22, n.x - r * 0.42, n.y + r * 0.22]).fill(BAND);
  g.poly([n.x, n.y, n.x + r * 0.42, n.y - r * 0.22, n.x + r * 0.42, n.y + r * 0.22]).fill(BAND);
  g.circle(n.x, n.y, r * 0.12).fill(0x7c1626);
}

/** The rabbit's head: two long upright ears (pink inside) that flick, a round white face with a pink nose and a bright eye. */
export function drawRabbitHead(g: Graphics, s: Skel, st: MagixDrawState): void {
  const r = st.headRadius;
  const h = s.head;
  const flick = Math.sin(st.t * 5) * 0.04;
  for (const k of [0, 1]) {
    const bx = h.x - r * 0.1 + k * r * 0.5;
    const lean = -0.08 + k * 0.22 + flick;
    const top: Point = { x: bx + lean * r * 2, y: h.y - r * 3 };
    g.poly([bx - r * 0.28, h.y - r * 0.7, top.x, top.y, bx + r * 0.28, h.y - r * 0.7]).fill(WHITE);
    g.poly([bx - r * 0.14, h.y - r * 0.9, top.x, top.y + r * 0.35, bx + r * 0.14, h.y - r * 0.9]).fill(PINK);
  }
  g.circle(h.x, h.y, r * 1.02).fill(WHITE);
  g.circle(h.x + r * 0.55, h.y - r * 0.12, r * 0.14).fill(0x16161c);
  g.circle(h.x + r * 0.95, h.y + r * 0.12, r * 0.14).fill(PINK);
}

/** The magic wand: a slim black rod with white tips, a glint at the end, held along the forearm. Returns the tip. */
export function drawWand(g: Graphics, hand: Point, ux: number, uy: number, o: number, t: number): Point {
  const len = 0.55;
  const tip = { x: hand.x + ux * len, y: hand.y + uy * len };
  const back = { x: hand.x - ux * 0.08, y: hand.y - uy * 0.08 };
  g.moveTo(back.x, back.y)
    .lineTo(tip.x, tip.y)
    .stroke({ width: 0.04 + o * 2, color: 0x020204, cap: 'round' });
  g.moveTo(back.x, back.y).lineTo(tip.x, tip.y).stroke({ width: 0.034, color: BLACK_LIT, cap: 'round' });
  g.moveTo(tip.x - ux * 0.09, tip.y - uy * 0.09)
    .lineTo(tip.x, tip.y)
    .stroke({ width: 0.036, color: WHITE, cap: 'round' });
  g.moveTo(back.x, back.y)
    .lineTo(back.x + ux * 0.07, back.y + uy * 0.07)
    .stroke({ width: 0.036, color: WHITE, cap: 'round' });
  const tw = 0.5 + 0.5 * Math.sin(t * 9);
  g.circle(tip.x, tip.y, 0.018 + tw * 0.012).fill({ color: GOLD, alpha: 0.9 });
  return tip;
}
