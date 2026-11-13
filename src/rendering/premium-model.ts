import type { Graphics } from 'pixi.js';
import type { Point, solveSkeleton } from '../animation/skeleton';

/**
 * Premium fighter models (owner, 13/11/2026: approved on Inferno, then "the same styling for
 * everything"; reference images 2 and 3). One painter, drawn on the same jointed rig as every
 * fighter, so every existing animation, attack, ability, dodge, reaction and KO drives it unchanged;
 * each fighter's look is a SKIN (palette, build and gear), chosen by its body style:
 * - anatomy: deltoid caps, biceps and forearm masses, chest and abdominals, a narrow waist, quads and
 *   calves (scaled by the skin's `muscle`); head, neck, trapezius, shoulders and pelvis are one body;
 * - materials: skin or fabric painted in three tones with a rim light and thick dark outlines;
 *   armour, cuffs, wraps, belts, trunks or long trousers, boots or bare feet;
 * - garments: a robe or a tattered cloak falling from the waist over both legs;
 * - element details: glowing seams, a chest core, pulsing veins and glowing fists (fire skins), a
 *   bone ribcage plate and pauldron (death skins), a flame crest for hair.
 * Light comes from the top-left of the screen whichever way the fighter faces.
 */

type Skel = ReturnType<typeof solveSkeleton>;

export interface PremiumPalette {
  readonly outline: number;
  readonly skin: number;
  readonly skinLit: number;
  readonly skinShade: number;
  readonly skinBack: number;
  readonly rim: number;
  readonly armour: number;
  readonly armourLit: number;
  readonly armourEdge: number;
  /** Glow colours (null: no glowing seams, veins or core). */
  readonly seam: number | null;
  readonly lava: number | null;
  readonly glow: number | null;
  /** Hands, if not skin (gloves, bone). */
  readonly hand?: number;
}

export interface PremiumSkin {
  readonly palette: PremiumPalette;
  /** Width multiplier over the rig's limb line. */
  readonly bulk: number;
  /** 0 = smooth (fabric, mannequin), 1 = athletic, more = brute. */
  readonly muscle: number;
  readonly gear: {
    readonly shoulder: 'guard' | 'bone' | 'none';
    readonly bracers: boolean;
    /** Lower-body clothing: short trunks, full trousers, or nothing. */
    readonly legs: 'trunks' | 'trousers' | 'none';
    readonly kneeGuards: boolean;
    readonly shinGuards: boolean;
    readonly feet: 'boots' | 'bare';
    readonly belt: boolean;
    /** Bone ribcage plate on the chest. */
    readonly ribcage?: boolean;
    /** Ball joints at the shoulders, elbows and knees (a mannequin). */
    readonly joints?: boolean;
  };
  readonly fire: { readonly core: boolean; readonly veins: boolean; readonly fists: boolean };
  /** A long garment from the waist over both legs: a robe, or a cloak with a tattered hem. */
  readonly garment?: {
    readonly hem: 'robe' | 'tattered';
    readonly trim?: number;
    /** The cloth's own colours (base, lit, shade); default: the skin's. */
    readonly cloth?: readonly [number, number, number];
  };
  /**
   * The sculpted head (drawn here): a flame crest, a bald brawler, a hood with glowing eyes, a hood
   * and white mask, a mannequin egg; or 'own' (the view draws its head style).
   */
  readonly head: 'crest' | 'brute' | 'cowl' | 'mask' | 'egg' | 'own';
}

/** Fire (the approved Inferno look). */
export const MAGMA: PremiumPalette = {
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
};

let preview = false;
/** Turn the redesign proposal on (the `?redesign` page option). Off by default: the game is unchanged. */
export function setRedesignPreview(on: boolean): void {
  preview = on;
}
export function redesignPreview(): boolean {
  return preview;
}

/**
 * Redesign proposal (owner, 13/11/2026: "recreate the look" of Inferno for the others; preview
 * only, behind `?redesign`, until approved). Every fighter gets Inferno's full treatment (the
 * painted three-tone body, the armour set with glowing seams, element core, veins and glowing
 * hands), themed to the fighter. Keyed by body style (no character names in shared code).
 */
export const PREMIUM_SKINS: Readonly<Record<string, PremiumSkin>> = {
  // Steel brawler: grey skin with a cold rim light, gunmetal armour with icy-blue energy seams and a
  // steel heart glowing in the chest; a sculpted bald head.
  muscle: {
    palette: {
      outline: 0x14171c,
      skin: 0x9aa0aa,
      skinLit: 0xd2d7df,
      skinShade: 0x5c626d,
      skinBack: 0x777d88,
      rim: 0xc8e6ff,
      armour: 0x30353f,
      armourLit: 0x6c7689,
      armourEdge: 0x0a0c11,
      seam: 0x7fd4ff,
      lava: 0xdff6ff,
      glow: 0x3aa8ff,
    },
    bulk: 1.7,
    muscle: 1.3,
    gear: {
      shoulder: 'guard',
      bracers: true,
      legs: 'trunks',
      kneeGuards: true,
      shinGuards: true,
      feet: 'boots',
      belt: true,
    },
    fire: { core: true, veins: false, fists: false },
    head: 'brute',
  },
  // Death mage: ash-violet skin, violet-black armour with glowing violet seams, a soul core, violet
  // veins and glowing hands; a robe falling from the sash; a hood with two glowing eyes.
  robe: {
    // Mage of Death (owner, 13/11/2026): deep black and dark purple, cursed-violet seams with a thin
    // sickly-green core, kept dark and sinister rather than bright.
    palette: {
      outline: 0x050308,
      skin: 0x1d1426,
      skinLit: 0x3a2a4f,
      skinShade: 0x0c0812,
      skinBack: 0x150e1c,
      rim: 0x8c62c0,
      armour: 0x16101d,
      armourLit: 0x352845,
      armourEdge: 0x050308,
      seam: 0x7b3fc4,
      lava: 0xa9e07c,
      glow: 0x5a1f9a,
    },
    bulk: 1.35,
    muscle: 0,
    gear: {
      shoulder: 'guard',
      bracers: true,
      legs: 'none',
      kneeGuards: false,
      shinGuards: false,
      feet: 'boots',
      belt: true,
    },
    fire: { core: true, veins: true, fists: true },
    garment: { hem: 'robe', trim: 0x6a34a8, cloth: [0x1f1229, 0x3b2350, 0x0d0712] },
    head: 'cowl',
  },
  // Masked stalker: a black bodysuit with a crimson rim light, black leather armour with crimson
  // seams and veins, a tattered black cloak from the belt, and the white mask under a hood.
  cloak: {
    palette: {
      outline: 0x050507,
      skin: 0x2d2d35,
      skinLit: 0x585862,
      skinShade: 0x15151a,
      skinBack: 0x212128,
      rim: 0xff6b6b,
      armour: 0x1c1616,
      armourLit: 0x433434,
      armourEdge: 0x050303,
      seam: 0xe5242e,
      lava: 0xff9a9a,
      glow: 0xb3101a,
      hand: 0x17171c,
    },
    bulk: 1.35,
    muscle: 0.75,
    gear: {
      shoulder: 'guard',
      bracers: true,
      legs: 'none',
      kneeGuards: true,
      shinGuards: true,
      feet: 'boots',
      belt: true,
    },
    fire: { core: false, veins: true, fists: false },
    garment: { hem: 'tattered', trim: 0x8c1018 },
    head: 'mask',
  },
  // Training mannequin: a pale shell, ball joints, grey guards with hazard-yellow seams.
  solid: {
    palette: {
      outline: 0x2e333d,
      skin: 0xc9ced8,
      skinLit: 0xf1f3f7,
      skinShade: 0x8c93a1,
      skinBack: 0xa7adba,
      rim: 0xffffff,
      armour: 0x5d6472,
      armourLit: 0x8f97a6,
      armourEdge: 0x232730,
      seam: 0xffc83a,
      lava: 0xfff0b0,
      glow: 0xffb000,
    },
    bulk: 1.35,
    muscle: 0.5,
    gear: {
      shoulder: 'guard',
      bracers: true,
      legs: 'none',
      kneeGuards: true,
      shinGuards: false,
      feet: 'bare',
      belt: true,
      joints: true,
    },
    fire: { core: false, veins: false, fists: false },
    head: 'egg',
  },
};

