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

/**
 * Surface material for blocks drawn inside `withMaterial` (owner, 13/11/2026: furniture in the
 * approved premium style): wood shows grain, metal brushed streaks and a specular strip, plastic a
 * soft sheen, fabric a fine weave, stone speckles. Glass, paper and plants stay plain.
 */
export type SurfaceMaterial =
  | 'wood'
  | 'metal'
  | 'glass'
  | 'plastic'
  | 'plant'
  | 'paper'
  | 'fabric'
  | 'stone'
  | 'ceramic';
let material: SurfaceMaterial | null = null;

/** Draw `fn` with every block's surfaces finished as `m` (a prop's own material). */
export function withMaterial<T>(m: SurfaceMaterial | null, fn: () => T): T {
  const before = material;
  material = m;
  try {
    return fn();
  } finally {
    material = before;
  }
}

/** A stable pseudo-random number in [0, 1) for a position (grain and speckles that never flicker). */
const hash = (a: number, b: number): number => {
  const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return v - Math.floor(v);
};

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
  const h = z1 - z0;
  if (a > 0.6 && h > 0.06) {
    // Premium finish: light falls off down each side, the lit top of each side catches a sheen.
    for (const [face, dark, sheen] of [
      [left, 0.1, 0.08],
      [right, 0.08, 0.04],
    ] as const) {
      const [b0, b1, t1, t0] = face as [P, P, P, P];
      const at = (k: number): [P, P] => [
        { x: b0.x + (t0.x - b0.x) * k, y: b0.y + (t0.y - b0.y) * k },
        { x: b1.x + (t1.x - b1.x) * k, y: b1.y + (t1.y - b1.y) * k },
      ];
      const [m0, m1] = at(0.4);
      g.poly(flat([b0, b1, m1, m0])).fill({ color: 0x000000, alpha: dark * a });
      const [u0, u1] = at(0.88);
      g.poly(flat([u0, u1, t1, t0])).fill({ color: 0xffffff, alpha: sheen * a });
    }
    surface(g, x0, y0, x1, y1, z0, z1, a);
  }
  if (edgeA > 0) {
    g.poly(flat(left)).stroke({ width: 0.022, color: EDGE, alpha: edgeA });
    g.poly(flat(right)).stroke({ width: 0.022, color: EDGE, alpha: edgeA });
  }
  // The near vertical corner (where the two visible sides meet) catches the light.
  if (h > 0.06)
    g.moveTo(pt(x1, y1, z0).x, pt(x1, y1, z0).y)
      .lineTo(pt(x1, y1, z1).x, pt(x1, y1, z1).y)
      .stroke({ width: 0.014, color: 0xffffff, alpha: 0.28 * a });
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

/** Material detail on a block's two visible sides and top (inside `withMaterial`). */
function surface(g: Graphics, x0: number, y0: number, x1: number, y1: number, z0: number, z1: number, a: number): void {
  const m = material;
  if (!m || m === 'glass' || m === 'plant' || m === 'paper') return;
  const w = x1 - x0;
  const d = y1 - y0;
  const h = z1 - z0;
  const line = (p: P, q: P, width: number, colour: number, alpha: number) =>
    g
      .moveTo(p.x, p.y)
      .lineTo(q.x, q.y)
      .stroke({ width, color: colour, alpha: alpha * a, cap: 'round' });
  if (m === 'wood') {
    // Grain running along each face, gently wavy, with the odd knot.
    const rows = Math.max(2, Math.round(h / 0.09));
    for (let i = 1; i < rows; i++) {
      const z = z0 + (h * i) / rows + (hash(i, x0) - 0.5) * 0.03;
      const wob = (hash(i, y0) - 0.5) * 0.025;
      line(pt(x0 + 0.02, y1, z), pt((x0 + x1) / 2, y1, z + wob), 0.006, 0x3a2412, 0.22);
      line(pt((x0 + x1) / 2, y1, z + wob), pt(x1 - 0.02, y1, z - wob * 0.5), 0.006, 0x3a2412, 0.22);
      if (d > 0.12) line(pt(x1, y0 + 0.02, z), pt(x1, y1 - 0.02, z + wob), 0.005, 0x3a2412, 0.18);
    }
    if (w > 0.3 && d > 0.2)
      for (let i = 1; i < 5; i++) {
        const y = y0 + (d * i) / 5;
        line(pt(x0 + 0.03, y, z1), pt(x1 - 0.03, y + (hash(i, z1) - 0.5) * 0.04, z1), 0.005, 0x3a2412, 0.16);
      }
  } else if (m === 'metal') {
    // Brushed streaks down the sides and a specular strip near the lit edge.
    const n = Math.max(3, Math.round(w / 0.06));
    for (let i = 1; i < n; i++) {
      const x = x0 + (w * i) / n;
      line(pt(x, y1, z0 + 0.02), pt(x, y1, z1 - 0.02), 0.004, 0xffffff, 0.06 + 0.05 * hash(i, x0));
    }
    const sx = x0 + w * 0.18;
    line(pt(sx, y1, z0 + h * 0.08), pt(sx, y1, z1 - h * 0.06), Math.min(0.03, w * 0.08), 0xffffff, 0.16);
  } else if (m === 'plastic' || m === 'ceramic') {
    // A soft glossy sheen across the upper part of the lit side.
    const zs = z0 + h * 0.7;
    line(pt(x0 + w * 0.12, y1, zs), pt(x1 - w * 0.25, y1, zs + h * 0.08), Math.min(0.05, h * 0.18), 0xffffff, 0.12);
  } else if (m === 'fabric') {
    // A fine weave: faint crossing threads.
    const n = Math.max(3, Math.round(w / 0.05));
    for (let i = 1; i < n; i++) {
      const x = x0 + (w * i) / n;
      line(pt(x, y1, z0 + 0.02), pt(x, y1, z1 - 0.02), 0.003, 0x000000, 0.07);
    }
    const r = Math.max(3, Math.round(h / 0.05));
    for (let i = 1; i < r; i++) {
      const z = z0 + (h * i) / r;
      line(pt(x0 + 0.02, y1, z), pt(x1 - 0.02, y1, z), 0.003, 0xffffff, 0.05);
    }
  } else if (m === 'stone') {
    for (let i = 0; i < 14; i++) {
      const u = hash(i, x0 + y0);
      const v = hash(i + 7, z1);
      const p = pt(x0 + w * u, y1, z0 + h * v);
      g.circle(p.x, p.y, 0.008).fill({ color: i % 2 ? 0xffffff : 0x000000, alpha: 0.12 * a });
    }
  }
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
