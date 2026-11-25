import type { Graphics } from 'pixi.js';

type Point = { x: number; y: number };

/**
 * What Inkmaster's people carry, drawn along the forearm in the world's metre units (x forward, y down): his oversized calligraphy
 * brush, and the ink clones' sword and bow. All black ink and dark lacquered wood with pale highlights, so they read against any floor.
 */

const INK_BLACK = 0x07070a;
const INK_WET = 0x24242c;
const PALE = 0xf2eee3;
const WOOD = 0x3a2416;
const WOOD_LIT = 0x6b4426;
const GOLD = 0xb99347;

/** A unit vector along `from -> to`, then turned `liftRad` radians up the screen (negative y). */
function along(from: Point, to: Point, liftRad: number): { ux: number; uy: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const l = Math.hypot(dx, dy) || 1;
  const c = Math.cos(-liftRad);
  const s = Math.sin(-liftRad);
  const bx = dx / l;
  const by = dy / l;
  return { ux: bx * c - by * s, uy: bx * s + by * c };
}

/**
 * The calligraphy brush, taller than he is: a long dark wooden handle with a gold ferrule and a full black bristle head that flows
 * to a fine point and drips. `wet` (0..1) is how much ink the bristles are carrying; the drops fall as he moves.
 */
export function drawInkBrush(
  g: Graphics,
  rear: Point,
  front: Point,
  o: number,
  t: number,
  wet = 1,
): { tip: Point; inner: Point } {
  // Held in both hands near the middle of the handle, a hand's width of space between them: the line runs rear hand -> front hand,
  // and the handle reaches 0.5 m behind the rear hand and the bristles stand beyond the front hand.
  const dx = front.x - rear.x;
  const dy = front.y - rear.y;
  const dl = Math.hypot(dx, dy) || 1;
  const ux = dx / dl;
  const uy = dy / dl;
  const nx = -uy;
  const ny = ux;
  const hand = front;
  const at = (k: number, side = 0): Point => ({ x: hand.x + ux * k + nx * side, y: hand.y + uy * k + ny * side });
  const butt = at(-0.5 - dl);
  const ferrule = at(0.62);
  // The handle: dark lacquered wood, a pale highlight along its lit side, two gold bands.
  g.moveTo(butt.x, butt.y)
    .lineTo(ferrule.x, ferrule.y)
    .stroke({ width: 0.052 + o * 2, color: INK_BLACK, cap: 'round' });
  g.moveTo(butt.x, butt.y).lineTo(ferrule.x, ferrule.y).stroke({ width: 0.04, color: WOOD, cap: 'round' });
  g.moveTo(at(-0.46, -0.012).x, at(-0.46, -0.012).y)
    .lineTo(at(0.58, -0.012).x, at(0.58, -0.012).y)
    .stroke({ width: 0.011, color: WOOD_LIT, alpha: 0.8, cap: 'round' });
  for (const k of [-0.44 - dl, 0.54]) {
    g.moveTo(at(k, -0.026).x, at(k, -0.026).y)
      .lineTo(at(k, 0.026).x, at(k, 0.026).y)
      .stroke({ width: 0.016, color: GOLD, cap: 'round' });
  }
  // The ferrule: a short gold collar where the bristles begin.
  g.moveTo(at(0.6, 0).x, at(0.6, 0).y)
    .lineTo(at(0.72, 0).x, at(0.72, 0).y)
    .stroke({ width: 0.062 + o * 2, color: INK_BLACK, cap: 'butt' });
  g.moveTo(at(0.6, 0).x, at(0.6, 0).y)
    .lineTo(at(0.72, 0).x, at(0.72, 0).y)
    .stroke({ width: 0.05, color: GOLD, cap: 'butt' });
  // The bristles: a plump, flowing teardrop of black, swaying a little with the clock, ending in a fine point.
  const sway = Math.sin(t * 5.2) * 0.012;
  const len = 0.5;
  const tip = at(0.72 + len, sway * 3);
  const head = [
    at(0.72, -0.04),
    at(0.84, -0.075 + sway),
    at(1.0, -0.05 + sway * 1.4),
    tip,
    at(1.0, 0.052 + sway),
    at(0.84, 0.078),
    at(0.72, 0.04),
  ];
  const flat = head.flatMap((p) => [p.x, p.y]);
  g.poly(flat).fill(INK_BLACK);
  g.poly(flat).stroke({ width: o * 1.4 + 0.004, color: INK_BLACK, join: 'round' });
  // Glints of wet ink along the bristles, and the strands that part at the tip.
  g.moveTo(at(0.78, -0.035).x, at(0.78, -0.035).y)
    .quadraticCurveTo(at(0.94, -0.04).x, at(0.94, -0.04).y, at(1.1, -0.006).x, at(1.1, -0.006).y)
    .stroke({ width: 0.007, color: PALE, alpha: 0.35 + 0.25 * wet, cap: 'round' });
  g.moveTo(at(0.78, 0.03).x, at(0.78, 0.03).y)
    .quadraticCurveTo(at(0.94, 0.04).x, at(0.94, 0.04).y, at(1.14, 0.012).x, at(1.14, 0.012).y)
    .stroke({ width: 0.006, color: INK_WET, alpha: 0.9, cap: 'round' });
  // Drips from the point, falling on a loop.
  if (wet > 0.05) {
    for (let i = 0; i < 2; i++) {
      const p = (t * 0.9 + i * 0.5) % 1;
      const dx = tip.x - ux * 0.02;
      const dy = tip.y + p * p * 0.42;
      g.ellipse(dx + nx * 0.01 * i, dy, 0.011, 0.016 + p * 0.012).fill({ color: INK_BLACK, alpha: (1 - p) * wet });
    }
  }
  // Both gripping hands.
  for (const h of [front, rear]) {
    g.circle(h.x, h.y, 0.046 + o).fill(INK_BLACK);
    g.circle(h.x, h.y, 0.036).fill(0x22222a);
  }
  return { tip, inner: at(0.75) };
}

