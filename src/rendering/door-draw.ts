import type { Graphics } from 'pixi.js';
import type { Rect } from '../modes/hide-seek/house-types';
import { PLASTER_AGED } from './house-decor';
import { aged, hash2 } from './house-furniture';
import { face, faceQuad, isoBlock, shade, withMaterial } from './iso-draw';

/**
 * Doors for the Nightmare House (owner, 18/11/2026: doors must be textured): a worn wooden leaf with
 * raised panels, grain, a brass knob and a keyhole plate, hinges, a scuffed kick plate and scratches,
 * set in a frame with a lintel so the wall above the opening is closed. Drawn in world metres.
 */
const DOOR_H = 2.1;
const WOOD = 0x6b4a2e;

/** The face of a thin box the camera sees, and the span along it. */
function visibleFace(r: Rect): { at: (u: number, v: number) => { x: number; y: number }; a0: number; a1: number } {
  return r.x1 - r.x0 >= r.y1 - r.y0
    ? { at: face.left(r.y1), a0: r.x0, a1: r.x1 }
    : { at: face.right(r.x1), a0: r.y0, a1: r.y1 };
}

/** One door leaf (closed, or swung open against the wall), textured. `seed` makes each door wear differently. */
export function drawDoorLeaf(g: Graphics, r: Rect, seed: number, exterior: boolean): void {
  const base = exterior ? 0x4a2f22 : WOOD;
  withMaterial('wood', () =>
    isoBlock(g, r.x0, r.y0, r.x1, r.y1, 0, DOOR_H, { colour: aged(base), top: aged(base, 1.15), edge: 0.5 }),
  );
  const { at, a0, a1 } = visibleFace(r);
  const w = a1 - a0;
  if (w < 0.3) return; // an edge-on leaf: nothing to see but the edge
  const m = Math.min(0.14, w * 0.1);
  // Raised panels: a tall pair above, a squat pair below, each with a dark recess and a lit lower lip.
  const panels: readonly [number, number, number, number][] = [
    [a0 + m, 1.15, a0 + w / 2 - m / 2, DOOR_H - 0.18],
    [a0 + w / 2 + m / 2, 1.15, a1 - m, DOOR_H - 0.18],
    [a0 + m, 0.2, a0 + w / 2 - m / 2, 1.0],
    [a0 + w / 2 + m / 2, 0.2, a1 - m, 1.0],
  ];
  for (const [u0, v0, u1, v1] of panels) {
    faceQuad(g, at, u0, v0, u1, v1).fill({ color: 0x000000, alpha: 0.22 });
    faceQuad(g, at, u0, v0, u1, v1).stroke({ width: 0.018, color: 0x120c07, alpha: 0.75 });
    faceQuad(g, at, u0 + 0.03, v0 + 0.03, u1 - 0.03, v0 + 0.05).fill({ color: 0xffffff, alpha: 0.1 });
    faceQuad(g, at, u0 + 0.05, v1 - 0.06, u1 - 0.05, v1 - 0.04).fill({ color: 0x000000, alpha: 0.18 });
  }
  // Grain down the stiles, and a few scratches.
  for (let i = 0; i < 5; i++) {
    const u = a0 + w * (0.05 + 0.9 * hash2(seed, i));
    const p = at(u, 0.15);
    const q = at(u + (hash2(seed, i + 9) - 0.5) * 0.04, DOOR_H - 0.1);
    g.moveTo(p.x, p.y).lineTo(q.x, q.y).stroke({ width: 0.006, color: 0x1a0f08, alpha: 0.3 });
  }
  for (let i = 0; i < 3; i++) {
    const u = a0 + w * (0.15 + 0.7 * hash2(seed, 20 + i));
    const v = 0.4 + 1.2 * hash2(seed, 30 + i);
    const p = at(u, v);
    const q = at(u + 0.12, v - 0.1);
    g.moveTo(p.x, p.y).lineTo(q.x, q.y).stroke({ width: 0.008, color: 0xf0e0c8, alpha: 0.22 });
  }
  // Kick plate, hinges and a brass knob with its keyhole plate.
  faceQuad(g, at, a0 + 0.02, 0, a1 - 0.02, 0.18).fill({ color: 0x8a8d90, alpha: 0.75 });
  faceQuad(g, at, a0 + 0.02, 0.17, a1 - 0.02, 0.185).fill({ color: 0xffffff, alpha: 0.25 });
  for (const v of [0.3, 1.0, 1.8]) faceQuad(g, at, a0, v, a0 + 0.04, v + 0.14).fill(0x2a2620);
  const k = at(a1 - m - 0.08, 1.02);
  faceQuad(g, at, a1 - m - 0.13, 0.9, a1 - m - 0.03, 1.2).fill({ color: 0x2a2418, alpha: 0.85 });
  g.circle(k.x, k.y, 0.045).fill(aged(0xb89a4a, 1.2)).stroke({ width: 0.008, color: 0x2a2010, alpha: 0.7 });
  g.circle(k.x - 0.012, k.y - 0.012, 0.014).fill({ color: 0xffffff, alpha: 0.5 });
}

/**
 * The frame round an opening: two jambs and a lintel, so the wall above the door is not left open. `lintel`
 * is false for walls the camera sees over (the low front walls of the building).
 */
export function drawDoorFrame(g: Graphics, r: Rect, lintel: boolean): void {
  const horiz = r.x1 - r.x0 >= r.y1 - r.y0;
  const jamb = 0.1;
  const plaster = aged(PLASTER_AGED, 1.05);
  const frame = aged(0x3a2a1c);
  if (horiz) {
    isoBlock(g, r.x0 - jamb, r.y0 - 0.02, r.x0, r.y1 + 0.02, 0, DOOR_H + 0.08, { colour: frame, edge: 0.4 });
    isoBlock(g, r.x1, r.y0 - 0.02, r.x1 + jamb, r.y1 + 0.02, 0, DOOR_H + 0.08, { colour: frame, edge: 0.4 });
    if (lintel)
      isoBlock(g, r.x0 - jamb, r.y0, r.x1 + jamb, r.y1, DOOR_H + 0.08, 2.6, {
        colour: plaster,
        top: shade(plaster, 1.1),
        edge: 0.3,
      });
  } else {
    isoBlock(g, r.x0 - 0.02, r.y0 - jamb, r.x1 + 0.02, r.y0, 0, DOOR_H + 0.08, { colour: frame, edge: 0.4 });
    isoBlock(g, r.x0 - 0.02, r.y1, r.x1 + 0.02, r.y1 + jamb, 0, DOOR_H + 0.08, { colour: frame, edge: 0.4 });
    if (lintel)
      isoBlock(g, r.x0, r.y0 - jamb, r.x1, r.y1 + jamb, DOOR_H + 0.08, 2.6, {
        colour: plaster,
        top: shade(plaster, 1.1),
        edge: 0.3,
      });
  }
}
