import type { Graphics } from 'pixi.js';
import type { Point, solveSkeleton } from '../animation/skeleton';

/**
 * Inferno's premium model (owner, 13/11/2026: the visual-redesign prototype, after the owner's
 * reference images 2 and 3). Drawn on the same jointed rig as every fighter, so every existing
 * animation, attack, ability, dodge, reaction and KO drives it unchanged. A heroic, athletic build
 * in the painted fighting-game style of the references:
 * - anatomy: deltoid caps, biceps and forearm masses, a sculpted chest and abdominals, a narrow
 *   waist, quads and calves; head, neck, trapezius, shoulders, torso and pelvis joined as one body;
 * - materials: ember-orange skin painted in three tones (lit face, mid, shadow side) with a warm rim
 *   light, thick dark-ember outlines; charcoal armour (shoulder guard, bracers, knee and shin
 *   guards, boots, belt and trunks) with glowing seams;
 * - fire: a molten core in the chest, lava veins that pulse along the limbs, glowing fists, and a
 *   crest of flame for hair (all on the additive fire layer so they glow).
 * Light comes from the top-left of the screen whichever way he faces.
 */

type Skel = ReturnType<typeof solveSkeleton>;

/** Inferno's palette. */
export const MAGMA = {
  outline: 0x2a0c04,
  skin: 0xe2692c,
  skinLit: 0xffa057,
  skinShade: 0xa8381a,
  skinBack: 0xb9471f,
  rim: 0xffd27a,
  armour: 0x2b2524,
  armourLit: 0x5a504c,
  armourEdge: 0x0d0a0a,
  seam: 0xffa230,
  lava: 0xffe27a,
  glow: 0xff6a1a,
} as const;

export interface MagmaDrawState {
  /** 1 = facing right (the figure is mirrored in x by its container). */
  readonly facing: 1 | -1;
  /** Render clock, seconds (pulses and flicker). */
  readonly t: number;
  /** 0..1 hit flash toward `flashColour`. */
  readonly flash: number;
  readonly flashColour: number;
  /** The rig's limb width, metres. */
  readonly w: number;
  readonly headRadius: number;
  /** 0..1 how fast he moves (the hair streams back). */
  readonly motion: number;
}

/** How much bulkier than the rig's limb line the body is drawn. */
const BULK = 1.5;

const toward = (colour: number, target: number, k: number): number => {
  if (k <= 0) return colour;
  const kk = Math.min(1, k);
  const ch = (c: number, s: number) => (c >> s) & 0xff;
  const mix = (s: number) => Math.round(ch(colour, s) + (ch(target, s) - ch(colour, s)) * kk);
  return (mix(16) << 16) | (mix(8) << 8) | mix(0);
};

const lerp = (p: Point, q: Point, k: number): Point => ({ x: p.x + (q.x - p.x) * k, y: p.y + (q.y - p.y) * k });

/** Unit direction and normal of p→q. */
function frame(p: Point, q: Point): { ux: number; uy: number; nx: number; ny: number; l: number } {
  const dx = q.x - p.x;
  const dy = q.y - p.y;
  const l = Math.hypot(dx, dy) || 1e-6;
  return { ux: dx / l, uy: dy / l, nx: -dy / l, ny: dx / l, l };
}

/** A filled tapered capsule p→q with end radii ra, rb. */
function capsule(g: Graphics, p: Point, q: Point, ra: number, rb: number, colour: number, alpha = 1): void {
  const { nx, ny } = frame(p, q);
  g.poly([
    p.x + nx * ra,
    p.y + ny * ra,
    q.x + nx * rb,
    q.y + ny * rb,
    q.x - nx * rb,
    q.y - ny * rb,
    p.x - nx * ra,
    p.y - ny * ra,
  ])
    .circle(p.x, p.y, ra)
    .circle(q.x, q.y, rb)
    .fill({ color: colour, alpha });
}

/** A tapered band p→q with flat ends (shorts legs, bracers, guards). */
function sleeveQuad(g: Graphics, p: Point, q: Point, ra: number, rb: number, colour: number, alpha = 1): void {
  const { nx, ny } = frame(p, q);
  g.poly([
    p.x + nx * ra,
    p.y + ny * ra,
    q.x + nx * rb,
    q.y + ny * rb,
    q.x - nx * rb,
    q.y - ny * rb,
    p.x - nx * ra,
    p.y - ny * ra,
  ]).fill({
    color: colour,
    alpha,
  });
}

