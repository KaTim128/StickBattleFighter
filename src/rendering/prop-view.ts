import { Container, Graphics } from 'pixi.js';
import { footprint, kindOf, PROP_KINDS, type PropPlacement } from '../data/objects/props';
import { face, faceQuad, isoBlock, isoCylinder, isoShadow, shade } from './iso-draw';
import { iso } from './projection';

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
  if (kind.decal) {
    // Decals are drawn in floor space (inside the floor layer): plain world metres.
    g.roundRect(x0, y0, w, d, 0.15).fill(0x7a2632).stroke({ width: 0.08, color: 0xc9a227 });
    g.roundRect(x0 + 0.3, y0 + 0.3, w - 0.6, d - 0.6, 0.1).stroke({ width: 0.04, color: 0xd8b25a });
    root.position.set(p.x, p.y);
    return root;
  }
  if (z === 0) isoShadow(g, x0, y0, x1, y1, h);

  switch (p.kind) {
    case 'pillar':
      isoBlock(g, x0, y0, x1, y1, 0, h, { colour: 0xd9d4cc });
      break;
    case 'desk': {
      legs(g, w, d, h - 0.05, 0x4a4f57);
      isoBlock(g, x0, y0, x1, y1, h - 0.05, h, { colour: 0xf2efe9, noAo: true });
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
      const back = face.left(-0.2);
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
      faceQuad(g, face.left(0.03), x0 + 0.03, z + 0.15, x1 - 0.03, z + h - 0.03).fill(0x5fb0ea);
      faceQuad(g, face.left(0.03), x0 + 0.05, z + h - 0.12, x0 + 0.2, z + h - 0.05).fill({
        color: 0xffffff,
        alpha: 0.35,
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
      const front = w >= d ? face.left(y1) : face.right(x1);
      const [a0, a1] = w >= d ? [x0, x1] : [y0, y1];
      for (let i = 0; i < 4; i++) {
        const v0 = 0.06 + (i * (h - 0.1)) / 4;
        const v1 = v0 + (h - 0.1) / 4 - 0.04;
        faceQuad(g, front, a0 + 0.05, v0, a1 - 0.05, v1).stroke({ width: 0.012, color: 0x55606e, alpha: 0.8 });
        const m = (a0 + a1) / 2;
        faceQuad(g, front, m - 0.08, v1 - 0.06, m + 0.08, v1 - 0.03).fill(0xe6eaef);
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
      faceQuad(g, face.left(y1), x0 + 0.08, 0.2, x1 - 0.08, 0.3).fill(0x5c6470);
      break;
    }
    case 'cubicle-panel': {
      isoBlock(g, x0, y0, x1, y1, 0, h, { colour: 0x9aa3b4 });
      isoBlock(g, x0, y0, x1, y1, h - 0.04, h, { colour: 0xd6dbe2, noAo: true });
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
      isoBlock(g, x0 + 0.06, y1 - 0.2, x1 - 0.06, y1 - 0.06, 0.55, 1.3, { colour: 0x3a231a });
      break;
    }
    case 'visitor-chair': {
      legs(g, w - 0.08, d - 0.08, 0.42, 0x4a2e1e, 0, 0.04);
      isoBlock(g, x0 + 0.04, y0 + 0.04, x1 - 0.04, y1 - 0.04, 0.42, 0.5, { colour: 0x8a2e2e, noAo: true });
      isoBlock(g, x1 - 0.12, y0 + 0.04, x1 - 0.04, y1 - 0.04, 0.5, 0.95, { colour: 0x6b4228, noAo: true });
      break;
    }
    case 'bookshelf': {
      const wood = 0xcfa36c;
      const along = w >= d;
      const front = along ? face.left(y1) : face.right(x1);
      const [a0, a1] = along ? [x0, x1] : [y0, y1];
      isoBlock(g, x0, y0, x1, y1, 0, h, { colour: shade(wood, 0.75) });
      const palette = [0xc0504d, 0x3e6e9e, 0xe3b23c, 0x5b8c5a, 0x7d5ba6, 0xe07b39, 0x2f4858];
      for (let s = 0; s < 4; s++) {
        const v0 = 0.06 + (s * (h - 0.1)) / 4;
        const v1 = v0 + (h - 0.1) / 4;
        faceQuad(g, front, a0 + 0.04, v0, a1 - 0.04, v1 - 0.04).fill(0x3a2a1c);
        for (let u = a0 + 0.07, k = s * 5; u < a1 - 0.1; u += 0.09, k++) {
          const bh = v1 - v0 - 0.1 - ((k * 7) % 3) * 0.04;
          faceQuad(g, front, u, v0 + 0.01, u + 0.075, v0 + 0.01 + bh).fill(palette[k % palette.length]!);
        }
        faceQuad(g, front, a0 + 0.02, v1 - 0.04, a1 - 0.02, v1).fill(wood);
      }
      break;
    }
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
      const f = face.left(y1);
      faceQuad(g, f, x0 + 0.08, 0.08, x1 - 0.08, h - 0.1).fill(0x56606c);
      faceQuad(g, f, x0 + 0.18, 0.95, x1 - 0.18, 1.0).fill(0x9c7446);
      faceQuad(g, f, -0.1, 1.0, 0.1, 1.06).fill(0x1d1f24);
      faceQuad(g, f, -0.15, 0.5, 0.15, 0.56).fill(0x8a2e2e);
      faceQuad(g, f, -0.02, 0.08, 0.02, 0.5).fill(0x22252a);
      faceQuad(g, f, x0 + 0.08, 0.08, x1 - 0.08, h - 0.1)
        .fill({ color: 0xcfe8ff, alpha: 0.22 })
        .stroke({ width: 0.02, color: 0x9fc4e6 });
      const l = iso(0, 0, h + 0.03);
      g.circle(l.x, l.y, 0.05).fill(0x5fdc6a);
      break;
    }
    case 'sofa': {
      const c = 0xcfd3d8;
      isoBlock(g, x0, y0, x1, y1, 0.06, 0.38, { colour: c });
      isoBlock(g, x0, y0, x1, y0 + 0.22, 0.38, 0.8, { colour: shade(c, 0.96) });
      isoBlock(g, x0, y0 + 0.22, x0 + 0.2, y1, 0.38, 0.6, { colour: c });
      isoBlock(g, x1 - 0.2, y0 + 0.22, x1, y1, 0.38, 0.6, { colour: c });
      for (let i = 0; i < 2; i++) {
        const u = x0 + 0.22 + i * ((w - 0.44) / 2);
        isoBlock(g, u, y0 + 0.24, u + (w - 0.44) / 2 - 0.02, y1 - 0.04, 0.38, 0.5, { colour: 0xe2e5e9, noAo: true });
      }
      isoBlock(g, x0 + 0.3, y0 + 0.24, x0 + 0.62, y0 + 0.36, 0.5, 0.76, { colour: 0xe2643a, noAo: true });
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
    case 'rug':
      break;
    default: {
      const k: never = p.kind;
      throw new Error(`no drawing for prop kind ${String(k)}`);
    }
  }
  const at = iso(p.x, p.y);
  root.position.set(at.x, at.y);
  return root;
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
