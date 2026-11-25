import { Container, Graphics } from 'pixi.js';
import { footprint, kindOf, PROP_KINDS, type PropPlacement } from '../data/objects/props';
import type { FurnitureDef } from '../modes/hide-seek/house-types';
import { drawBookshelf } from './bookshelf-view';
import { drawHouseRug, drawInto } from './house-furniture';
import { face, faceQuad, isoBlock, isoCylinder, isoShadow, shade, withMaterial } from './iso-draw';
import { ISO_T, iso } from './projection';

/**
 * Office and test props in the 2.5D style (TD-045, owner-approved mockups): bevelled blocks lit
 * from the top-left, soft shadows, ambient occlusion and a few crisp details on the faces the
 * camera sees. Original designs. Origin = centre of the footprint on the floor; a node is placed
 * at its projected centre. GREYBOX art until the art pass (Phase 8), but in the final style.
 */
const DARK = 0x2a2d33;

/** Leg posts under a raised top (tables, desks). */
function legs(g: Graphics, w: number, d: number, h: number, colour: number, inset = 0.05, size = 0.05): void {
  // Back legs first, then front, so the front ones overlap.
  for (const [lx, ly] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ] as const) {
    const cx = lx * (w / 2 - inset - size / 2);
    const cy = ly * (d / 2 - inset - size / 2);
    isoBlock(g, cx - size / 2, cy - size / 2, cx + size / 2, cy + size / 2, 0, h, { colour, edge: 0.25 });
  }
}

/**
 * The face its front shows on, if the camera can see it (the +y and +x faces), as a face mapper and
 * the span along it; null when the front faces away (n or w): then we see the back, which stays plain.
 */
function frontOf(
  p: PropPlacement,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): { at: (u: number, v: number) => { x: number; y: number }; a0: number; a1: number } | null {
  const facing = p.facing ?? (x1 - x0 >= y1 - y0 ? 's' : 'e');
  if (facing === 's') return { at: face.left(y1), a0: x0, a1: x1 };
  if (facing === 'e') return { at: face.right(x1), a0: y0, a1: y1 };
  return null;
}

/** For a chair: the box its backrest occupies (the side opposite where it faces). */
function backrestBox(
  facing: 'n' | 's' | 'e' | 'w',
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  t: number,
): [number, number, number, number] {
  if (facing === 's') return [x0, y0, x1, y0 + t];
  if (facing === 'n') return [x0, y1 - t, x1, y1];
  if (facing === 'e') return [x0, y0, x0 + t, y1];
  return [x1 - t, y0, x1, y1];
}

/** A small seeded random generator, so every prop of a kind weathers the same way. */
function texRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type FaceAt = (u: number, v: number) => { x: number; y: number };

/** Surface texture on a face: grit and pitting (tiny dark and light flecks), pale chips and the odd stain. */
function speckle(
  g: Graphics,
  at: FaceAt,
  u0: number,
  v0: number,
  u1: number,
  v1: number,
  n: number,
  seed: number,
  dark = 0x3b3326,
  light = 0xfff3d6,
): void {
  const r = texRng(seed);
  for (let i = 0; i < n; i++) {
    const q = at(u0 + r() * (u1 - u0), v0 + r() * (v1 - v0));
    const size = 0.008 + r() * 0.02;
    const pale = r() < 0.4;
    g.circle(q.x, q.y, size).fill({ color: pale ? light : dark, alpha: pale ? 0.35 : 0.3 + r() * 0.25 });
  }
}

/** Long thin streaks along a face (wood grain, weathering streaks), slightly wavering. */
function streaks(
  g: Graphics,
  at: FaceAt,
  u0: number,
  v0: number,
  u1: number,
  v1: number,
  n: number,
  seed: number,
  colour: number,
  alpha = 0.35,
): void {
  const r = texRng(seed);
  for (let i = 0; i < n; i++) {
    const v = v0 + r() * (v1 - v0);
    const a = u0 + r() * (u1 - u0) * 0.5;
    const b = Math.min(u1, a + (u1 - u0) * (0.25 + r() * 0.5));
    const p0 = at(a, v);
    const p1 = at((a + b) / 2, v + (r() - 0.5) * 0.03);
    const p2 = at(b, v + (r() - 0.5) * 0.02);
    g.moveTo(p0.x, p0.y)
      .quadraticCurveTo(p1.x, p1.y, p2.x, p2.y)
      .stroke({ width: 0.007 + r() * 0.008, color: colour, alpha: alpha * (0.5 + r()) });
  }
}

/** A crack or vein wandering across a face. */
function vein(
  g: Graphics,
  at: FaceAt,
  u: number,
  v: number,
  len: number,
  seed: number,
  colour: number,
  width = 0.012,
  alpha = 0.7,
): void {
  const r = texRng(seed);
  let cu = u;
  let cv = v;
  const p = at(cu, cv);
  g.moveTo(p.x, p.y);
  for (let i = 0; i < 6; i++) {
    cu += (len / 6) * (0.6 + r() * 0.8);
    cv += (r() - 0.5) * len * 0.5;
    const q = at(cu, cv);
    g.lineTo(q.x, q.y);
  }
  g.stroke({ width, color: colour, alpha, join: 'round' });
}

/** Dirt and damp gathered along the foot of a face, and a few pale scuffs higher up. */
function grime(g: Graphics, at: FaceAt, u0: number, u1: number, height: number, seed: number): void {
  const r = texRng(seed);
  const strip = [at(u0, 0), at(u1, 0), at(u1, height * 0.22), at(u0, height * 0.28)];
  g.poly(strip.flatMap((q) => [q.x, q.y])).fill({ color: 0x2c2417, alpha: 0.28 });
  for (let i = 0; i < 3; i++) {
    const a = u0 + r() * (u1 - u0);
    const p0 = at(a, height * (0.4 + r() * 0.4));
    const p1 = at(a + (u1 - u0) * 0.1, height * (0.4 + r() * 0.4) - 0.04);
    g.moveTo(p0.x, p0.y).lineTo(p1.x, p1.y).stroke({ width: 0.012, color: 0xfff3d6, alpha: 0.28 });
  }
}

/** A patch of moss or lichen on a face, low down and in a corner. */
function moss(g: Graphics, at: FaceAt, u: number, v: number, size: number, seed: number): void {
  const r = texRng(seed);
  for (let i = 0; i < 9; i++) {
    const q = at(u + (r() - 0.5) * size, v + (r() - 0.5) * size * 0.6);
    g.circle(q.x, q.y, 0.012 + r() * 0.025).fill({ color: r() < 0.5 ? 0x6b7b45 : 0x55663a, alpha: 0.5 });
  }
}

