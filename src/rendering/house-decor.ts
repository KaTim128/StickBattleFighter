import type { Graphics } from 'pixi.js';
import type { Rect, RoomDef } from '../modes/hide-seek/house-types';
import { hash2 } from './house-furniture';
import { face, faceQuad } from './iso-draw';
import { iso } from './projection';

/**
 * Horror dressing for the Nightmare House (owner, 18/11/2026): aged plaster with damp stains,
 * cracks, peeling paint and a worn skirting; floors with grime, scuffs, stains, a drift of debris and
 * a cold slant of moonlight through a window; dark corners. Everything is deterministic (seeded by
 * position) so it never shimmers, and drawn flat or on the wall faces the camera sees.
 */
export const PLASTER_AGED = 0x9d9b8e;
export const BRICK_AGED = 0x65514a;

/** Details on the two faces of a wall block the camera sees. `alongX`: the long face is the +y face. */
export function wallDetails(g: Graphics, r: Rect, heightM: number, alongX: boolean, exterior: boolean): void {
  const seed = r.x0 * 13.1 + r.y0 * 7.3;
  const front = alongX ? face.left(r.y1) : face.right(r.x1);
  const [a0, a1] = alongX ? [r.x0, r.x1] : [r.y0, r.y1];
  const len = a1 - a0;
  const h = heightM;
  // Skirting board and a darker foot where damp rises.
  faceQuad(g, front, a0, 0, a1, Math.min(0.14, h)).fill({ color: 0x1f1a15, alpha: 0.7 });
  if (h < 1) return; // a low ledge: nothing more to see
  faceQuad(g, front, a0, 0.14, a1, 0.34).fill({ color: 0x120e0a, alpha: 0.12 });
  // A dado rail partway up.
  faceQuad(g, front, a0, h * 0.4, a1, h * 0.4 + 0.03).fill({ color: 0x1a1612, alpha: 0.32 });
  // Water stain running down from the top.
  const stainAt = hash2(seed, 1);
  if (stainAt > 0.35) {
    const u = a0 + len * (0.1 + 0.6 * hash2(seed, 2));
    const sw = 0.14 + 0.12 * hash2(seed, 3);
    for (const [k, alpha] of [
      [1, 0.1],
      [0.7, 0.08],
      [0.4, 0.08],
    ] as const)
      faceQuad(g, front, u, h * (1 - 0.55 * k * (0.6 + 0.4 * hash2(seed, 4))), u + sw, h).fill({
        color: 0x14100a,
        alpha,
      });
  }
  // Streaks.
  for (let i = 0; i < 2; i++) {
    const u = a0 + len * hash2(seed, 10 + i);
    faceQuad(g, front, u, h * 0.15, u + 0.02, h).fill({ color: 0x000000, alpha: 0.07 });
  }
  // A crack.
  if (hash2(seed, 5) > 0.55) {
    const u = a0 + len * (0.15 + 0.7 * hash2(seed, 6));
    let v = h * (0.55 + 0.35 * hash2(seed, 7));
    let uu = u;
    const p = front(uu, v);
    g.moveTo(p.x, p.y);
    for (let k = 0; k < 5; k++) {
      uu += (hash2(seed, 20 + k) - 0.5) * 0.14;
      v -= 0.12 + 0.1 * hash2(seed, 30 + k);
      const q = front(Math.min(a1, Math.max(a0, uu)), Math.max(0.2, v));
      g.lineTo(q.x, q.y);
    }
    g.stroke({ width: 0.013, color: 0x0c0a08, alpha: 0.55 });
  }
  // A peeling patch of paint, lighter underneath.
  if (!exterior && hash2(seed, 8) > 0.6) {
    const u = a0 + len * (0.1 + 0.5 * hash2(seed, 9));
    const pw = 0.18 + 0.2 * hash2(seed, 11);
    const v0 = h * (0.45 + 0.3 * hash2(seed, 12));
    const pts = [
      front(u, v0),
      front(u + pw * 0.5, v0 + 0.1),
      front(u + pw, v0 + 0.04),
      front(u + pw * 0.9, v0 - 0.14),
      front(u + pw * 0.4, v0 - 0.2),
      front(u + 0.02, v0 - 0.1),
    ];
    g.poly(pts.flatMap((p) => [p.x, p.y])).fill({ color: 0xd7cdb8, alpha: 0.22 });
  }
  // Scratch marks, three parallel, now and then.
  if (!exterior && hash2(seed, 13) > 0.8) {
    const u = a0 + len * (0.2 + 0.5 * hash2(seed, 14));
    for (let k = 0; k < 3; k++) {
      const p = front(u + k * 0.04, h * 0.7);
      const q = front(u + k * 0.04 + 0.06, h * 0.35);
      g.moveTo(p.x, p.y).lineTo(q.x, q.y).stroke({ width: 0.01, color: 0x0a0806, alpha: 0.6 });
    }
  }
}