/** An oval centred at c, its long axis along (ux, uy), half-lengths a (along) and b (across). */
function oval(g: Graphics, c: Point, ux: number, uy: number, a: number, b: number, colour: number, alpha = 1): void {
  const pts: number[] = [];
  for (let i = 0; i < 18; i++) {
    const th = (i / 18) * Math.PI * 2;
    const ca = Math.cos(th) * a;
    const sb = Math.sin(th) * b;
    pts.push(c.x + ux * ca - uy * sb, c.y + uy * ca + ux * sb);
  }
  g.poly(pts).fill({ color: colour, alpha });
}

/** A band along p→q on one side of the axis, between fractions `from`..`to` of the radius. */
function band(
  g: Graphics,
  p: Point,
  q: Point,
  ra: number,
  rb: number,
  side: number,
  from: number,
  to: number,
  colour: number,
  alpha: number,
): void {
  const { nx, ny } = frame(p, q);
  const s = side;
  g.poly([
    p.x + nx * ra * from * s,
    p.y + ny * ra * from * s,
    q.x + nx * rb * from * s,
    q.y + ny * rb * from * s,
    q.x + nx * rb * to * s,
    q.y + ny * rb * to * s,
    p.x + nx * ra * to * s,
    p.y + ny * ra * to * s,
  ]).fill({ color: colour, alpha });
}

export class MagmaModel {
  /** Local light direction (toward the light): up and to the screen's left whichever way he faces. */
  private lx = -0.55;
  private ly = -0.83;
  private st!: MagmaDrawState;

  /**
   * Draw the whole body. `g` is the body layer (normal blending), `fire` the additive glow layer.
   * Order: far arm and leg, torso, near leg, head, near arm (the head sits behind the near arm).
   */
  draw(g: Graphics, fire: Graphics, s: Skel, st: MagmaDrawState): void {
    // A heroic build: the model's width unit is half again the rig's thin limb line.
    this.st = { ...st, w: st.w * BULK };
    this.lx = -0.55 * st.facing;
    this.ly = -0.83;
    this.arm(g, fire, s.armBack, true);
    this.leg(g, fire, s.legBack, true);
    this.torso(g, fire, s);
    this.leg(g, fire, s.legFront, false);
    this.head(g, fire, s);
    this.arm(g, fire, s.armFront, false);
  }

  // ---------------------------------------------------------------- colour helpers

  private c(colour: number): number {
    return toward(colour, this.st.flashColour, this.st.flash);
  }

  /** Which side of p→q faces the light: +1 or −1 (sign of the normal). */
  private litSide(p: Point, q: Point): number {
    const { nx, ny } = frame(p, q);
    return nx * this.lx + ny * this.ly >= 0 ? 1 : -1;
  }

  /**
   * A painted skin segment: outline, mid tone, shadow side, lit side, and a warm rim of fire-light
   * on the shadow edge. `far` darkens it (the limb on the far side of the body).
   */
  private flesh(g: Graphics, p: Point, q: Point, ra: number, rb: number, far: boolean): void {
    const o = this.st.w * 0.32;
    const base = this.c(far ? MAGMA.skinBack : MAGMA.skin);
    capsule(g, p, q, ra + o, rb + o, this.c(MAGMA.outline));
    capsule(g, p, q, ra, rb, base);
    const side = this.litSide(p, q);
    band(g, p, q, ra, rb, -side, 0.2, 1, this.c(far ? toward(MAGMA.skinShade, 0x000000, 0.25) : MAGMA.skinShade), 0.85);
    band(g, p, q, ra, rb, side, 0.1, 0.75, this.c(MAGMA.skinLit), far ? 0.35 : 0.7);
    band(g, p, q, ra, rb, -side, 0.84, 0.98, this.c(MAGMA.rim), far ? 0.25 : 0.55);
  }