/** Stone: grit and pitting on the lit faces and the top, a vein, grime at the foot, moss in a corner. */
function weatherBlock(
  g: Graphics,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  h: number,
  seed: number,
  mossy = true,
): void {
  const left = face.left(y1);
  const right = face.right(x1);
  const top = face.top(h);
  speckle(g, left, x0, 0.03, x1, h - 0.02, Math.round(60 * (x1 - x0) * h) + 14, seed);
  speckle(g, right, y0, 0.03, y1, h - 0.02, Math.round(60 * (y1 - y0) * h) + 10, seed + 1);
  speckle(g, top, x0, y0, x1, y1, Math.round(50 * (x1 - x0) * (y1 - y0)) + 10, seed + 2);
  streaks(g, left, x0, 0.05, x1, h - 0.03, 5, seed + 3, 0x8e8061, 0.35);
  vein(g, left, x0 + (x1 - x0) * 0.2, h * 0.7, (x1 - x0) * 0.5, seed + 4, 0x5d5546, 0.012, 0.6);
  grime(g, left, x0, x1, h, seed + 5);
  grime(g, right, y0, y1, h, seed + 6);
  if (mossy) moss(g, left, x0 + 0.1, 0.07, 0.25, seed + 7);
}

export function buildPropView(p: PropPlacement): Container {
  const { w, d, h } = footprint(p);
  const z = p.elevationM ?? 0;
  const x0 = -w / 2;
  const y0 = -d / 2;
  const x1 = w / 2;
  const y1 = d / 2;
  const root = new Container();
  root.label = `prop-${p.kind}`;
  const g = new Graphics();
  root.addChild(g);
  const kind = kindOf(p.kind);
  if (p.house && kind.decal) {
    // The house's own rug, in plain floor metres.
    drawHouseRug(g, { x0, y0, x1, y1, colour: p.house.colour }, (x, y) => ({ x, y }), 1);
    root.position.set(p.x, p.y);
    return root;
  }
  if (p.house) {
    // A piece of the Hide and Seek house's furniture, drawn with the house's own art around the prop's centre.
    const piece: FurnitureDef = {
      id: p.house.id,
      kind: p.house.kind as FurnitureDef['kind'],
      floor: 0,
      x0,
      y0,
      x1,
      y1,
      heightM: h,
      solid: kind.solid,
      blocksSight: false,
      colour: p.house.colour,
    };
    drawInto(g, piece, [], [], p.facing);
    const at = iso(p.x, p.y);
    root.position.set(at.x, at.y);
    return root;
  }
  if (kind.decal) {
    // Decals are drawn in floor space (inside the floor layer): plain world metres.
    g.roundRect(x0, y0, w, d, 0.15).fill(0x7a2632).stroke({ width: 0.08, color: 0xc9a227 });
    g.roundRect(x0 + 0.3, y0 + 0.3, w - 0.6, d - 0.6, 0.1).stroke({ width: 0.04, color: 0xd8b25a });
    root.position.set(p.x, p.y);
    return root;
  }
  if (z === 0) isoShadow(g, x0, y0, x1, y1, h);
  // Every block of this prop is finished in its own material (premium style, owner 13/11/2026).
  withMaterial(kind.material, () => drawKind(g, p, x0, y0, x1, y1, w, d, h, z));
  const at = iso(p.x, p.y);
  root.position.set(at.x, at.y);
  return root;
}

