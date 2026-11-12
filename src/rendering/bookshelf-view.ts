import type { Graphics } from 'pixi.js';
import type { PropPlacement } from '../data/objects/props';
import { isoBlock, shade } from './iso-draw';
import { iso } from './projection';

/**
 * The bookshelf, premium redesign (owner, 13/11/2026: the visual-redesign prototype, after the
 * owner's reference images 2 and 3). A built piece of cabinetry rather than a painted box:
 * - carcass: side panels and shelves of real thickness, a back panel set in, a moulded cornice
 *   overhanging the top and a recessed plinth at the foot;
 * - each compartment is a real recess: the back panel and the inner side wall are in shade, the
 *   shelf surface catches light at the front and darkens toward the back, and the shelf above
 *   throws a soft shadow;
 * - books are little 3D blocks (spine, side, top) in varied heights, widths and colours with
 *   spine bands, some leaning, some lying in stacks, with a few objects (a box file, a plant pot,
 *   a trophy);
 * - warm walnut with grain on the outer side and the top, bevel highlights on lit edges, contact
 *   shadows and ambient occlusion at the floor.
 * Only the drawing changed: size, collision, climbing, damage and every behaviour are the prop's.
 * Coordinates: world metres about the footprint's centre (like every prop view).
 */
const WOOD = {
  base: 0x8a5a34,
  lit: 0xb07a4a,
  dark: 0x5a3720,
  grain: 0x6b4228,
  edge: 0x2a170c,
  inner: 0x3b2516,
} as const;
const BOOKS = [0xb23a32, 0x2f5f8f, 0xd7a535, 0x3f7a4e, 0x6d4a96, 0xcf6a2c, 0x264556, 0x8c2f4a, 0x56763a, 0xe6dcc4];

type P = { x: number; y: number };
const flat = (ps: P[]): number[] => ps.flatMap((p) => [p.x, p.y]);