  /** An armour plate along p→q (charcoal with a lit edge and a glowing seam). */
  private plate(
    g: Graphics,
    fire: Graphics,
    p: Point,
    q: Point,
    ra: number,
    rb: number,
    far: boolean,
    seam = true,
    sleeve = false,
  ): void {
    const o = this.st.w * 0.3;
    const shape = sleeve ? sleeveQuad : capsule;
    shape(g, p, q, ra + o, rb + o, this.c(MAGMA.armourEdge));
    shape(g, p, q, ra, rb, this.c(far ? toward(MAGMA.armour, 0x000000, 0.3) : MAGMA.armour));
    band(g, p, q, ra, rb, this.litSide(p, q), 0.25, 0.85, this.c(MAGMA.armourLit), far ? 0.4 : 0.8);
    if (!seam) return;
    // The glowing seam down the plate's middle.
    const { nx, ny } = frame(p, q);
    const off = -this.litSide(p, q) * 0.15;
    fire
      .moveTo(p.x + nx * ra * off, p.y + ny * ra * off)
      .lineTo(q.x + nx * rb * off, q.y + ny * rb * off)
      .stroke({ width: this.st.w * 0.16, color: MAGMA.seam, alpha: far ? 0.35 : 0.75, cap: 'round' });
  }

  /** A muscle mass: an outlined oval, lit on the light side. */
  private muscle(g: Graphics, c: Point, ux: number, uy: number, a: number, b: number, far: boolean): void {
    const o = this.st.w * 0.28;
    oval(g, c, ux, uy, a + o, b + o, this.c(MAGMA.outline));
    oval(g, c, ux, uy, a, b, this.c(far ? MAGMA.skinBack : MAGMA.skin));
    // Highlight toward the light.
    const lit = { x: c.x + this.lx * b * 0.35, y: c.y + this.ly * b * 0.35 };
    oval(g, lit, ux, uy, a * 0.62, b * 0.5, this.c(MAGMA.skinLit), far ? 0.3 : 0.65);
  }

  /** A pulsing lava vein: a jagged glowing line from p to q. */
  private vein(fire: Graphics, p: Point, q: Point, seed: number, far: boolean): void {
    const { nx, ny } = frame(p, q);
    const t = this.st.t;
    const pulse = 0.55 + 0.3 * Math.sin(t * 5 + seed * 2.1) + 0.15 * Math.sin(t * 13 + seed);
    const pts: Point[] = [];
    for (let i = 0; i <= 4; i++) {
      const k = i / 4;
      const j = (i % 2 ? 1 : -1) * this.st.w * 0.12 * (0.6 + 0.4 * Math.sin(seed * 3 + i));
      pts.push({ x: p.x + (q.x - p.x) * k + nx * j, y: p.y + (q.y - p.y) * k + ny * j });
    }
    for (const [width, colour, alpha] of [
      [this.st.w * 0.34, MAGMA.glow, 0.25],
      [this.st.w * 0.12, MAGMA.lava, 0.9],
    ] as const) {
      fire.moveTo(pts[0]!.x, pts[0]!.y);
      for (const v of pts.slice(1)) fire.lineTo(v.x, v.y);
      fire.stroke({ width, color: colour, alpha: alpha * pulse * (far ? 0.5 : 1), cap: 'round', join: 'round' });
    }
  }

  // ---------------------------------------------------------------- body parts