function drawKind(
  g: Graphics,
  p: PropPlacement,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  w: number,
  d: number,
  h: number,
  z: number,
): void {
  switch (p.kind) {
    case 'pillar':
      isoBlock(g, x0, y0, x1, y1, 0, h, { colour: 0xd9d4cc });
      break;
    case 'desk': {
      // Brushed-steel legs, a laminate top with a dark edge band and a desk mat.
      withMaterial('metal', () => legs(g, w, d, h - 0.05, 0x5a606a));
      isoBlock(g, x0, y0, x1, y1, h - 0.05, h, { colour: 0xf2efe9, noAo: true });
      faceQuad(g, face.left(y1), x0, h - 0.05, x1, h - 0.035).fill({ color: 0x3a3e45, alpha: 0.55 });
      faceQuad(g, face.right(x1), y0, h - 0.05, y1, h - 0.035).fill({ color: 0x3a3e45, alpha: 0.45 });
      if (w > 0.8 && d > 0.5)
        faceQuad(g, face.top(h + 0.001), x0 + w * 0.25, y0 + d * 0.45, x1 - w * 0.2, y1 - 0.08).fill({
          color: 0x2f3440,
          alpha: 0.18,
        });
      break;
    }
    case 'meeting-table':
      isoBlock(g, -0.12, -0.12, 0.12, 0.12, 0, h - 0.06, { colour: 0x3e3f44 });
      isoBlock(g, x0, y0, x1, y1, h - 0.06, h, { colour: 0xf4f1ec, noAo: true });
      break;
    case 'office-chair': {
      // Five-star base, gas lift, seat and a see-through mesh back.
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + 0.3;
        const c = iso(0, 0, 0.08);
        const e = iso(Math.cos(a) * 0.26, Math.sin(a) * 0.26, 0.04);
        g.moveTo(c.x, c.y).lineTo(e.x, e.y).stroke({ width: 0.04, color: DARK, cap: 'round' });
        g.circle(e.x, e.y + 0.02, 0.025).fill(0x15171a);
      }
      isoCylinder(g, 0, 0, 0.08, 0.03, 0.34, 0x9aa0a8);
      isoBlock(g, -0.24, -0.22, 0.24, 0.22, 0.42, 0.5, { colour: 0x3b3f46 });
      // The mesh back stands on the side away from where the chair faces (its desk or table).
      const facing = p.facing ?? 's';
      const along = facing === 'n' || facing === 's';
      const back = along ? face.left(facing === 's' ? -0.2 : 0.2) : face.right(facing === 'e' ? -0.2 : 0.2);
      faceQuad(g, back, -0.24, 0.52, 0.24, 1.0)
        .fill({ color: 0x2a2e36, alpha: 0.75 })
        .stroke({ width: 0.03, color: 0x1c1f24 });
      for (let i = 1; i < 6; i++) {
        const u = -0.24 + i * 0.08;
        const a = back(u, 0.54);
        const b = back(u, 0.98);
        g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 0.008, color: 0x8a93a1, alpha: 0.6 });
      }
      break;
    }
    case 'computer': {
      isoBlock(g, -0.08, -0.05, 0.08, 0.05, z, z + 0.02, { colour: 0x3a3e45, noAo: true });
      isoBlock(g, -0.02, -0.02, 0.02, 0.02, z + 0.02, z + 0.14, { colour: 0x3a3e45, noAo: true });
      isoBlock(g, x0, -0.03, x1, 0.03, z + 0.12, z + h, { colour: 0x26292e, noAo: true });
      if (p.facing === 'n') {
        // Screen facing away: the monitor's back, a raised housing with vents, a cable down the stand.
        const back = face.left(0.03);
        isoBlock(g, x0 + 0.08, 0.03, x1 - 0.08, 0.07, z + 0.18, z + h - 0.06, { colour: 0x2e3238, noAo: true });
        for (let i = 0; i < 4; i++) {
          const vz = z + h - 0.12 - i * 0.025;
          faceQuad(g, face.left(0.07), x0 + 0.12, vz, x1 - 0.12, vz + 0.008).fill({ color: 0x15171b, alpha: 0.9 });
        }
        faceQuad(g, back, x0 + 0.02, z + h - 0.03, x1 - 0.02, z + h - 0.015).fill({ color: 0xffffff, alpha: 0.12 });
        const c0 = iso(0.01, 0.07, z + 0.18);
        const c1 = iso(0.03, 0.06, z + 0.01);
        g.moveTo(c0.x, c0.y)
          .quadraticCurveTo(c0.x + 0.04, (c0.y + c1.y) / 2, c1.x, c1.y)
          .stroke({ width: 0.012, color: 0x111316 });
        break;
      }
      // A thin bezel round a lit screen: a deep blue desktop, two app windows and a glare.
      const scr = face.left(0.03);
      const sx0 = x0 + 0.02;
      const sx1 = x1 - 0.02;
      const sz0 = z + 0.14;
      const sz1 = z + h - 0.02;
      faceQuad(g, scr, sx0, sz0, sx1, sz1).fill(0x2f6fb3);
      faceQuad(g, scr, sx0, sz0 + (sz1 - sz0) * 0.5, sx1, sz1).fill({ color: 0x5fb0ea, alpha: 0.55 });
      faceQuad(g, scr, sx0 + 0.03, sz0 + 0.04, sx0 + (sx1 - sx0) * 0.55, sz1 - 0.05).fill({
        color: 0xeef4fb,
        alpha: 0.9,
      });
      faceQuad(g, scr, sx0 + 0.03, sz1 - 0.08, sx0 + (sx1 - sx0) * 0.55, sz1 - 0.05).fill(0x3b4a5c);
      faceQuad(g, scr, sx0 + (sx1 - sx0) * 0.6, sz0 + 0.03, sx1 - 0.03, sz0 + (sz1 - sz0) * 0.6).fill({
        color: 0x1b2633,
        alpha: 0.85,
      });
      for (let i = 0; i < 3; i++) {
        const lz = sz1 - 0.12 - i * 0.04;
        faceQuad(g, scr, sx0 + 0.05, lz, sx0 + (sx1 - sx0) * (0.42 - i * 0.07), lz + 0.012).fill({
          color: 0x9aa7b8,
          alpha: 0.9,
        });
      }
      g.poly(
        [
          scr(sx0 + 0.02, sz1 - 0.02),
          scr(sx0 + 0.14, sz1 - 0.02),
          scr(sx0 + 0.04, sz0 + 0.06),
          scr(sx0 + 0.02, sz0 + 0.06),
        ].flatMap((q) => [q.x, q.y]),
      ).fill({
        color: 0xffffff,
        alpha: 0.18,
      });
      break;
    }
    case 'keyboard':
      isoBlock(g, x0, y0, x1, y1, z, z + h, { colour: 0xd9dbe0, noAo: true });
      break;
    case 'mouse':
      isoBlock(g, x0, y0, x1, y1, z, z + h, { colour: 0xd9dbe0, noAo: true });
      break;
    case 'coffee-cup':
      isoCylinder(g, 0, 0, z, w / 2, h, 0xe2643a);
      break;
    case 'cabinet': {
      isoBlock(g, x0, y0, x1, y1, 0, h, { colour: 0x9aa4b1 });
      const fr = frontOf(p, x0, y0, x1, y1);
      if (!fr) break; // facing into the room: we see its plain back
      const { at: front, a0, a1 } = fr;
      for (let i = 0; i < 4; i++) {
        const v0 = 0.06 + (i * (h - 0.1)) / 4;
        const v1 = v0 + (h - 0.1) / 4 - 0.04;
        // Each drawer front: a shadowed gap below, a lit top lip, a label slot and a recessed pull.
        faceQuad(g, front, a0 + 0.05, v0 - 0.02, a1 - 0.05, v0).fill({ color: 0x000000, alpha: 0.28 });
        faceQuad(g, front, a0 + 0.05, v0, a1 - 0.05, v1).stroke({ width: 0.012, color: 0x55606e, alpha: 0.8 });
        faceQuad(g, front, a0 + 0.05, v1 - 0.015, a1 - 0.05, v1).fill({ color: 0xffffff, alpha: 0.25 });
        const m = (a0 + a1) / 2;
        faceQuad(g, front, m - 0.08, v1 - 0.06, m + 0.08, v1 - 0.03).fill(0xe6eaef);
        faceQuad(g, front, m - 0.1, v1 - 0.14, m + 0.1, v1 - 0.1).fill(0x3a414c);
        faceQuad(g, front, m - 0.1, v1 - 0.105, m + 0.1, v1 - 0.095).fill({ color: 0xffffff, alpha: 0.45 });
      }
      break;
    }
    case 'drawer-unit': {
      isoBlock(g, x0, y0, x1, y1, 0, h, { colour: 0x8c96a3 });
      const front = face.right(x1);
      for (let i = 0; i < 3; i++) {
        const v1 = 0.05 + ((i + 1) * (h - 0.08)) / 3;
        const p = front(0, v1 - 0.05);
        g.moveTo(p.x - 0.05, p.y + 0.02)
          .lineTo(p.x + 0.05, p.y - 0.02)
          .stroke({ width: 0.02, color: 0xe6eaef });
      }
      break;
    }
    case 'glass-partition':
      isoBlock(g, x0, y0, x1, y1, 0, h, { colour: 0xbfe0ff, alpha: 0.3, edge: 0.6, noAo: true });
      isoBlock(g, x0, y0, x1, y1, h - 0.05, h, { colour: 0x8aa6c0 });
      break;
    case 'plant': {
      isoCylinder(g, 0, 0, 0, 0.2, 0.42, 0xf2efe9);
      const top = iso(0, 0, 0.42);
      g.ellipse(top.x, top.y, 0.16, 0.08).fill(0x5a3f2b);
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        const len = 0.4 + (i % 4) * 0.1;
        const lift = 0.5 + (i % 3) * 0.18;
        const tx = top.x + Math.cos(a) * len;
        const ty = top.y - lift + Math.sin(a) * len * 0.35;
        g.moveTo(top.x, top.y)
          .quadraticCurveTo(top.x + Math.cos(a) * len * 0.3 - 0.05, ty - 0.22, tx, ty)
          .quadraticCurveTo(top.x + Math.cos(a) * len * 0.3 + 0.05, ty - 0.1, top.x, top.y)
          .fill(i % 2 ? 0x3f8f4f : 0x56a85f);
      }
      break;
    }
    case 'water-dispenser': {
      isoBlock(g, x0, y0, x1, y1, 0, 0.95, { colour: 0xf1f2f4 });
      faceQuad(g, face.left(y1), x0 + 0.07, 0.6, x1 - 0.07, 0.78).fill(0xc9ccd2);
      isoCylinder(g, 0, 0, 0.95, 0.13, 0.4, 0x6fc0f0, 0.85);
      break;
    }
    case 'bin':
      isoCylinder(g, 0, 0, 0, w / 2, h, 0x4a525e);
      break;
    case 'printer': {
      isoBlock(g, x0, y0, x1, y1, 0, h - 0.25, { colour: 0x8a929e });
      isoBlock(g, x0 + 0.04, y0 + 0.04, x1 - 0.04, y1 - 0.04, h - 0.25, h, { colour: 0xe6e8eb });
      isoBlock(g, -0.2, y0 + 0.1, 0.2, y0 + 0.35, h, h + 0.02, { colour: 0xffffff, noAo: true }); // paper
      const pf = frontOf(p, x0, y0, x1, y1);
      if (pf) faceQuad(g, pf.at, pf.a0 + 0.08, 0.2, pf.a1 - 0.08, 0.3).fill(0x5c6470);
      break;
    }
    case 'cubicle-panel': {
      // A fabric panel in an aluminium frame: a base rail, end posts and a top cap; the odd note
      // pinned to the side we see.
      isoBlock(g, x0, y0, x1, y1, 0, h, { colour: 0x9aa3b4 });
      withMaterial('metal', () => {
        isoBlock(g, x0, y0, x1, y1, h - 0.04, h, { colour: 0xd6dbe2, noAo: true });
        isoBlock(g, x0, y0, x1, y1, 0, 0.06, { colour: 0x7b8392, noAo: true });
        const along = w >= d;
        const post = 0.04;
        if (along) {
          isoBlock(g, x0, y0, x0 + post, y1, 0, h, { colour: 0xc9ced6, noAo: true });
          isoBlock(g, x1 - post, y0, x1, y1, 0, h, { colour: 0xc9ced6, noAo: true });
        } else {
          isoBlock(g, x0, y0, x1, y0 + post, 0, h, { colour: 0xc9ced6, noAo: true });
          isoBlock(g, x0, y1 - post, x1, y1, 0, h, { colour: 0xc9ced6, noAo: true });
        }
      });
      const seed = Math.sin(p.x * 12.9898 + p.y * 78.233) * 43758.5453;
      const r = seed - Math.floor(seed);
      if (r < 0.45) {
        const along = w >= d;
        const at = along ? face.left(y1) : face.right(x1);
        const span0 = along ? x0 : y0;
        const span1 = along ? x1 : y1;
        const u = span0 + (span1 - span0) * (0.25 + r);
        const colours = [0xfff3a0, 0xffd1e0, 0xc8f0ff];
        faceQuad(g, at, u, h * 0.62, u + 0.12, h * 0.78).fill(colours[Math.floor(r * 30) % 3]!);
        const pin = at(u + 0.06, h * 0.76);
        g.circle(pin.x, pin.y, 0.012).fill(0xd8323a);
      }
      break;
    }
    case 'executive-desk': {
      isoBlock(g, x0, y0, x1, y1, 0, h - 0.05, { colour: 0x5b3322 });
      isoBlock(g, x0 - 0.02, y0 - 0.02, x1 + 0.02, y1 + 0.02, h - 0.05, h, { colour: 0x6e3f2a, noAo: true });
      faceQuad(g, face.top(h + 0.001), x0 + 0.15, y0 + 0.15, x1 - 0.15, y1 - 0.15).fill({
        color: 0x1f3b2c,
        alpha: 0.85,
      });
      break;
    }
    case 'boss-chair': {
      isoCylinder(g, 0, 0, 0.05, 0.04, 0.4, 0x222222);
      isoBlock(g, x0 + 0.05, y0 + 0.05, x1 - 0.05, y1 - 0.05, 0.42, 0.55, { colour: 0x3a231a });
      const [bx0, by0, bx1, by1] = backrestBox(p.facing ?? 's', x0 + 0.06, y0 + 0.06, x1 - 0.06, y1 - 0.06, 0.14);
      isoBlock(g, bx0, by0, bx1, by1, 0.55, 1.3, { colour: 0x3a231a });
      break;
    }
    case 'visitor-chair': {
      legs(g, w - 0.08, d - 0.08, 0.42, 0x4a2e1e, 0, 0.04);
      isoBlock(g, x0 + 0.04, y0 + 0.04, x1 - 0.04, y1 - 0.04, 0.42, 0.5, { colour: 0x8a2e2e, noAo: true });
      const [bx0, by0, bx1, by1] = backrestBox(p.facing ?? 's', x0 + 0.04, y0 + 0.04, x1 - 0.04, y1 - 0.04, 0.08);
      isoBlock(g, bx0, by0, bx1, by1, 0.5, 0.95, { colour: 0x6b4228, noAo: true });
      break;
    }
    case 'bookshelf':
      // Premium redesign prototype (owner, 13/11/2026): src/rendering/bookshelf-view.ts.
      drawBookshelf(g, p, x0, y0, x1, y1, h);
      break;
    case 'kitchen-counter': {
      isoBlock(g, x0, y0, x1, y1, 0, h - 0.05, { colour: 0xc89a66 });
      isoBlock(g, x0 - 0.02, y0, x1 + 0.02, y1 + 0.03, h - 0.05, h, { colour: 0xece8e0, noAo: true });
      const doors = Math.max(2, Math.round(w / 0.6));
      for (let i = 0; i < doors; i++) {
        const u0 = x0 + (w / doors) * i + 0.03;
        const u1 = x0 + (w / doors) * (i + 1) - 0.03;
        faceQuad(g, face.left(y1), u0, 0.1, u1, h - 0.1).stroke({ width: 0.012, color: 0x8a6440, alpha: 0.8 });
        faceQuad(g, face.left(y1), (u0 + u1) / 2 - 0.05, h - 0.2, (u0 + u1) / 2 + 0.05, h - 0.17).fill(0xd9dee5);
      }
      break;
    }
    case 'coffee-machine': {
      isoBlock(g, x0, y0, x1, y1, z, z + h, { colour: 0x2b2d33, noAo: true });
      faceQuad(g, face.left(y1), x0 + 0.04, z + h - 0.14, x1 - 0.04, z + h - 0.04).fill(0xa9b0ba);
      faceQuad(g, face.left(y1), -0.07, z + 0.03, 0.07, z + 0.18).fill(0x111216);
      const light = face.left(y1)(x1 - 0.07, z + h - 0.09);
      g.circle(light.x, light.y, 0.02).fill(0xff4d3d);
      isoCylinder(g, 0, y1 - 0.06, z + 0.03, 0.03, 0.06, 0xf2efe8);
      break;
    }
    case 'microwave':
      isoBlock(g, x0, y0, x1, y1, z, z + h, { colour: 0xd9dde3, noAo: true });
      faceQuad(g, face.left(y1), x0 + 0.04, z + 0.04, x0 + w * 0.65, z + h - 0.04).fill(0x23272e);
      faceQuad(g, face.left(y1), x1 - w * 0.25, z + 0.06, x1 - 0.04, z + h - 0.06).fill(0x8a929e);
      break;
    case 'snack-shelf': {
      isoBlock(g, x0, y0, x1, y1, 0, h, { colour: 0x9aa3ad });
      if (!frontOf(p, x0, y0, x1, y1)) break; // shelves face into the room
      const palette = [0xe8b23a, 0xd9443b, 0x3a8fd9, 0x45a85a, 0xf07c2a, 0xb04ad0, 0xf2e4a0];
      for (let s = 0; s < 4; s++) {
        const v0 = 0.06 + (s * (h - 0.1)) / 4;
        const v1 = v0 + (h - 0.1) / 4;
        faceQuad(g, face.left(y1), x0 + 0.03, v0, x1 - 0.03, v1 - 0.03).fill(0x4a525c);
        for (let u = x0 + 0.06, k = s * 3; u < x1 - 0.13; u += 0.14, k++) {
          faceQuad(g, face.left(y1), u, v0 + 0.01, u + 0.11, v1 - 0.06 - ((k * 5) % 3) * 0.04).fill(
            palette[k % palette.length]!,
          );
        }
      }
      break;
    }
    case 'vending-machine': {
      isoBlock(g, x0, y0, x1, y1, 0, h, { colour: 0xc0303a });
      if (!frontOf(p, x0, y0, x1, y1)) break;
      const f = face.left(y1);
      faceQuad(g, f, x0 + 0.06, 0.5, x0 + w * 0.68, h - 0.12).fill(0x1d2a38);
      const colours = [0xe8b23a, 0x45a85a, 0x3a8fd9, 0xf07c2a, 0xd9e3ef];
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 4; c++) {
          const u = x0 + 0.1 + c * ((w * 0.68 - 0.12) / 4);
          const v = 0.56 + r * ((h - 0.7) / 5);
          faceQuad(g, f, u, v, u + 0.1, v + 0.17).fill(colours[(r + c) % colours.length]!);
        }
      }
      faceQuad(g, f, x0 + 0.06, 0.5, x0 + w * 0.68, h - 0.12).fill({ color: 0xbfe6ff, alpha: 0.15 });
      faceQuad(g, f, x1 - w * 0.25, 1.1, x1 - 0.06, 1.45).fill(0x2a2d33);
      faceQuad(g, f, x0 + 0.06, 0.18, x0 + w * 0.68, 0.36).fill(0x111216);
      break;
    }
    case 'phone-booth': {
      // An acoustic pod: frame, felt-lined inside, glass front, stool and phone shelf, a "free" light.
      isoBlock(g, x0, y0, x1, y1, 0, h, { colour: 0x3a4048 });
      const l = iso(0, 0, h + 0.03);
      g.circle(l.x, l.y, 0.05).fill(0x5fdc6a); // the "free" light on top
      if (!frontOf(p, x0, y0, x1, y1)) break; // its glass door opens into the room
      const f = face.left(y1);
      faceQuad(g, f, x0 + 0.08, 0.08, x1 - 0.08, h - 0.1).fill(0x56606c);
      faceQuad(g, f, x0 + 0.18, 0.95, x1 - 0.18, 1.0).fill(0x9c7446);
      faceQuad(g, f, -0.1, 1.0, 0.1, 1.06).fill(0x1d1f24);
      faceQuad(g, f, -0.15, 0.5, 0.15, 0.56).fill(0x8a2e2e);
      faceQuad(g, f, -0.02, 0.08, 0.02, 0.5).fill(0x22252a);
      faceQuad(g, f, x0 + 0.08, 0.08, x1 - 0.08, h - 0.1)
        .fill({ color: 0xcfe8ff, alpha: 0.22 })
        .stroke({ width: 0.02, color: 0x9fc4e6 });
      break;
    }
    case 'sofa': {
      const c = 0xcfd3d8;
      // Its back against the wall: facing north (into the room from the south wall) puts the back at +y.
      const backSouth = p.facing === 'n';
      const [b0, b1] = backSouth ? [y1 - 0.22, y1] : [y0, y0 + 0.22];
      const [s0, s1] = backSouth ? [y0 + 0.04, y1 - 0.24] : [y0 + 0.24, y1 - 0.04];
      isoBlock(g, x0, y0, x1, y1, 0.06, 0.38, { colour: c });
      if (!backSouth) isoBlock(g, x0, b0, x1, b1, 0.38, 0.8, { colour: shade(c, 0.96) });
      isoBlock(g, x0, Math.min(s0, b0), x0 + 0.2, Math.max(s1, b1), 0.38, 0.6, { colour: c });
      isoBlock(g, x1 - 0.2, Math.min(s0, b0), x1, Math.max(s1, b1), 0.38, 0.6, { colour: c });
      for (let i = 0; i < 2; i++) {
        const u = x0 + 0.22 + i * ((w - 0.44) / 2);
        isoBlock(g, u, s0, u + (w - 0.44) / 2 - 0.02, s1, 0.38, 0.5, { colour: 0xe2e5e9, noAo: true });
      }
      isoBlock(g, x0 + 0.3, backSouth ? b0 - 0.12 : b1, x0 + 0.62, backSouth ? b0 : b1 + 0.12, 0.5, 0.76, {
        colour: 0xe2643a,
        noAo: true,
      });
      if (backSouth) isoBlock(g, x0, b0, x1, b1, 0.38, 0.8, { colour: shade(c, 0.96) }); // nearer the camera: drawn last
      break;
    }
    case 'book': {
      const covers = [0xc0504d, 0x3e6e9e, 0x5b8c5a, 0x7d5ba6];
      isoBlock(g, x0, y0, x1, y1, z, z + h, {
        colour: covers[Math.round(p.x * 7 + p.y * 3) % covers.length]!,
        noAo: true,
      });
      faceQuad(g, face.left(y1), x0 + 0.01, z + 0.008, x1 - 0.02, z + h - 0.008).fill(0xf4efe2); // pages
      break;
    }
    case 'stapler':
      isoBlock(g, x0, y0, x1, y1, z, z + 0.025, { colour: 0x2b2d33, noAo: true });
      isoBlock(g, x0, y0, x1 - 0.02, y1, z + 0.03, z + h, { colour: 0xd23b3b, noAo: true });
      break;
    case 'water-bottle':
      isoCylinder(g, 0, 0, z, 0.04, h - 0.04, 0x6fc0f0, 0.8);
      isoCylinder(g, 0, 0, z + h - 0.04, 0.02, 0.04, 0x2b6fb0);
      break;
    case 'paper-stack': {
      isoBlock(g, x0, y0, x1, y1, z, z + h, { colour: 0xf4f2ec, noAo: true });
      for (let i = 1; i < 4; i++)
        faceQuad(g, face.left(y1), x0, z + (h * i) / 4, x1, z + (h * i) / 4 + 0.004).fill(0xd8d4c8);
      break;
    }
    case 'fire-extinguisher': {
      isoCylinder(g, 0, 0, 0, 0.09, 0.46, 0xd42a2a);
      isoCylinder(g, 0, 0, 0.46, 0.04, 0.05, 0x2b2d33);
      const top = iso(0, 0, 0.53);
      const nozzle = iso(0.06, 0.12, 0.3);
      g.moveTo(top.x, top.y)
        .quadraticCurveTo(top.x + 0.14, top.y + 0.08, nozzle.x, nozzle.y)
        .stroke({ width: 0.025, color: 0x1d1f24 });
      g.rect(top.x - 0.07, top.y - 0.03, 0.14, 0.025).fill(0xc9ccd2); // handle
      faceQuad(g, face.left(0.09), -0.06, 0.2, 0.06, 0.32).fill(0xf2efe9); // label
      break;
    }
    // ---- The Colosseum's ruins and cargo: weathered sandy stone, cracked marble, aged wood and terracotta.
    case 'roman-column-fallen': {
      // A toppled fluted column lying along x: a drum with grooves, a worn capital at one end, a jagged break at the other.
      const m = 0xe6dcc4;
      isoBlock(g, x0 + 0.35, y0 + 0.05, x1 - 0.55, y1 - 0.05, 0, h - 0.08, { colour: m });
      isoBlock(g, x1 - 0.55, y0, x1, y1, 0, h, { colour: 0xd9c7a1 }); // the capital
      isoBlock(g, x1 - 0.2, y0, x1, y1, 0, h, { colour: 0xcdb98f, noAo: true }); // the worn rim of the capital
      const f = face.left(y1 - 0.05);
      for (let i = 1; i < 6; i++) {
        const v = (i / 6) * (h - 0.12);
        const q0 = f(x0 + 0.4, v);
        const q1 = f(x1 - 0.6, v);
        g.moveTo(q0.x, q0.y).lineTo(q1.x, q1.y).stroke({ width: 0.012, color: 0x9c9078, alpha: 0.7 });
      }
      // The broken end: jagged teeth of marble and a dark crack.
      const j = [
        f(x0 + 0.35, 0),
        f(x0 + 0.28, 0.2),
        f(x0 + 0.42, 0.34),
        f(x0 + 0.3, 0.52),
        f(x0 + 0.4, h - 0.08),
        f(x0 + 0.5, h - 0.08),
        f(x0 + 0.5, 0),
      ];
      g.poly(j.flatMap((q) => [q.x, q.y])).fill({ color: 0xb9ac92, alpha: 0.95 });
      const c0 = f(x0 + 1.2, h - 0.1);
      const c1 = f(x0 + 1.5, h * 0.5);
      const c2 = f(x0 + 1.4, 0.05);
      g.moveTo(c0.x, c0.y).lineTo(c1.x, c1.y).lineTo(c2.x, c2.y).stroke({ width: 0.02, color: 0x5d5546, alpha: 0.8 });
      {
        const lf = face.left(y1 - 0.05);
        vein(g, lf, x0 + 0.5, h * 0.62, 1.9, 101, 0x9a8f78, 0.014, 0.75);
        vein(g, lf, x0 + 1.4, h * 0.3, 1.2, 102, 0x8a7f68, 0.011, 0.6);
        speckle(g, lf, x0 + 0.4, 0.03, x1 - 0.6, h - 0.1, 90, 103, 0x6a5f48);
        streaks(g, lf, x0 + 0.4, 0.05, x1 - 0.6, h - 0.12, 8, 104, 0x9c9078, 0.4);
        grime(g, lf, x0 + 0.4, x1 - 0.55, h, 105);
        speckle(g, face.top(h - 0.08), x0 + 0.35, y0 + 0.05, x1 - 0.55, y1 - 0.05, 60, 106, 0x7a6f58);
        moss(g, lf, x0 + 0.7, 0.07, 0.4, 107);
        speckle(g, face.left(y1), x1 - 0.55, 0.03, x1, h - 0.02, 40, 108, 0x6a5f48); // the capital's grit
        vein(g, face.right(x1), y0 + 0.1, h * 0.55, 0.5, 109, 0x6a5f48, 0.012, 0.6);
      }
      break;
    }
    case 'column-stub':
      // A column snapped off a metre and a half up: plinth, fluted drum and a ragged top.
      isoBlock(g, x0, y0, x1, y1, 0, 0.2, { colour: 0xd0bf98 });
      isoCylinder(g, 0, 0, 0.2, 0.37, h - 0.2, 0xe6dcc4);
      for (let i = 0; i < 4; i++) {
        const a = -0.6 + i * 0.5;
        const b0 = iso(Math.cos(a) * 0.37, Math.sin(a) * 0.37, 0.24);
        const b1 = iso(Math.cos(a) * 0.37, Math.sin(a) * 0.37, h - 0.08);
        g.moveTo(b0.x, b0.y).lineTo(b1.x, b1.y).stroke({ width: 0.012, color: 0x9c9078, alpha: 0.6 });
      }
      for (let i = 0; i < 5; i++) {
        const a = i * 1.3;
        const t = iso(Math.cos(a) * 0.22, Math.sin(a) * 0.14, h + 0.02);
        g.poly([t.x - 0.08, t.y, t.x - 0.02, t.y - 0.1, t.x + 0.07, t.y]).fill({ color: 0xcdbf9f, alpha: 0.95 });
      }
      for (let i = 0; i < 40; i++) {
        const r = texRng(200 + i);
        const a = -1.2 + r() * 1.9;
        const q = iso(Math.cos(a) * 0.37, Math.sin(a) * 0.37, 0.25 + r() * (h - 0.35));
        g.circle(q.x, q.y, 0.008 + r() * 0.016).fill({ color: r() < 0.4 ? 0xfff3d6 : 0x6a5f48, alpha: 0.35 });
      }
      for (let i = 0; i < 3; i++) {
        const q0 = iso(0.37 * Math.cos(-0.5 + i * 0.4), 0.37 * Math.sin(-0.5 + i * 0.4), h * 0.8);
        const q1 = iso(0.37 * Math.cos(-0.5 + i * 0.4), 0.37 * Math.sin(-0.5 + i * 0.4), h * 0.3);
        g.moveTo(q0.x, q0.y)
          .lineTo(q1.x + 0.03, q1.y)
          .stroke({ width: 0.01, color: 0x8e8061, alpha: 0.45 });
      }
      weatherBlock(g, x0, y0, x1, y1, 0.2, 210, true); // the plinth
      break;
    case 'column-piece': {
      // A cracked marble drum lying where it fell.
      isoCylinder(g, 0, 0, 0, 0.44, h, 0xe9e1cf);
      const t = iso(0, 0, h);
      g.moveTo(t.x - 0.3, t.y - 0.02)
        .lineTo(t.x - 0.05, t.y + 0.07)
        .lineTo(t.x + 0.08, t.y - 0.03)
        .lineTo(t.x + 0.3, t.y + 0.05)
        .stroke({ width: 0.02, color: 0x6a6252, alpha: 0.85 });
      const b = iso(0.2, 0.2, 0.05);
      g.moveTo(b.x, b.y - 0.55)
        .lineTo(b.x - 0.06, b.y - 0.3)
        .lineTo(b.x + 0.02, b.y - 0.1)
        .stroke({ width: 0.018, color: 0x6a6252, alpha: 0.8 });
      for (let i = 0; i < 36; i++) {
        const r = texRng(300 + i);
        const a = -1.2 + r() * 1.9;
        const q = iso(Math.cos(a) * 0.44, Math.sin(a) * 0.44, 0.04 + r() * (h - 0.08));
        g.circle(q.x, q.y, 0.008 + r() * 0.016).fill({ color: r() < 0.4 ? 0xfff3d6 : 0x7a6f58, alpha: 0.35 });
      }
      speckle(g, face.top(h), -0.35, -0.2, 0.35, 0.2, 30, 330, 0x8a7f68);
      break;
    }
    case 'broken-arch': {
      // What is left of an arch: a stout pier with the first stepped courses of the arch still sitting on it (all inside its own
      // footprint, every course resting on the one below), a lower stump opposite, and the fallen stones between them on the floor.
      isoBlock(g, x0, y0, x0 + 0.8, y1, 0, h * 0.7, { colour: 0xd9c7a1 });
      isoBlock(g, x0, y0 + 0.05, x0 + 0.6, y1 - 0.05, h * 0.7, h * 0.88, { colour: 0xe0cfa8 });
      isoBlock(g, x0, y0 + 0.1, x0 + 0.4, y1 - 0.1, h * 0.88, h, { colour: 0xe6d8b6 });
      isoBlock(g, x1 - 0.6, y0, x1, y1, 0, h * 0.45, { colour: 0xcdb98f });
      isoBlock(g, x0 + 0.85, y0 + 0.15, x1 - 0.65, y1 - 0.15, 0, 0.22, { colour: 0xc4b48f, noAo: true });
      const f = face.left(y1);
      for (const [u, v] of [
        [0.3, 0.3],
        [1.55, 0.2],
      ] as const) {
        const q = f(x0 + u, v);
        g.moveTo(q.x, q.y)
          .lineTo(q.x + 0.08, q.y + 0.12)
          .lineTo(q.x - 0.02, q.y + 0.24)
          .stroke({ width: 0.018, color: 0x6a5f48, alpha: 0.8 });
      }
      weatherBlock(g, x0, y0, x0 + 0.8, y1, h * 0.7, 400);
      weatherBlock(g, x1 - 0.6, y0, x1, y1, h * 0.45, 410);
      {
        // Courses of stone on the pier and the stepped arch, and the rubble's grit.
        const lf = face.left(y1);
        for (const z of [0.25, 0.5, 0.75]) {
          const a0 = lf(x0, z);
          const a1 = lf(x0 + 0.8, z);
          g.moveTo(a0.x, a0.y).lineTo(a1.x, a1.y).stroke({ width: 0.012, color: 0x8e8061, alpha: 0.6 });
        }
        speckle(g, face.top(0.22), x0 + 0.85, y0 + 0.15, x1 - 0.65, y1 - 0.15, 26, 420);
      }
      break;
    }
    case 'stone-block': {
      isoBlock(g, x0, y0, x1, y1, 0, h, { colour: 0xd2c3a0 });
      const f = face.left(y1);
      const m0 = f(x0, h * 0.5);
      const m1 = f(x1, h * 0.5);
      g.moveTo(m0.x, m0.y).lineTo(m1.x, m1.y).stroke({ width: 0.012, color: 0x8e8061, alpha: 0.6 });
      const c = f(x0 + 0.1, h);
      g.poly([c.x, c.y, c.x + 0.18, c.y, c.x + 0.05, c.y + 0.14]).fill({ color: 0x9d8f70, alpha: 0.9 }); // a chipped corner
      weatherBlock(g, x0, y0, x1, y1, h, 500);
      break;
    }
    case 'rubble':
      // Loose stones lying flat on the floor, side by side (none overlaps or floats).
      for (const [cx, cy, sw, sd, sh, col] of [
        [-0.3, -0.1, 0.4, 0.3, 0.2, 0xd2c3a0],
        [0.15, 0.1, 0.5, 0.35, 0.28, 0xc4b48f],
        [0.38, -0.22, 0.26, 0.2, 0.14, 0xe0d2b0],
        [-0.28, 0.24, 0.3, 0.2, 0.12, 0xb9aa86],
        [0.02, -0.3, 0.2, 0.16, 0.1, 0xcfbf9a],
      ] as const)
        isoBlock(g, cx - sw / 2, cy - sd / 2, cx + sw / 2, cy + sd / 2, 0, sh, { colour: col, noAo: true });
      for (const [cx, cy, sw, sd, sh] of [
        [-0.3, -0.1, 0.4, 0.3, 0.2],
        [0.15, 0.1, 0.5, 0.35, 0.28],
        [0.38, -0.22, 0.26, 0.2, 0.14],
        [-0.28, 0.24, 0.3, 0.2, 0.12],
        [0.02, -0.3, 0.2, 0.16, 0.1],
      ] as const) {
        speckle(g, face.top(sh), cx - sw / 2, cy - sd / 2, cx + sw / 2, cy + sd / 2, 12, 600 + Math.round(cx * 100));
        speckle(g, face.left(cy + sd / 2), cx - sw / 2, 0.01, cx + sw / 2, sh - 0.01, 8, 610 + Math.round(cy * 100));
      }
      break;
    case 'crate': {
      isoBlock(g, x0, y0, x1, y1, 0, h, { colour: 0x9a6a3a });
      for (const [mapper, a0, a1] of [
        [face.left(y1), x0, x1],
        [face.right(x1), y0, y1],
      ] as const) {
        for (let i = 1; i < 4; i++) {
          const v = (i / 4) * h;
          const q0 = mapper(a0, v);
          const q1 = mapper(a1, v);
          g.moveTo(q0.x, q0.y).lineTo(q1.x, q1.y).stroke({ width: 0.012, color: 0x5a3a1c, alpha: 0.7 });
        }
      }
      const f = face.left(y1);
      for (const [u0, v0, u1, v1] of [
        [x0, 0, x1, h],
        [x0, h, x1, 0],
      ] as const) {
        const q0 = f(u0, v0);
        const q1 = f(u1, v1);
        g.moveTo(q0.x, q0.y).lineTo(q1.x, q1.y).stroke({ width: 0.03, color: 0x6e4a26, alpha: 0.6 });
      }
      for (const [mapper, a0, a1] of [
        [face.left(y1), x0, x1],
        [face.right(x1), y0, y1],
      ] as const) {
        streaks(g, mapper, a0 + 0.02, 0.03, a1 - 0.02, h - 0.03, 16, 700 + Math.round(a0 * 10), 0x4e3319, 0.5);
        streaks(g, mapper, a0 + 0.02, 0.03, a1 - 0.02, h - 0.03, 6, 720 + Math.round(a0 * 10), 0xc99a62, 0.3);
        speckle(g, mapper, a0, 0.02, a1, h - 0.02, 26, 740 + Math.round(a0 * 10), 0x3a2614, 0xe0b27a);
        // Nails along each plank end, knots and a darkened edge.
        for (const v of [0.1, 0.3, 0.5, 0.7]) {
          for (const u of [a0 + 0.06, a1 - 0.06]) {
            const q = mapper(u, v);
            g.circle(q.x, q.y, 0.014).fill({ color: 0x2a2a2e, alpha: 0.85 });
          }
        }
        const k1 = mapper(a0 + (a1 - a0) * 0.35, h * 0.4);
        g.ellipse(k1.x, k1.y, 0.03, 0.02).fill({ color: 0x3a2412, alpha: 0.7 });
        const edge = [mapper(a0, 0), mapper(a0 + 0.05, 0), mapper(a0 + 0.05, h), mapper(a0, h)];
        g.poly(edge.flatMap((q) => [q.x, q.y])).fill({ color: 0x2a1a0c, alpha: 0.3 });
        grime(g, mapper, a0, a1, h, 760 + Math.round(a0 * 10));
      }
      speckle(g, face.top(h), x0, y0, x1, y1, 30, 790, 0x3a2614, 0xe0b27a);
      streaks(g, face.top(h), x0 + 0.03, y0 + 0.03, x1 - 0.03, y1 - 0.03, 8, 791, 0x4e3319, 0.45);
      break;
    }
    case 'barrel': {
      isoCylinder(g, 0, 0, 0, 0.33, h, 0x8a5a2e);
      for (const z of [0.2, 0.7]) isoCylinder(g, 0, 0, z, 0.345, 0.07, 0x3b3b40);
      for (let i = 0; i < 4; i++) {
        const a = -0.7 + i * 0.5;
        const b0 = iso(Math.cos(a) * 0.33, Math.sin(a) * 0.33, 0.05);
        const b1 = iso(Math.cos(a) * 0.33, Math.sin(a) * 0.33, h - 0.05);
        g.moveTo(b0.x, b0.y).lineTo(b1.x, b1.y).stroke({ width: 0.01, color: 0x4c3018, alpha: 0.6 });
      }
      for (let i = 0; i < 46; i++) {
        const r = texRng(800 + i);
        const a = -1.3 + r() * 2;
        const q = iso(Math.cos(a) * 0.33, Math.sin(a) * 0.33, 0.04 + r() * (h - 0.08));
        g.ellipse(q.x, q.y, 0.006 + r() * 0.01, 0.02 + r() * 0.04).fill({
          color: r() < 0.5 ? 0x4c3018 : 0xb98456,
          alpha: 0.4,
        });
      }
      for (const z of [0.2, 0.7]) {
        for (let i = 0; i < 5; i++) {
          const a = -1.1 + i * 0.45;
          const q = iso(Math.cos(a) * 0.345, Math.sin(a) * 0.345, z + 0.035);
          g.circle(q.x, q.y, 0.016).fill(0x7a6e60); // hoop rivets
          g.moveTo(q.x, q.y)
            .lineTo(q.x + 0.01, q.y + 0.12)
            .stroke({ width: 0.02, color: 0x7a4a2a, alpha: 0.45 }); // rust run
        }
      }
      const lid = iso(0, 0, h);
      g.ellipse(lid.x, lid.y, 0.27, 0.27 * ISO_T).stroke({ width: 0.014, color: 0x3a2412, alpha: 0.7 });
      for (const k of [-0.12, 0, 0.12])
        g.moveTo(lid.x + k, lid.y - 0.12)
          .lineTo(lid.x + k, lid.y + 0.12)
          .stroke({ width: 0.008, color: 0x4c3018, alpha: 0.5 });
      break;
    }
    case 'amphora': {
      // A terracotta jar standing on a solid foot: the belly rests on it, the neck on the belly, the rim on the neck.
      isoCylinder(g, 0, 0, 0, 0.11, 0.18, 0xa85a32);
      const body = iso(0, 0, 0.42);
      g.ellipse(body.x, body.y, 0.22, 0.27).fill(0xb5653a);
      g.ellipse(body.x - 0.07, body.y - 0.05, 0.09, 0.14).fill({ color: 0xd08454, alpha: 0.6 });
      const neck = iso(0, 0, 0.72);
      g.rect(neck.x - 0.08, neck.y - 0.14, 0.16, 0.28).fill(0xa85a32);
      const rim = iso(0, 0, 0.9);
      g.ellipse(rim.x, rim.y, 0.115, 0.04).fill(0xc5764a).stroke({ width: 0.012, color: 0x6a3a20, alpha: 0.7 });
      for (const side of [-1, 1] as const) {
        g.moveTo(neck.x + side * 0.08, neck.y - 0.08)
          .quadraticCurveTo(neck.x + side * 0.26, neck.y - 0.02, neck.x + side * 0.2, neck.y + 0.16)
          .stroke({ width: 0.035, color: 0xa85a32, cap: 'round' });
      }
      g.moveTo(body.x - 0.21, body.y - 0.02)
        .lineTo(body.x + 0.21, body.y - 0.02)
        .stroke({ width: 0.03, color: 0x4a2a18, alpha: 0.8 });
      g.moveTo(body.x - 0.2, body.y + 0.06)
        .lineTo(body.x + 0.2, body.y + 0.06)
        .stroke({ width: 0.012, color: 0xe6c79a, alpha: 0.7 });
      // Glaze, a painted zigzag band, scuffs, a hairline crack and dirt around the foot.
      g.moveTo(body.x + 0.12, body.y - 0.2)
        .quadraticCurveTo(body.x + 0.17, body.y, body.x + 0.12, body.y + 0.18)
        .stroke({ width: 0.018, color: 0xf0b88a, alpha: 0.5 });
      for (let k = 0; k < 8; k++) {
        const x = body.x - 0.2 + k * 0.057;
        g.moveTo(x, body.y - 0.07 + (k % 2) * 0.03)
          .lineTo(x + 0.028, body.y - 0.04 - (k % 2) * 0.03)
          .stroke({ width: 0.012, color: 0xe6c79a, alpha: 0.8 });
      }
      for (let k = 0; k < 40; k++) {
        const r = texRng(900 + k);
        g.circle(body.x - 0.2 + r() * 0.4, body.y - 0.26 + r() * 0.52, 0.006 + r() * 0.012).fill({
          color: r() < 0.5 ? 0x6a3a20 : 0xf0b88a,
          alpha: 0.3,
        });
      }
      g.moveTo(body.x - 0.06, body.y + 0.05)
        .lineTo(body.x - 0.02, body.y + 0.14)
        .lineTo(body.x - 0.07, body.y + 0.22)
        .stroke({ width: 0.01, color: 0x4a2412, alpha: 0.8 });
      g.ellipse(body.x, body.y + 0.3, 0.19, 0.04).fill({ color: 0x2c2417, alpha: 0.3 });
      break;
    }
    case 'rug':
    // The house's pieces are drawn from the house's own art before this switch is reached.
    case 'house-chair':
    case 'house-armchair':
    case 'house-sofa':
    case 'house-table':
    case 'house-small-table':
    case 'house-lamp':
    case 'house-chest':
    case 'house-storage':
    case 'house-counter':
    case 'house-rug':
      break;
    default: {
      const k: never = p.kind;
      throw new Error(`no drawing for prop kind ${String(k)}`);
    }
  }
}