export interface PremiumDrawState {
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
  /** 0..1 how fast it moves (a flame crest streams back). */
  readonly motion: number;
  /** A temporary tint over the whole body (a fury buff flushing red), 0..1. */
  readonly tint?: { readonly colour: number; readonly k: number };
  /** Draws the fighter's own head style (skins with `head: 'own'`), after the body, before the near arm. */
  readonly drawHead?: () => void;
}

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

export class PremiumModel {
  private readonly P: PremiumPalette;

  constructor(private readonly skin: PremiumSkin) {
    this.P = skin.palette;
  }

  /** Local light direction (toward the light): up and to the screen's left whichever way he faces. */
  private lx = -0.55;
  private ly = -0.83;
  private st!: PremiumDrawState;

  /**
   * Draw the whole body. `g` is the body layer (normal blending), `fire` the additive glow layer.
   * Order: far arm and leg, torso, near leg, head, near arm (the head sits behind the near arm).
   */
  draw(g: Graphics, fire: Graphics, s: Skel, st: PremiumDrawState): void {
    // The model's width unit is the rig's thin limb line times the skin's build.
    this.st = { ...st, w: st.w * this.skin.bulk };
    this.lx = -0.55 * st.facing;
    this.ly = -0.83;
    this.arm(g, fire, s.armBack, true);
    this.leg(g, fire, s.legBack, true);
    if (this.skin.garment) {
      // A long garment hangs over both legs, under the torso.
      this.leg(g, fire, s.legFront, false);
      this.garment(g, s);
      this.torso(g, fire, s);
    } else {
      this.torso(g, fire, s);
      this.leg(g, fire, s.legFront, false);
    }
    const hs = this.skin.head;
    if (hs === 'crest' || hs === 'brute') this.head(g, fire, s, hs);
    else if (hs === 'cowl' || hs === 'mask') this.hooded(g, fire, s, hs);
    else if (hs === 'egg') this.egg(g, s);
    else {
      this.neck(g, s);
      st.drawHead?.();
    }
    this.arm(g, fire, s.armFront, false);
  }

  // ---------------------------------------------------------------- colour helpers

  private c(colour: number): number {
    const tinted = this.st.tint ? toward(colour, this.st.tint.colour, this.st.tint.k) : colour;
    return toward(tinted, this.st.flashColour, this.st.flash);
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
    const base = this.c(far ? this.P.skinBack : this.P.skin);
    capsule(g, p, q, ra + o, rb + o, this.c(this.P.outline));
    capsule(g, p, q, ra, rb, base);
    const side = this.litSide(p, q);
    band(
      g,
      p,
      q,
      ra,
      rb,
      -side,
      0.2,
      1,
      this.c(far ? toward(this.P.skinShade, 0x000000, 0.25) : this.P.skinShade),
      0.85,
    );
    band(g, p, q, ra, rb, side, 0.1, 0.75, this.c(this.P.skinLit), far ? 0.35 : 0.7);
    band(g, p, q, ra, rb, -side, 0.84, 0.98, this.c(this.P.rim), far ? 0.25 : 0.55);
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
    shape(g, p, q, ra + o, rb + o, this.c(this.P.armourEdge));
    shape(g, p, q, ra, rb, this.c(far ? toward(this.P.armour, 0x000000, 0.3) : this.P.armour));
    band(g, p, q, ra, rb, this.litSide(p, q), 0.25, 0.85, this.c(this.P.armourLit), far ? 0.4 : 0.8);
    if (!seam || this.P.seam === null) return;
    // The glowing seam down the plate's middle.
    const { nx, ny } = frame(p, q);
    const off = -this.litSide(p, q) * 0.15;
    fire
      .moveTo(p.x + nx * ra * off, p.y + ny * ra * off)
      .lineTo(q.x + nx * rb * off, q.y + ny * rb * off)
      .stroke({ width: this.st.w * 0.16, color: this.P.seam, alpha: far ? 0.35 : 0.75, cap: 'round' });
  }

  /** A muscle mass: an outlined oval, lit on the light side. */
  private muscle(g: Graphics, c: Point, ux: number, uy: number, a: number, b: number, far: boolean): void {
    const o = this.st.w * 0.28;
    oval(g, c, ux, uy, a + o, b + o, this.c(this.P.outline));
    oval(g, c, ux, uy, a, b, this.c(far ? this.P.skinBack : this.P.skin));
    // Highlight toward the light.
    const lit = { x: c.x + this.lx * b * 0.35, y: c.y + this.ly * b * 0.35 };
    oval(g, lit, ux, uy, a * 0.62, b * 0.5, this.c(this.P.skinLit), far ? 0.3 : 0.65);
  }