  private arm(g: Graphics, fire: Graphics, pts: readonly Point[], far: boolean): void {
    const [sh, el, hand] = pts as [Point, Point, Point];
    const w = this.st.w;
    // Upper arm with the biceps/triceps mass and a deltoid cap over the shoulder.
    this.flesh(g, sh, el, w * 0.66, w * 0.47, far);
    const u = frame(sh, el);
    const bi = lerp(sh, el, 0.45);
    const front = this.litSide(sh, el);
    this.muscle(
      g,
      { x: bi.x + u.nx * w * 0.08 * front, y: bi.y + u.ny * w * 0.08 * front },
      u.ux,
      u.uy,
      u.l * 0.3,
      w * 0.5,
      far,
    );
    // Forearm, tapering to the wrist, with a charcoal bracer over its lower two-thirds.
    this.flesh(g, el, hand, w * 0.52, w * 0.4, far);
    this.plate(g, fire, lerp(el, hand, 0.35), lerp(el, hand, 0.92), w * 0.5, w * 0.44, far, true, true);
    this.vein(fire, lerp(sh, el, 0.15), lerp(sh, el, 0.85), far ? 3 : 1, far);
    // Deltoid cap (the near shoulder wears a charcoal guard with a glowing rim).
    const capR = w * 0.55;
    const capC = lerp(sh, el, 0.12);
    if (far) {
      this.muscle(g, capC, u.ux, u.uy, capR, capR * 0.85, true);
    } else {
      g.circle(capC.x, capC.y, capR + w * 0.22).fill(this.c(MAGMA.armourEdge));
      g.circle(capC.x, capC.y, capR).fill(this.c(MAGMA.armour));
      g.circle(capC.x + this.lx * capR * 0.3, capC.y + this.ly * capR * 0.3, capR * 0.55).fill({
        color: this.c(MAGMA.armourLit),
        alpha: 0.8,
      });
      fire.arc(capC.x, capC.y, capR * 0.82, Math.PI * 0.15, Math.PI * 0.95).stroke({
        width: w * 0.14,
        color: MAGMA.seam,
        alpha: 0.75,
      });
    }
    this.fist(g, fire, el, hand, far);
  }

  /** A clenched fist: a rounded block with knuckles, glowing with heat. */
  private fist(g: Graphics, fire: Graphics, el: Point, hand: Point, far: boolean): void {
    const w = this.st.w;
    const u = frame(el, hand);
    const c = { x: hand.x + u.ux * w * 0.35, y: hand.y + u.uy * w * 0.35 };
    const r = w * 0.62;
    fire
      .circle(c.x, c.y, r * 2.1)
      .fill({ color: MAGMA.glow, alpha: (far ? 0.12 : 0.22) * (0.8 + 0.2 * Math.sin(this.st.t * 9)) });
    oval(g, c, u.ux, u.uy, r * 1.1 + w * 0.28, r + w * 0.28, this.c(MAGMA.outline));
    oval(g, c, u.ux, u.uy, r * 1.1, r, this.c(far ? MAGMA.skinBack : MAGMA.skin));
    oval(
      g,
      { x: c.x + this.lx * r * 0.3, y: c.y + this.ly * r * 0.3 },
      u.ux,
      u.uy,
      r * 0.6,
      r * 0.5,
      this.c(MAGMA.skinLit),
      far ? 0.3 : 0.7,
    );
    // Knuckle ridge across the front of the fist.
    const k0 = { x: c.x + u.ux * r * 0.7 + u.nx * r * 0.7, y: c.y + u.uy * r * 0.7 + u.ny * r * 0.7 };
    const k1 = { x: c.x + u.ux * r * 0.7 - u.nx * r * 0.7, y: c.y + u.uy * r * 0.7 - u.ny * r * 0.7 };
    g.moveTo(k0.x, k0.y)
      .lineTo(k1.x, k1.y)
      .stroke({ width: w * 0.12, color: this.c(MAGMA.skinShade), alpha: 0.8, cap: 'round' });
    fire
      .circle(c.x + u.ux * r * 0.4, c.y + u.uy * r * 0.4, r * 0.45)
      .fill({ color: MAGMA.lava, alpha: far ? 0.2 : 0.4 });
  }