/** An ink sword: a slim black blade with a pale edge and a wrapped grip. */
export function drawInkSword(g: Graphics, elbow: Point, hand: Point, o: number): { tip: Point; inner: Point } {
  const { ux, uy } = along(elbow, hand, (30 * Math.PI) / 180);
  const nx = -uy;
  const ny = ux;
  const at = (k: number, side = 0): Point => ({ x: hand.x + ux * k + nx * side, y: hand.y + uy * k + ny * side });
  const len = 0.78;
  g.moveTo(at(-0.1).x, at(-0.1).y)
    .lineTo(at(0.05).x, at(0.05).y)
    .stroke({ width: 0.044 + o * 2, color: INK_BLACK, cap: 'round' });
  g.moveTo(at(-0.1).x, at(-0.1).y).lineTo(at(0.05).x, at(0.05).y).stroke({ width: 0.032, color: WOOD, cap: 'round' });
  g.moveTo(at(0.05, -0.07).x, at(0.05, -0.07).y)
    .lineTo(at(0.05, 0.07).x, at(0.05, 0.07).y)
    .stroke({ width: 0.026 + o * 2, color: INK_BLACK, cap: 'round' });
  const blade = [
    at(0.07, -0.026),
    at(0.07 + len * 0.55, -0.032),
    at(0.07 + len, 0),
    at(0.07 + len * 0.55, 0.026),
    at(0.07, 0.024),
  ];
  const flat = blade.flatMap((p) => [p.x, p.y]);
  g.poly(flat).fill(INK_BLACK);
  g.poly(flat).stroke({ width: o * 1.3 + 0.004, color: INK_BLACK, join: 'round' });
  g.moveTo(at(0.09, -0.012).x, at(0.09, -0.012).y)
    .lineTo(at(0.07 + len * 0.9, -0.004).x, at(0.07 + len * 0.9, -0.004).y)
    .stroke({ width: 0.008, color: PALE, alpha: 0.85, cap: 'round' });
  g.circle(hand.x, hand.y, 0.04 + o).fill(INK_BLACK);
  return { tip: at(0.07 + len), inner: at(0.1) };
}