/** A tiny deterministic random sequence for this shelf (the same books every time). */
function seeded(seed: number): () => number {
  let s = (Math.floor(seed * 9973) ^ 0x5bd1e995) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function drawBookshelf(
  g: Graphics,
  p: PropPlacement,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  h: number,
): void {
  const facing = p.facing ?? (x1 - x0 >= y1 - y0 ? 's' : 'e');
  // Front axis: `a` runs along the front, `dp` is depth from the front face into the shelf.
  const alongX = facing === 's' || facing === 'n';
  const a0 = alongX ? x0 : y0;
  const a1 = alongX ? x1 : y1;
  const depth = alongX ? y1 - y0 : x1 - x0;
  const at = (a: number, dp: number, z: number): P => {
    if (facing === 's') return iso(a, y1 - dp, z);
    if (facing === 'e') return iso(x1 - dp, a, z);
    if (facing === 'n') return iso(a, y0 + dp, z);
    return iso(x0 + dp, a, z);
  };
  const quad = (pts: P[], colour: number, alpha = 1) => g.poly(flat(pts)).fill({ color: colour, alpha });
  const line = (a: P, b: P, width: number, colour: number, alpha = 1) =>
    g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width, color: colour, alpha, cap: 'round' });

  const T = 0.04; // board thickness
  const plinth = 0.1;
  const cornice = 0.07;
  const top = h;
  const shelfTops = [plinth + T, 0.57, 1.03, 1.49]; // the surfaces the books stand on
  const roofUnder = top - cornice; // underside of the top board

  // 1. The carcass as a solid block (so the back, sides and top read even where details are not
  //    drawn), then the outer side and top re-dressed with grain.
  isoBlock(g, x0, y0, x1, y1, 0, top - cornice, { colour: WOOD.base, edge: 0.6 });
  // Cornice: a slightly larger board on top, with a moulded lit lip.
  const over = 0.025;
  isoBlock(g, x0 - over, y0 - over, x1 + over, y1 + over, top - cornice, top, {
    colour: WOOD.lit,
    top: shade(WOOD.lit, 1.08),
    edge: 0.7,
    noAo: true,
  });
  const rnd = seeded(p.x * 31 + p.y * 17);
  // Grain along the top and down the visible outer side.
  for (let i = 0; i < 7; i++) {
    const dp = (i + 0.5) * (depth / 7) + (rnd() - 0.5) * 0.02;
    const wob = (rnd() - 0.5) * 0.03;
    line(at(a0 + 0.04, dp, top + 0.001), at((a0 + a1) / 2, dp + wob, top + 0.001), 0.006, WOOD.grain, 0.35);
    line(at((a0 + a1) / 2, dp + wob, top + 0.001), at(a1 - 0.04, dp, top + 0.001), 0.006, WOOD.grain, 0.35);
  }
  if (facing === 's' || facing === 'e') {
    // The outer end panel the camera sees (right side for 's', left/front side for 'e').
    const endA = facing === 's' ? a1 : a1;
    for (let i = 0; i < 6; i++) {
      const dp = (i + 0.5) * (depth / 6);
      const sway = (rnd() - 0.5) * 0.04;
      const pts: P[] = [];
      for (let z = 0.12; z <= top - cornice - 0.02; z += 0.25)
        pts.push(at(endA, dp + Math.sin(z * 6 + i) * 0.01 + sway, z));
      g.moveTo(pts[0]!.x, pts[0]!.y);
      for (const q of pts.slice(1)) g.lineTo(q.x, q.y);
      g.stroke({ width: 0.005, color: WOOD.dark, alpha: 0.35 });
    }
    // A soft vertical light falloff down the end panel.
    quad([at(endA, 0, 0), at(endA, depth, 0), at(endA, depth, 0.6), at(endA, 0, 0.6)], 0x000000, 0.12);
  } else {
    // Back to the camera: the back panel of tongue-and-groove boards.
    for (let a = a0 + 0.16; a < a1 - 0.05; a += 0.16)
      line(at(a, depth, 0.05), at(a, depth, top - cornice - 0.02), 0.008, WOOD.edge, 0.45);
    return;
  }

  // 2. Each compartment: a recess with a back panel, the visible inner wall, the shelf surface.
  const inner0 = a0 + T;
  const inner1 = a1 - T;
  const back = depth - 0.03;
  const levels = [...shelfTops, roofUnder];
  for (let i = 0; i < shelfTops.length; i++) {
    const zb = levels[i]!;
    const zt = levels[i + 1]! - (i + 1 < shelfTops.length ? T : 0);
    // Back panel (deep shade, a little lighter at the top where light falls in).
    quad([at(inner0, back, zb), at(inner1, back, zb), at(inner1, back, zt), at(inner0, back, zt)], WOOD.inner);
    quad(
      [
        at(inner0, back, zb),
        at(inner1, back, zb),
        at(inner1, back, zb + (zt - zb) * 0.45),
        at(inner0, back, zb + (zt - zb) * 0.45),
      ],
      0x000000,
      0.25,
    );
    // The inner face of the near-left side panel (the camera sees it).
    quad([at(inner0, 0, zb), at(inner0, back, zb), at(inner0, back, zt), at(inner0, 0, zt)], shade(WOOD.base, 0.62));
    // Shelf surface: lit at the front, darker toward the back.
    quad([at(inner0, 0, zb), at(inner1, 0, zb), at(inner1, back, zb), at(inner0, back, zb)], shade(WOOD.lit, 0.95));
    quad(
      [at(inner0, back * 0.55, zb), at(inner1, back * 0.55, zb), at(inner1, back, zb), at(inner0, back, zb)],
      0x000000,
      0.22,
    );
    // Shadow thrown by the shelf above across the back panel.
    quad(
      [at(inner0, back, zt - 0.05), at(inner1, back, zt - 0.05), at(inner1, back, zt), at(inner0, back, zt)],
      0x000000,
      0.35,
    );
    books(zb, zt - 0.03, i);
  }

  // 3. The front frame over the recesses: side stiles, shelf fronts, the plinth.
  const frontBoard = (aa0: number, aa1: number, z0: number, z1: number, colour: number) => {
    quad([at(aa0, 0, z0), at(aa1, 0, z0), at(aa1, 0, z1), at(aa0, 0, z1)], colour);
    line(at(aa0, 0, z1), at(aa1, 0, z1), 0.012, 0xffffff, 0.3); // lit top edge
    g.poly(flat([at(aa0, 0, z0), at(aa1, 0, z0), at(aa1, 0, z1), at(aa0, 0, z1)])).stroke({
      width: 0.012,
      color: WOOD.edge,
      alpha: 0.6,
    });
  };
  frontBoard(a0, inner0, 0, top - cornice, shade(WOOD.base, 1.02));
  frontBoard(inner1, a1, 0, top - cornice, shade(WOOD.base, 0.94));
  for (const z of shelfTops.slice(1)) frontBoard(inner0, inner1, z - T, z, shade(WOOD.lit, 0.98));
  frontBoard(inner0, inner1, roofUnder - T, roofUnder, shade(WOOD.lit, 0.98));
  // Plinth: recessed a little, darker, with the bottom shelf's lip over it.
  quad(
    [at(inner0, 0.02, 0), at(inner1, 0.02, 0), at(inner1, 0.02, plinth), at(inner0, 0.02, plinth)],
    shade(WOOD.base, 0.55),
  );
  frontBoard(inner0, inner1, plinth, plinth + T, shade(WOOD.lit, 0.98));
  // Ambient occlusion at the floor line.
  quad([at(a0, 0, 0), at(a1, 0, 0), at(a1, 0, 0.05), at(a0, 0, 0.05)], 0x000000, 0.25);

  /** Fill one shelf from z0 (its surface) up to z1 (the clear height). */
  function books(z0: number, z1: number, shelf: number): void {
    const clear = z1 - z0;
    let a = inner0 + 0.02;
    const end = inner1 - 0.02;
    // Each shelf gets one feature (an object or a lying stack) somewhere along it.
    const featureAt = inner0 + (0.25 + rnd() * 0.5) * (inner1 - inner0);
    let featured = false;
    while (a < end - 0.03) {
      if (!featured && a > featureAt) {
        featured = true;
        const kind = shelf % 3;
        if (kind === 0) {
          // A stack of books lying flat.
          let z = z0;
          for (let k = 0; k < 3 + Math.floor(rnd() * 2); k++) {
            const bw = 0.2 + rnd() * 0.06;
            const bh = 0.035 + rnd() * 0.015;
            const c = BOOKS[Math.floor(rnd() * BOOKS.length)]!;
            block(a + (rnd() - 0.5) * 0.02, a + bw, back - 0.24, back - 0.02, z, z + bh, c);
            z += bh;
          }
          a += 0.26;
        } else if (kind === 1) {
          // A small potted plant.
          block(a, a + 0.12, back - 0.16, back - 0.04, z0, z0 + 0.1, 0xd9d4c8);
          for (let k = 0; k < 5; k++) {
            const lx = a + 0.06 + (k - 2) * 0.025;
            const tip = at(lx + (k - 2) * 0.02, back - 0.1, z0 + 0.1 + 0.08 + rnd() * 0.08);
            const base = at(lx, back - 0.1, z0 + 0.1);
            g.moveTo(base.x, base.y)
              .lineTo(tip.x, tip.y)
              .stroke({ width: 0.03, color: k % 2 ? 0x3f8a46 : 0x5aa85a, cap: 'round' });
          }
          a += 0.18;
        } else {
          // A small gold trophy.
          block(a + 0.02, a + 0.1, back - 0.14, back - 0.06, z0, z0 + 0.04, 0x3a2a1c);
          block(a + 0.05, a + 0.07, back - 0.11, back - 0.09, z0 + 0.04, z0 + 0.1, 0xd9a531);
          block(a + 0.025, a + 0.095, back - 0.135, back - 0.065, z0 + 0.1, z0 + 0.17, 0xe8b93c);
          a += 0.15;
        }
        continue;
      }
      const bw = 0.03 + rnd() * 0.025;
      const bh = Math.min(clear, clear * (0.6 + rnd() * 0.32));
      const bd = 0.17 + rnd() * 0.05;
      const c = BOOKS[Math.floor(rnd() * BOOKS.length)]!;
      if (rnd() < 0.08 && a + bh < end) {
        // The odd book leaning on its neighbour.
        lean(a, bw, bd, bh, z0, c);
        a += bh * 0.55 + bw;
        continue;
      }
      block(a, a + bw, back - bd, back, z0, z0 + bh, c);
      // Spine bands (gold or dark) near the top and bottom.
      const band = rnd() < 0.5 ? 0xe8c46a : shade(c, 0.55);
      for (const k of [0.12, 0.82]) {
        const z = z0 + bh * k;
        line(at(a + 0.004, back - bd, z), at(a + bw - 0.004, back - bd, z), 0.008, band, 0.85);
      }
      a += bw + (rnd() < 0.15 ? 0.012 : 0.002);
    }
  }

  /** A small box between a0..a1 along the front, dp0..dp1 deep, z0..z1 high. */
  function block(aa0: number, aa1: number, dp0: number, dp1: number, z0: number, z1: number, colour: number): void {
    const front = [at(aa0, dp0, z0), at(aa1, dp0, z0), at(aa1, dp0, z1), at(aa0, dp0, z1)];
    const side = [at(aa1, dp0, z0), at(aa1, dp1, z0), at(aa1, dp1, z1), at(aa1, dp0, z1)];
    const lid = [at(aa0, dp0, z1), at(aa1, dp0, z1), at(aa1, dp1, z1), at(aa0, dp1, z1)];
    quad(side, shade(colour, 0.62));
    quad(front, shade(colour, 0.92));
    quad(lid, shade(colour, 1.12));
    g.poly(flat(front)).stroke({ width: 0.006, color: 0x1a120a, alpha: 0.5 });
    line(front[3]!, front[2]!, 0.006, 0xffffff, 0.25);
  }

  /** A book leaning over to the right, resting on the next one. */
  function lean(aa: number, bw: number, bd: number, bh: number, z0: number, colour: number): void {
    const tilt = 0.55; // how far the top is pushed over, in book heights
    const f0 = at(aa, back - bd, z0);
    const f1 = at(aa + bw, back - bd, z0);
    const f2 = at(aa + bw + bh * tilt, back - bd, z0 + bh * 0.84);
    const f3 = at(aa + bh * tilt, back - bd, z0 + bh * 0.84);
    const s2 = at(aa + bw + bh * tilt, back, z0 + bh * 0.84);
    const s1 = at(aa + bw, back, z0);
    quad([f1, s1, s2, f2], shade(colour, 0.62));
    quad([f0, f1, f2, f3], shade(colour, 0.92));
    g.poly(flat([f0, f1, f2, f3])).stroke({ width: 0.006, color: 0x1a120a, alpha: 0.5 });
  }
}