/**
 * Depth-sort key offset for a placed prop, in view units: its nearest corner (largest x + y).
 * Items on a desk sort just after their host, so they draw on top of it.
 */
export function propFootOffset(p: PropPlacement, all: readonly PropPlacement[] = []): number {
  const { w, d } = footprint(p);
  const own = iso(w / 2, d / 2).y;
  if ((p.elevationM ?? 0) === 0) return own;
  const host = all.find((q) => {
    if ((q.elevationM ?? 0) > 0 || !PROP_KINDS[q.kind].solid) return false;
    const f = footprint(q);
    return Math.abs(p.x - q.x) <= f.w / 2 && Math.abs(p.y - q.y) <= f.d / 2;
  });
  if (!host) return own;
  const hf = footprint(host);
  const hostKey = iso(host.x + hf.w / 2, host.y + hf.d / 2).y;
  const order = p.sortY !== undefined ? (p.sortY % 1) * 0.01 : 0;
  return hostKey + 0.002 + order - iso(p.x, p.y).y;
}

/** Tallest thing in the arena, so the camera can show it against the top wall. */
export function tallestPropM(props: readonly PropPlacement[]): number {
  return props.reduce((m, p) => Math.max(m, PROP_KINDS[p.kind].h + (p.elevationM ?? 0)), 0);
}
