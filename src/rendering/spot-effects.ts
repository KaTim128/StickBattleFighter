import { type Container, Graphics } from 'pixi.js';
import type { FurnitureDef, HouseDef } from '../modes/hide-seek/house-types';
import { type Facing, facingFor, frontVisible } from './furniture-facing';
import { aged } from './house-furniture';
import type { HouseView } from './house-view';
import { isoBlock, shade } from './iso-draw';
import { iso } from './projection';

/**
 * What the hunter's search does to the hiding places themselves (owner, 18/11/2026): a cupboard or wardrobe door
 * swings open on its hinge to show a dark inside, a chest or box lid is lifted, a curtain is dragged aside, a bush
 * shakes. The baked furniture picture never changes; a thin overlay (or a slide of the baked node) is drawn on top
 * and eased by how far the hunter has got in his action. What he opened stays open a good while, which is itself a
 * clue to the player that he has been there.
 */
type Fx = {
  mode: 'door' | 'lid' | 'curtain' | 'bush';
  f: FurnitureDef;
  facing: Facing;
  node: Container;
  g: Graphics | null;
};

/** How long a place the hunter opened stays open, seconds. */
export const LEFT_OPEN_S = 30;

const MODE: Readonly<Record<string, Fx['mode']>> = {
  wardrobe: 'door',
  cupboard: 'door',
  'shed-cabinet': 'door',
  chest: 'lid',
  box: 'lid',
  curtain: 'curtain',
  'shower-curtain': 'curtain',
  bush: 'bush',
};

export class SpotEffects {
  private readonly fx = new Map<string, Fx>();
  private readonly amount = new Map<string, number>();
  private readonly drawn = new Map<string, number>();
  private readonly lastTouch = new Map<string, number>();
  private clockS = 0;

  constructor(view: HouseView, house: HouseDef) {
    for (const f of house.furniture) {
      const mode = f.hide ? MODE[f.hide.kind] : undefined;
      if (!mode) continue;
      const nodeRef = view.nodes.find((n) => n.kind === 'furniture' && n.id === f.id);
      if (!nodeRef) continue;
      const facing = facingFor(
        f,
        house.furniture,
        house.walls.filter((w) => w.floor === f.floor),
      );
      let g: Graphics | null = null;
      // Doors only show when their front faces the camera; lids are on top, so always show.
      if ((mode === 'door' && frontVisible(facing)) || mode === 'lid') {
        g = new Graphics();
        view.floors[f.floor].actors.add(g, iso(f.x1, f.y1).y + 0.03);
      }
      this.fx.set(f.id, { mode, f, facing, node: nodeRef.node, g });
    }
  }

  /**
   * Advance by `dtS`. `target` is how far open the hunter has the place he is working on right now (0..1), or null
   * when he is working on none.
   */
  update(dtS: number, target: { spotId: string; amount: number } | null): void {
    this.clockS += dtS;
    if (target) {
      this.lastTouch.set(target.spotId, this.clockS);
      const now = this.amount.get(target.spotId) ?? 0;
      this.amount.set(target.spotId, Math.max(now, target.amount));
    }
    for (const [id, fx] of this.fx) {
      let a = this.amount.get(id) ?? 0;
      const touched = this.lastTouch.get(id);
      // After he has left, it stays as he left it for a while, then swings gently shut.
      if (touched !== undefined && this.clockS - touched > LEFT_OPEN_S && fx.mode !== 'bush')
        a = Math.max(0, a - dtS * 0.25);
      if (fx.mode === 'bush' && touched !== undefined)
        a = target?.spotId === id ? target.amount : Math.max(0, a - dtS * 1.2);
      this.amount.set(id, a);
      this.apply(fx, a);
    }
  }

  /** Keep each overlay drawn just in front of its furniture, whatever draw order the furniture has been given. */
  syncDepth(): void {
    for (const fx of this.fx.values()) if (fx.g) fx.g.zIndex = fx.node.zIndex + 0.01;
  }