  /** A pulsing lava vein: a jagged glowing line from p to q. */
  private vein(fire: Graphics, p: Point, q: Point, seed: number, far: boolean): void {
    if (this.P.glow === null || this.P.lava === null) return;
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
      [this.st.w * 0.34, this.P.glow, 0.25],
      [this.st.w * 0.12, this.P.lava, 0.9],
    ] as const) {
      fire.moveTo(pts[0]!.x, pts[0]!.y);
      for (const v of pts.slice(1)) fire.lineTo(v.x, v.y);
      fire.stroke({ width, color: colour, alpha: alpha * pulse * (far ? 0.5 : 1), cap: 'round', join: 'round' });
    }
  }

  // ---------------------------------------------------------------- body parts

  /** A ball joint (mannequin skins): a shaded sphere at the joint. */
  private joint(g: Graphics, c: Point, r: number, far: boolean): void {
    if (!this.skin.gear.joints) return;
    g.circle(c.x, c.y, r + this.st.w * 0.2).fill(this.c(this.P.outline));
    g.circle(c.x, c.y, r).fill(this.c(far ? toward(this.P.armour, 0x000000, 0.25) : this.P.armour));
    g.circle(c.x + this.lx * r * 0.3, c.y + this.ly * r * 0.3, r * 0.45).fill({
      color: this.c(this.P.armourLit),
      alpha: 0.8,
    });
  }

  private arm(g: Graphics, fire: Graphics, pts: readonly Point[], far: boolean): void {
    const [sh, el, hand] = pts as [Point, Point, Point];
    const w = this.st.w;
    const m = this.skin.muscle;
    const gear = this.skin.gear;
    // Upper arm with the biceps/triceps mass and a deltoid cap over the shoulder.
    this.flesh(g, sh, el, w * (0.5 + 0.16 * Math.min(1.4, m)), w * 0.47, far);
    const u = frame(sh, el);
    const bi = lerp(sh, el, 0.45);
    const front = this.litSide(sh, el);
    if (m > 0)
      this.muscle(
        g,
        { x: bi.x + u.nx * w * 0.08 * front, y: bi.y + u.ny * w * 0.08 * front },
        u.ux,
        u.uy,
        u.l * 0.3 * Math.min(1.25, m),
        w * 0.5 * m,
        far,
      );
    // Forearm, tapering to the wrist; bracers or wraps over its lower part; a flared sleeve cuff
    // on a robe or cloak.
    this.flesh(g, el, hand, w * 0.52, w * 0.4, far);
    if (gear.bracers)
      this.plate(g, fire, lerp(el, hand, 0.35), lerp(el, hand, 0.92), w * 0.5, w * 0.44, far, true, true);
    if (this.skin.garment) this.cuff(g, el, hand, far);
    if (this.skin.fire.veins) this.vein(fire, lerp(sh, el, 0.15), lerp(sh, el, 0.85), far ? 3 : 1, far);
    this.joint(g, el, w * 0.3, far);
    // The shoulder: an armour guard, a bone pauldron, a mannequin joint, or a deltoid cap.
    const capR = w * 0.55;
    const capC = lerp(sh, el, 0.12);
    if (!far && gear.shoulder === 'guard') {
      g.circle(capC.x, capC.y, capR + w * 0.22).fill(this.c(this.P.armourEdge));
      g.circle(capC.x, capC.y, capR).fill(this.c(this.P.armour));
      g.circle(capC.x + this.lx * capR * 0.3, capC.y + this.ly * capR * 0.3, capR * 0.55).fill({
        color: this.c(this.P.armourLit),
        alpha: 0.8,
      });
      if (this.P.seam !== null)
        fire.arc(capC.x, capC.y, capR * 0.82, Math.PI * 0.15, Math.PI * 0.95).stroke({
          width: w * 0.14,
          color: this.P.seam,
          alpha: 0.75,
        });
    } else if (!far && gear.shoulder === 'bone') {
      this.bonePauldron(g, sh);
    } else if (gear.joints) {
      this.joint(g, sh, w * 0.36, far);
    } else if (m > 0) {
      this.muscle(g, capC, u.ux, u.uy, capR * Math.min(1.3, m), capR * 0.85 * Math.min(1.3, m), far);
    }
    this.fist(g, fire, el, hand, far);
  }

  /** A flared sleeve cuff at the wrist (robes and cloaks). */
  private cuff(g: Graphics, el: Point, hand: Point, far: boolean): void {
    const w = this.st.w;
    const u = frame(el, hand);
    const a = lerp(el, hand, 0.62);
    const b = lerp(el, hand, 1.02);
    const flare = this.skin.garment?.hem === 'tattered' ? 0.85 : 0.75;
    const pts = (grow: number) => [
      a.x + u.nx * (w * 0.5 + grow),
      a.y + u.ny * (w * 0.5 + grow),
      b.x + u.nx * (w * flare + grow),
      b.y + u.ny * (w * flare + grow),
      b.x - u.nx * (w * flare + grow),
      b.y - u.ny * (w * flare + grow),
      a.x - u.nx * (w * 0.5 + grow),
      a.y - u.ny * (w * 0.5 + grow),
    ];
    g.poly(pts(w * 0.22)).fill(this.c(this.P.outline));
    g.poly(pts(0)).fill(this.c(far ? this.P.skinBack : this.P.skin));
    band(g, a, b, w * 0.5, w * flare, -this.litSide(a, b), 0.2, 1, this.c(this.P.skinShade), 0.8);
    const trim = this.skin.garment?.trim;
    if (trim !== undefined)
      g.moveTo(b.x + u.nx * w * flare, b.y + u.ny * w * flare)
        .lineTo(b.x - u.nx * w * flare, b.y - u.ny * w * flare)
        .stroke({ width: w * 0.16, color: this.c(trim), alpha: far ? 0.5 : 0.9, cap: 'round' });
  }

  /** A clenched fist: a rounded block with knuckles (glowing with heat on fire skins). */
  private fist(g: Graphics, fire: Graphics, el: Point, hand: Point, far: boolean): void {
    const w = this.st.w;
    const u = frame(el, hand);
    const c = { x: hand.x + u.ux * w * 0.35, y: hand.y + u.uy * w * 0.35 };
    const r = w * 0.62 * (this.skin.muscle > 1.2 ? 0.85 : 1);
    const handColour = this.P.hand ?? this.P.skin;
    const glowing = this.skin.fire.fists && this.P.glow !== null && this.P.lava !== null;
    if (glowing)
      fire.circle(c.x, c.y, r * 2.1).fill({
        color: this.P.glow as number,
        alpha: (far ? 0.12 : 0.22) * (0.8 + 0.2 * Math.sin(this.st.t * 9)),
      });
    oval(g, c, u.ux, u.uy, r * 1.1 + w * 0.28, r + w * 0.28, this.c(this.P.outline));
    oval(g, c, u.ux, u.uy, r * 1.1, r, this.c(far ? toward(handColour, 0x000000, 0.2) : handColour));
    oval(
      g,
      { x: c.x + this.lx * r * 0.3, y: c.y + this.ly * r * 0.3 },
      u.ux,
      u.uy,
      r * 0.6,
      r * 0.5,
      this.c(toward(handColour, 0xffffff, 0.35)),
      far ? 0.3 : 0.7,
    );
    // Knuckle ridge across the front of the fist.
    const k0 = { x: c.x + u.ux * r * 0.7 + u.nx * r * 0.7, y: c.y + u.uy * r * 0.7 + u.ny * r * 0.7 };
    const k1 = { x: c.x + u.ux * r * 0.7 - u.nx * r * 0.7, y: c.y + u.uy * r * 0.7 - u.ny * r * 0.7 };
    g.moveTo(k0.x, k0.y)
      .lineTo(k1.x, k1.y)
      .stroke({ width: w * 0.12, color: this.c(toward(handColour, 0x000000, 0.35)), alpha: 0.8, cap: 'round' });
    if (glowing)
      fire
        .circle(c.x + u.ux * r * 0.4, c.y + u.uy * r * 0.4, r * 0.45)
        .fill({ color: this.P.lava as number, alpha: far ? 0.2 : 0.4 });
  }

  private leg(g: Graphics, fire: Graphics, pts: readonly Point[], far: boolean): void {
    const [hip, knee, ankle] = pts as [Point, Point, Point];
    const w = this.st.w;
    const m = this.skin.muscle;
    const gear = this.skin.gear;
    const trousers = gear.legs === 'trousers';
    // Thigh with the quadriceps mass toward the front (cloth over it for trousers).
    if (trousers) this.plate(g, fire, hip, knee, w * 0.74, w * 0.56, far, false, false);
    else this.flesh(g, hip, knee, w * 0.8, w * 0.55, far);
    const u = frame(hip, knee);
    const quad = lerp(hip, knee, 0.5);
    const fwd = u.nx >= 0 ? 1 : -1; // toward +x (the front)
    if (m > 0 && !trousers)
      this.muscle(
        g,
        { x: quad.x + u.nx * w * 0.14 * fwd, y: quad.y + u.ny * w * 0.14 * fwd },
        u.ux,
        u.uy,
        u.l * 0.34,
        w * 0.62 * Math.min(1.2, m),
        far,
      );
    if (gear.legs === 'trunks')
      this.plate(g, fire, lerp(hip, knee, -0.05), lerp(hip, knee, 0.24), w * 0.84, w * 0.78, far, false, true);
    // Shin with the calf behind.
    if (trousers) this.plate(g, fire, knee, lerp(knee, ankle, 0.92), w * 0.54, w * 0.46, far, false, false);
    else this.flesh(g, knee, ankle, w * 0.58, w * 0.42, far);
    const v = frame(knee, ankle);
    const calf = lerp(knee, ankle, 0.32);
    const back = v.nx >= 0 ? -1 : 1;
    if (m > 0 && !trousers)
      this.muscle(
        g,
        { x: calf.x + v.nx * w * 0.16 * back, y: calf.y + v.ny * w * 0.16 * back },
        v.ux,
        v.uy,
        v.l * 0.24,
        w * 0.5 * Math.min(1.2, m),
        far,
      );
    if (trousers) {
      // Cloth folds behind the knee and a lit crease down the front.
      g.moveTo(knee.x - v.nx * w * 0.2, knee.y - v.ny * w * 0.2)
        .lineTo(lerp(knee, ankle, 0.25).x, lerp(knee, ankle, 0.25).y)
        .stroke({ width: w * 0.08, color: this.c(this.P.armourEdge), alpha: 0.6, cap: 'round' });
    }
    if (gear.shinGuards)
      this.plate(g, fire, lerp(knee, ankle, 0.5), lerp(knee, ankle, 0.9), w * 0.5, w * 0.45, far, true, true);
    if (this.skin.fire.veins) this.vein(fire, lerp(hip, knee, 0.42), lerp(hip, knee, 0.92), far ? 7 : 5, far);
    if (gear.kneeGuards) {
      const kr = w * 0.4;
      g.circle(knee.x, knee.y, kr + w * 0.2).fill(this.c(this.P.armourEdge));
      g.circle(knee.x, knee.y, kr).fill(this.c(far ? toward(this.P.armour, 0x000000, 0.3) : this.P.armour));
      g.circle(knee.x + this.lx * kr * 0.3, knee.y + this.ly * kr * 0.3, kr * 0.5).fill({
        color: this.c(this.P.armourLit),
        alpha: 0.8,
      });
    }
    this.joint(g, knee, w * 0.34, far);
    this.boot(g, fire, knee, ankle, far);
  }

  /** A foot pointing forward along the floor from the ankle: a boot, or a bare/mannequin foot. */
  private boot(g: Graphics, fire: Graphics, knee: Point, ankle: Point, far: boolean): void {
    const w = this.st.w;
    const v = frame(knee, ankle);
    const bare = this.skin.gear.feet === 'bare';
    // The foot points "forward" (+x in the fighter's frame), turned with the shin a little.
    const fx = Math.abs(v.uy) > 0.35 ? 1 : Math.sign(v.ux) || 1;
    const sole = { x: ankle.x + v.ux * w * 0.3, y: ankle.y + v.uy * w * 0.3 };
    const toe = { x: sole.x + fx * w * (bare ? 1.05 : 1.3), y: sole.y + w * 0.06 };
    const heel = { x: sole.x - fx * w * (bare ? 0.3 : 0.36), y: sole.y + w * 0.04 };
    const top = { x: ankle.x - v.ux * w * (bare ? 0.1 : 0.3), y: ankle.y - v.uy * w * (bare ? 0.1 : 0.3) };
    const outline = this.c(bare ? this.P.outline : this.P.armourEdge);
    const shape = (grow: number) => [
      top.x - fx * (w * 0.34 + grow),
      top.y - grow,
      top.x + fx * (w * 0.38 + grow),
      top.y - grow,
      toe.x + fx * grow,
      toe.y - w * (bare ? 0.22 : 0.3) - grow,
      toe.x + fx * grow,
      toe.y + grow,
      heel.x - fx * grow,
      heel.y + grow,
    ];
    const base = bare ? this.P.skin : this.P.armour;
    const lit = bare ? this.P.skinLit : this.P.armourLit;
    g.poly(shape(w * 0.2)).fill(outline);
    g.poly(shape(0)).fill(this.c(far ? toward(base, 0x000000, 0.3) : base));
    // Lit upper (and a glowing sole line on fire skins).
    g.poly([
      top.x - fx * w * 0.14,
      top.y + w * 0.05,
      top.x + fx * w * 0.34,
      top.y + w * 0.05,
      toe.x - fx * w * 0.2,
      toe.y - w * 0.18,
    ]).fill({
      color: this.c(lit),
      alpha: far ? 0.35 : 0.7,
    });
    if (!bare && this.P.seam !== null)
      fire
        .moveTo(heel.x, heel.y - w * 0.06)
        .lineTo(toe.x, toe.y - w * 0.06)
        .stroke({
          width: w * 0.14,
          color: this.P.seam,
          alpha: far ? 0.35 : 0.8,
          cap: 'round',
        });
  }

  /**
   * A long garment from the waist over both legs, swaying with them: a robe to the ankles with a
   * trimmed hem, or a cloak whose hem hangs in ragged tatters. Folds run down from the waist.
   */
  private garment(g: Graphics, s: Skel): void {
    const w = this.st.w;
    const gm = this.skin.garment!;
    const [cloth, clothLit, clothShade] = gm.cloth ?? [this.P.skin, this.P.skinLit, this.P.skinShade];
    const waist = s.pelvis;
    const shin = (leg: readonly Point[], k: number) => lerp(leg[1]!, leg[2]!, k);
    const hemF = shin(s.legFront, 0.86);
    const hemB = shin(s.legBack, 0.86);
    const left = Math.min(hemF.x, hemB.x) - w * 0.7;
    const right = Math.max(hemF.x, hemB.x) + w * 0.7;
    const hem = Math.max(hemF.y, hemB.y);
    const top = waist.y - w * 0.3;
    // Outline of the skirt: the waist, flaring out to the hem; a tattered hem zig-zags.
    const shape = (grow: number): number[] => {
      const pts: number[] = [waist.x - w * 0.95 - grow, top - grow, waist.x + w * 0.95 + grow, top - grow];
      pts.push(right + grow, hem - w * 0.2);
      if (gm.hem === 'tattered') {
        const n = 7;
        for (let i = 1; i < n; i++) {
          const x = right + ((left - right) * i) / n;
          const drop = i % 2 ? w * (0.55 + 0.2 * Math.sin(i * 2.3 + this.st.t * 2)) : -w * 0.05;
          pts.push(x, hem + drop + grow);
        }
      } else {
        pts.push((left + right) / 2 + w * 0.3, hem + w * 0.18 + grow);
      }
      pts.push(left - grow, hem - w * 0.1);
      return pts;
    };
    g.poly(shape(w * 0.24)).fill(this.c(this.P.outline));
    g.poly(shape(0)).fill(this.c(cloth));
    // Shade the side away from the light, light the near panel, rim the far edge.
    const lightRight = this.lx > 0;
    const shadeX = lightRight ? left : right;
    const litX = lightRight ? right : left;
    g.poly([waist.x, top, shadeX, hem - w * 0.1, (left + right) / 2, hem]).fill({
      color: this.c(clothShade),
      alpha: 0.75,
    });
    g.moveTo(waist.x + (lightRight ? -1 : 1) * w * 0.9, top)
      .lineTo(litX, hem - w * 0.25)
      .stroke({ width: w * 0.18, color: this.c(clothLit), alpha: 0.55, cap: 'round' });
    g.moveTo(waist.x + (lightRight ? 1 : -1) * w * 0.9, top)
      .lineTo(shadeX, hem - w * 0.2)
      .stroke({ width: w * 0.1, color: this.c(this.P.rim), alpha: 0.35, cap: 'round' });
    // Folds.
    for (const k of [0.3, 0.55, 0.78]) {
      const x0 = waist.x - w * 0.7 + w * 1.4 * k;
      const x1 = left + (right - left) * k;
      g.moveTo(x0, top + w * 0.2)
        .quadraticCurveTo((x0 + x1) / 2 + w * 0.15, (top + hem) / 2, x1, hem - w * 0.1)
        .stroke({ width: w * 0.1, color: this.c(clothShade), alpha: 0.85, cap: 'round' });
    }
    // A trimmed hem on a robe.
    if (gm.trim !== undefined)
      g.moveTo(left, hem - w * 0.1)
        .lineTo((left + right) / 2 + w * 0.3, hem + w * 0.18)
        .lineTo(right, hem - w * 0.2)
        .stroke({ width: w * 0.18, color: this.c(gm.trim), alpha: 0.9, cap: 'round', join: 'round' });
  }

  /** Three overlapping bone plates over the near shoulder. */
  private bonePauldron(g: Graphics, sh: Point): void {
    const w = this.st.w;
    const bone = this.P.hand ?? 0xd8cdb6;
    for (const [dx, dy, r] of [
      [-w * 0.3, -w * 0.08, w * 0.72],
      [0, -w * 0.2, w * 0.62],
      [w * 0.28, -w * 0.3, w * 0.48],
    ] as const) {
      g.circle(sh.x + dx, sh.y + dy, r + w * 0.2).fill(this.c(this.P.outline));
      g.circle(sh.x + dx, sh.y + dy, r).fill(this.c(bone));
      g.circle(sh.x + dx + this.lx * r * 0.25, sh.y + dy + this.ly * r * 0.25, r * 0.45).fill({
        color: 0xffffff,
        alpha: 0.4,
      });
      g.arc(sh.x + dx, sh.y + dy, r * 0.8, Math.PI * 0.2, Math.PI * 0.8).stroke({
        width: w * 0.06,
        color: this.c(toward(bone, 0x000000, 0.4)),
        alpha: 0.7,
      });
    }
  }

  /** The neck, for skins whose head the view draws (its own head style sits on top). */
  private neck(g: Graphics, s: Skel): void {
    const w = this.st.w;
    capsule(g, s.neck, s.head, w * 0.42 + w * 0.3, w * 0.4 + w * 0.3, this.c(this.P.outline));
    capsule(g, s.neck, s.head, w * 0.42, w * 0.4, this.c(this.P.skin));
  }

  /**
   * Pelvis to neck: one sculpted body (or the garment's bodice) with, by skin, the chest and
   * abdominals, a belt, a bone ribcage plate and a molten core.
   */
  private torso(g: Graphics, fire: Graphics, s: Skel): void {
    const w = this.st.w;
    const m = this.skin.muscle;
    const base = s.pelvis;
    const top = s.chest;
    const u = frame(base, top);
    // The torso's outline as a smooth profile: hips, waist, ribcage, shoulders (half-widths). A brute
    // has a broader chest; cloth hangs straighter.
    const chestK = m > 1.2 ? 1.32 : m === 0 ? 0.9 : 1;
    const prof: [number, number][] = [
      [-0.06, 0.82],
      [0.08, 0.86],
      [0.3, m === 0 ? 0.82 : 0.72],
      [0.55, 1.02 * chestK],
      [0.8, 1.27 * chestK],
      [0.92, 1.3 * chestK],
      [1.0, 1.2 * chestK],
      [1.05, 1.02 + 0.1 * (chestK - 1)],
      [1.09, 0.8],
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
      const r: number[] = [];
      for (let i = 0; i < right.length; i += 2) r.push(right[i]!, right[i + 1]!);
      return [...left, ...r];
    };
    g.poly(outline(w * 0.32)).fill(this.c(this.P.outline));
    g.poly(outline(0)).fill(this.c(this.P.skin));
    // Trapezius up into the neck.
    const neckTop = lerp(top, s.neck, 0.9);
    capsule(g, top, neckTop, w * 0.62 + w * 0.3, w * 0.42 + w * 0.3, this.c(this.P.outline));
    capsule(g, top, neckTop, w * 0.62, w * 0.42, this.c(this.P.skin));
    band(g, top, neckTop, w * 0.62, w * 0.42, -this.litSide(top, neckTop), 0.2, 1, this.c(this.P.skinShade), 0.8);
    // Shading: the far side in shadow, the near side lit, a rim light on the shadow edge.
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
    shadeBand(0.15, 1, -side, this.c(this.P.skinShade), 0.8);
    shadeBand(0.05, 0.7, side, this.c(this.P.skinLit), 0.55);
    shadeBand(0.85, 0.98, -side, this.c(this.P.rim), 0.5);
    const chestC = lerp(base, top, 0.78);
    const fwd = u.nx >= 0 ? 1 : -1; // toward +x (the front)
    if (m > 0) {
      // Chest: two pectoral masses under the shoulders, split down the middle.
      const k2 = Math.min(1.3, m);
      for (const [off, k] of [
        [0.45, 1],
        [-0.25, 0.75],
      ] as const) {
        const c = { x: chestC.x + u.nx * w * off * fwd, y: chestC.y + u.ny * w * off * fwd };
        oval(g, c, u.nx, u.ny, w * 0.62 * k * k2, w * 0.4 * k2, this.c(this.P.skinShade), 0.55);
        oval(
          g,
          { x: c.x + this.lx * w * 0.08, y: c.y + this.ly * w * 0.08 },
          u.nx,
          u.ny,
          w * 0.5 * k * k2,
          w * 0.28 * k2,
          this.c(this.P.skinLit),
          0.55,
        );
      }
      // Abdominals: three rows of two, toward the front.
      for (let row = 0; row < 3; row++) {
        const p = lerp(base, top, 0.22 + row * 0.13);
        for (const col of [0.18, 0.55]) {
          const c = { x: p.x + u.nx * w * col * fwd, y: p.y + u.ny * w * col * fwd };
          oval(g, c, u.ux, u.uy, w * 0.2, w * 0.17, this.c(this.P.skinShade), 0.45);
          oval(
            g,
            { x: c.x + this.lx * w * 0.04, y: c.y + this.ly * w * 0.04 },
            u.ux,
            u.uy,
            w * 0.13,
            w * 0.11,
            this.c(this.P.skinLit),
            0.5,
          );
        }
      }
    } else {
      // Cloth: a fold from the shoulder down across the chest, and a lit lapel edge.
      const a = lerp(base, top, 0.95);
      const b = lerp(base, top, 0.3);
      g.moveTo(a.x + u.nx * w * 0.9 * fwd, a.y + u.ny * w * 0.9 * fwd)
        .quadraticCurveTo(b.x + u.nx * w * 0.5 * fwd, b.y + u.ny * w * 0.5 * fwd, b.x - u.nx * w * 0.2 * fwd, b.y)
        .stroke({ width: w * 0.1, color: this.c(this.P.skinShade), alpha: 0.85, cap: 'round' });
      g.moveTo(a.x + u.nx * w * 0.7 * fwd, a.y + u.ny * w * 0.7 * fwd)
        .lineTo(b.x + u.nx * w * 0.35 * fwd, b.y + u.ny * w * 0.35 * fwd)
        .stroke({ width: w * 0.08, color: this.c(this.P.skinLit), alpha: 0.6, cap: 'round' });
    }
    if (this.skin.gear.ribcage) {
      // A bone ribcage plate across the chest, a sternum down the middle.
      const bone = this.P.hand ?? 0xd8cdb6;
      for (const k of [0.62, 0.74, 0.86]) {
        const p0 = lerp(base, top, k);
        const a = { x: p0.x - u.nx * w * 0.6 * fwd, y: p0.y - u.ny * w * 0.6 * fwd };
        const b = { x: p0.x + u.nx * w * 0.95 * fwd + u.ux * w * 0.05, y: p0.y + u.ny * w * 0.95 * fwd - w * 0.06 };
        g.moveTo(a.x, a.y)
          .lineTo(b.x, b.y)
          .stroke({ width: w * 0.24, color: this.c(this.P.outline), cap: 'round' });
        g.moveTo(a.x, a.y)
          .lineTo(b.x, b.y)
          .stroke({ width: w * 0.15, color: this.c(bone), cap: 'round' });
        g.moveTo(a.x, a.y - w * 0.03)
          .lineTo(b.x, b.y - w * 0.03)
          .stroke({ width: w * 0.05, color: 0xffffff, alpha: 0.45, cap: 'round' });
      }
      const st0 = lerp(base, top, 0.92);
      const st1 = lerp(base, top, 0.55);
      const off = { x: u.nx * w * 0.25 * fwd, y: u.ny * w * 0.25 * fwd };
      g.moveTo(st0.x + off.x, st0.y + off.y)
        .lineTo(st1.x + off.x, st1.y + off.y)
        .stroke({ width: w * 0.2, color: this.c(toward(bone, 0x000000, 0.25)), cap: 'round' });
    }
    if (this.skin.gear.belt) {
      // A belt (or sash) just above the hips, with a buckle (glowing on fire skins).
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
      g.poly(beltPts(w * 0.22)).fill(this.c(this.P.armourEdge));
      g.poly(beltPts(0)).fill(this.c(this.P.armour));
      const buckle = lerp(b0, b1, 0.5);
      const bc = { x: buckle.x + u.nx * w * 0.45 * fwd, y: buckle.y + u.ny * w * 0.45 * fwd };
      g.circle(bc.x, bc.y, w * 0.32).fill(this.c(this.P.armourLit));
      if (this.P.seam !== null) fire.circle(bc.x, bc.y, w * 0.2).fill({ color: this.P.seam, alpha: 0.9 });
    }
    if (this.skin.fire.core && this.P.glow !== null && this.P.lava !== null) {
      // The molten core in the chest: a glowing heart of fire with cracks running out of it.
      const t = this.st.t;
      const pulse = 0.75 + 0.25 * Math.sin(t * 4);
      const core = {
        x: chestC.x + u.nx * w * 0.18 * fwd - u.ux * w * 0.05,
        y: chestC.y + u.ny * w * 0.18 * fwd - u.uy * w * 0.05,
      };
      g.circle(core.x, core.y, w * 0.42).fill(this.c(this.P.armourEdge));
      for (const [r, colour, alpha] of [
        [w * 1.1, this.P.glow, 0.18 * pulse],
        [w * 0.36, this.P.glow, 0.85],
        [w * 0.24, this.P.lava, 0.95],
        [w * 0.11, 0xffffff, 0.9 * pulse],
      ] as const)
        fire.circle(core.x, core.y, r).fill({ color: colour, alpha });
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.6;
        const len = w * (0.55 + 0.15 * Math.sin(t * 3 + i));
        fire
          .moveTo(core.x + Math.cos(a) * w * 0.3, core.y + Math.sin(a) * w * 0.3)
          .lineTo(core.x + Math.cos(a + 0.25) * len, core.y + Math.sin(a + 0.25) * len)
          .stroke({ width: w * 0.08, color: this.P.lava, alpha: 0.7 * pulse, cap: 'round' });
      }
    }
  }

  /** The head: a strong jaw and brow under a crest of flame; a dark ember face with no eyes. */
  private head(g: Graphics, fire: Graphics, s: Skel, style: 'crest' | 'brute' = 'crest'): void {
    const r = this.st.headRadius;
    const w = this.st.w;
    const h = s.head;
    const u = frame(s.neck, h); // up along the neck
    // Neck.
    capsule(g, s.neck, h, w * 0.42 + w * 0.3, w * 0.4 + w * 0.3, this.c(this.P.outline));
    capsule(g, s.neck, h, w * 0.42, w * 0.4, this.c(this.P.skin));
    // Skull and jaw: a round cranium with a squarer jaw toward his front and down.
    const jaw = { x: h.x + r * 0.28 - u.ux * r * 0.45, y: h.y - u.uy * r * 0.45 + r * 0.05 };
    const skull = (grow: number, colour: number) => {
      g.circle(h.x, h.y - r * 0.05, r + grow).fill(colour);
      oval(g, jaw, 1, 0, r * 0.72 + grow, r * 0.55 + grow, colour);
    };
    skull(w * 0.32, this.c(this.P.outline));
    skull(0, this.c(this.P.skin));
    // Shadow on the far side, light on the near, rim of fire on the back of the head.
    oval(
      g,
      { x: h.x - this.lx * r * 0.35, y: h.y - this.ly * r * 0.3 },
      1,
      0,
      r * 0.85,
      r * 0.75,
      this.c(this.P.skinShade),
      0.6,
    );
    oval(
      g,
      { x: h.x + this.lx * r * 0.35, y: h.y + this.ly * r * 0.35 },
      1,
      0,
      r * 0.5,
      r * 0.42,
      this.c(this.P.skinLit),
      0.7,
    );
    // The face (no eyes: owner, 12/11/2026): a heavy brow casting a shadow band, a strong nose
    // ridge, a lit cheekbone and a square jaw line, all in his ember skin.
    const fx = h.x + r * 0.55;
    oval(g, { x: fx, y: h.y + r * 0.02 }, 0.2, 1, r * 0.42, r * 0.3, this.c(this.P.skinShade), 0.55); // brow shadow
    g.moveTo(h.x + r * 0.05, h.y - r * 0.3)
      .quadraticCurveTo(h.x + r * 0.7, h.y - r * 0.42, h.x + r * 1.02, h.y - r * 0.12)
      .stroke({ width: r * 0.2, color: this.c(this.P.outline), cap: 'round' }); // brow ridge
    g.moveTo(h.x + r * 0.1, h.y - r * 0.38)
      .quadraticCurveTo(h.x + r * 0.62, h.y - r * 0.5, h.x + r * 0.9, h.y - r * 0.3)
      .stroke({ width: r * 0.1, color: this.c(this.P.skinLit), alpha: 0.8, cap: 'round' }); // lit brow
    g.moveTo(h.x + r * 0.98, h.y - r * 0.1)
      .lineTo(h.x + r * 1.12, h.y + r * 0.22)
      .lineTo(h.x + r * 0.96, h.y + r * 0.3)
      .stroke({ width: r * 0.1, color: this.c(this.P.outline), cap: 'round', join: 'round' }); // nose
    oval(g, { x: h.x + r * 0.55, y: h.y + r * 0.3 }, 1, 0.3, r * 0.22, r * 0.12, this.c(this.P.skinLit), 0.75); // cheekbone
    g.moveTo(h.x + r * 0.1, h.y + r * 0.62)
      .quadraticCurveTo(h.x + r * 0.7, h.y + r * 0.86, h.x + r * 0.98, h.y + r * 0.56)
      .stroke({ width: r * 0.08, color: this.c(this.P.skinShade), alpha: 0.9, cap: 'round' }); // jaw line
    g.moveTo(h.x + r * 0.72, h.y + r * 0.5)
      .lineTo(h.x + r * 0.98, h.y + r * 0.46)
      .stroke({ width: r * 0.06, color: this.c(this.P.outline), alpha: 0.9, cap: 'round' }); // set mouth
    if (style === 'crest') {
      this.crest(fire, h, r);
      return;
    }
    // The brawler: an ear, a ridge of short-cropped scalp, a steel stud at the brow.
    oval(
      g,
      { x: h.x - r * 0.15, y: h.y + r * 0.12 },
      0.3,
      1,
      r * 0.24 + w * 0.12,
      r * 0.18 + w * 0.12,
      this.c(this.P.outline),
    );
    oval(g, { x: h.x - r * 0.15, y: h.y + r * 0.12 }, 0.3, 1, r * 0.24, r * 0.18, this.c(this.P.skinShade));
    g.arc(h.x, h.y - r * 0.05, r * 0.92, Math.PI * 1.12, Math.PI * 1.75).stroke({
      width: r * 0.18,
      color: this.c(toward(this.P.skinShade, 0x000000, 0.35)),
      alpha: 0.75,
    });
    if (this.P.seam !== null)
      fire.circle(h.x + r * 0.55, h.y - r * 0.42, r * 0.07).fill({ color: this.P.seam, alpha: 0.9 });
  }

  /**
   * A hood over the head: a peaked cowl with folds, a lit crown and a rim light. `cowl` hides a dark
   * void with two glowing eyes; `mask` shows a white mask with dark eye hollows in the opening.
   */
  private hooded(g: Graphics, fire: Graphics, s: Skel, style: 'cowl' | 'mask'): void {
    const r = this.st.headRadius * 1.15;
    const w = this.st.w;
    const h = s.head;
    this.neck(g, s);
    const shape: [number, number][] = [
      [0.95, -0.55],
      [0.55, -1.05],
      [-0.25, -1.25],
      [-1.0, -1.5],
      [-0.95, -0.7],
      [-1.15, 0.1],
      [-1.05, 0.95],
      [-0.35, 1.25],
      [0.55, 1.1],
      [0.98, 0.65],
    ];
    const hood = (grow: number): number[] =>
      shape.flatMap(([x, y]) => {
        const len = Math.hypot(x, y) || 1;
        return [h.x + x * r + (x / len) * grow, h.y + y * r + (y / len) * grow];
      });
    g.poly(hood(w * 0.3)).fill(this.c(this.P.outline));
    g.poly(hood(0)).fill(this.c(this.P.armour));
    g.poly([
      h.x - 1.0 * r,
      h.y - 1.5 * r,
      h.x - 0.95 * r,
      h.y - 0.7 * r,
      h.x - 1.15 * r,
      h.y + 0.1 * r,
      h.x - 1.05 * r,
      h.y + 0.95 * r,
      h.x - 0.35 * r,
      h.y + 1.2 * r,
      h.x - 0.2 * r,
      h.y - 0.6 * r,
    ]).fill({ color: this.c(this.P.armourEdge), alpha: 0.55 });
    g.moveTo(h.x - 0.2 * r, h.y - 1.15 * r)
      .quadraticCurveTo(h.x + 0.5 * r, h.y - 1.0 * r, h.x + 0.85 * r, h.y - 0.55 * r)
      .stroke({ width: r * 0.16, color: this.c(this.P.armourLit), alpha: 0.85, cap: 'round' });
    g.moveTo(h.x - 0.98 * r, h.y - 1.38 * r)
      .lineTo(h.x - 1.08 * r, h.y + 0.85 * r)
      .stroke({ width: r * 0.08, color: this.c(this.P.rim), alpha: 0.5, cap: 'round' });
    for (const k of [0.25, 0.55]) {
      g.moveTo(h.x - (0.2 + k) * r, h.y - 0.9 * r)
        .quadraticCurveTo(h.x - (0.5 + k) * r, h.y + 0.1 * r, h.x - (0.3 + k * 0.6) * r, h.y + 1.0 * r)
        .stroke({ width: r * 0.06, color: this.c(this.P.armourEdge), alpha: 0.8, cap: 'round' });
    }
    // A glowing seam along the hood's edge, like Inferno's armour.
    if (this.P.seam !== null)
      fire
        .moveTo(h.x + 0.95 * r, h.y - 0.5 * r)
        .quadraticCurveTo(h.x + 1.1 * r, h.y + 0.1 * r, h.x + 0.95 * r, h.y + 0.62 * r)
        .stroke({ width: r * 0.06, color: this.P.seam, alpha: 0.75, cap: 'round' });
    const oc = { x: h.x + 0.5 * r, y: h.y + 0.1 * r };
    oval(g, oc, 0.3, 1, r * 0.68, r * 0.46, this.c(this.P.outline));
    oval(g, oc, 0.3, 1, r * 0.6, r * 0.38, this.c(0x060408));
    // Owner, 13/11/2026: Necro has no eyes; the hood holds only darkness.
    if (style === 'cowl') {
      return;
    }
    // The white mask: shaded far side, a lit brow, dark eye hollows, nostrils and a thin mouth.
    const mc = { x: h.x + 0.6 * r, y: h.y + 0.14 * r };
    const bone = 0xf1eee6;
    oval(g, mc, 0.22, 1, r * 0.66 + w * 0.12, r * 0.4 + w * 0.12, this.c(0x111114));
    oval(g, mc, 0.22, 1, r * 0.66, r * 0.4, this.c(bone));
    oval(g, { x: mc.x - r * 0.15, y: mc.y + r * 0.05 }, 0.22, 1, r * 0.58, r * 0.18, this.c(0xbdb8ac), 0.65);
    oval(g, { x: mc.x + r * 0.05, y: mc.y - r * 0.3 }, 0.22, 1, r * 0.22, r * 0.14, 0xffffff, 0.6);
    // Eye openings after the owner's reference (13/11/2026): large, dark, hollow almond holes cut
    // through the mask, each pointed and dipped low at the inner corner by the nose, so the blank
    // face stares down with a menacing scowl. The far one is foreshortened and mirrored.
    for (const [dx, k, dir] of [
      [-0.05, 1, 1],
      [0.4, 0.78, -1],
    ] as const) {
      const cx = mc.x + dx * r;
      const cy = mc.y - r * 0.08;
      const half = r * 0.22 * k;
      const inner = cx + dir * half;
      const outer = cx - dir * half;
      const hole = [
        outer,
        cy - r * 0.1 * k,
        cx - dir * half * 0.2,
        cy - r * 0.12 * k,
        inner,
        cy + r * 0.06 * k,
        cx,
        cy + r * 0.1 * k,
        outer + dir * half * 0.15,
        cy + r * 0.04 * k,
      ];
      // A soft shadow round the hole gives the cut depth, then the hollow itself.
      g.poly(hole.map((v, i) => (i % 2 ? cy + (v - cy) * 1.35 : cx + (v - cx) * 1.15))).fill({
        color: this.c(0x8e897e),
        alpha: 0.55,
      });
      g.poly(hole).fill(this.c(0x050506));
    }
    g.circle(mc.x + r * 0.27, mc.y + r * 0.14, r * 0.025).fill(0x2a2a30);
    g.circle(mc.x + r * 0.32, mc.y + r * 0.13, r * 0.022).fill(0x2a2a30);
    g.moveTo(mc.x + r * 0.08, mc.y + r * 0.36)
      .quadraticCurveTo(mc.x + r * 0.2, mc.y + r * 0.4, mc.x + r * 0.33, mc.y + r * 0.34)
      .stroke({ width: r * 0.045, color: 0x1a1a1e, cap: 'round' });
  }

  /** A mannequin's head: a smooth egg with a seam round it and a soft highlight. */
  private egg(g: Graphics, s: Skel): void {
    const r = this.st.headRadius;
    const w = this.st.w;
    const h = s.head;
    this.neck(g, s);
    oval(g, h, 0.2, 1, r * 1.12 + w * 0.22, r * 0.92 + w * 0.22, this.c(this.P.outline));
    oval(g, h, 0.2, 1, r * 1.12, r * 0.92, this.c(this.P.skin));
    oval(g, { x: h.x - this.lx * r * 0.3, y: h.y + r * 0.25 }, 0.2, 1, r * 0.9, r * 0.6, this.c(this.P.skinShade), 0.6);
    oval(
      g,
      { x: h.x + this.lx * r * 0.35, y: h.y - r * 0.35 },
      0.2,
      1,
      r * 0.4,
      r * 0.28,
      this.c(this.P.skinLit),
      0.85,
    );
    g.moveTo(h.x - r * 0.75, h.y - r * 0.6)
      .quadraticCurveTo(h.x, h.y - r * 0.1, h.x + r * 0.85, h.y + r * 0.45)
      .stroke({ width: r * 0.05, color: this.c(this.P.skinShade), alpha: 0.9, cap: 'round' });
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