/**
 * A traditional bow held out in front of the body, upright and slightly forward: a lacquered black limb with a pale string. While
 * `draw` (0..1) rises the string is pulled back along the arrow to the cheek and the arrow nocks.
 */
export function drawInkBow(g: Graphics, hand: Point, facing: 1 | -1, o: number, draw: number): void {
  const half = 0.5;
  const bulge = 0.16 * (1 - draw * 0.25);
  const top = { x: hand.x - 0.02, y: hand.y - half };
  const bot = { x: hand.x - 0.02, y: hand.y + half };
  g.moveTo(top.x, top.y)
    .quadraticCurveTo(hand.x + bulge * 2, hand.y, bot.x, bot.y)
    .stroke({ width: 0.044 + o * 2, color: INK_BLACK, cap: 'round' });
  g.moveTo(top.x, top.y)
    .quadraticCurveTo(hand.x + bulge * 2, hand.y, bot.x, bot.y)
    .stroke({ width: 0.03, color: WOOD, cap: 'round' });
  g.moveTo(top.x + 0.01, top.y + 0.04)
    .quadraticCurveTo(hand.x + bulge * 1.9, hand.y, bot.x + 0.01, bot.y - 0.04)
    .stroke({ width: 0.008, color: WOOD_LIT, alpha: 0.7, cap: 'round' });
  // The string, pulled back as the shot is drawn (toward the body, which is behind the bow for a figure facing +x).
  const pull = -0.34 * draw * facing;
  g.moveTo(top.x, top.y)
    .lineTo(hand.x + pull - 0.02, hand.y)
    .lineTo(bot.x, bot.y)
    .stroke({ width: 0.007, color: PALE, alpha: 0.9, cap: 'round' });
  if (draw > 0.15) {
    const tail = { x: hand.x + pull - 0.02, y: hand.y };
    const head = { x: hand.x + 0.34 * facing, y: hand.y };
    g.moveTo(tail.x, tail.y).lineTo(head.x, head.y).stroke({ width: 0.016, color: INK_BLACK, cap: 'round' });
    g.poly([head.x, head.y - 0.03, head.x + 0.06 * facing, head.y, head.x, head.y + 0.03]).fill(INK_BLACK);
    g.moveTo(tail.x, tail.y)
      .lineTo(tail.x + 0.06 * facing, tail.y - 0.03)
      .stroke({ width: 0.01, color: PALE, alpha: 0.6 });
  }
  g.circle(hand.x, hand.y, 0.04 + o).fill(INK_BLACK);
}

/**
 * The Ink Spear: the brush grown into a long spear. `form` (0..1) is how far the change has gone: the dark lacquered shaft stretches
 * out past the front hand, the bristles harden into a long leaf-shaped blade of black ink with a pale edge, and a red tassel and
 * wisps of living ink stream from the socket. Held the way the brush is, along the line from the rear hand to the front hand.
 */
