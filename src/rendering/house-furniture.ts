import { Graphics } from 'pixi.js';
import type { FurnitureDef, Rect } from '../modes/hide-seek/house-types';
import { drawBookshelf } from './bookshelf-view';
import { type Facing, facingFor, frontVisible } from './furniture-facing';
import { face, faceQuad, isoBlock, isoCylinder, isoShadow, shade, withMaterial } from './iso-draw';
import { iso } from './projection';

/**
 * The Nightmare House's furniture (owner, 18/11/2026): every piece is modelled in the same 2.5D
 * language as the office furniture (src/rendering/prop-view.ts: bevelled blocks lit from the top
 * left, materials with grain, weave and sheen, drawer fronts, handles, soft shadows and ambient
 * occlusion), then aged: colours drained and darkened, dust on the tops, scratches, stains, a split
 * seam here and a cobweb there. Everything is drawn in WORLD metres, so a drawing sits where its
 * footprint is. Original designs; greybox until the art pass.
 */
type Look = { colour: number; top?: number; edge?: number; noAo?: boolean; alpha?: number };

const MOULD = 0x2b2620;

/** A stable pseudo-random number for a seed (wear that never flickers between frames). */
export const hash2 = (a: number, b: number): number => {
  const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return v - Math.floor(v);
};

