import type { Graphics } from 'pixi.js';
import { BOMB_BURST_S, type Card, type Dust, type MagixWorld, type Thrown } from '../abilities/magix-world';

type Point = { x: number; y: number };
type Project = (x: number, y: number, z?: number) => Point;

/**
 * Magix's props, drawn from the magic world's state every frame: the 52 spinning playing cards with their glittering trails, the hat's
 * thrown sword and bomb, and the dust cloud of Mirror Act. Cheap by design: one small polygon per card and a short trail of dots, drawn
 * into the shared glow and body layers, so a full barrage of 52 stays smooth.
 */
const CARD = 0xfaf6ee;
const RED = 0xd23a4a;
const BLACK = 0x15151c;
const GOLD = 0xffd86b;
const VIOLET = 0xb48cff;
const HEIGHT_M = 0.85;

export function drawMagix(f: Graphics, g: Graphics, P: Project, world: MagixWorld, t: number): void {
  for (const c of world.cards) card(f, g, P, c);
  for (const th of world.thrown) thrown(f, g, P, th, t);
  for (const d of world.dusts) dust(f, g, P, d, t);
}

/** A card spinning edge-on and flat again as it flies: a rotated rectangle whose width follows the spin. */
function card(f: Graphics, g: Graphics, P: Project, c: Card): void {
  const w = 0.09 * (0.25 + 0.75 * Math.abs(Math.cos(c.spin)));
  const h = 0.13;
  const px = -c.dir.y;
  const py = c.dir.x;
  const corners = [
    [-h, -w],
    [h, -w],
    [h, w],
    [-h, w],
  ].map(([a, b]) => P(c.x + c.dir.x * a! + px * b!, c.y + c.dir.y * a! + py * b!, HEIGHT_M));
  g.poly(corners.flatMap((p) => [p.x, p.y])).fill(CARD);
  g.poly(corners.flatMap((p) => [p.x, p.y])).stroke({ width: 0.008, color: 0x2a2a35, alpha: 0.9 });
  const mid = P(c.x, c.y, HEIGHT_M);
  g.circle(mid.x, mid.y, 0.028).fill(c.index % 26 < 13 ? RED : BLACK);
  // The magic trail: fading glints behind it, heavier cards (extra knockback) glow gold.
  for (let i = 0; i < c.trail.length; i++) {
    const tp = c.trail[i]!;
    const p = P(tp.x, tp.y, HEIGHT_M);
    const a = 0.55 * (1 - i / c.trail.length);
    f.circle(p.x, p.y, 0.04 * (1 - i / 8)).fill({ color: c.heavy ? GOLD : VIOLET, alpha: a });
  }
}

function thrown(f: Graphics, g: Graphics, P: Project, th: Thrown, t: number): void {
  if (th.kind === 'sword') {
    const a = Math.atan2(th.dir.y, th.dir.x) + th.spin;
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    const tip = P(th.x + ux * 0.45, th.y + uy * 0.45, HEIGHT_M);
    const base = P(th.x - ux * 0.2, th.y - uy * 0.2, HEIGHT_M);
    g.moveTo(base.x, base.y).lineTo(tip.x, tip.y).stroke({ width: 0.05, color: 0x20202a, cap: 'round' });
    g.moveTo(base.x, base.y).lineTo(tip.x, tip.y).stroke({ width: 0.032, color: 0xe6edf5, cap: 'round' });
    const guard = P(th.x - ux * 0.2, th.y - uy * 0.2, HEIGHT_M);
    g.circle(guard.x, guard.y, 0.045).fill(GOLD);
    const glow = P(th.x, th.y, HEIGHT_M);
    f.circle(glow.x, glow.y, 0.25).fill({ color: VIOLET, alpha: 0.25 });
    return;
  }
  const z = th.landed ? 0.18 : HEIGHT_M + Math.sin(Math.min(1, th.ageS / 0.6) * Math.PI) * 0.8;
  const p = P(th.x, th.y, z);
  if (th.burstS > 0) {
    const k = Math.min(1, th.burstS / BOMB_BURST_S);
    const r = th.spec.bomb.radiusM * (0.3 + 0.7 * k);
    const c = P(th.x, th.y, 0.1);
    f.circle(c.x, c.y, r).fill({ color: 0xffd1ec, alpha: 0.4 * (1 - k) });
    g.circle(c.x, c.y, r).stroke({ width: 0.05, color: GOLD, alpha: 1 - k });
    return;
  }
  g.circle(p.x, p.y, 0.17).fill(BLACK);
  g.circle(p.x - 0.05, p.y - 0.06, 0.05).fill({ color: 0x6a6a78, alpha: 0.9 });
  const hurry = th.landed ? 1 - Math.max(0, th.fuseS) / th.spec.bomb.fuseS : 0;
  const blink = Math.sin(t * (12 + hurry * 30)) > 0 ? 1 : 0.3;
  f.circle(p.x + 0.04, p.y - 0.22, 0.07 + 0.05 * blink).fill({ color: 0xff7a3a, alpha: 0.8 * blink });
}

/** The dust of Mirror Act: grey-violet puffs swelling round him, with confetti thrown through them. */
function dust(f: Graphics, g: Graphics, P: Project, d: Dust, t: number): void {
  const k = Math.min(1, d.ageS / d.spec.dustS);
  const fade = k < 0.5 ? k / 0.5 : 1 - (k - 0.5) / 0.5;
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + t * 0.6;
    const r = (0.5 + 0.9 * k) * (0.7 + 0.3 * Math.sin(i * 2.1));
    const p = P(d.x + Math.cos(a) * r, d.y + Math.sin(a) * r * 0.9, 0.6 + 0.5 * Math.sin(i + t));
    g.circle(p.x, p.y, 0.45 * (0.6 + k * 0.6)).fill({ color: i % 2 ? 0x5a4a78 : 0x8a7aa8, alpha: 0.55 * fade });
  }
  const c = P(d.x, d.y, 0.9);
  for (let i = 0; i < 14; i++) {
    const a = i * 2.4 + t * 2;
    const rr = 0.3 + k * 1.4;
    f.circle(c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr * 0.7 - k * 0.4, 0.03).fill({
      color: [RED, GOLD, VIOLET, 0x7ad7ff][i % 4]!,
      alpha: 0.9 * fade,
    });
  }
}