/** Dirty floor boards or tiles, grime in the corners, stains, scuffs, a little debris and (for rooms with a window) moonlight. */
export function floorDecor(g: Graphics, room: RoomDef, hasWindow: boolean): void {
  if (room.outdoors) return;
  const r = room.rect;
  const seed = r.x0 * 3.7 + r.y0 * 5.1;
  const poly = (x0: number, y0: number, x1: number, y1: number): number[] => [
    ...pair(iso(x0, y0)),
    ...pair(iso(x1, y0)),
    ...pair(iso(x1, y1)),
    ...pair(iso(x0, y1)),
  ];
  // Dark corners: rings of shadow creeping in from the walls.
  for (const [inset, alpha] of [
    [0, 0.2],
    [0.35, 0.14],
    [0.75, 0.09],
    [1.25, 0.05],
  ] as const) {
    const w = r.x1 - r.x0;
    const d = r.y1 - r.y0;
    const i2 = Math.min(inset, w / 2 - 0.01, d / 2 - 0.01);
    // A ring: outer rectangle minus inner, drawn as four strips.
    const strip = Math.min(0.4, w / 2, d / 2);
    g.poly(poly(r.x0, r.y0, r.x1, r.y0 + i2 + strip * 0.4)).fill({ color: 0x000000, alpha });
    g.poly(poly(r.x0, r.y1 - i2 - strip * 0.4, r.x1, r.y1)).fill({ color: 0x000000, alpha });
    g.poly(poly(r.x0, r.y0, r.x0 + i2 + strip * 0.4, r.y1)).fill({ color: 0x000000, alpha });
    g.poly(poly(r.x1 - i2 - strip * 0.4, r.y0, r.x1, r.y1)).fill({ color: 0x000000, alpha });
  }
  // Stains and grime blotches.
  const n = Math.round(((r.x1 - r.x0) * (r.y1 - r.y0)) / 14) + 1;
  for (let i = 0; i < n; i++) {
    const x = r.x0 + (r.x1 - r.x0) * (0.1 + 0.8 * hash2(seed, i));
    const y = r.y0 + (r.y1 - r.y0) * (0.1 + 0.8 * hash2(seed, i + 40));
    const c = iso(x, y);
    const rad = 0.3 + 0.5 * hash2(seed, i + 80);
    const dark = hash2(seed, i + 120) > 0.8;
    g.ellipse(c.x, c.y, rad, rad * 0.5).fill({ color: dark ? 0x3a0f0f : 0x15110c, alpha: dark ? 0.2 : 0.14 });
    g.ellipse(c.x + 0.05, c.y, rad * 0.55, rad * 0.28).fill({
      color: dark ? 0x4a1414 : 0x0e0a07,
      alpha: dark ? 0.2 : 0.12,
    });
  }
  // Scuffs and a few dry leaves / paper scraps of debris.
  for (let i = 0; i < 5; i++) {
    const x = r.x0 + (r.x1 - r.x0) * hash2(seed, i + 200);
    const y = r.y0 + (r.y1 - r.y0) * hash2(seed, i + 240);
    const a = iso(x, y);
    const b = iso(x + 0.4 * (hash2(seed, i + 280) - 0.5), y + 0.5 * (hash2(seed, i + 320) - 0.5));
    g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 0.02, color: 0x000000, alpha: 0.25 });
    if (i < 3) {
      const p = iso(x + 0.3, y + 0.2);
      g.poly([p.x, p.y, p.x + 0.12, p.y - 0.02, p.x + 0.1, p.y + 0.06, p.x - 0.02, p.y + 0.05]).fill({
        color: i % 2 ? 0x8a7a5a : 0xb0a58a,
        alpha: 0.4,
      });
    }
  }
  // Moonlight through a window on the north wall: a cold, slanted patch with crossbars.
  if (hasWindow && r.x1 - r.x0 > 3) {
    const wx = r.x0 + (r.x1 - r.x0) * (0.25 + 0.4 * hash2(seed, 900));
    const ww = Math.min(1.8, (r.x1 - r.x0) * 0.3);
    const slant = 0.9;
    const d = Math.min(2.6, (r.y1 - r.y0) * 0.55);
    const quad = [iso(wx, r.y0), iso(wx + ww, r.y0), iso(wx + ww + slant, r.y0 + d), iso(wx + slant, r.y0 + d)];
    g.poly(quad.flatMap(pair)).fill({ color: 0x9fb8d8, alpha: 0.11 });
    for (let k = 1; k < 3; k++) {
      const t = k / 3;
      const p0 = iso(wx + ww * t, r.y0);
      const p1 = iso(wx + ww * t + slant, r.y0 + d);
      g.moveTo(p0.x, p0.y).lineTo(p1.x, p1.y).stroke({ width: 0.04, color: 0x000000, alpha: 0.12 });
    }
    g.moveTo(quad[3]!.x, quad[3]!.y)
      .lineTo(quad[2]!.x, quad[2]!.y)
      .stroke({ width: 0.04, color: 0x000000, alpha: 0.1 });
  }
}

const pair = (p: { x: number; y: number }): [number, number] => [p.x, p.y];