  /** How open a place is right now, 0..1 (for tests and the audio). */
  openness(spotId: string): number {
    return this.amount.get(spotId) ?? 0;
  }

  reset(): void {
    this.amount.clear();
    this.lastTouch.clear();
    for (const [id, fx] of this.fx) {
      this.apply(fx, 0);
      this.drawn.set(id, -1);
    }
  }

  private apply(fx: Fx, a: number): void {
    const { f } = fx;
    if (fx.mode === 'curtain') {
      // Dragged aside along the rail.
      const along = f.x1 - f.x0 >= f.y1 - f.y0;
      const v = along ? iso(-1.1 * a, 0) : iso(0, -1.1 * a);
      const o = iso(0, 0);
      fx.node.pivot.set(-(v.x - o.x), -(v.y - o.y));
      return;
    }
    if (fx.mode === 'bush') {
      // Shaken: a quick side to side jiggle that dies away.
      const wob = Math.sin(this.clockS * 38) * 0.07 * a;
      fx.node.pivot.set(wob, Math.cos(this.clockS * 31) * 0.03 * a);
      return;
    }
    if (!fx.g) return;
    const last = this.drawn.get(f.id);
    if (last !== undefined && Math.abs(last - a) < 0.01) return;
    this.drawn.set(f.id, a);
    fx.g.clear();
    if (a <= 0.01) return;
    if (fx.mode === 'door') drawDoorOpen(fx.g, f, fx.facing, a);
    else drawLidUp(fx.g, f, a);
  }
}

const pts = (arr: readonly { x: number; y: number }[]): number[] => arr.flatMap((p) => [p.x, p.y]);
const lerpP = (a: { x: number; y: number }, b: { x: number; y: number }, t: number) => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});

/**
 * A cupboard or wardrobe door swung open on its left hinge. The opening is textured, not a black hole: a back of
 * wooden planks, a side wall catching the light, shelves with stacked linen, clothes hanging from a rail in a
 * tall wardrobe, shadow gathering toward the top and the edges; the door leaf shows its inner face with its
 * raised panels, a hinge and a knob.
 */