export function drawInkSpear(
  g: Graphics,
  rear: Point,
  front: Point,
  o: number,
  t: number,
  form: number,
): { tip: Point; inner: Point } {
  const dx = front.x - rear.x;
  const dy = front.y - rear.y;
  const dl = Math.hypot(dx, dy) || 1;
  const ux = dx / dl;
  const uy = dy / dl;
  const nx = -uy;
  const ny = ux;
  const at = (k: number, side = 0): Point => ({ x: front.x + ux * k + nx * side, y: front.y + uy * k + ny * side });
  const reach = 0.62 + 0.85 * form; // the shaft grows
  const butt = at(-0.5 - dl);
  const socket = at(reach);
  // The shaft: dark lacquered wood with a pale lit edge and gold bands.
  g.moveTo(butt.x, butt.y)
    .lineTo(socket.x, socket.y)
    .stroke({ width: 0.056 + o * 2, color: INK_BLACK, cap: 'round' });
  g.moveTo(butt.x, butt.y).lineTo(socket.x, socket.y).stroke({ width: 0.042, color: WOOD, cap: 'round' });
  g.moveTo(at(-0.46, -0.013).x, at(-0.46, -0.013).y)
    .lineTo(at(reach - 0.04, -0.013).x, at(reach - 0.04, -0.013).y)
    .stroke({ width: 0.011, color: WOOD_LIT, alpha: 0.8, cap: 'round' });
  for (const k of [-0.44 - dl, reach * 0.5, reach - 0.08]) {
    g.moveTo(at(k, -0.028).x, at(k, -0.028).y)
      .lineTo(at(k, 0.028).x, at(k, 0.028).y)
      .stroke({ width: 0.016, color: GOLD, cap: 'round' });
  }
  // The blade: a long leaf of black ink with a pale cutting edge, flowing like a brush stroke that has set hard.
  const bl = 0.3 + 0.35 * form;
  const wob = Math.sin(t * 6) * 0.008;
  const tip = at(reach + bl, wob);
  const blade = [
    at(reach, -0.03),
    at(reach + bl * 0.3, -0.085 - wob),
    at(reach + bl * 0.7, -0.05),
    tip,
    at(reach + bl * 0.7, 0.05),
    at(reach + bl * 0.3, 0.088 + wob),
    at(reach, 0.03),
  ];
  const flat = blade.flatMap((p) => [p.x, p.y]);
  g.poly(flat).fill(INK_BLACK);
  g.poly(flat).stroke({ width: o * 1.4 + 0.004, color: INK_BLACK, join: 'round' });
  g.moveTo(at(reach + 0.02, -0.02).x, at(reach + 0.02, -0.02).y)
    .lineTo(tip.x, tip.y)
    .stroke({ width: 0.009, color: PALE, alpha: 0.85, cap: 'round' });
  g.moveTo(at(reach + 0.02, 0.02).x, at(reach + 0.02, 0.02).y)
    .lineTo(tip.x, tip.y)
    .stroke({ width: 0.006, color: INK_WET, alpha: 0.9, cap: 'round' });
  // A red tassel at the socket, and living wisps of ink streaming back from the blade.
  for (let i = 0; i < 3; i++) {
    const s = Math.sin(t * 7 + i * 1.3) * 0.03;
    g.moveTo(socket.x, socket.y)
      .quadraticCurveTo(
        at(reach - 0.1, (i - 1) * 0.05 + s).x,
        at(reach - 0.1, (i - 1) * 0.05 + s).y,
        at(reach - 0.2, (i - 1) * 0.07 + s * 2).x,
        at(reach - 0.2, (i - 1) * 0.07 + s * 2).y,
      )
      .stroke({ width: 0.012, color: 0xb01c24, alpha: 0.9, cap: 'round' });
  }
  for (let i = 0; i < 5; i++) {
    const p = (t * 1.4 + i * 0.2) % 1;
    const w = at(reach + 0.1 + (0.5 - p) * bl, (i % 2 ? 1 : -1) * (0.07 + p * 0.1));
    g.circle(w.x, w.y + p * 0.08, 0.012 * (1 - p)).fill({ color: INK_BLACK, alpha: (1 - p) * form });
  }
  for (const h of [front, rear]) {
    g.circle(h.x, h.y, 0.046 + o).fill(INK_BLACK);
    g.circle(h.x, h.y, 0.036).fill(0x22222a);
  }
  return { tip, inner: at(0.75) };
}
