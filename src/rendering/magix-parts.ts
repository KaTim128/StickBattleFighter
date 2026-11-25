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
 * Magix's head: a tall black top hat with a red band, a plain white face with only a curled black moustache, and the
 * red bow tie at his throat. Drawn in the model's local frame (x forward).
 */
export function drawMagixHead(g: Graphics, s: Skel, st: MagixDrawState): void {
  const r = st.headRadius;
  const h = s.head;
  // The face: a plain white head with nothing on it but a thick, curled black moustache.
  g.circle(h.x, h.y, r * 0.97).fill(WHITE);
  const mx = h.x + r * 0.3;
  const my = h.y + r * 0.32;
  // Two thick lobes swelling out from the middle and drooping a little, each ending in a tight upward curl (a handlebar).
  for (const side of [-1, 1]) {
    g.moveTo(mx, my - r * 0.14)
      .bezierCurveTo(
        mx + side * r * 0.25,
        my - r * 0.3,
        mx + side * r * 0.62,
        my - r * 0.12,
        mx + side * r * 0.66,
        my + r * 0.12,
      )
      .bezierCurveTo(mx + side * r * 0.5, my + r * 0.34, mx + side * r * 0.2, my + r * 0.3, mx, my + r * 0.12)
      .fill(BLACK);
    // The curled tip: a small hook turning up and back.
    g.circle(mx + side * r * 0.68, my + r * 0.0, r * 0.12).fill(BLACK);
    g.circle(mx + side * r * 0.62, my - r * 0.1, r * 0.07).fill(BLACK);
  }
  g.ellipse(mx, my - r * 0.02, r * 0.14, r * 0.14).fill(BLACK);
  // Texture: fine hair strands combed out along each lobe (lighter lines that fan out from the centre), a soft sheen on the top edge,
  // and a curl at each tip drawn as a small spiral.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const k = i / 2;
      const y0 = my - r * 0.06 + k * r * 0.14;
      g.moveTo(mx + side * r * 0.08, y0)
        .quadraticCurveTo(
          mx + side * r * 0.32,
          y0 - r * 0.1 + k * r * 0.06,
          mx + side * r * (0.6 - k * 0.08),
          y0 + r * (0.0 + k * 0.06),
        )
        .stroke({ width: 0.005, color: 0x4a4a58, alpha: 0.9, cap: 'round' });
    }
    g.moveTo(mx + side * r * 0.1, my - r * 0.17)
      .quadraticCurveTo(mx + side * r * 0.36, my - r * 0.27, mx + side * r * 0.6, my - r * 0.12)
      .stroke({ width: 0.008, color: 0x6a6a78, alpha: 0.8, cap: 'round' });
    const tx = mx + side * r * 0.68;
    g.moveTo(tx - side * r * 0.08, my + r * 0.04)
      .quadraticCurveTo(tx + side * r * 0.08, my + r * 0.02, tx + side * r * 0.04, my - r * 0.08)
      .quadraticCurveTo(tx - side * r * 0.02, my - r * 0.12, tx - side * r * 0.05, my - r * 0.04)
      .stroke({ width: 0.005, color: 0x6a6a78, alpha: 0.9, cap: 'round' });
  }
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
