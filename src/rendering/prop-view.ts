import { Container, Graphics } from 'pixi.js';
import { footprint, kindOf, PROP_KINDS, type PropPlacement } from '../data/objects/props';

/**
 * GREYBOX drawings for office and test props, top-down with a slight
 * three-quarter view: each prop shows its top face lifted by its height and
 * a front face down to the floor, plus a soft shadow (REQ-VIS-9). Origin =
 * centre of the footprint on the floor. Readable placeholders, not final art.
 */
const EDGE = 0x1f242d;
const SHADOW = 0x000000;

interface BoxColours {
  top: number;
  front: number;
  alpha?: number;
}

/** A box w × d footprint, h tall, standing on the floor (or lifted by `lift`). */
function box(g: Graphics, w: number, d: number, h: number, c: BoxColours, lift = 0, edge = EDGE): Graphics {
  const a = c.alpha ?? 1;
  return g
    .rect(-w / 2, d / 2 - h - lift, w, h)
    .fill({ color: c.front, alpha: a })
    .stroke({ width: 0.03, color: edge, alpha: Math.min(1, a + 0.3) })
    .rect(-w / 2, -d / 2 - h - lift, w, d)
    .fill({ color: c.top, alpha: a })
    .stroke({ width: 0.03, color: edge, alpha: Math.min(1, a + 0.3) });
}

function shadow(g: Graphics, w: number, d: number): void {
  g.rect(-w / 2 + 0.08, -d / 2 + 0.1, w, d).fill({ color: SHADOW, alpha: 0.22 });
}