  private leg(g: Graphics, fire: Graphics, pts: readonly Point[], far: boolean): void {
    const [hip, knee, ankle] = pts as [Point, Point, Point];
    const w = this.st.w;
    // Thigh with the quadriceps mass toward the front.
    this.flesh(g, hip, knee, w * 0.8, w * 0.55, far);
    const u = frame(hip, knee);
    const quad = lerp(hip, knee, 0.5);
    const fwd = u.nx >= 0 ? 1 : -1; // toward +x (his front)
    this.muscle(
      g,
      { x: quad.x + u.nx * w * 0.14 * fwd, y: quad.y + u.ny * w * 0.14 * fwd },
      u.ux,
      u.uy,
      u.l * 0.34,
      w * 0.62,
      far,
    );
    // Charcoal trunks over the top of the thigh.
    this.plate(g, fire, lerp(hip, knee, -0.05), lerp(hip, knee, 0.24), w * 0.84, w * 0.78, far, false, true);
    // Shin with the calf behind; a charcoal shin guard; a knee guard.
    this.flesh(g, knee, ankle, w * 0.58, w * 0.42, far);
    const v = frame(knee, ankle);
    const calf = lerp(knee, ankle, 0.32);
    const back = v.nx >= 0 ? -1 : 1;
    this.muscle(
      g,
      { x: calf.x + v.nx * w * 0.16 * back, y: calf.y + v.ny * w * 0.16 * back },
      v.ux,
      v.uy,
      v.l * 0.24,
      w * 0.5,
      far,
    );
    this.plate(g, fire, lerp(knee, ankle, 0.5), lerp(knee, ankle, 0.9), w * 0.5, w * 0.45, far, true, true);
    this.vein(fire, lerp(hip, knee, 0.42), lerp(hip, knee, 0.92), far ? 7 : 5, far);
    // A compact knee guard.
    const kr = w * 0.4;
    g.circle(knee.x, knee.y, kr + w * 0.2).fill(this.c(MAGMA.armourEdge));
    g.circle(knee.x, knee.y, kr).fill(this.c(far ? toward(MAGMA.armour, 0x000000, 0.3) : MAGMA.armour));
    g.circle(knee.x + this.lx * kr * 0.3, knee.y + this.ly * kr * 0.3, kr * 0.5).fill({
      color: this.c(MAGMA.armourLit),
      alpha: 0.8,
    });
    this.boot(g, fire, knee, ankle, far);
  }

  /** A boot pointing forward along the floor from the ankle (a heel, a sole and a toe cap). */
  private boot(g: Graphics, fire: Graphics, knee: Point, ankle: Point, far: boolean): void {
    const w = this.st.w;
    const v = frame(knee, ankle);
    // The foot points "forward" (+x in his frame), turned with the shin a little.
    const fx = Math.abs(v.uy) > 0.35 ? 1 : Math.sign(v.ux) || 1;
    const sole = { x: ankle.x + v.ux * w * 0.3, y: ankle.y + v.uy * w * 0.3 };
    const toe = { x: sole.x + fx * w * 1.3, y: sole.y + w * 0.06 };
    const heel = { x: sole.x - fx * w * 0.36, y: sole.y + w * 0.04 };
    const top = { x: ankle.x - v.ux * w * 0.3, y: ankle.y - v.uy * w * 0.3 };
    const outline = this.c(MAGMA.armourEdge);
    const shape = (grow: number) => [
      top.x - fx * (w * 0.34 + grow),
      top.y - grow,
      top.x + fx * (w * 0.38 + grow),
      top.y - grow,
      toe.x + fx * grow,
      toe.y - w * 0.3 - grow,
      toe.x + fx * grow,
      toe.y + grow,
      heel.x - fx * grow,
      heel.y + grow,
    ];
    g.poly(shape(w * 0.2)).fill(outline);
    g.poly(shape(0)).fill(this.c(far ? toward(MAGMA.armour, 0x000000, 0.3) : MAGMA.armour));
    // Lit upper and a glowing sole line.
    g.poly([
      top.x - fx * w * 0.14,
      top.y + w * 0.05,
      top.x + fx * w * 0.34,
      top.y + w * 0.05,
      toe.x - fx * w * 0.2,
      toe.y - w * 0.25,
    ]).fill({
      color: this.c(MAGMA.armourLit),
      alpha: far ? 0.35 : 0.7,
    });
    fire
      .moveTo(heel.x, heel.y - w * 0.06)
      .lineTo(toe.x, toe.y - w * 0.06)
      .stroke({
        width: w * 0.14,
        color: MAGMA.seam,
        alpha: far ? 0.35 : 0.8,
        cap: 'round',
      });
  }

