import type { Graphics } from 'pixi.js';
import { ISO_T, iso } from './projection';

/**
 * Drawing helpers for the 2.5D look (TD-045, owner-approved mockups): bevelled blocks lit from
 * the top-left, soft floor shadows and ambient occlusion where things meet the floor.
 * Coordinates are WORLD metres relative to an anchor (the node's own position), so a drawing
 * can be built once and moved by its node.
 */
const LIGHT_TOP = 1;
/** The +y face (towards the viewer, left on screen) catches the light from the top-left. */
const LIGHT_LEFT = 0.86;
/** The +x face (right on screen) is in shade. */
const LIGHT_RIGHT = 0.68;
const EDGE = 0x241d18;

export function shade(colour: number, k: number): number {
  const r = Math.min(255, Math.round(((colour >> 16) & 255) * k));
  const g = Math.min(255, Math.round(((colour >> 8) & 255) * k));
  const b = Math.min(255, Math.round((colour & 255) * k));
  return (r << 16) | (g << 8) | b;
}

export interface BlockLook {
  /** Base colour; faces are shaded from it unless given. */
  readonly colour: number;
  readonly top?: number;
  readonly alpha?: number;
  /** Outline alpha (0 = none). */
  readonly edge?: number;
  /** Skip the darker band at the foot of the sides (raised parts like table tops). */
  readonly noAo?: boolean;
}

type P = { x: number; y: number };

const pt = (x: number, y: number, z: number): P => iso(x, y, z);
const flat = (ps: P[]): number[] => ps.flatMap((p) => [p.x, p.y]);

/**
 * A box from (x0, y0, z0) to (x1, y1, z1), relative to the anchor. Draws the two faces the
 * camera sees (+y on the left, +x on the right), then the top, with a bevel highlight along the
 * lit top edges and a touch of ambient occlusion at the base.
 */
export function isoBlock(
  g: Graphics,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  z0: number,
  z1: number,
  look: BlockLook,
): Graphics {
  const a = look.alpha ?? 1;
  const edgeA = (look.edge ?? 0.45) * a;
  const left = [pt(x0, y1, z0), pt(x1, y1, z0), pt(x1, y1, z1), pt(x0, y1, z1)];
  const right = [pt(x1, y0, z0), pt(x1, y1, z0), pt(x1, y1, z1), pt(x1, y0, z1)];
  const top = [pt(x0, y0, z1), pt(x1, y0, z1), pt(x1, y1, z1), pt(x0, y1, z1)];
  g.poly(flat(left)).fill({ color: shade(look.colour, LIGHT_LEFT), alpha: a });
  g.poly(flat(right)).fill({ color: shade(look.colour, LIGHT_RIGHT), alpha: a });
  if (edgeA > 0) {
    g.poly(flat(left)).stroke({ width: 0.018, color: EDGE, alpha: edgeA });
    g.poly(flat(right)).stroke({ width: 0.018, color: EDGE, alpha: edgeA });
  }
  const h = z1 - z0;
  if (!look.noAo && h > 0.12 && z0 === 0) {
    // Ambient occlusion: the sides darken just above the floor.
    const ao = Math.min(0.22, h * 0.35);
    g.poly(flat([pt(x0, y1, 0), pt(x1, y1, 0), pt(x1, y1, ao), pt(x0, y1, ao)])).fill({
      color: 0x000000,
      alpha: 0.14 * a,
    });
    g.poly(flat([pt(x1, y0, 0), pt(x1, y1, 0), pt(x1, y1, ao), pt(x1, y0, ao)])).fill({
      color: 0x000000,
      alpha: 0.14 * a,
    });
  }
  g.poly(flat(top)).fill({ color: look.top ?? shade(look.colour, LIGHT_TOP * 1.06), alpha: a });
  if (edgeA > 0) g.poly(flat(top)).stroke({ width: 0.018, color: EDGE, alpha: edgeA });
  // Bevel: light catches the top's front edges.
  const [t0, t1, t2, t3] = top as [P, P, P, P];
  g.moveTo(t3.x, t3.y)
    .lineTo(t2.x, t2.y)
    .lineTo(t1.x, t1.y)
    .stroke({ width: 0.02, color: 0xffffff, alpha: 0.35 * a });
  g.moveTo(t0.x, t0.y)
    .lineTo(t3.x, t3.y)
    .stroke({ width: 0.015, color: 0xffffff, alpha: 0.18 * a });
  return g;
}

/** A soft drop shadow for a footprint: light from the top-left, so it falls down and to the right. */
export function isoShadow(g: Graphics, x0: number, y0: number, x1: number, y1: number, heightM: number): Graphics {
  const reach = Math.min(0.9, 0.12 + heightM * 0.35);
  for (const [grow, alpha] of [
    [reach, 0.07],
    [reach * 0.6, 0.08],
    [reach * 0.25, 0.1],
  ] as const) {
    g.poly(
      flat([
        pt(x0, y0, 0),
        pt(x1 + grow, y0 + grow * 0.3, 0),
        pt(x1 + grow, y1 + grow, 0),
        pt(x0 + grow * 0.3, y1 + grow, 0),
        pt(x0, y1, 0),
      ]),
    ).fill({ color: 0x1a120a, alpha });
  }
  return g;
}

/** A point on a face, for drawing details (screens, drawers, books). */
export const face = {
  /** The +y face (left on screen): u along x, v up. */
  left: (y1: number) => (u: number, v: number) => pt(u, y1, v),
  /** The +x face (right on screen): u along y, v up. */
  right: (x1: number) => (u: number, v: number) => pt(x1, u, v),
  /** The top at height z: u along x, v along y. */
  top: (z: number) => (u: number, v: number) => pt(u, v, z),
};

/** A quad on a face from (u0, v0) to (u1, v1). */
export function faceQuad(
  g: Graphics,
  at: (u: number, v: number) => P,
  u0: number,
  v0: number,
  u1: number,
  v1: number,
): Graphics {
  return g.poly(flat([at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)]));
}

/** An upright cylinder (bins, pots, bottles) with a lit side and an elliptical top. */
export function isoCylinder(
  g: Graphics,
  cx: number,
  cy: number,
  z0: number,
  r: number,
  h: number,
  colour: number,
  alpha = 1,
): Graphics {
  const b = pt(cx, cy, z0);
  const t = pt(cx, cy, z0 + h);
  // A floor circle of radius r projects to an ellipse r wide and r·T tall.
  const rx = r;
  const ry = r * ISO_T;
  g.moveTo(b.x - rx, b.y)
    .lineTo(t.x - rx, t.y)
    .lineTo(t.x + rx, t.y)
    .lineTo(b.x + rx, b.y)
    .closePath()
    .fill({ color: shade(colour, 0.82), alpha });
  g.ellipse(b.x, b.y, rx, ry).fill({ color: shade(colour, 0.82), alpha });
  g.rect(t.x - rx, t.y, rx * 0.7, b.y - t.y).fill({ color: shade(colour, 0.98), alpha }); // lit side
  g.ellipse(t.x, t.y, rx, ry)
    .fill({ color: shade(colour, 1.1), alpha })
    .stroke({ width: 0.015, color: EDGE, alpha: 0.4 * alpha });
  return g;
}