function drawDoorOpen(g: Graphics, f: FurnitureDef, facing: Facing, amt: number): void {
  const h = f.heightM;
  const v0 = 0.12;
  const v1 = h - 0.1;
  const east = facing === 'e';
  const a0 = east ? f.y0 : f.x0;
  const a1 = east ? f.y1 : f.x1;
  const span = a1 - a0;
  const door = Math.min(span * 0.5, 0.75); // the leaf that opens
  const depth = Math.min(0.5, (east ? f.x1 - f.x0 : f.y1 - f.y0) * 0.8);
  // The point on the front face at (u along it, z up), `out` metres out from the face (negative: inside).
  const on = (u: number, z: number, out = 0) => (east ? iso(f.x1 + out, u, z) : iso(u, f.y1 + out, z));
  const ua = a0 + 0.05;
  const ub = ua + door;
  const fade = Math.min(1, amt * 1.6);
  const wood = aged(f.colour, 0.62);
  // The back of the cabinet: planks.
  g.poly(pts([on(ua, v0, -depth), on(ub, v0, -depth), on(ub, v1, -depth), on(ua, v1, -depth)])).fill({
    color: wood,
    alpha: fade,
  });
  for (let u = ua + 0.1; u < ub; u += 0.11) {
    const p = on(u, v0, -depth);
    const q = on(u, v1, -depth);
    g.moveTo(p.x, p.y)
      .lineTo(q.x, q.y)
      .stroke({ width: 0.008, color: 0x000000, alpha: 0.35 * fade });
  }
  // The side wall on the hinge side, catching the light from the room.
  g.poly(pts([on(ua, v0, 0), on(ua, v0, -depth), on(ua, v1, -depth), on(ua, v1, 0)])).fill({
    color: shade(wood, 1.35),
    alpha: fade,
  });
  // Shelves (with linen on them) in a cupboard; a hanging rail and clothes in a tall wardrobe.
  const tall = h > 1.6;
  const shelves = tall ? [0.32] : [0.3, 0.62];
  for (const k of shelves) {
    const z = v0 + (v1 - v0) * k;
    g.poly(pts([on(ua, z, 0), on(ub, z, 0), on(ub, z, -depth), on(ua, z, -depth)])).fill({
      color: shade(wood, 1.5),
      alpha: fade,
    });
    g.moveTo(on(ua, z, 0).x, on(ua, z, 0).y)
      .lineTo(on(ub, z, 0).x, on(ub, z, 0).y)
      .stroke({ width: 0.012, color: 0x000000, alpha: 0.5 * fade });
    // Folded linen: a stack of two or three flat blocks in worn colours.
    for (let n = 0; n < 3; n++) {
      const cu = ua + 0.08 + n * ((door - 0.2) / 3);
      const stack = 1 + ((n + Math.round(f.x0 * 3)) % 3);
      for (let r = 0; r < stack; r++) {
        const colour = [0x8a8274, 0x6a5a4a, 0x56606a][(n + r) % 3]!;
        const zz = z + r * 0.045;
        g.poly(
          pts([
            on(cu, zz, -0.04),
            on(cu + (door - 0.2) / 3 - 0.04, zz, -0.04),
            on(cu + (door - 0.2) / 3 - 0.04, zz + 0.04, -0.04),
            on(cu, zz + 0.04, -0.04),
          ]),
        ).fill({ color: aged(colour, 0.9), alpha: fade });
      }
    }
  }
  if (tall) {
    const rail = v1 - 0.22;
    g.moveTo(on(ua, rail, -depth * 0.55).x, on(ua, rail, -depth * 0.55).y)
      .lineTo(on(ub, rail, -depth * 0.55).x, on(ub, rail, -depth * 0.55).y)
      .stroke({ width: 0.025, color: 0xa4a8ac, alpha: fade });
    const colours = [0x2b2a3c, 0x4a2a2a, 0x2a3a30, 0x3c3c3c, 0x40342a];
    const n = Math.max(3, Math.floor(door / 0.15));
    for (let i = 0; i < n; i++) {
      const cu = ua + 0.06 + i * ((door - 0.1) / n);
      const len = 0.6 + 0.35 * (((i * 7) % 5) / 5);
      const w = (door - 0.1) / n - 0.015;
      const top = rail - 0.02;
      g.poly(
        pts([
          on(cu, top, -depth * 0.55),
          on(cu + w, top, -depth * 0.55),
          on(cu + w * 0.92, top - len, -depth * 0.55),
          on(cu + w * 0.08, top - len, -depth * 0.55),
        ]),
      ).fill({
        color: aged(colours[i % colours.length]!, 1),
        alpha: fade,
      });
      const hk = on(cu + w / 2, top + 0.03, -depth * 0.55);
      g.circle(hk.x, hk.y, 0.014).fill({ color: 0xa4a8ac, alpha: fade });
    }
  }
  // Shadow gathering toward the top and the edges, so it reads as a deep space.
  for (const [k, alpha] of [
    [0.25, 0.22],
    [0.12, 0.2],
  ] as const)
    g.poly(pts([on(ua, v1 - (v1 - v0) * k, 0), on(ub, v1 - (v1 - v0) * k, 0), on(ub, v1, 0), on(ua, v1, 0)])).fill({
      color: 0x000000,
      alpha: alpha * fade,
    });
  g.poly(pts([on(ua, v0, 0), on(ub, v0, 0), on(ub, v1, 0), on(ua, v1, 0)])).stroke({
    width: 0.03,
    color: 0x0c0806,
    alpha: 0.85 * fade,
  }); // the dark reveal round the opening
  // The leaf, hinged at the left edge and swinging out and across as it opens, drawn with its inner face to us.
  const th = amt * 1.25;
  const outN = Math.sin(th) * door;
  const acrossN = Math.cos(th) * door;
  const hingeBot = on(ua, v0);
  const hingeTop = on(ua, v1);
  const farBot = on(ua + acrossN, v0, outN);
  const farTop = on(ua + acrossN, v1, outN);
  const leaf = (sx: number, t: number) => lerpP(lerpP(hingeBot, farBot, sx), lerpP(hingeTop, farTop, sx), t);
  g.poly(pts([hingeBot, farBot, farTop, hingeTop]))
    .fill({ color: aged(f.colour, 0.9), alpha: 1 })
    .stroke({ width: 0.02, color: 0x120e0a, alpha: 0.85 });
  for (const [t0, t1] of [
    [0.07, 0.47],
    [0.53, 0.93],
  ] as const)
    for (const [x0, x1] of [[0.14, 0.86]] as const) {
      g.poly(pts([leaf(x0, t0), leaf(x1, t0), leaf(x1, t1), leaf(x0, t1)]))
        .fill({ color: 0x000000, alpha: 0.2 })
        .stroke({ width: 0.012, color: 0x120e0a, alpha: 0.6 });
      g.poly(pts([leaf(x0, t1 - 0.03), leaf(x1, t1 - 0.03), leaf(x1, t1), leaf(x0, t1)])).fill({
        color: 0xffffff,
        alpha: 0.1,
      });
    }
  for (const t of [0.2, 0.8]) {
    const hp = leaf(0.02, t);
    g.circle(hp.x, hp.y, 0.022).fill(0x2a2620); // hinges
  }
  const knob = leaf(0.88, 0.5);
  g.circle(knob.x, knob.y, 0.034).fill(0x9a8f5a);
  g.circle(knob.x - 0.01, knob.y - 0.01, 0.01).fill({ color: 0xffffff, alpha: 0.5 });
}