  /** Pelvis to neck: one sculpted body with chest, abdominals, waist, belt and the molten core. */
  private torso(g: Graphics, fire: Graphics, s: Skel): void {
    const w = this.st.w;
    const base = s.pelvis;
    const top = s.chest;
    const u = frame(base, top);
    // The torso's outline as a smooth profile: hips, waist, ribcage, shoulders (half-widths).
    const prof: [number, number][] = [
      [-0.06, 0.82],
      [0.08, 0.86],
      [0.3, 0.72],
      [0.55, 1.02],
      [0.82, 1.28],
      [1.0, 1.32],
      [1.08, 0.9],
    ];
    const outline = (grow: number): number[] => {
      const left: number[] = [];
      const right: number[] = [];
      for (const [k, half] of prof) {
        const p = lerp(base, top, k);
        const h = half * w + grow;
        left.push(p.x + u.nx * h, p.y + u.ny * h);
        right.unshift(p.x - u.nx * h, p.y - u.ny * h);
      }
      // Pairs in `right` were unshifted as [x, y]: restore their order.
      const r: number[] = [];
      for (let i = 0; i < right.length; i += 2) r.push(right[i]!, right[i + 1]!);
      return [...left, ...r];
    };
    g.poly(outline(w * 0.32)).fill(this.c(MAGMA.outline));
    g.poly(outline(0)).fill(this.c(MAGMA.skin));
    // Trapezius up into the neck.
    const neckTop = lerp(top, s.neck, 0.9);
    capsule(g, top, neckTop, w * 0.62 + w * 0.3, w * 0.42 + w * 0.3, this.c(MAGMA.outline));
    capsule(g, top, neckTop, w * 0.62, w * 0.42, this.c(MAGMA.skin));
    band(g, top, neckTop, w * 0.62, w * 0.42, -this.litSide(top, neckTop), 0.2, 1, this.c(MAGMA.skinShade), 0.8);
    // Shading: the far side in shadow, the near side lit, a rim of fire-light on the shadow edge.
    const side = this.litSide(base, top);
    const shadeBand = (from: number, to: number, sgn: number, colour: number, alpha: number) => {
      const pts: number[] = [];
      for (const [k, half] of prof) {
        const p = lerp(base, top, k);
        pts.push(p.x + u.nx * half * w * from * sgn, p.y + u.ny * half * w * from * sgn);
      }
      for (let i = prof.length - 1; i >= 0; i--) {
        const [k, half] = prof[i]!;
        const p = lerp(base, top, k);
        pts.push(p.x + u.nx * half * w * to * sgn, p.y + u.ny * half * w * to * sgn);
      }
      g.poly(pts).fill({ color: colour, alpha });
    };
    shadeBand(0.15, 1, -side, this.c(MAGMA.skinShade), 0.8);
    shadeBand(0.05, 0.7, side, this.c(MAGMA.skinLit), 0.55);
    shadeBand(0.85, 0.98, -side, this.c(MAGMA.rim), 0.5);
    // Chest: two pectoral masses under the shoulders, split down the middle.
    const chestC = lerp(base, top, 0.78);
    const fwd = u.nx >= 0 ? 1 : -1; // toward +x (his front)
    for (const [off, k] of [
      [0.45, 1],
      [-0.25, 0.75],
    ] as const) {
      const c = { x: chestC.x + u.nx * w * off * fwd, y: chestC.y + u.ny * w * off * fwd };
      oval(g, c, u.nx, u.ny, w * 0.62 * k, w * 0.4, this.c(MAGMA.skinShade), 0.55);
      oval(
        g,
        { x: c.x + this.lx * w * 0.08, y: c.y + this.ly * w * 0.08 },
        u.nx,
        u.ny,
        w * 0.5 * k,
        w * 0.28,
        this.c(MAGMA.skinLit),
        0.55,
      );
    }
    // Abdominals: three rows of two, toward his front.
    for (let row = 0; row < 3; row++) {
      const p = lerp(base, top, 0.22 + row * 0.13);
      for (const col of [0.18, 0.55]) {
        const c = { x: p.x + u.nx * w * col * fwd, y: p.y + u.ny * w * col * fwd };
        oval(g, c, u.ux, u.uy, w * 0.2, w * 0.17, this.c(MAGMA.skinShade), 0.45);
        oval(
          g,
          { x: c.x + this.lx * w * 0.04, y: c.y + this.ly * w * 0.04 },
          u.ux,
          u.uy,
          w * 0.13,
          w * 0.11,
          this.c(MAGMA.skinLit),
          0.5,
        );
      }
    }
    // Belt with a glowing buckle, just above the hips.
    const b0 = lerp(base, top, 0.02);
    const b1 = lerp(base, top, 0.14);
    const beltHalf = w * 0.9;
    const beltPts = (grow: number) => [
      b0.x + u.nx * (beltHalf + grow),
      b0.y + u.ny * (beltHalf + grow),
      b1.x + u.nx * (beltHalf + grow),
      b1.y + u.ny * (beltHalf + grow),
      b1.x - u.nx * (beltHalf + grow),
      b1.y - u.ny * (beltHalf + grow),
      b0.x - u.nx * (beltHalf + grow),
      b0.y - u.ny * (beltHalf + grow),
    ];
    g.poly(beltPts(w * 0.22)).fill(this.c(MAGMA.armourEdge));
    g.poly(beltPts(0)).fill(this.c(MAGMA.armour));
    const buckle = lerp(b0, b1, 0.5);
    const bc = { x: buckle.x + u.nx * w * 0.45 * fwd, y: buckle.y + u.ny * w * 0.45 * fwd };
    g.circle(bc.x, bc.y, w * 0.32).fill(this.c(MAGMA.armourLit));
    fire.circle(bc.x, bc.y, w * 0.2).fill({ color: MAGMA.seam, alpha: 0.9 });
    // The molten core in his chest: a glowing heart of fire with cracks running out of it.
    const t = this.st.t;
    const pulse = 0.75 + 0.25 * Math.sin(t * 4);
    const core = {
      x: chestC.x + u.nx * w * 0.18 * fwd - u.ux * w * 0.05,
      y: chestC.y + u.ny * w * 0.18 * fwd - u.uy * w * 0.05,
    };
    g.circle(core.x, core.y, w * 0.42).fill(this.c(MAGMA.armourEdge));
    for (const [r, colour, alpha] of [
      [w * 1.1, MAGMA.glow, 0.18 * pulse],
      [w * 0.36, MAGMA.glow, 0.85],
      [w * 0.24, MAGMA.lava, 0.95],
      [w * 0.11, 0xffffff, 0.9 * pulse],
    ] as const)
      fire.circle(core.x, core.y, r).fill({ color: colour, alpha });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.6;
      const len = w * (0.55 + 0.15 * Math.sin(t * 3 + i));
      fire
        .moveTo(core.x + Math.cos(a) * w * 0.3, core.y + Math.sin(a) * w * 0.3)
        .lineTo(core.x + Math.cos(a + 0.25) * len, core.y + Math.sin(a + 0.25) * len)
        .stroke({ width: w * 0.08, color: MAGMA.lava, alpha: 0.7 * pulse, cap: 'round' });
    }
  }

  /** The head: a strong jaw and brow under a crest of flame; a dark ember face with no eyes. */
  private head(g: Graphics, fire: Graphics, s: Skel): void {
    const r = this.st.headRadius;
    const w = this.st.w;
    const h = s.head;
    const u = frame(s.neck, h); // up along the neck
    // Neck.
    capsule(g, s.neck, h, w * 0.42 + w * 0.3, w * 0.4 + w * 0.3, this.c(MAGMA.outline));
    capsule(g, s.neck, h, w * 0.42, w * 0.4, this.c(MAGMA.skin));
    // Skull and jaw: a round cranium with a squarer jaw toward his front and down.
    const jaw = { x: h.x + r * 0.28 - u.ux * r * 0.45, y: h.y - u.uy * r * 0.45 + r * 0.05 };
    const skull = (grow: number, colour: number) => {
      g.circle(h.x, h.y - r * 0.05, r + grow).fill(colour);
      oval(g, jaw, 1, 0, r * 0.72 + grow, r * 0.55 + grow, colour);
    };
    skull(w * 0.32, this.c(MAGMA.outline));
    skull(0, this.c(MAGMA.skin));
    // Shadow on the far side, light on the near, rim of fire on the back of the head.
    oval(
      g,
      { x: h.x - this.lx * r * 0.35, y: h.y - this.ly * r * 0.3 },
      1,
      0,
      r * 0.85,
      r * 0.75,
      this.c(MAGMA.skinShade),
      0.6,
    );
    oval(
      g,
      { x: h.x + this.lx * r * 0.35, y: h.y + this.ly * r * 0.35 },
      1,
      0,
      r * 0.5,
      r * 0.42,
      this.c(MAGMA.skinLit),
      0.7,
    );
    // The face (no eyes or mouth: owner, 12/11/2026 and 13/11/2026): a heavy brow casting a shadow
    // band, a strong nose ridge, a lit cheekbone and a square jaw line, all in his ember skin.
    const fx = h.x + r * 0.55;
    oval(g, { x: fx, y: h.y + r * 0.02 }, 0.2, 1, r * 0.42, r * 0.3, this.c(MAGMA.skinShade), 0.55); // brow shadow
    g.moveTo(h.x + r * 0.05, h.y - r * 0.3)
      .quadraticCurveTo(h.x + r * 0.7, h.y - r * 0.42, h.x + r * 1.02, h.y - r * 0.12)
      .stroke({ width: r * 0.2, color: this.c(MAGMA.outline), cap: 'round' }); // brow ridge
    g.moveTo(h.x + r * 0.1, h.y - r * 0.38)
      .quadraticCurveTo(h.x + r * 0.62, h.y - r * 0.5, h.x + r * 0.9, h.y - r * 0.3)
      .stroke({ width: r * 0.1, color: this.c(MAGMA.skinLit), alpha: 0.8, cap: 'round' }); // lit brow
    g.moveTo(h.x + r * 0.98, h.y - r * 0.1)
      .lineTo(h.x + r * 1.12, h.y + r * 0.22)
      .lineTo(h.x + r * 0.96, h.y + r * 0.3)
      .stroke({ width: r * 0.1, color: this.c(MAGMA.outline), cap: 'round', join: 'round' }); // nose
    oval(g, { x: h.x + r * 0.55, y: h.y + r * 0.3 }, 1, 0.3, r * 0.22, r * 0.12, this.c(MAGMA.skinLit), 0.75); // cheekbone
    g.moveTo(h.x + r * 0.1, h.y + r * 0.62)
      .quadraticCurveTo(h.x + r * 0.7, h.y + r * 0.86, h.x + r * 0.98, h.y + r * 0.56)
      .stroke({ width: r * 0.08, color: this.c(MAGMA.skinShade), alpha: 0.9, cap: 'round' }); // jaw line
    this.crest(fire, h, r);
  }

  /** A crest of flame for hair: tongues swept back and up from the crown, streaming with speed. */
  private crest(fire: Graphics, h: Point, r: number): void {
    const t = this.st.t;
    const back = -0.35 - this.st.motion * 0.9;
    for (const L of [
      { n: 6, colour: 0xff3c14, alpha: 0.6, len: 1.9, w: 0.4 },
      { n: 5, colour: 0xff8c1e, alpha: 0.7, len: 1.5, w: 0.36 },
      { n: 4, colour: 0xffd95a, alpha: 0.8, len: 1.05, w: 0.32 },
    ]) {
      for (let i = 0; i < L.n; i++) {
        const k = (i + 0.5) / L.n; // front of the crown to the back
        const bx = h.x + r * (0.55 - k * 1.25);
        const by = h.y - r * (0.75 + 0.15 * Math.sin(k * Math.PI));
        const flick = Math.sin(t * 9 + i * 2.1 + L.len * 3) * 0.5 + Math.sin(t * 15.3 + i * 1.3) * 0.3;
        const tipX = bx + back * r * (0.6 + k) + flick * r * 0.2;
        const tipY = by - r * (L.len * (0.65 + 0.35 * Math.sin(k * Math.PI)) + flick * 0.15);
        const bw = r * L.w;
        fire
          .moveTo(bx - bw, by + r * 0.15)
          .bezierCurveTo(bx - bw * 1.2, by - r * 0.4, tipX - bw * 0.4, tipY + r * 0.5, tipX, tipY)
          .bezierCurveTo(tipX + bw * 0.4, tipY + r * 0.5, bx + bw * 1.2, by - r * 0.4, bx + bw, by + r * 0.15)
          .fill({ color: L.colour, alpha: L.alpha });
      }
    }
    for (let i = 0; i < 5; i++) {
      const k = (t * 0.8 + i / 5) % 1;
      fire
        .circle(
          h.x - r * (0.2 + k * 0.8) + Math.sin(i * 4 + t * 3) * r * 0.4,
          h.y - r * (1.3 + k * 2.4),
          r * 0.08 * (1 - k * 0.6),
        )
        .fill({
          color: 0xffb03c,
          alpha: 1 - k,
        });
    }
  }
}