/** Blend a colour toward another. */
function mix(a: number, b: number, t: number): number {
  const ch = (s: number) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

/** Age a colour: drain it toward a dusty grey-brown and darken it. */
export function aged(colour: number, k = 1): number {
  return shade(mix(colour, 0x5a5248, 0.34), 0.78 * k);
}

/** A seed from a furniture id, so each piece wears differently but the same every time. */
function seedOf(f: FurnitureDef): number {
  let h = 17;
  for (let i = 0; i < f.id.length; i++) h = (h * 31 + f.id.charCodeAt(i)) % 9973;
  return h;
}

/** Draw one piece of furniture. `all` lets a chair find the table it faces. */
export function drawHouseFurniture(
  f: FurnitureDef,
  all: readonly FurnitureDef[] = [],
  walls: readonly Rect[] = [],
): Graphics {
  return drawInto(new Graphics(), f, all, walls);
}

export function drawInto(g: Graphics, f: FurnitureDef, all: readonly FurnitureDef[], walls: readonly Rect[]): Graphics {
  const facing = facingFor(f, all, walls);
  const w = f.x1 - f.x0;
  const d = f.y1 - f.y0;
  const h = f.heightM;
  const c = f.colour;
  const seed = seedOf(f);
  const solid = f.kind !== 'curtain' && f.kind !== 'shower-curtain' && f.kind !== 'tree' && f.kind !== 'bush';
  if (solid && f.kind !== 'rug') isoShadow(g, f.x0, f.y0, f.x1, f.y1, h);
  const B = (x0: number, y0: number, x1: number, y1: number, z0: number, z1: number, look: Look): void => {
    isoBlock(g, x0, y0, x1, y1, z0, z1, {
      ...look,
      colour: aged(look.colour),
      ...(look.top ? { top: aged(look.top, 1.1) } : {}),
    });
  };
  // A piece whose front faces away from the camera (a wardrobe against the south wall) shows its plain back.
  if (FRONTED.has(f.kind) && !frontVisible(facing)) {
    plainBack(g, f, B);
    wear(g, f, seed);
    return g;
  }
  switch (f.kind) {
    case 'sofa':
    case 'armchair':
      withMaterial('fabric', () => seating(g, f, B, seed, facing));
      break;
    case 'coffee-table':
      withMaterial('wood', () => {
        for (const [lx, ly] of [
          [f.x0 + 0.06, f.y0 + 0.06],
          [f.x1 - 0.12, f.y0 + 0.06],
          [f.x0 + 0.06, f.y1 - 0.12],
          [f.x1 - 0.12, f.y1 - 0.12],
        ] as const)
          B(lx, ly, lx + 0.06, ly + 0.06, 0, h - 0.05, { colour: shade(c, 0.8), edge: 0.3 });
        B(f.x0 + 0.1, f.y0 + 0.1, f.x1 - 0.1, f.y1 - 0.1, 0.12, 0.16, { colour: shade(c, 0.85), noAo: true });
        B(f.x0, f.y0, f.x1, f.y1, h - 0.06, h, { colour: c, noAo: true });
      });
      // A dusty book and a burnt-down candle stub on the top.
      B(f.x0 + 0.2, f.y0 + 0.2, f.x0 + 0.55, f.y0 + 0.42, h, h + 0.04, { colour: 0x5a3a3a, noAo: true });
      isoCylinder(g, f.x1 - 0.3, f.y1 - 0.3, h, 0.04, 0.09, 0xcfc6a4);
      break;
    case 'tv-console': {
      withMaterial('wood', () => {
        B(f.x0, f.y0, f.x1, f.y1, 0.06, h, { colour: c });
        B(f.x0 + 0.02, f.y0 + 0.02, f.x1 - 0.02, f.y1 - 0.02, 0, 0.06, { colour: MOULD, noAo: true });
      });
      // Doors on the face the camera sees, then the television standing on it.
      const front = facing === 'e' ? face.right(f.x1) : face.left(f.y1);
      const [a0, a1] = facing === 'e' ? [f.y0, f.y1] : [f.x0, f.x1];
      const n = Math.max(2, Math.round((a1 - a0) / 0.5));
      for (let i = 0; i < n; i++) {
        const u0 = a0 + ((a1 - a0) / n) * i + 0.03;
        const u1 = a0 + ((a1 - a0) / n) * (i + 1) - 0.03;
        faceQuad(g, front, u0, 0.1, u1, h - 0.05).stroke({ width: 0.012, color: 0x120e0a, alpha: 0.8 });
        faceQuad(g, front, (u0 + u1) / 2 - 0.02, h - 0.2, (u0 + u1) / 2 + 0.02, h - 0.1).fill(0x9a9588);
      }
      const cx = (f.x0 + f.x1) / 2;
      const cy = (f.y0 + f.y1) / 2;
      const sw = Math.min(0.9, Math.max(w, d) * 0.55);
      const alongY = facing === 'e';
      // The TV is thin: its screen faces the room (east when the console runs north-south).
      if (alongY) {
        isoBlock(g, cx - 0.05, cy - sw / 2, cx + 0.05, cy + sw / 2, h, h + 0.52, { colour: 0x0c0d10, edge: 0.5 });
        faceQuad(g, face.right(cx + 0.05), cy - sw / 2 + 0.04, h + 0.04, cy + sw / 2 - 0.04, h + 0.48).fill({
          color: 0x161c20,
          alpha: 0.95,
        });
        faceQuad(g, face.right(cx + 0.05), cy - sw / 2 + 0.1, h + 0.3, cy - sw / 2 + 0.3, h + 0.44).fill({
          color: 0x9fb4b8,
          alpha: 0.07,
        }); // a ghost of reflected light, never an image
      } else {
        isoBlock(g, cx - sw / 2, cy - 0.05, cx + sw / 2, cy + 0.05, h, h + 0.52, { colour: 0x0c0d10, edge: 0.5 });
        faceQuad(g, face.left(cy + 0.05), cx - sw / 2 + 0.04, h + 0.04, cx + sw / 2 - 0.04, h + 0.48).fill(0x161c20);
      }
      break;
    }
    case 'side-table':
      withMaterial('wood', () => {
        B(f.x0 + 0.05, f.y0 + 0.05, f.x0 + 0.1, f.y0 + 0.1, 0, h - 0.05, { colour: shade(c, 0.8) });
        B(f.x1 - 0.1, f.y0 + 0.05, f.x1 - 0.05, f.y0 + 0.1, 0, h - 0.05, { colour: shade(c, 0.8) });
        B(f.x0 + 0.05, f.y1 - 0.1, f.x0 + 0.1, f.y1 - 0.05, 0, h - 0.05, { colour: shade(c, 0.8) });
        B(f.x1 - 0.1, f.y1 - 0.1, f.x1 - 0.05, f.y1 - 0.05, 0, h - 0.05, { colour: shade(c, 0.8) });
        B(f.x0, f.y0, f.x1, f.y1, h - 0.06, h, { colour: c, noAo: true });
      });
      break;
    case 'floor-lamp': {
      const cx = (f.x0 + f.x1) / 2;
      const cy = (f.y0 + f.y1) / 2;
      isoCylinder(g, cx, cy, 0, 0.17, 0.04, 0x2a2622);
      isoBlock(g, cx - 0.025, cy - 0.025, cx + 0.025, cy + 0.025, 0.04, h - 0.35, {
        colour: aged(0x6a5a3a),
        edge: 0.3,
      });
      // A shade that glows weakly: warm, dim, a little crooked.
      const top = iso(cx, cy, h - 0.35);
      const bot = iso(cx, cy, h);
      g.poly([top.x - 0.12, top.y, top.x + 0.12, top.y, bot.x + 0.2, bot.y, bot.x - 0.2, bot.y]).fill({
        color: aged(0xe8d28a, 1.1),
        alpha: 0.96,
      });
      g.ellipse(bot.x, bot.y, 0.2, 0.2 * 0.5).fill({ color: 0xffe6a0, alpha: 0.4 });
      break;
    }
    case 'bookshelf':
      withMaterial('wood', () =>
        drawBookshelf(
          g,
          { kind: 'bookshelf', x: (f.x0 + f.x1) / 2, y: (f.y0 + f.y1) / 2, facing } as never,
          f.x0,
          f.y0,
          f.x1,
          f.y1,
          h,
        ),
      );
      break;
    case 'dining-table':
      withMaterial('wood', () => {
        for (const [lx, ly] of [
          [f.x0 + 0.08, f.y0 + 0.08],
          [f.x1 - 0.18, f.y0 + 0.08],
          [f.x0 + 0.08, f.y1 - 0.18],
          [f.x1 - 0.18, f.y1 - 0.18],
        ] as const)
          B(lx, ly, lx + 0.1, ly + 0.1, 0, h - 0.07, { colour: shade(c, 0.78), edge: 0.3 });
        B(f.x0 + 0.1, f.y0 + 0.1, f.x1 - 0.1, f.y1 - 0.1, h - 0.18, h - 0.12, { colour: shade(c, 0.8), noAo: true });
        B(f.x0, f.y0, f.x1, f.y1, h - 0.07, h, { colour: c, noAo: true });
      });
      // A stained runner, two cracked plates and a toppled glass.
      faceQuad(g, face.top(h + 0.001), f.x0 + 0.15, (f.y0 + f.y1) / 2 - 0.1, f.x1 - 0.15, (f.y0 + f.y1) / 2 + 0.1).fill(
        {
          color: 0x6a2a2a,
          alpha: 0.55,
        },
      );
      for (const [px, py] of [
        [f.x0 + 0.4, f.y0 + 0.3],
        [f.x1 - 0.4, f.y1 - 0.3],
      ] as const) {
        const p = iso(px, py, h);
        g.ellipse(p.x, p.y, 0.13, 0.065)
          .fill({ color: 0xcfcabb, alpha: 0.85 })
          .stroke({ width: 0.008, color: 0x2a2620, alpha: 0.6 });
      }
      break;
    case 'chair': {
      withMaterial('wood', () => chair(f, facing, B));
      break;
    }
    case 'counter':
    case 'sink':
      withMaterial('wood', () => {
        B(f.x0, f.y0, f.x1, f.y1, 0, h - 0.06, { colour: c });
        B(f.x0 - 0.02, f.y0 - 0.02, f.x1 + 0.02, f.y1 + 0.03, h - 0.06, h, { colour: 0xb4ad9d, noAo: true });
        const horiz = facing === 's';
        const front = horiz ? face.left(f.y1) : face.right(f.x1);
        const [a0, a1] = horiz ? [f.x0, f.x1] : [f.y0, f.y1];
        const n = Math.max(2, Math.round((a1 - a0) / 0.7));
        for (let i = 0; i < n; i++) {
          const u0 = a0 + ((a1 - a0) / n) * i + 0.03;
          const u1 = a0 + ((a1 - a0) / n) * (i + 1) - 0.03;
          faceQuad(g, front, u0, 0.08, u1, h - 0.1).stroke({ width: 0.012, color: 0x120e0a, alpha: 0.75 });
          faceQuad(g, front, u0 + 0.06, 0.14, u1 - 0.06, h - 0.16).stroke({
            width: 0.008,
            color: 0x120e0a,
            alpha: 0.35,
          });
          faceQuad(g, front, (u0 + u1) / 2 - 0.06, h - 0.22, (u0 + u1) / 2 + 0.06, h - 0.2).fill(0x8f8b80);
        }
      });
      if (f.kind === 'sink') sink(g, f, facing);
      break;
    case 'fridge': {
      withMaterial('metal', () => B(f.x0, f.y0, f.x1, f.y1, 0, h, { colour: 0xcfd2d4 }));
      const front = facing === 's' ? face.left(f.y1) : face.right(f.x1);
      const [a0, a1] = facing === 's' ? [f.x0, f.x1] : [f.y0, f.y1];
      faceQuad(g, front, a0 + 0.03, h * 0.62, a1 - 0.03, h * 0.625).fill({ color: 0x000000, alpha: 0.55 });
      faceQuad(g, front, a1 - 0.12, h * 0.66, a1 - 0.09, h * 0.9).fill(0x8a8e92);
      faceQuad(g, front, a1 - 0.12, h * 0.2, a1 - 0.09, h * 0.55).fill(0x8a8e92);
      faceQuad(g, front, a0 + 0.1, h * 0.7, a0 + 0.2, h * 0.78).fill({ color: 0xd7c26a, alpha: 0.8 }); // a faded note
      break;
    }
    case 'stove': {
      withMaterial('metal', () => B(f.x0, f.y0, f.x1, f.y1, 0, h, { colour: 0x6c7077 }));
      for (const [bx, by] of [
        [0.25, 0.28],
        [0.75, 0.28],
        [0.25, 0.7],
        [0.75, 0.7],
      ] as const) {
        const p = iso(f.x0 + w * bx, f.y0 + d * by, h);
        g.ellipse(p.x, p.y, 0.1, 0.05).fill(0x14151a).stroke({ width: 0.012, color: 0x3a3d44 });
        g.ellipse(p.x, p.y, 0.05, 0.025).stroke({ width: 0.008, color: 0x3a3d44 });
      }
      const front = facing === 's' ? face.left(f.y1) : face.right(f.x1);
      const [a0, a1] = facing === 's' ? [f.x0, f.x1] : [f.y0, f.y1];
      faceQuad(g, front, a0 + 0.08, 0.1, a1 - 0.08, h - 0.15).fill({ color: 0x15171b, alpha: 0.85 }); // oven window
      faceQuad(g, front, a0 + 0.08, h - 0.12, a1 - 0.08, h - 0.1).fill(0xa4a8ae);
      break;
    }
    case 'cupboard':
    case 'wardrobe':
    case 'shed-cabinet':
      withMaterial('wood', () => cabinet(g, f, B, seed, facing));
      break;
    case 'toilet':
      withMaterial('ceramic', () => toilet(g, f));
      break;
    case 'bathtub':
      withMaterial('ceramic', () => {
        B(f.x0, f.y0, f.x1, f.y1, 0.08, h, { colour: 0xd8d6cf });
        const inner = { x0: f.x0 + 0.1, y0: f.y0 + 0.1, x1: f.x1 - 0.1, y1: f.y1 - 0.1 };
        faceQuad(g, face.top(h + 0.001), inner.x0, inner.y0, inner.x1, inner.y1).fill({ color: 0x2c3234, alpha: 0.9 });
        faceQuad(g, face.top(h + 0.002), inner.x0 + 0.1, inner.y0 + 0.1, inner.x0 + 0.5, inner.y1 - 0.1).fill({
          color: 0x4b3a2a,
          alpha: 0.5,
        }); // an old brown stain
        for (const [lx, ly] of [
          [f.x0 + 0.1, f.y1 - 0.1],
          [f.x1 - 0.15, f.y1 - 0.1],
        ] as const)
          B(lx, ly, lx + 0.06, ly + 0.06, 0, 0.1, { colour: 0x6c6a62 });
      });
      break;
    case 'basin': {
      withMaterial('ceramic', () => {
        B(f.x0 + 0.1, f.y0 + 0.1, f.x1 - 0.1, f.y1 - 0.1, 0, h - 0.18, { colour: 0xc9c7c0 });
        B(f.x0, f.y0, f.x1, f.y1, h - 0.18, h, { colour: 0xd8d6cf });
      });
      const p = iso((f.x0 + f.x1) / 2, (f.y0 + f.y1) / 2, h);
      g.ellipse(p.x, p.y, Math.max(0.1, w * 0.3), 0.08).fill(0x4a4e50);
      const t = iso((f.x0 + f.x1) / 2, f.y0 + 0.08, h);
      g.rect(t.x - 0.012, t.y - 0.14, 0.024, 0.14).fill(0x9aa0a6);
      // A cracked mirror above the basin, hanging on the wall.
      const m = iso((f.x0 + f.x1) / 2, f.y0 - 0.02, h + 0.55);
      g.poly([m.x - 0.22, m.y - 0.3, m.x + 0.22, m.y - 0.3, m.x + 0.22, m.y + 0.18, m.x - 0.22, m.y + 0.18]).fill({
        color: 0x6f8084,
        alpha: 0.8,
      });
      g.moveTo(m.x - 0.05, m.y - 0.3)
        .lineTo(m.x + 0.02, m.y - 0.08)
        .lineTo(m.x - 0.1, m.y + 0.05)
        .lineTo(m.x + 0.12, m.y + 0.18)
        .stroke({ width: 0.012, color: 0xe8eef0, alpha: 0.7 });
      break;
    }
    case 'bed':
      withMaterial('fabric', () => bed(g, f, B, seed, facing));
      break;
    case 'nightstand':
      withMaterial('wood', () => {
        B(f.x0, f.y0, f.x1, f.y1, 0.05, h, { colour: c });
        const front = facing === 's' ? face.left(f.y1) : face.right(f.x1);
        const [a0, a1] = facing === 's' ? [f.x0, f.x1] : [f.y0, f.y1];
        faceQuad(g, front, a0 + 0.04, h * 0.5, a1 - 0.04, h - 0.05).stroke({
          width: 0.012,
          color: 0x120e0a,
          alpha: 0.8,
        });
        faceQuad(g, front, (a0 + a1) / 2 - 0.04, h * 0.7, (a0 + a1) / 2 + 0.04, h * 0.74).fill(0x9a9588);
        faceQuad(g, front, a0 + 0.04, 0.1, a1 - 0.04, h * 0.45).stroke({ width: 0.012, color: 0x120e0a, alpha: 0.8 });
        B(
          (f.x0 + f.x1) / 2 - 0.03,
          (f.y0 + f.y1) / 2 - 0.03,
          (f.x0 + f.x1) / 2 + 0.03,
          (f.y0 + f.y1) / 2 + 0.03,
          h,
          h + 0.22,
          {
            colour: 0x6a5a3a,
          },
        );
      });
      break;
    case 'desk':
      withMaterial('wood', () => {
        B(f.x0, f.y0, f.x1, f.y1, h - 0.06, h, { colour: c, noAo: true });
        B(f.x0 + 0.04, f.y0 + 0.04, f.x0 + 0.1, f.y1 - 0.04, 0, h - 0.06, { colour: shade(c, 0.8) });
        B(f.x1 - 0.5, f.y0 + 0.04, f.x1 - 0.04, f.y1 - 0.04, 0, h - 0.06, { colour: shade(c, 0.9) });
        faceQuad(g, face.left(f.y1 - 0.04), f.x1 - 0.46, 0.1, f.x1 - 0.08, h * 0.45).stroke({
          width: 0.012,
          color: 0x120e0a,
          alpha: 0.8,
        });
        faceQuad(g, face.left(f.y1 - 0.04), f.x1 - 0.46, h * 0.5, f.x1 - 0.08, h - 0.1).stroke({
          width: 0.012,
          color: 0x120e0a,
          alpha: 0.8,
        });
      });
      B(f.x0 + 0.3, f.y0 + 0.1, f.x0 + 0.7, f.y0 + 0.18, h, h + 0.3, { colour: 0x16181c, edge: 0.5 });
      break;
    case 'chest':
      withMaterial('wood', () => {
        B(f.x0, f.y0, f.x1, f.y1, 0, h * 0.72, { colour: c });
        B(f.x0 - 0.01, f.y0 - 0.01, f.x1 + 0.01, f.y1 + 0.01, h * 0.72, h, { colour: shade(c, 0.9) });
        const horiz = facing === 's';
        const front = horiz ? face.left(f.y1 + 0.01) : face.right(f.x1 + 0.01);
        const [a0, a1] = horiz ? [f.x0, f.x1] : [f.y0, f.y1];
        for (const u of [a0 + (a1 - a0) * 0.2, a1 - (a1 - a0) * 0.2 - 0.05])
          faceQuad(g, front, u, 0, u + 0.05, h).fill({ color: 0x1a1612, alpha: 0.75 }); // iron bands
        faceQuad(g, front, (a0 + a1) / 2 - 0.04, h * 0.6, (a0 + a1) / 2 + 0.04, h * 0.8).fill(0x8f7a3a);
      });
      break;
    case 'box':
      B(f.x0, f.y0, f.x1, f.y1, 0, h, { colour: 0x9a7d55, top: 0xa88a60 });
      faceQuad(g, face.top(h + 0.001), (f.x0 + f.x1) / 2 - 0.03, f.y0, (f.x0 + f.x1) / 2 + 0.03, f.y1).fill({
        color: 0xd8c9a0,
        alpha: 0.7,
      });
      faceQuad(
        g,
        w >= d ? face.left(f.y1) : face.right(f.x1),
        (w >= d ? f.x0 : f.y0) + 0.08,
        h * 0.35,
        (w >= d ? f.x1 : f.y1) - 0.1,
        h * 0.62,
      ).fill({
        color: 0xf0e8d0,
        alpha: 0.45,
      });
      break;
    case 'shelf':
      withMaterial('wood', () => {
        for (const [lx, ly] of [
          [f.x0, f.y0],
          [f.x1 - 0.05, f.y0],
          [f.x0, f.y1 - 0.05],
          [f.x1 - 0.05, f.y1 - 0.05],
        ] as const)
          B(lx, ly, lx + 0.05, ly + 0.05, 0, h, { colour: shade(c, 0.8), edge: 0.3 });
        for (let i = 1; i <= 3; i++)
          B(f.x0, f.y0, f.x1, f.y1, (h * i) / 3 - 0.04, (h * i) / 3, { colour: c, noAo: true });
      });
      for (let i = 0; i < 3; i++) {
        const z = (h * (i + 1)) / 3;
        B(f.x0 + 0.1 + i * 0.12, f.y0 + 0.08, f.x0 + 0.26 + i * 0.12, f.y0 + 0.24, z, z + 0.16, {
          colour: [0x5a4a3a, 0x3a4a52, 0x6a5a3a][i]!,
          noAo: true,
        });
      }
      break;
    case 'curtain':
    case 'shower-curtain':
      drape(g, f, seed);
      break;
    case 'bush':
      bush(g, f, seed);
      break;
    case 'tree':
      tree(g, f, seed);
      break;
    case 'bench':
      withMaterial('wood', () => {
        B(f.x0, f.y0, f.x0 + 0.08, f.y1, 0, 0.4, { colour: shade(c, 0.8) });
        B(f.x1 - 0.08, f.y0, f.x1, f.y1, 0, 0.4, { colour: shade(c, 0.8) });
        B(f.x0, f.y0, f.x1, f.y1, 0.4, 0.46, { colour: c, noAo: true });
        B(f.x0, f.y0, f.x1, f.y0 + 0.06, 0.46, h, { colour: c });
      });
      break;
    case 'garden-table':
      withMaterial('metal', () => {
        isoCylinder(g, (f.x0 + f.x1) / 2, (f.y0 + f.y1) / 2, 0, 0.05, h - 0.04, aged(0x8a8f94));
        isoCylinder(g, (f.x0 + f.x1) / 2, (f.y0 + f.y1) / 2, h - 0.04, Math.min(w, d) * 0.5, 0.04, aged(c));
      });
      break;
    case 'barbecue':
      isoCylinder(g, (f.x0 + f.x1) / 2, (f.y0 + f.y1) / 2, 0.3, Math.min(w, d) * 0.5, h - 0.3, aged(0x2a2c30));
      B(f.x0 + 0.05, f.y0 + 0.05, f.x0 + 0.1, f.y0 + 0.1, 0, 0.3, { colour: 0x2a2c30 });
      B(f.x1 - 0.1, f.y1 - 0.1, f.x1 - 0.05, f.y1 - 0.05, 0, 0.3, { colour: 0x2a2c30 });
      break;
    case 'car':
      car(f, B);
      break;
    case 'bin':
      isoCylinder(g, (f.x0 + f.x1) / 2, (f.y0 + f.y1) / 2, 0, Math.min(w, d) * 0.5, h, aged(0x4a5a4a));
      break;
    default:
      B(f.x0, f.y0, f.x1, f.y1, 0, h, { colour: c, top: shade(c, 1.2) });
  }
  if (solid && f.kind !== 'rug' && h >= 0.35) wear(g, f, seed);
  return g;
}

// ---------------------------------------------------------------------------------- pieces
const FRONTED = new Set<FurnitureDef['kind']>([
  'cupboard',
  'wardrobe',
  'shed-cabinet',
  'counter',
  'sink',
  'fridge',
  'stove',
  'nightstand',
  'chest',
  'tv-console',
]);

/** The back of a fronted piece: a plain carcass with its top and, for a stove, the hobs. */
function plainBack(g: Graphics, f: FurnitureDef, B: Blk): void {
  const h = f.heightM;
  const metal = f.kind === 'fridge' || f.kind === 'stove';
  withMaterial(metal ? 'metal' : 'wood', () => {
    B(f.x0, f.y0, f.x1, f.y1, f.kind === 'tv-console' ? 0.06 : 0, h, {
      colour: f.kind === 'fridge' ? 0xcfd2d4 : f.kind === 'stove' ? 0x6c7077 : f.colour,
    });
    if (f.kind === 'counter')
      B(f.x0 - 0.02, f.y0 - 0.02, f.x1 + 0.02, f.y1 + 0.03, h - 0.06, h, { colour: 0xb4ad9d, noAo: true });
  });
  if (f.kind === 'tv-console') {
    const cx = (f.x0 + f.x1) / 2;
    const cy = (f.y0 + f.y1) / 2;
    B(cx - 0.05, cy - 0.3, cx + 0.05, cy + 0.3, h, h + 0.52, { colour: 0x0c0d10 });
  }
  if (f.kind === 'stove')
    for (const [bx, by] of [
      [0.25, 0.3],
      [0.75, 0.3],
      [0.25, 0.7],
      [0.75, 0.7],
    ] as const) {
      const p = iso(f.x0 + (f.x1 - f.x0) * bx, f.y0 + (f.y1 - f.y0) * by, h);
      g.ellipse(p.x, p.y, 0.1, 0.05).fill(0x14151a);
    }
}
type Blk = (x0: number, y0: number, x1: number, y1: number, z0: number, z1: number, look: Look) => void;

/**
 * A frame for a piece that has a front: `R(a0, a1, p0, p1)` is the world rectangle that runs from `a0` to `a1`
 * across the front and from `p0` to `p1` in depth measured from the BACK, whichever way the piece faces.
 */
function frameFor(f: FurnitureDef, facing: Facing) {
  const across = facing === 'n' || facing === 's';
  const R = (a0: number, a1: number, p0: number, p1: number): [number, number, number, number] => {
    switch (facing) {
      case 's':
        return [f.x0 + a0, f.y0 + p0, f.x0 + a1, f.y0 + p1];
      case 'n':
        return [f.x0 + a0, f.y1 - p1, f.x0 + a1, f.y1 - p0];
      case 'e':
        return [f.x0 + p0, f.y0 + a0, f.x0 + p1, f.y0 + a1];
      default:
        return [f.x1 - p1, f.y0 + a0, f.x1 - p0, f.y0 + a1];
    }
  };
  return { R, L: across ? f.x1 - f.x0 : f.y1 - f.y0, D: across ? f.y1 - f.y0 : f.x1 - f.x0 };
}

/** Boxes drawn in depth order (far to near), so a piece that faces any way overlaps itself correctly. */
function drawSorted(
  B: Blk,
  parts: readonly { r: readonly [number, number, number, number]; z0: number; z1: number; look: Look }[],
): void {
  const key = (p: (typeof parts)[number]) => p.r[0] + p.r[2] + p.r[1] + p.r[3] + p.z0 * 0.05;
  for (const p of [...parts].sort((a, b) => key(a) - key(b))) B(...p.r, p.z0, p.z1, p.look);
}

/**
 * Sofa and armchair, facing `facing` (toward the table they are used with): feet and plinth, a back on the
 * side away from the sitter, arms, split seat cushions and leaning back cushions.
 */
function seating(g: Graphics, f: FurnitureDef, B: Blk, seed: number, facing: Facing): void {
  const c = f.colour;
  const { R, L, D } = frameFor(f, facing);
  const arm = f.kind === 'sofa' ? 0.3 : 0.22;
  const backT = 0.34;
  const seatTop = 0.4;
  const parts: { r: readonly [number, number, number, number]; z0: number; z1: number; look: Look }[] = [];
  const add = (r: readonly [number, number, number, number], z0: number, z1: number, look: Look) =>
    parts.push({ r, z0, z1, look });
  for (const [a0, a1] of [
    [0.05, 0.2],
    [L - 0.2, L - 0.05],
  ] as const)
    for (const [p0, p1] of [
      [0.04, 0.16],
      [D - 0.16, D - 0.04],
    ] as const)
      add(R(a0, a1, p0, p1), 0, 0.1, { colour: MOULD, edge: 0.3 });
  add(R(0, L, 0, D), 0.1, 0.3, { colour: shade(c, 0.85) });
  add(R(0, L, 0, backT), 0.3, f.heightM, { colour: c });
  add(R(0, arm, 0, D), 0.3, 0.64, { colour: shade(c, 0.95) });
  add(R(L - arm, L, 0, D), 0.3, 0.64, { colour: shade(c, 0.95) });
  const n = Math.max(1, Math.round((L - arm * 2) / 0.85));
  const cw = (L - arm * 2) / n;
  for (let i = 0; i < n; i++) {
    const a0 = arm + cw * i + 0.01;
    const a1 = arm + cw * (i + 1) - 0.01;
    add(R(a0, a1, backT, D - 0.02), 0.3, seatTop + 0.04 * ((seed + i) % 2), { colour: shade(c, 1.06), noAo: true });
    add(R(a0 + 0.03, a1 - 0.03, backT - 0.02, backT + 0.14), seatTop, f.heightM - 0.1, {
      colour: shade(c, 0.98),
      noAo: true,
    });
  }
  // A throw pillow on a sofa, in the corner by an arm.
  if (f.kind === 'sofa')
    add(R(arm + 0.05, arm + 0.4, backT + 0.1, backT + 0.28), seatTop, seatTop + 0.3, { colour: 0x8a3a3a, noAo: true });
  drawSorted(B, parts);
  if (f.kind !== 'sofa') return;
  // A sag in the seat and, on the side the camera sees, a rip with stuffing.
  const dent = R(L * 0.45, L * 0.7, backT + 0.2, D - 0.15);
  const at = iso((dent[0] + dent[2]) / 2, (dent[1] + dent[3]) / 2, seatTop + 0.05);
  g.ellipse(at.x, at.y, 0.26, 0.09).fill({ color: 0x000000, alpha: 0.18 });
  if (!frontVisible(facing)) return;
  const edge = R(L * 0.25, L * 0.25, D, D);
  const t = facing === 's' ? iso(edge[0], f.y1, 0.34) : iso(f.x1, edge[1], 0.34);
  g.moveTo(t.x - 0.1, t.y)
    .lineTo(t.x - 0.03, t.y - 0.05)
    .lineTo(t.x + 0.03, t.y + 0.02)
    .lineTo(t.x + 0.1, t.y - 0.04)
    .stroke({ width: 0.012, color: 0x120e0a, alpha: 0.8 });
  g.circle(t.x, t.y - 0.03, 0.018).fill({ color: 0xe8e2d0, alpha: 0.7 });
}

function chair(f: FurnitureDef, facing: Facing, B: Blk): void {
  const c = f.colour;
  // The backrest stands on the side opposite where the chair faces.
  const t = 0.07;
  const back: [number, number, number, number] =
    facing === 's'
      ? [f.x0, f.y0, f.x1, f.y0 + t]
      : facing === 'n'
        ? [f.x0, f.y1 - t, f.x1, f.y1]
        : facing === 'e'
          ? [f.x0, f.y0, f.x0 + t, f.y1]
          : [f.x1 - t, f.y0, f.x1, f.y1];
  for (const [lx, ly] of [
    [f.x0 + 0.02, f.y0 + 0.02],
    [f.x1 - 0.07, f.y0 + 0.02],
    [f.x0 + 0.02, f.y1 - 0.07],
    [f.x1 - 0.07, f.y1 - 0.07],
  ] as const)
    B(lx, ly, lx + 0.05, ly + 0.05, 0, f.heightM * 0.5, { colour: shade(c, 0.8), edge: 0.3 });
  const southBack = facing === 'n';
  if (!southBack) B(...back, f.heightM * 0.5, f.heightM + 0.35, { colour: c });
  B(f.x0, f.y0, f.x1, f.y1, f.heightM * 0.5 - 0.05, f.heightM * 0.5, { colour: shade(c, 1.1), noAo: true });
  if (southBack) B(...back, f.heightM * 0.5, f.heightM + 0.35, { colour: c });
}

/** Wardrobe, cupboard, shed cabinet: carcass, plinth, crown, panelled doors with handles (one a crack open). */
function cabinet(g: Graphics, f: FurnitureDef, B: Blk, seed: number, facing: Facing): void {
  const c = f.colour;
  const w = f.x1 - f.x0;
  const d = f.y1 - f.y0;
  const h = f.heightM;
  B(f.x0, f.y0, f.x1, f.y1, 0.08, h, { colour: c });
  B(f.x0 + 0.03, f.y0 + 0.03, f.x1 - 0.03, f.y1 - 0.03, 0, 0.08, { colour: MOULD, noAo: true });
  if (f.kind !== 'shed-cabinet')
    B(f.x0 - 0.03, f.y0 - 0.03, f.x1 + 0.03, f.y1 + 0.03, h - 0.07, h, { colour: shade(c, 1.1), noAo: true });
  const horiz = facing === 's';
  const front = horiz ? face.left(f.y1) : face.right(f.x1);
  const [a0, a1] = horiz ? [f.x0, f.x1] : [f.y0, f.y1];
  const doors = a1 - a0 > 1.1 ? 2 : 1;
  for (let i = 0; i < doors; i++) {
    const u0 = a0 + ((a1 - a0) / doors) * i + 0.04;
    const u1 = a0 + ((a1 - a0) / doors) * (i + 1) - 0.04;
    faceQuad(g, front, u0, 0.14, u1, h - 0.12).fill({ color: 0x000000, alpha: 0.12 });
    faceQuad(g, front, u0, 0.14, u1, h - 0.12).stroke({ width: 0.014, color: 0x120e0a, alpha: 0.85 });
    faceQuad(g, front, u0 + 0.08, 0.26, u1 - 0.08, h * 0.5 - 0.04).stroke({
      width: 0.01,
      color: 0x120e0a,
      alpha: 0.45,
    });
    faceQuad(g, front, u0 + 0.08, h * 0.5 + 0.04, u1 - 0.08, h - 0.24).stroke({
      width: 0.01,
      color: 0x120e0a,
      alpha: 0.45,
    });
    const hx = i === 0 ? u1 - 0.07 : u0 + 0.07;
    faceQuad(g, front, hx - 0.015, h * 0.45, hx + 0.015, h * 0.58).fill(0x9a8f5a);
  }
  // One door hangs a little open: a dark sliver of the inside.
  if (seed % 3 !== 0 && f.kind !== 'shed-cabinet') {
    const u = a1 - 0.06;
    faceQuad(g, front, u - 0.07, 0.18, u, h - 0.16).fill({ color: 0x050403, alpha: 0.75 });
  }
}

function toilet(g: Graphics, f: FurnitureDef): void {
  const cx = (f.x0 + f.x1) / 2;
  const cy = (f.y0 + f.y1) / 2;
  const w = f.x1 - f.x0;
  const d = f.y1 - f.y0;
  const horiz = w <= d; // the tank is against the back wall (north or west)
  const tank = horiz ? ([f.x0, f.y0, f.x1, f.y0 + d * 0.3] as const) : ([f.x0, f.y0, f.x0 + w * 0.3, f.y1] as const);
  isoBlock(g, tank[0], tank[1], tank[2], tank[3], 0.4, f.heightM + 0.25, { colour: aged(0xd8d6cf), edge: 0.45 });
  isoCylinder(g, cx, horiz ? cy + d * 0.12 : cy, 0, Math.min(w, d) * 0.3, 0.2, aged(0xcfcdc6));
  isoCylinder(
    g,
    cx + (horiz ? 0 : w * 0.1),
    cy + (horiz ? d * 0.12 : 0),
    0.2,
    Math.min(w, d) * 0.46,
    0.22,
    aged(0xd8d6cf),
  );
  const lid = iso(cx + (horiz ? 0 : w * 0.1), cy + (horiz ? d * 0.12 : 0), 0.42);
  g.ellipse(lid.x, lid.y, Math.min(w, d) * 0.36, Math.min(w, d) * 0.18).fill(0x3a3f40);
}

/**
 * A bed with its head to `facing`'s back (a wall): headboard, a sheeted mattress, two plump pillows at the head, and a
 * blanket tucked in under the pillows, with a folded-back cuff, draped sides, wrinkles and an old stain.
 */
/**
 * A sink's bowl, and a tap at its back (the wall side) whose spout arcs forward over the bowl, whichever way the
 * unit faces (owner, 18/11/2026: the tap must face the bowl).
 */
function sink(g: Graphics, f: FurnitureDef, facing: Facing): void {
  const h = f.heightM;
  const { R, L, D } = frameFor(f, facing);
  const mid = (a: number, p: number, z: number) => {
    const r = R(a, a, p, p);
    return iso(r[0], r[1], z);
  };
  const bowl = mid(L / 2, D / 2, h);
  g.ellipse(bowl.x, bowl.y, Math.min(0.34, L * 0.3), Math.min(0.34, L * 0.3) * 0.5)
    .fill(0x6e7378)
    .stroke({ width: 0.012, color: 0x2a2d33 });
  g.ellipse(bowl.x, bowl.y + 0.01, Math.min(0.28, L * 0.24), Math.min(0.28, L * 0.24) * 0.5).fill(0x3d4146);
  // The tap stands at the back edge, rises, bends toward the front and ends over the bowl, pointing down.
  const reach = Math.min(D * 0.42, 0.4);
  const base = mid(L / 2, 0.1, h);
  const top = mid(L / 2, 0.1, h + 0.3);
  const over = mid(L / 2, reach, h + 0.3);
  const tip = mid(L / 2, reach, h + 0.22);
  g.moveTo(base.x, base.y).lineTo(top.x, top.y).lineTo(over.x, over.y).lineTo(tip.x, tip.y).stroke({
    width: 0.035,
    color: 0xaab0b6,
    cap: 'round',
    join: 'round',
  });
  g.circle(base.x, base.y, 0.045).fill(0x7a8086); // the tap's base
  for (const a of [L / 2 - 0.12, L / 2 + 0.12]) {
    const hp = mid(a, 0.1, h + 0.05);
    g.circle(hp.x, hp.y, 0.022).fill(0xc9ced3); // the two handles either side of the pole
  }
}

/** Where the bed's rails end and its mattress begins: the legs stand this high, leaving the gap below clear. */
export const BED_RAIL_TOP_M = 0.5;

function bed(g: Graphics, f: FurnitureDef, B: Blk, seed: number, facing: Facing): void {
  const c = f.colour;
  const { R, L, D } = frameFor(f, facing);
  const h = f.heightM;
  const parts: { r: readonly [number, number, number, number]; z0: number; z1: number; look: Look }[] = [];
  const add = (r: readonly [number, number, number, number], z0: number, z1: number, look: Look) =>
    parts.push({ r, z0, z1, look });
  const ph = Math.min(0.75, D * 0.2); // pillow depth
  const blanketFrom = 0.14 + ph + 0.04; // the blanket starts where the pillows end: it is tucked in under them
  // The floor under the bed is in shadow; the frame stands on four legs with a clear gap beneath its rails.
  const FRAME = 0x4a3a2a;
  const under = [R(0.05, L - 0.05, 0.1, D - 0.05)].map((q) => [
    iso(q[0], q[1]),
    iso(q[2], q[1]),
    iso(q[2], q[3]),
    iso(q[0], q[3]),
  ])[0]!;
  g.poly(under.flatMap((p) => [p.x, p.y])).fill({ color: 0x000000, alpha: 0.5 });
  const leg = 0.12;
  for (const [a0, a1] of [
    [0, leg],
    [L - leg, L],
  ] as const)
    for (const [p0, p1] of [
      [0, leg],
      [D - leg, D],
    ] as const)
      add(R(a0, a1, p0, p1), 0, BED_RAIL_TOP_M, { colour: FRAME, edge: 0.4 });
  add(R(leg, L - leg, D - 0.07, D - 0.01), BED_RAIL_TOP_M - 0.12, BED_RAIL_TOP_M, { colour: FRAME }); // the foot rail
  add(R(0, 0.07, leg, D - leg), BED_RAIL_TOP_M - 0.12, BED_RAIL_TOP_M, { colour: FRAME }); // the side rails
  add(R(L - 0.07, L, leg, D - leg), BED_RAIL_TOP_M - 0.12, BED_RAIL_TOP_M, { colour: FRAME });
  add(R(0, L, 0, 0.12), 0.25, h + 0.55, { colour: FRAME }); // the headboard
  add(R(0.04, L - 0.04, 0.02, 0.12), h + 0.2, h + 0.5, { colour: shade(FRAME, 1.15), noAo: true }); // its raised panel
  add(R(0.04, L - 0.04, 0.12, D - 0.04), BED_RAIL_TOP_M, h, { colour: 0xe6e0d0 }); // the mattress and its sheet
  // Blanket: wider than the mattress so it drapes down the sides, a lighter cuff folded back at the top edge.
  // A blanket with a colour of its own (burgundy or deep green), so it reads against the pale sheet and pillows.
  const wool = [0x8a3a46, 0x3f6a58, 0x6a4a7a][seed % 3] ?? c;
  add(R(-0.05, L + 0.05, blanketFrom, D + 0.03), h - 0.2, h + 0.07, { colour: shade(wool, 1.0) });
  add(R(-0.05, L + 0.05, blanketFrom, blanketFrom + 0.24), h + 0.07, h + 0.12, {
    colour: shade(wool, 1.3),
    noAo: true,
  });
  // Two plump pillows with a gap between, lying on the sheet at the head.
  const half = (L - 0.3) / 2;
  add(R(0.1, 0.1 + half, 0.16, 0.16 + ph), h, h + 0.26, { colour: 0xf2ecdc, top: 0xfaf4e6, noAo: true });
  add(R(0.2 + half, L - 0.1, 0.16, 0.16 + ph), h, h + 0.26, { colour: 0xeae4d4, top: 0xf6f0e2, noAo: true });
  drawSorted(B, parts);
  // Details on the blanket's top: wrinkles from a lumpy sleeper, a dent in each pillow, an old stain.
  const pt = (a: number, p: number, z: number) => {
    const r = R(a, a, p, p);
    return iso(r[0], r[1], z);
  };
  for (let i = 0; i < 5; i++) {
    const a0 = L * (0.12 + 0.18 * i);
    const p0 = blanketFrom + 0.3 + (D - blanketFrom - 0.5) * hash2(seed, i);
    const s0 = pt(a0, p0, h + 0.075);
    const s1 = pt(a0 + 0.35, p0 + 0.18, h + 0.075);
    g.moveTo(s0.x, s0.y)
      .lineTo(s1.x, s1.y)
      .stroke({ width: 0.012, color: i % 2 ? 0x000000 : 0xffffff, alpha: i % 2 ? 0.2 : 0.13 });
  }
  for (const [a0, a1] of [
    [0.1, 0.1 + half],
    [0.2 + half, L - 0.1],
  ] as const) {
    const m = pt((a0 + a1) / 2, 0.16 + ph / 2, h + 0.26);
    g.ellipse(m.x, m.y, (a1 - a0) * 0.22, 0.06).fill({ color: 0x000000, alpha: 0.12 });
  }
  const st = pt(L * 0.55, D * 0.62, h + 0.08);
  g.ellipse(st.x, st.y, 0.3 + 0.05 * (seed % 3), 0.11).fill({ color: 0x3a1a14, alpha: 0.4 });
}

/** A hanging drape: folds as shaded vertical bands, ragged at the foot. */
function drape(g: Graphics, f: FurnitureDef, seed: number): void {
  const w = f.x1 - f.x0;
  const d = f.y1 - f.y0;
  const alongX = w >= d;
  const front = alongX ? face.left(f.y1) : face.right(f.x1);
  const [a0, a1] = alongX ? [f.x0, f.x1] : [f.y0, f.y1];
  const base = aged(f.colour);
  const n = Math.max(4, Math.round((a1 - a0) / 0.1));
  for (let i = 0; i < n; i++) {
    const u0 = a0 + ((a1 - a0) / n) * i;
    const u1 = a0 + ((a1 - a0) / n) * (i + 1);
    const foot = 0.04 + hash2(i, seed) * 0.14;
    faceQuad(g, front, u0, foot, u1, f.heightM).fill({ color: shade(base, 0.72 + 0.42 * ((i % 3) / 2)), alpha: 0.95 });
  }
  faceQuad(g, front, a0, f.heightM - 0.05, a1, f.heightM).fill(0x2a2620); // the rod
  if (alongX) isoBlock(g, f.x0, f.y0, f.x1, f.y1, f.heightM - 0.04, f.heightM, { colour: 0x2a2620, edge: 0.2 });
}

function bush(g: Graphics, f: FurnitureDef, seed: number): void {
  const cx = (f.x0 + f.x1) / 2;
  const cy = (f.y0 + f.y1) / 2;
  const top = iso(cx, cy, f.heightM * 0.5);
  const r = Math.max(f.x1 - f.x0, f.y1 - f.y0) * 0.55;
  g.ellipse(top.x + 0.1, top.y + 0.2, r, r * 0.45).fill({ color: 0x000000, alpha: 0.18 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + seed;
    g.ellipse(top.x + Math.cos(a) * r * 0.45, top.y + Math.sin(a) * r * 0.2 - 0.1, r * 0.6, r * 0.5).fill({
      color: shade(0x2a4a30, 0.6 + 0.1 * (i % 4)),
      alpha: 0.97,
    });
  }
  g.ellipse(top.x - r * 0.1, top.y - r * 0.4, r * 0.5, r * 0.35).fill({ color: shade(0x2a4a30, 0.95), alpha: 0.95 });
}

function tree(g: Graphics, f: FurnitureDef, seed: number): void {
  const cx = (f.x0 + f.x1) / 2;
  const cy = (f.y0 + f.y1) / 2;
  isoBlock(g, f.x0 + 0.1, f.y0 + 0.1, f.x1 - 0.1, f.y1 - 0.1, 0, 2.4, { colour: aged(0x5a4630), edge: 0.35 });
  const top = iso(cx, cy, f.heightM - 0.4);
  // A bare, heavy crown: dark clumps with gaps, so it reads as dead and menacing.
  for (const [dx, dy, r, k] of [
    [0, 0, 1.6, 0.55],
    [-1, 0.2, 1.1, 0.5],
    [1, 0.1, 1.1, 0.6],
    [0, -0.6, 1.0, 0.65],
    [-0.4, 0.5, 0.8, 0.5],
  ] as const)
    g.ellipse(top.x + dx, top.y + dy * 0.6, r, r * 0.75).fill({
      color: shade(0x2a4430, k + 0.1 * hash2(dx, seed)),
      alpha: 0.94,
    });
}

function car(f: FurnitureDef, B: Blk): void {
  const h = f.heightM;
  const alongX = f.x1 - f.x0 >= f.y1 - f.y0;
  const R = (a0: number, a1: number, p0: number, p1: number, z0: number, z1: number, colour: number) =>
    alongX
      ? B(f.x0 + a0, f.y0 + p0, f.x0 + a1, f.y0 + p1, z0, z1, { colour })
      : B(f.x0 + p0, f.y0 + a0, f.x0 + p1, f.y0 + a1, z0, z1, { colour });
  const L = alongX ? f.x1 - f.x0 : f.y1 - f.y0;
  const D = alongX ? f.y1 - f.y0 : f.x1 - f.x0;
  R(0, L, 0.05, D - 0.05, 0.25, h * 0.6, f.colour); // an old, dull, dusty body
  R(L * 0.22, L * 0.72, 0.12, D - 0.12, h * 0.6, h, shade(f.colour, 0.8));
  R(L * 0.24, L * 0.7, 0.1, D - 0.1, h * 0.62, h - 0.05, 0x1c2630); // glass
  for (const a of [0.12, L - 0.62]) for (const p of [0.02, D - 0.22]) R(a, a + 0.5, p, p + 0.2, 0, 0.5, 0x15171a); // wheels
}

/** Wear that makes any solid piece look old: dust on the top, scratches and a stain on the visible sides, a cobweb on tall ones. */
function wear(g: Graphics, f: FurnitureDef, seed: number): void {
  const w = f.x1 - f.x0;
  const d = f.y1 - f.y0;
  const h = f.heightM;
  // Dust sheen across the top.
  faceQuad(g, face.top(h + 0.002), f.x0, f.y0, f.x1, f.y1).fill({ color: 0xd8d0c0, alpha: 0.06 });
  // Scratches on the camera-facing side.
  const front = w >= d ? face.left(f.y1) : face.right(f.x1);
  const [a0, a1] = w >= d ? [f.x0, f.x1] : [f.y0, f.y1];
  for (let i = 0; i < 3; i++) {
    const u = a0 + (a1 - a0) * (0.15 + 0.7 * hash2(i, seed));
    const v = h * (0.15 + 0.6 * hash2(i + 5, seed));
    const p = front(u, v);
    const q = front(u + 0.12 + 0.1 * hash2(i + 9, seed), v - 0.08 - 0.1 * hash2(i + 3, seed));
    g.moveTo(p.x, p.y).lineTo(q.x, q.y).stroke({ width: 0.008, color: 0xf0e8d8, alpha: 0.16 });
  }
  // A damp stain creeping up from the foot.
  const s0 = a0 + (a1 - a0) * hash2(seed, 2) * 0.6;
  faceQuad(g, front, s0, 0, s0 + 0.35, h * 0.22 + 0.04).fill({ color: 0x1a140e, alpha: 0.13 });
  // A cobweb in the near top corner of tall pieces.
  if (h >= 1.2) {
    const corner = front(a0 + 0.02, h - 0.02);
    for (let k = 0; k < 4; k++) {
      const e = front(a0 + 0.02 + 0.07 * (k + 1), h - 0.02 - 0.16 + 0.03 * k);
      g.moveTo(corner.x, corner.y).lineTo(e.x, e.y).stroke({ width: 0.005, color: 0xe8e8e0, alpha: 0.4 });
    }
    for (const r of [0.1, 0.18]) {
      const p0 = front(a0 + 0.02 + r, h - 0.02);
      const p1 = front(a0 + 0.02 + r * 0.6, h - 0.02 - r * 0.9);
      const p2 = front(a0 + 0.02, h - 0.02 - r);
      g.moveTo(p0.x, p0.y).lineTo(p1.x, p1.y).lineTo(p2.x, p2.y).stroke({ width: 0.004, color: 0xe8e8e0, alpha: 0.32 });
    }
  }
}