/**
 * A chest or box with its lid lifted: the opening is lined (wooden planks round the inside, a floor with cloth and
 * a few things in it, dust and a cobweb in a corner) and the lid shows its velvet or card lining as it rises.
 */
function drawLidUp(g: Graphics, f: FurnitureDef, amt: number): void {
  const h = f.heightM;
  const d = f.y1 - f.y0;
  const dep = Math.min(0.34, h * 0.8);
  const xa = f.x0 + 0.06;
  const xb = f.x1 - 0.06;
  const ya = f.y0 + 0.06;
  const yb = f.y1 - 0.06;
  const fade = Math.min(1, amt * 1.6);
  const wood = aged(f.colour, 0.7);
  // The floor of the inside, with a lining cloth.
  g.poly(pts([iso(xa, ya, h - dep), iso(xb, ya, h - dep), iso(xb, yb, h - dep), iso(xa, yb, h - dep)])).fill({
    color: shade(wood, 0.5),
    alpha: fade,
  });
  g.poly(
    pts([
      iso(xa + 0.08, ya + 0.08, h - dep + 0.005),
      iso(xb - 0.08, ya + 0.08, h - dep + 0.005),
      iso(xb - 0.08, yb - 0.08, h - dep + 0.005),
      iso(xa + 0.08, yb - 0.08, h - dep + 0.005),
    ]),
  ).fill({
    color: f.kind === 'chest' ? 0x4a2228 : shade(wood, 0.7),
    alpha: 0.9 * fade,
  });
  // The far inner walls the camera sees: the back one (facing us) and the west one, with planking.
  g.poly(pts([iso(xa, ya, h), iso(xb, ya, h), iso(xb, ya, h - dep), iso(xa, ya, h - dep)])).fill({
    color: shade(wood, 1.15),
    alpha: fade,
  });
  g.poly(pts([iso(xa, ya, h), iso(xa, yb, h), iso(xa, yb, h - dep), iso(xa, ya, h - dep)])).fill({
    color: shade(wood, 0.85),
    alpha: fade,
  });
  for (let k = 1; k < 4; k++) {
    const z = h - (dep * k) / 4;
    const p = iso(xa, ya, z);
    const q = iso(xb, ya, z);
    g.moveTo(p.x, p.y)
      .lineTo(q.x, q.y)
      .stroke({ width: 0.008, color: 0x000000, alpha: 0.35 * fade });
    const r = iso(xa, yb, z);
    g.moveTo(p.x, p.y)
      .lineTo(r.x, r.y)
      .stroke({ width: 0.008, color: 0x000000, alpha: 0.3 * fade });
  }
  // Shadow in the depths, then what is inside: a folded cloth, a book, a candle stub.
  g.poly(pts([iso(xa, ya, h), iso(xb, ya, h), iso(xb, ya, h - dep * 0.35), iso(xa, ya, h - dep * 0.35)])).fill({
    color: 0x000000,
    alpha: 0.25 * fade,
  });
  const mw = xb - xa;
  isoBlock(g, xa + mw * 0.12, ya + 0.1, xa + mw * 0.45, ya + 0.34, h - dep, h - dep + 0.07, {
    colour: 0x7a7468,
    alpha: fade,
    edge: 0.3,
    noAo: true,
  });
  isoBlock(g, xa + mw * 0.55, ya + 0.12, xa + mw * 0.78, ya + 0.3, h - dep, h - dep + 0.05, {
    colour: 0x5a2a2a,
    alpha: fade,
    edge: 0.3,
    noAo: true,
  });
  isoBlock(g, xb - 0.14, yb - 0.14, xb - 0.08, yb - 0.08, h - dep, h - dep + 0.12, {
    colour: 0xcfc6a4,
    alpha: fade,
    edge: 0.2,
    noAo: true,
  });
  // A cobweb across the back corner.
  const c = iso(xa + 0.02, ya + 0.02, h - 0.02);
  for (let k = 1; k <= 3; k++) {
    const e = iso(xa + 0.1 * k, ya + 0.02, h - 0.02 - 0.05 * k);
    g.moveTo(c.x, c.y)
      .lineTo(e.x, e.y)
      .stroke({ width: 0.005, color: 0xe8e8e0, alpha: 0.4 * fade });
  }
  // The rim of the opening, lit.
  g.poly(pts([iso(xa, ya, h), iso(xb, ya, h), iso(xb, yb, h), iso(xa, yb, h)])).stroke({
    width: 0.02,
    color: shade(wood, 1.6),
    alpha: 0.7 * fade,
  });
  // The lid, hinged at the back and lifted: we see its lined underside.
  const th = amt * 1.15;
  const reach = Math.cos(th) * d;
  const rise = Math.sin(th) * d;
  const lid = [
    iso(f.x0, f.y0, h),
    iso(f.x1, f.y0, h),
    iso(f.x1, f.y0 + reach, h + rise),
    iso(f.x0, f.y0 + reach, h + rise),
  ] as const;
  g.poly(pts(lid))
    .fill({ color: aged(f.colour, 1.05), alpha: 1 })
    .stroke({ width: 0.02, color: 0x120e0a, alpha: 0.85 });
  const m = (sx: number, t: number) => lerpP(lerpP(lid[0], lid[1], sx), lerpP(lid[3], lid[2], sx), t);
  g.poly(pts([m(0.07, 0.1), m(0.93, 0.1), m(0.93, 0.9), m(0.07, 0.9)])).fill({
    color: f.kind === 'chest' ? 0x5a1a24 : shade(wood, 1.2),
    alpha: 0.95,
  });
  // Stitching along the lining and an iron band.
  g.poly(pts([m(0.13, 0.17), m(0.87, 0.17), m(0.87, 0.83), m(0.13, 0.83)])).stroke({
    width: 0.008,
    color: 0xe8d8b8,
    alpha: 0.35,
  });
  g.poly(pts([m(0.42, 0), m(0.5, 0), m(0.5, 1), m(0.42, 1)])).fill({ color: 0x1a1612, alpha: 0.8 });
}