export function buildPropView(p: PropPlacement): Container {
  const { w, d, h } = footprint(p);
  const lift = p.elevationM ?? 0;
  const root = new Container();
  root.label = `prop-${p.kind}`;
  const g = new Graphics();
  root.addChild(g);
  if (lift === 0 && !kindOf(p.kind).decal) shadow(g, w, d);

  switch (p.kind) {
    case 'pillar':
      box(g, w, d, h, { top: 0xb5bdc9, front: 0x8b93a1 });
      break;
    case 'desk': {
      box(g, w, d, 0.06, { top: 0xc89b66, front: 0x9c7446 }, h - 0.06);
      // legs
      for (const sx of [-1, 1]) g.rect(sx * (w / 2 - 0.06) - 0.03, d / 2 - h + 0.06, 0.06, h - 0.06).fill(0x5e4630);
      break;
    }
    case 'meeting-table':
      box(g, w, d, 0.08, { top: 0x8f6a45, front: 0x6d4f32 }, h - 0.08);
      g.rect(-0.12, d / 2 - h + 0.08, 0.24, h - 0.08).fill(0x4b3726);
      break;
    case 'office-chair': {
      g.circle(0, 0, 0.27).fill({ color: SHADOW, alpha: 0.2 });
      g.rect(-0.03, -0.45, 0.06, 0.45).fill(0x2a2d33); // stem
      box(g, w * 0.9, d * 0.8, 0.08, { top: 0x3b4a63, front: 0x2b364a }, 0.45);
      box(g, w * 0.9, 0.1, 0.45, { top: 0x3b4a63, front: 0x33405a }, 0.5); // backrest
      break;
    }
    case 'computer':
      box(g, w, d * 0.5, h, { top: 0x2a2e36, front: 0x1c2026 }, lift);
      g.rect(-w / 2 + 0.04, d * 0.25 - h - lift + 0.04, w - 0.08, h - 0.1).fill(0x5fb6ff); // screen glow
      break;
    case 'keyboard':
      box(g, w, d, h, { top: 0x3a3f48, front: 0x23272e }, lift);
      break;
    case 'mouse':
      g.ellipse(0, -lift - h / 2, w / 2, d / 2)
        .fill(0x3a3f48)
        .stroke({ width: 0.015, color: EDGE });
      break;
    case 'coffee-cup':
      box(g, w, d, h, { top: 0x6b3f22, front: 0xf2efe8 }, lift);
      break;
    case 'cabinet': {
      box(g, w, d, h, { top: 0x9aa4b1, front: 0x7d8794 });
      for (let i = 1; i < 4; i++) {
        const y = d / 2 - h + (h / 4) * i;
        g.moveTo(-w / 2 + 0.06, y)
          .lineTo(w / 2 - 0.06, y)
          .stroke({ width: 0.025, color: EDGE });
        g.rect(-0.08, y - h / 8 - 0.02, 0.16, 0.04).fill(0xd9dee5);
      }
      break;
    }
    case 'glass-partition':
      box(g, w, d, h, { top: 0xcfe8ff, front: 0x9fd0ff, alpha: 0.35 }, 0, 0x6c8fb3);
      g.rect(-w / 2, d / 2 - h, w, 0.06).fill({ color: 0x6c8fb3, alpha: 0.9 }); // top rail
      break;
    case 'plant': {
      box(g, w * 0.7, d * 0.7, 0.45, { top: 0x7a4b30, front: 0x5f3a24 });
      for (const [lx, ly, r] of [
        [0, -0.85, 0.32],
        [-0.2, -0.65, 0.24],
        [0.22, -0.68, 0.24],
        [0, -1.1, 0.2],
      ] as const) {
        g.circle(lx, ly, r).fill(0x3f8f4a).stroke({ width: 0.03, color: 0x23552b });
      }
      break;
    }
    case 'water-dispenser':
      box(g, w, d, 0.95, { top: 0xe8ecf1, front: 0xc9d0d9 });
      g.roundRect(-w * 0.35, d / 2 - h - 0.05, w * 0.7, 0.42, 0.08)
        .fill({ color: 0x6fc3ff, alpha: 0.8 })
        .stroke({ width: 0.03, color: 0x3a7fb8 });
      break;
    case 'bin':
      box(g, w, d, h, { top: 0x2f353f, front: 0x4a525e });
      break;
    case 'printer':
      box(g, w, d, h, { top: 0xdcdfe4, front: 0xb8bdc6 });
      g.rect(-w * 0.3, -d / 2 - h + 0.08, w * 0.6, 0.12).fill(0xffffff);
      break;
    case 'drawer-unit': {
      // Steel pedestal: brushed grey with three drawer fronts and handles.
      box(g, w, d, h, { top: 0xa3acb8, front: 0x838d9a });
      for (let i = 1; i < 3; i++) {
        const y = d / 2 - h + (h / 3) * i;
        g.moveTo(-w / 2 + 0.04, y)
          .lineTo(w / 2 - 0.04, y)
          .stroke({ width: 0.02, color: EDGE });
      }
      for (let i = 0; i < 3; i++) g.rect(-0.07, d / 2 - h + (h / 3) * (i + 0.5) - 0.015, 0.14, 0.03).fill(0xdfe4ea);
      break;
    }
    case 'cubicle-panel': {
      box(g, w, d, h, { top: 0x8c95a6, front: 0x6f7889 });
      // fabric texture stripes on the visible face
      const vertical = d > w;
      if (!vertical)
        for (let x = -w / 2 + 0.3; x < w / 2; x += 0.3) g.moveTo(x, d / 2 - h + 0.08).lineTo(x, d / 2 - 0.05);
      g.stroke({ width: 0.012, color: 0x5d6575 });
      break;
    }
    case 'executive-desk': {
      // Heavy mahogany desk with a modesty panel and a leather writing pad.
      box(g, w, d, h, { top: 0x5b2f1f, front: 0x4a2618 });
      g.rect(-w / 2 + 0.12, -d / 2 - h + 0.15, w - 0.24, d * 0.5)
        .fill({ color: 0x1f3b2c, alpha: 0.9 })
        .stroke({ width: 0.02, color: 0xc9a227 });
      g.rect(-w / 2, d / 2 - h, w, 0.05).fill(0xc9a227); // brass trim
      break;
    }
    case 'boss-chair': {
      g.rect(-0.04, -0.5, 0.08, 0.5).fill(0x222222);
      box(g, w, d * 0.85, 0.12, { top: 0x2b1a14, front: 0x1c110d }, 0.45);
      box(g, w * 0.95, 0.16, 0.75, { top: 0x3a231a, front: 0x2b1a14 }, 0.55); // tall leather back
      g.rect(-w / 2 + 0.05, -0.16 - 1.25, w - 0.1, 0.05).fill(0xc9a227);
      break;
    }
    case 'visitor-chair': {
      for (const sx of [-1, 1]) g.rect(sx * (w / 2 - 0.05) - 0.025, d / 2 - 0.45, 0.05, 0.45).fill(0x4a2e1e);
      box(g, w, d * 0.85, 0.08, { top: 0x8a2e2e, front: 0x6b2323 }, 0.42); // red cushion
      box(g, w, 0.08, 0.45, { top: 0x6b4228, front: 0x5a3720 }, 0.5);
      break;
    }
    case 'bookshelf': {
      box(g, w, d, h, { top: 0x6b4228, front: 0x553420 });
      const shelves = 4;
      const palette = [0xb23a3a, 0x3a6fb2, 0xd6b13a, 0x3a9a5b, 0x8a5ab8, 0xe0e0d8];
      for (let s = 0; s < shelves; s++) {
        const y0 = d / 2 - h + 0.08 + (s * (h - 0.12)) / shelves;
        const rowH = (h - 0.12) / shelves;
        g.rect(-w / 2 + 0.05, y0 + rowH - 0.04, w - 0.1, 0.04).fill(0x3d2617);
        for (let x = -w / 2 + 0.08, k = s; x < w / 2 - 0.12; x += 0.11, k++) {
          g.rect(x, y0 + 0.06 + ((k * 7) % 3) * 0.02, 0.09, rowH - 0.12 - ((k * 7) % 3) * 0.02).fill(
            palette[k % palette.length]!,
          );
        }
      }
      break;
    }
    case 'kitchen-counter': {
      // Laminate top over wooden cupboards with doors, handles and a dark kick plate.
      box(g, w, d, h, { top: 0xe9e4da, front: 0xb98a5a });
      g.rect(-w / 2, d / 2 - 0.08, w, 0.08).fill(0x3a2a1c);
      const doors = Math.max(2, Math.round(w / 0.6));
      for (let i = 1; i < doors; i++) {
        const x = -w / 2 + (w / doors) * i;
        g.moveTo(x, d / 2 - h + 0.06).lineTo(x, d / 2 - 0.1);
      }
      g.stroke({ width: 0.02, color: 0x7a5636 });
      for (let i = 0; i < doors; i++)
        g.rect(-w / 2 + (w / doors) * (i + 0.5) - 0.06, d / 2 - h + 0.18, 0.12, 0.03).fill(0xd9dee5);
      break;
    }
    case 'coffee-machine':
      box(g, w, d, h, { top: 0x2b2d33, front: 0x1d1f24 }, lift);
      g.rect(-w / 2 + 0.05, d / 2 - h - lift + 0.05, w - 0.1, 0.12).fill(0xa9b0ba); // brushed panel
      g.circle(w / 2 - 0.08, d / 2 - h - lift + 0.11, 0.025).fill(0xff4d3d); // power light
      g.rect(-0.06, d / 2 - lift - 0.16, 0.12, 0.12).fill(0x111216); // cup bay
      g.rect(-0.035, d / 2 - lift - 0.1, 0.07, 0.07).fill(0xf2efe8); // a cup waiting
      break;
    case 'microwave':
      box(g, w, d, h, { top: 0xd9dde3, front: 0xbfc5ce }, lift);
      g.rect(-w / 2 + 0.04, d / 2 - h - lift + 0.05, w * 0.62, h - 0.1).fill(0x23272e); // door window
      g.rect(w / 2 - w * 0.28, d / 2 - h - lift + 0.06, w * 0.2, h - 0.12).fill(0x8a929e); // keypad
      break;
    case 'snack-shelf': {
      // Wire shelving stacked with colourful snack boxes, bags and drinks.
      box(g, w, d, h, { top: 0xaeb6c1, front: 0x8b939e });
      const palette = [0xe8b23a, 0xd9443b, 0x3a8fd9, 0x45a85a, 0xf07c2a, 0xb04ad0, 0xf2e4a0];
      const shelves = 4;
      const rowH = (h - 0.1) / shelves;
      for (let s = 0; s < shelves; s++) {
        const y0 = d / 2 - h + 0.06 + s * rowH;
        g.rect(-w / 2 + 0.03, y0 + rowH - 0.03, w - 0.06, 0.03).fill(0x6c747f);
        for (let x = -w / 2 + 0.06, k = s * 3; x < w / 2 - 0.14; x += 0.15, k++) {
          const tall = rowH - 0.1 - ((k * 5) % 3) * 0.05;
          g.roundRect(x, y0 + rowH - 0.03 - tall, 0.12, tall, 0.02).fill(palette[k % palette.length]!);
        }
      }
      break;
    }
    case 'vending-machine': {
      // Red cabinet, a glass front showing rows of snacks, and a keypad with a coin slot.
      box(g, w, d, h, { top: 0x8e1d24, front: 0xb3262e });
      const gx = -w / 2 + 0.06;
      const gw = w * 0.62;
      const gy = d / 2 - h + 0.1;
      const gh = h * 0.72;
      g.rect(gx, gy, gw, gh).fill(0x1d2a38);
      const colours = [0xe8b23a, 0x45a85a, 0x3a8fd9, 0xf07c2a, 0xd9e3ef];
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 4; c++) {
          g.rect(
            gx + 0.04 + (c * (gw - 0.08)) / 4,
            gy + 0.05 + (r * (gh - 0.1)) / 5,
            (gw - 0.08) / 4 - 0.03,
            (gh - 0.1) / 5 - 0.06,
          ).fill(colours[(r + c) % colours.length]!);
        }
      }
      g.rect(gx, gy, gw, gh).fill({ color: 0xbfe6ff, alpha: 0.18 }).stroke({ width: 0.02, color: 0x6c8fb3 });
      g.rect(w / 2 - w * 0.26, gy + 0.1, w * 0.18, 0.3).fill(0x2a2d33); // keypad
      g.rect(w / 2 - w * 0.22, gy + 0.5, w * 0.1, 0.04).fill(0xd9dee5); // coin slot
      g.rect(gx, d / 2 - 0.25, gw, 0.14).fill(0x111216); // pickup flap
      break;
    }
    case 'phone-booth': {
      // A one-person acoustic pod: dark frame, glass front, a stool and a phone shelf inside, a light on top.
      box(g, w, d, h, { top: 0x3a4048, front: 0x2f343c });
      const fx = -w / 2 + 0.08;
      const fw = w - 0.16;
      const fy = d / 2 - h + 0.12;
      g.rect(fx, fy, fw, h - 0.18).fill(0x46505c); // inside, felt lined
      g.rect(fx + 0.08, fy + 0.7, fw - 0.16, 0.06).fill(0x9c7446); // phone shelf
      g.rect(fx + fw / 2 - 0.12, fy + 0.62, 0.24, 0.08).fill(0x1d1f24); // phone
      g.rect(fx + fw / 2 - 0.16, d / 2 - 0.62, 0.32, 0.08).fill(0x6b2323); // stool seat
      g.rect(fx + fw / 2 - 0.025, d / 2 - 0.54, 0.05, 0.48).fill(0x22252a); // stool post
      g.rect(fx, fy, fw, h - 0.18)
        .fill({ color: 0xcfe8ff, alpha: 0.22 })
        .stroke({ width: 0.03, color: 0x8fb3d9 });
      g.moveTo(fx + fw * 0.2, fy + 0.15)
        .lineTo(fx + fw * 0.45, fy + 0.15)
        .stroke({ width: 0.03, color: 0xffffff, alpha: 0.5 });
      g.circle(0, -d / 2 - h + 0.12, 0.05).fill(0x5fdc6a); // "free" light
      break;
    }
    case 'sofa': {
      box(g, w, d, 0.42, { top: 0x5a6b8c, front: 0x47566f });
      box(g, w, 0.2, 0.4, { top: 0x66789b, front: 0x52617d }, 0.4); // back
      for (const sx of [-1, 1]) {
        // Arms at each end: a front face down to the seat and a top.
        const ax = sx * (w / 2 - 0.09) - 0.09;
        g.rect(ax, d / 2 - 0.65, 0.18, 0.65)
          .fill(0x52617d)
          .stroke({ width: 0.03, color: EDGE });
        g.rect(ax, -d / 2 - 0.65, 0.18, d)
          .fill(0x66789b)
          .stroke({ width: 0.03, color: EDGE });
      }
      for (const sx of [0, 1])
        g.rect(-w / 2 + 0.22 + sx * (w / 2 - 0.22), -d / 2 - 0.42 + 0.22, w / 2 - 0.26, d - 0.3).fill(0x6c7fa3); // cushions
      g.rect(-w / 2 + 0.3, -d / 2 - 0.78, 0.3, 0.26).fill(0xe0763a); // an accent pillow
      break;
    }
    case 'rug':
      g.roundRect(-w / 2, -d / 2, w, d, 0.15)
        .fill(0x6e1f2b)
        .stroke({ width: 0.08, color: 0xc9a227 });
      g.roundRect(-w / 2 + 0.3, -d / 2 + 0.3, w - 0.6, d - 0.6, 0.1).stroke({ width: 0.04, color: 0xd8b25a });
      break;
    default: {
      const kind: never = p.kind;
      throw new Error(`no drawing for prop kind ${String(kind)}`);
    }
  }
  root.position.set(p.x, p.y);
  return root;
}

/** Depth-sort key offset for a placed prop: its front edge, or its host's when it sits on one. */
export function propFootOffset(p: PropPlacement): number {
  if (p.sortY !== undefined) return p.sortY - p.y;
  return footprint(p).d / 2;
}

/** Tallest thing in the arena, so the camera can show it against the top wall. */
export function tallestPropM(props: readonly PropPlacement[]): number {
  return props.reduce((m, p) => Math.max(m, PROP_KINDS[p.kind].h + (p.elevationM ?? 0)), 0);
}
