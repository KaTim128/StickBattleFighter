import { Container, Graphics } from 'pixi.js';
import type { BoneLengths, Point, Pose } from '../animation/skeleton';
import { solveSkeleton } from '../animation/skeleton';
import type { BodyStyle, HeadStyle } from '../characters/schema';

export interface StickmanLook {
  readonly limb: number;
  readonly limbBack: number;
  readonly outline: number;
  readonly limbWidthM: number;
  readonly outlineWidthM: number;
  /** Pants over the hips and legs (muscle bodies); absent = bare legs. */
  readonly pants?: number;
}

/**
 * Draws a jointed stickman (REQ-ANI-6) standing on the top-down floor: an
 * outlined figure lifted by its hop height over a ground shadow (REQ-VIS-9).
 * Origin = the point between the feet on the floor.
 */
/** Dodge looks (owner, 11/11/2026): the default quick dash, the optional roll, Inferno's flame. */
export interface DodgeLook {
  /** 0..1 progress of a ground roll. */
  roll?: number;
  /** 0..1 how far the body has turned to flame. */
  flame?: number;
  /** A quick dash: 0..1 strength and the screen direction of travel (speed lines trail behind). */
  dash?: { amount: number; dirX: number; dirY: number };
}

/** Muscle body colours (Rampage Buffer, owner 12/11/2026): a grey hide with a pale rim light. */
const BRUTE = {
  rage: 0xd8281a,
  rim: 0xd9dce4,
  eye: 0xff3a1a,
  eyeHot: 0xffe2a0,
} as const;

/** Living-flame body colours (Inferno, owner 11/11/2026). */
const FLAME = { glow: 0xff5a14, ember: 0x6a1404, deep: 0xd8320c, core: 0xffd56a } as const;

export class StickmanView {
  private last: { s: ReturnType<typeof solveSkeleton>; facing: 1 | -1; heightM: number; rot: number } | null = null;
  readonly root = new Container();
  private readonly shadow = new Graphics();
  private readonly body = new Graphics();
  private readonly figure = new Container();
  /** The flame head (head style 'flame'): drawn additively so overlapping tongues glow. */
  private readonly fire = new Graphics();
  private readonly fireCore = new Graphics();
  /** Speed lines behind a quick dodge. */
  private readonly trail = new Graphics();
  /**
   * 0..1 how much of the body has burned away (death by fire): everything from the feet up to
   * this fraction of the figure's height is gone. 0 = whole.
   */
  burnAway = 0;
  private readonly burnMask = new Graphics();
  /** 0..1 guarding (a faint shield in front); `shieldFlare` 0..1 flares it after a block (PRS-5). */
  guard = 0;
  shieldFlare = 0;
  /** 0..1 a fury buff is on (Rampage Mode): the hide flushes red and the eyes burn. */
  rage = 0;
  /** Stunned: stars circle the head (PRS-6). */
  stunned = false;
  private readonly status = new Graphics();
  /** 0..1 how fast the fighter is moving: the flames stream back. */
  motion = 0;
  private readonly t0 = typeof performance === 'undefined' ? 0 : performance.now();

  constructor(
    private readonly bones: BoneLengths,
    private readonly look: StickmanLook,
    private readonly head: HeadStyle = 'round',
    private readonly bodyStyle: BodyStyle = 'solid',
    /** Drawn size (1 = standard; Rampage is 2): the shadow, trail and figure all scale about the feet. */
    private readonly size = 1,
  ) {
    this.root.label = 'stickman';
    this.fire.blendMode = 'add';
    this.figure.addChild(this.body, this.fire, this.fireCore, this.status, this.burnMask);
    const scaled = new Container();
    scaled.scale.set(size);
    scaled.addChild(this.shadow, this.trail, this.figure);
    this.root.addChild(scaled);
  }

  /** Seconds since this view was made (render-only animation clock for the flame head). */
  private get clockS(): number {
    return typeof performance === 'undefined' ? 0 : (performance.now() - this.t0) / 1000;
  }

  /**
   * @param facing 1 = right, -1 = left (the figure is mirrored)
   * @param heightM jump hop height; the figure lifts, the shadow stays and shrinks
   * @param tiltRad rotate the whole figure about its feet (knockdown: lying on the floor)
   * @param flash 0..1 hit flash: the whole figure blends to `flashColour` (a few frames on impact)
   */
  draw(
    pose: Pose,
    facing: 1 | -1,
    heightM: number,
    tiltRad = 0,
    flash = 0,
    flashColour = 0xffffff,
    dodge: DodgeLook = {},
  ): void {
    const s = solveSkeleton(pose, this.bones);
    this.last = { s, facing, heightM, rot: -facing * tiltRad };
    const { limbWidthM: w, outlineWidthM: o } = this.look;
    const limb = toward(this.look.limb, flashColour, flash);
    const limbBack = toward(this.look.limbBack, flashColour, flash);
    const outline = toward(this.look.outline, flashColour, flash * 0.85);

    // A soft contact shadow, cast a little down-right (light from the top-left), shrinking with height.
    const shrink = 1 / (1 + (heightM / this.size) * 0.8);
    this.shadow.clear();
    for (const [k, a] of [
      [1.25, 0.08],
      [1, 0.1],
      [0.7, 0.14],
    ] as const) {
      this.shadow
        .ellipse(0.06, 0.03, 0.42 * shrink * k, 0.17 * shrink * k)
        .fill({ color: 0x1a120a, alpha: a * shrink });
    }

    this.figure.scale.x = facing;
    const roll = dodge.roll ?? 0;
    if (roll > 0) {
      // Dodge roll ON THE GROUND (owner, 11/11/2026: "rolling on the ground, not floating"): the
      // tucked ball turns a full circle backwards about its own centre, and is lowered every frame
      // so its lowest point (a foot, a knee, the head or a shoulder) always touches the floor.
      const rot = -facing * Math.PI * 2 * roll;
      const pts = [s.pelvis, s.chest, s.neck, s.head, ...s.armFront, ...s.armBack, ...s.legFront, ...s.legBack];
      const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length;
      const cy = pts.reduce((a, p) => a + p.y, 0) / pts.length;
      const cos = Math.cos(rot);
      const sin = Math.sin(rot);
      let lowest = Number.NEGATIVE_INFINITY;
      for (const p of pts) {
        const lx = (p.x - cx) * facing; // mirrored by facing, then turned
        const ly = p.y - cy;
        const r = p === s.head ? this.bones.headRadius : this.look.limbWidthM / 2;
        lowest = Math.max(lowest, lx * sin + ly * cos + r);
      }
      this.figure.pivot.set(cx, cy);
      this.figure.x = cx * facing;
      this.figure.y = -lowest; // the floor is y = 0 at the fighter's feet
      this.figure.rotation = rot;
    } else {
      this.figure.x = 0;
      this.figure.pivot.set(0, 0);
      this.figure.y = -heightM / this.size; // the hop height is real metres, not scaled with the body
      // Falling backwards, away from the facing direction.
      this.figure.rotation = -facing * tiltRad;
    }
    this.drawTrail(dodge.dash, outline);
    // Flame dodge: the body burns away into a streaking flame, then reforms.
    const flame = dodge.flame ?? 0;
    this.body.alpha = 1 - flame;

    // Burning away (death by fire): keep only the part of the figure above the burning edge.
    if (this.burnAway > 0) {
      const top = -(
        this.bones.spine +
        this.bones.neck +
        this.bones.thigh +
        this.bones.shin +
        this.bones.headRadius * 2 +
        0.3
      );
      const edge = top * this.burnAway;
      this.burnMask
        .clear()
        .rect(-3, top - 0.5, 6, edge - (top - 0.5))
        .fill(0xffffff);
      this.figure.mask = this.burnMask;
    } else if (this.figure.mask) {
      this.figure.mask = null;
      this.burnMask.clear();
    }
    const g = this.body.clear();
    this.fire.clear();
    this.fireCore.clear();
    this.fire.alpha = 1;
    this.fireCore.alpha = 1;
    const stroke = (pts: readonly Point[], color: number, width: number, alpha = 1): void => {
      const [first, ...rest] = pts;
      if (!first) return;
      g.moveTo(first.x, first.y);
      for (const p of rest) g.lineTo(p.x, p.y);
      g.stroke({ width, color, alpha, cap: 'round', join: 'round' });
    };
    const fiery = this.bodyStyle === 'flame';
    const t = this.clockS;
    const limbs: [readonly Point[], number][] = [
      [s.armBack, limbBack],
      [s.legBack, limbBack],
      [[s.pelvis, s.chest, s.neck], limb],
      [s.legFront, limb],
      [s.armFront, limb],
    ];
    if (fiery) {
      // A living flame (owner, 11/11/2026): a soft glow around the whole body first.
      for (const [pts] of limbs) stroke(pts, FLAME.glow, w * 3.4, 0.16);
    }
    // Back limbs first (darker), then torso, front limbs, head.
    const muscled = this.bodyStyle === 'muscle';
    limbs.forEach(([pts, rawColour], i) => {
      // Rampage Mode flushes the hide red (owner, 12/11/2026).
      const colour = this.rage > 0 ? toward(rawColour, BRUTE.rage, this.rage * 0.3) : rawColour;
      if (!fiery) {
        stroke(pts, outline, w + o * 2);
        stroke(pts, colour, w);
        if (muscled) this.muscleDetail(g, pts, w, colour, outline, i);
        return;
      }
      const edge = toward(FLAME.ember, flashColour, flash * 0.85);
      stroke(pts, edge, w + o * 1.6); // ember-dark edges instead of a black outline
      stroke(pts, colour, w);
      this.charStreaks(g, pts, w, t + i * 1.7, edge);
      // A white-hot core that flickers along the limb.
      const pulse = 0.55 + 0.25 * Math.sin(t * 11 + i * 2.3) + 0.2 * Math.sin(t * 23 + i);
      stroke(pts, toward(FLAME.core, flashColour, flash), w * 0.42, Math.min(1, pulse));
    });
    if (fiery && flame < 0.5) this.bodyTongues(s, t, w);
    this.drawStatus(s, t);
    if (flame > 0.01) {
      // Dodge: the body becomes a small, quick streak of flame at chest height (owner: smaller, no grey).
      this.flameHead(0, -0.75, 0.19 + 0.05 * flame, flash, 1.2 * flame, flame);
    } else if (this.head === 'flame') this.flameHead(s.head.x, s.head.y, this.bones.headRadius * 1.15, flash);
    else if (this.head === 'brute') this.bruteHead(g, s, limb, outline, o);
    else {
      g.circle(s.head.x, s.head.y, this.bones.headRadius)
        .fill(limb)
        .stroke({ width: o * 1.4, color: outline });
    }
  }

  /** Quick dodge speed lines: short streaks trailing opposite the dash, fading in and out with it. */
  private drawTrail(dash: DodgeLook['dash'], colour: number): void {
    const t = this.trail.clear();
    if (!dash || dash.amount <= 0.01) return;
    const len = Math.hypot(dash.dirX, dash.dirY) || 1;
    const bx = -dash.dirX / len;
    const by = -dash.dirY / len;
    for (const [h, l, start] of [
      [0.45, 0.55, 0.2],
      [0.95, 0.8, 0.12],
      [1.35, 0.5, 0.22],
    ] as const) {
      const x0 = bx * start;
      const y0 = -h + by * start * 0.5;
      t.moveTo(x0, y0)
        .lineTo(x0 + bx * l * dash.amount, y0 + by * l * dash.amount * 0.5)
        .stroke({ width: 0.035, color: colour, alpha: 0.4 * dash.amount, cap: 'round' });
    }
  }

  /**
   * A living flame for a head (owner-approved mockup, TD-045): layered tongues (red, orange,
   * yellow) that flicker on their own rhythms and stream back as the fighter moves, a glowing
   * ball of fire with a deep-red rim at the neck, rising embers and two bright ember-rimmed eyes.
   * Original procedural design; drawn in the figure's frame (it mirrors with the facing).
   */
  private flameHead(x: number, y: number, r: number, flash: number, lean?: number, alpha = 1): void {
    const t = this.clockS;
    // The figure is mirrored by facing, so "back" is always −x here; `lean` overrides (+ = forward).
    const back = lean ?? -this.motion;
    this.fire.alpha = alpha;
    this.fireCore.alpha = alpha;
    const f = this.fire;
    // Halo.
    for (let i = 0; i < 4; i++) f.circle(x, y, r * (3.2 - i * 0.55)).fill({ color: 0xff6a1a, alpha: 0.05 });
    const layers = [
      { n: 7, colour: 0xff3c14, alpha: 0.55, len: 2.2, w: 0.42 },
      { n: 6, colour: 0xff8c1e, alpha: 0.65, len: 1.8, w: 0.38 },
      { n: 5, colour: 0xffd95a, alpha: 0.75, len: 1.35, w: 0.34 },
    ];
    for (const L of layers) {
      for (let i = 0; i < L.n; i++) {
        const ang = Math.PI + ((i + 0.5) / L.n) * Math.PI;
        const bx = x + Math.cos(ang) * r * 0.8;
        const by = y + Math.sin(ang) * r * 0.55;
        const flick = Math.sin(t * 9 + i * 2.1 + L.len * 3) * 0.5 + Math.sin(t * 15.3 + i * 1.3) * 0.3;
        const up = (0.6 + 0.4 * Math.sin(ang - Math.PI)) * L.len;
        const tipX = bx + Math.cos(ang) * r * 0.35 + back * r * 1.2 + flick * r * 0.25;
        const tipY = y - r * (up + 0.3 + flick * 0.2);
        const bw = r * L.w;
        f.moveTo(bx, by + r * 0.35)
          .bezierCurveTo(bx - bw * 1.6, by + r * 0.2, tipX - bw * 0.5, tipY + r * 0.7, tipX, tipY)
          .bezierCurveTo(tipX + bw * 0.5, tipY + r * 0.7, bx + bw * 1.6, by + r * 0.2, bx, by + r * 0.35)
          .fill({ color: L.colour, alpha: L.alpha });
      }
    }
    // Embers drifting up and back.
    for (let i = 0; i < 6; i++) {
      const k = (t * 0.8 + i / 6) % 1;
      f.circle(
        x + Math.sin(i * 4 + t * 3) * r * 0.8 + back * k * r,
        y - r * (1 + k * 3),
        r * 0.09 * (1 - k * 0.6),
      ).fill({
        color: 0xffb03c,
        alpha: 1 - k,
      });
    }
    const c = this.fireCore;
    // The ball of fire: deep red at the rim where it meets the neck, orange, amber, then a
    // white-hot centre (owner, 11/11/2026: no grey or blue anywhere on the face).
    c.ellipse(x, y + r * 0.62, r * 0.66, r * 0.34).fill({ color: FLAME.deep, alpha: 0.85 });
    c.circle(x, y, r).fill({ color: 0xff8c1e, alpha: 0.95 });
    c.circle(x - r * 0.15, y - r * 0.12, r * 0.68).fill({ color: 0xffc94a, alpha: 0.95 });
    c.circle(x - r * 0.2, y - r * 0.2, r * 0.35).fill({ color: 0xfff6d2, alpha: 0.95 });
    // Eyes: two bright slits rimmed in ember red, burning out of the fire.
    for (const [ex, ey, ew, eh] of [
      [0.28, -0.05, 0.1, 0.22],
      [0.62, -0.02, 0.09, 0.2],
    ] as const) {
      c.ellipse(x + r * ex, y + r * ey, r * (ew + 0.05), r * (eh + 0.05)).fill({ color: FLAME.ember, alpha: 0.85 });
      c.ellipse(x + r * ex, y + r * ey, r * ew, r * eh).fill(0xfffbe6);
    }
    if (flash > 0) c.circle(x, y, r).fill({ color: 0xffffff, alpha: flash * 0.6 });
  }

  /**
   * Defence and status marks (PRS-5, PRS-6), in the figure's frame (+x = in front):
   * - a curved shield of light in front of the chest while guarding, flaring bright when it
   *   absorbs a blow;
   * - three small stars circling the head while stunned.
   */
  private drawStatus(s: ReturnType<typeof solveSkeleton>, t: number): void {
    const g = this.status.clear();
    const shield = Math.max(this.guard * 0.45, this.shieldFlare);
    if (shield > 0.01) {
      const cx = s.chest.x + 0.2;
      const cy = (s.chest.y + s.pelvis.y) / 2 - 0.1;
      const r = 0.55 + 0.1 * this.shieldFlare;
      const a0 = -1.05;
      const a1 = 1.05;
      g.moveTo(cx + Math.cos(a0) * r * 0.55, cy + Math.sin(a0) * r)
        .arc(cx, cy, r, a0, a1)
        .lineTo(cx + Math.cos(a1) * r * 0.55, cy + Math.sin(a1) * r)
        .arc(cx - r * 0.45, cy, r * 0.85, a1 * 0.9, a0 * 0.9, true)
        .closePath()
        .fill({ color: 0x7fd8ff, alpha: 0.18 * shield + 0.25 * this.shieldFlare })
        .stroke({ width: 0.035, color: 0xd8f4ff, alpha: 0.5 * shield + 0.5 * this.shieldFlare });
      if (this.shieldFlare > 0.05) {
        // Ripples spreading from where it took the blow.
        g.circle(cx + r * 0.75, cy, 0.12 + (1 - this.shieldFlare) * 0.35).stroke({
          width: 0.03,
          color: 0xffffff,
          alpha: this.shieldFlare,
        });
      }
    }
    if (this.stunned) {
      for (let i = 0; i < 3; i++) {
        const a = t * 4.5 + (i * Math.PI * 2) / 3;
        const x = s.head.x + Math.cos(a) * 0.24;
        const y = s.head.y - this.bones.headRadius - 0.12 + Math.sin(a) * 0.06;
        const k = 0.06;
        g.poly([
          x,
          y - k,
          x + k * 0.3,
          y - k * 0.3,
          x + k,
          y,
          x + k * 0.3,
          y + k * 0.3,
          x,
          y + k,
          x - k * 0.3,
          y + k * 0.3,
          x - k,
          y,
          x - k * 0.3,
          y - k * 0.3,
        ])
          .fill({ color: 0xffe066, alpha: 0.95 })
          .stroke({ width: 0.012, color: 0x7a5a00 });
      }
    }
  }

  /**
   * Muscle (Rampage Buffer, owner 12/11/2026: "heavily muscular … a much broader chest, massive
   * shoulders, thick arms, powerful legs and visibly defined muscles", grey, no gear). Over each
   * stroked limb: a V-shaped torso with a barrel chest, pecs, abs and a trapezius hump; capped
   * deltoids, bulging biceps and forearms and big fists; thick quads and calves. Every muscle is
   * outlined in the figure's own outline (the Stickman Arena line style), shaded underneath and
   * caught by a pale rim light on top. `part`: 0 rear arm, 1 rear leg, 2 torso, 3 lead leg, 4 lead arm.
   */
  private muscleDetail(
    g: Graphics,
    pts: readonly Point[],
    w: number,
    colour: number,
    outline: number,
    part: number,
  ): void {
    const lit = toward(colour, 0xffffff, 0.22);
    const shade = toward(colour, 0x000000, 0.32);
    const rim = toward(BRUTE.rim, colour, 0.35);
    const o = this.look.outlineWidthM;
    // A stroke along p→q between fractions k0..k1, shifted sideways by `off` (+ = the limb's front).
    const seg = (p: Point, q: Point, width: number, c: number, alpha = 1, k0 = 0, k1 = 1, off = 0) => {
      const dx = q.x - p.x;
      const dy = q.y - p.y;
      const l = Math.hypot(dx, dy) || 1;
      const nx = (-dy / l) * off;
      const ny = (dx / l) * off;
      g.moveTo(p.x + dx * k0 + nx, p.y + dy * k0 + ny)
        .lineTo(p.x + dx * k1 + nx, p.y + dy * k1 + ny)
        .stroke({ width, color: c, alpha, cap: 'round' });
    };
    // Muscle masses are drawn in two passes, all outlines then all fills, so the masses of one limb
    // merge into a single smooth silhouette instead of a stack of outlined lumps.
    type Mass =
      | { p: Point; q: Point; width: number; k0: number; k1: number; off: number; c: number }
      | (Point & { r: number; c: number });
    const masses: Mass[] = [];
    const mass = (p: Point, q: Point, width: number, k0: number, k1: number, off = 0, c = colour) =>
      masses.push({ p, q, width, k0, k1, off, c });
    const ball = (x: number, y: number, r: number, c = colour) => masses.push({ x, y, r, c });
    const paint = (): void => {
      for (const pass of [0, 1] as const) {
        for (const m of masses) {
          if ('r' in m) {
            g.circle(m.x, m.y, m.r + (pass ? 0 : o)).fill(pass ? m.c : outline);
          } else seg(m.p, m.q, m.width + (pass ? 0 : o * 2), pass ? m.c : outline, 1, m.k0, m.k1, m.off);
        }
      }
    };
    const at = (p: Point, q: Point, k: number, off = 0): Point => {
      const dx = q.x - p.x;
      const dy = q.y - p.y;
      const l = Math.hypot(dx, dy) || 1;
      return { x: p.x + dx * k + (-dy / l) * off, y: p.y + dy * k + (dx / l) * off };
    };
    const line = (a: Point, b: Point, width: number, c: number, alpha = 1) =>
      g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width, color: c, alpha, cap: 'round' });
    if (part === 2) {
      const [pelvis, chest, neck] = pts;
      if (!pelvis || !chest || !neck) return;
      // A bodybuilder's V-taper (owner, 12/11/2026): a tight waist flaring into a barrel chest far
      // wider than it, a trapezius hump and a thick neck, all one shape; pants over the hips.
      const pants = this.look.pants;
      mass(pelvis, chest, w * 1.85, 0.0, 0.38, 0, pants ?? colour);
      mass(pelvis, chest, w * 2.15, 0.34, 0.62, w * 0.05);
      mass(pelvis, chest, w * 3.7, 0.56, 1.0, w * 0.1);
      mass(chest, neck, w * 2.2, 0, 0.75);
      paint();
      // (The pants' own edge marks the waist: no belt or seam line.)
      // Muscle definition is shaded, not drawn (owner, 12/11/2026: "the abs look like they're drawn
      // and not real"): soft light on each muscle's bulge and soft shadow in the grooves, with no
      // hard lines. Pecs: a lit slab with a soft shadow under it.
      seg(pelvis, chest, w * 1.25, lit, 0.4, 0.76, 0.95, w * 1.05);
      seg(pelvis, chest, w * 0.5, shade, 0.4, 0.665, 0.69, w * 1.05);
      // Abs (above the waistband): a soft centre groove, then three pairs of rounded, lit blocks.
      seg(pelvis, chest, w * 0.2, shade, 0.35, 0.42, 0.64, w * 0.85);
      for (const [k0, k1] of [
        [0.425, 0.46],
        [0.5, 0.535],
        [0.575, 0.61],
      ] as const) {
        seg(pelvis, chest, w * 0.42, lit, 0.3, k0, k1, w * 0.5);
        seg(pelvis, chest, w * 0.42, lit, 0.3, k0, k1, w * 1.2);
        seg(pelvis, chest, w * 0.16, shade, 0.22, k1 + 0.012, k1 + 0.016, w * 0.85); // soft groove below
      }
      // Lats' shadow down the back; a pale rim light across the shoulders.
      seg(pelvis, chest, w * 0.45, shade, 0.5, 0.15, 0.85, -w * 1.2);
      seg(pelvis, chest, w * 0.22, rim, 0.7, 0.62, 0.97, -w * 1.55);
      return;
    }
    const [root, mid, end] = pts;
    if (!root || !mid || !end) return;
    const arm = part === 0 || part === 4;
    if (arm) {
      // Massive capped deltoid, biceps and triceps bulging into the elbow, a forearm widest near the
      // elbow, and a big fist.
      ball(root.x, root.y, w * 1.4);
      mass(root, mid, w * 1.95, 0.12, 0.62, w * 0.2);
      mass(root, mid, w * 1.45, 0.5, 0.95);
      mass(mid, end, w * 1.65, 0.06, 0.5);
      mass(mid, end, w * 1.25, 0.45, 0.85);
      ball(end.x, end.y, w * 0.95, toward(colour, 0x000000, 0.1));
      paint();
      g.moveTo(root.x + Math.cos(Math.PI * 1.05) * w * 1.15, root.y + Math.sin(Math.PI * 1.05) * w * 1.15)
        .arc(root.x, root.y, w * 1.15, Math.PI * 1.05, Math.PI * 1.6)
        .stroke({ width: w * 0.22, color: rim, alpha: 0.7 });
      seg(root, mid, w * 0.32, lit, 0.6, 0.22, 0.58, w * 0.75); // biceps highlight
      line(at(root, mid, 0.62, w * 0.2), at(root, mid, 0.5, w * 1.2), o * 0.6, shade, 0.9); // biceps edge
      seg(mid, end, w * 0.26, rim, 0.55, 0.12, 0.7, -w * 0.6);
      line({ x: end.x - w * 0.55, y: end.y - w * 0.12 }, { x: end.x + w * 0.55, y: end.y - w * 0.02 }, o * 0.6, shade);
      return;
    }
    // Legs: thick quads and hamstrings, a hard knee, a heavy calf and a broad foot; in loose fighting
    // pants (owner, 12/11/2026) when the fighter has them, ending just above the foot.
    const pants = this.look.pants;
    const cloth = pants ?? colour;
    mass(root, mid, w * 1.8, 0.0, 0.6, w * 0.1, cloth);
    mass(root, mid, w * 1.5, 0.5, 1.0, 0, cloth);
    mass(mid, end, w * 1.45, 0.0, 0.55, -w * 0.1, cloth);
    mass(mid, end, w * 1.2, 0.5, pants !== undefined ? 0.78 : 0.88, 0, cloth);
    paint();
    g.ellipse(end.x + w * 0.45, end.y, w * 1.05, w * 0.5)
      .fill(toward(colour, 0x000000, 0.18))
      .stroke({ width: o, color: outline });
    if (pants !== undefined) {
      const clothLit = toward(pants, 0xffffff, 0.16);
      const fold = toward(pants, 0x000000, 0.4);
      seg(root, mid, w * 0.32, clothLit, 0.6, 0.12, 0.62, w * 0.75);
      line(at(root, mid, 0.3, w * 0.5), at(root, mid, 0.55, -w * 0.2), o * 0.5, fold, 0.9); // folds
      line(at(mid, end, 0.25, w * 0.4), at(mid, end, 0.45, -w * 0.3), o * 0.5, fold, 0.9);
      line(at(mid, end, 0.05, -w * 0.5), at(mid, end, 0.05, w * 0.6), o * 0.5, fold, 0.7); // behind the knee
    } else {
      seg(root, mid, w * 0.38, lit, 0.55, 0.14, 0.62, w * 0.85);
      line(at(root, mid, 0.25, w * 0.15), at(root, mid, 0.72, w * 0.35), o * 0.55, shade, 0.9); // quad split
      seg(mid, end, w * 0.3, shade, 0.5, 0.15, 0.55, w * 0.55);
    }
  }

  /**
   * A plain round stickman head (Rampage Buffer, owner 12/11/2026: "a simple round human stickman
   * head"), with two narrow eyes that glow red under a scowling brow, so he stays menacing (owner,
   * 12/11/2026: "make sure the eyes are visible and look menacing"). Drawn in the figure's frame
   * (+x = forward).
   */
  private bruteHead(
    g: Graphics,
    s: ReturnType<typeof solveSkeleton>,
    colour: number,
    outline: number,
    o: number,
  ): void {
    const r = this.bones.headRadius;
    const hx = s.head.x;
    const hy = s.head.y;
    const skin = this.rage > 0 ? toward(colour, BRUTE.rage, this.rage * 0.3) : colour;
    g.circle(hx, hy, r)
      .fill(skin)
      .stroke({ width: o * 1.4, color: outline });
    // Pale rim light on the back of the skull, a shadow under the jaw.
    // (Each arc starts with its own moveTo, or Pixi joins it to the last point drawn with a line.)
    const arcAt = (rr: number, a0: number, a1: number) =>
      g.moveTo(hx + Math.cos(a0) * rr, hy + Math.sin(a0) * rr).arc(hx, hy, rr, a0, a1);
    arcAt(r * 0.82, Math.PI * 1.05, Math.PI * 1.55).stroke({ width: r * 0.14, color: BRUTE.rim, alpha: 0.55 });
    arcAt(r * 0.8, Math.PI * 0.2, Math.PI * 0.75).stroke({
      width: r * 0.16,
      color: toward(skin, 0x000000, 0.3),
      alpha: 0.6,
    });
    const rage = this.rage;
    const eye = toward(BRUTE.eye, 0xff0000, rage);
    const pulse = 0.85 + 0.15 * Math.sin(this.clockS * 5);
    // Narrow slanted slits (explicit points: tiny curves at metre scale can collapse to nothing).
    const slit = (cx: number, cy: number, k: number): void => {
      const P = (u: number, v: number): number[] => [cx + r * u * k, cy + r * v * k];
      g.poly([...P(-0.2, -0.1), ...P(0.22, 0.02), ...P(0.18, 0.1), ...P(-0.16, 0.04)]).fill(eye);
      g.poly([...P(-0.12, -0.04), ...P(0.15, 0.04), ...P(0.02, 0.05)]).fill(BRUTE.eyeHot);
      this.fire.ellipse(cx, cy, r * 0.32 * k, r * 0.2 * k).fill({ color: eye, alpha: (0.3 + 0.35 * rage) * pulse });
    };
    slit(hx + r * 0.72, hy - r * 0.08, 0.7); // the far eye, near the edge of the face
    slit(hx + r * 0.3, hy - r * 0.02, 1.0);
    // The scowl: a hard brow dropping toward the middle of the face.
    g.moveTo(hx - r * 0.02, hy - r * 0.3)
      .lineTo(hx + r * 0.5, hy - r * 0.12)
      .lineTo(hx + r * 0.88, hy - r * 0.32)
      .stroke({ width: o * 1.3, color: outline, cap: 'round', join: 'round' });
  }

  /** Charred streaks: short dark flecks drifting along a limb, so the fire has darker detail. */
  private charStreaks(g: Graphics, pts: readonly Point[], w: number, phase: number, colour: number): void {
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i]!;
      const b = pts[i + 1]!;
      for (let k = 0; k < 2; k++) {
        const u = (phase * 0.35 + k * 0.5 + i * 0.27) % 1;
        const u2 = Math.min(1, u + 0.16);
        const off = (k === 0 ? 1 : -1) * w * 0.22;
        const nx = -(b.y - a.y);
        const ny = b.x - a.x;
        const nl = Math.hypot(nx, ny) || 1;
        g.moveTo(a.x + (b.x - a.x) * u + (nx / nl) * off, a.y + (b.y - a.y) * u + (ny / nl) * off)
          .lineTo(a.x + (b.x - a.x) * u2 + (nx / nl) * off, a.y + (b.y - a.y) * u2 + (ny / nl) * off)
          .stroke({ width: w * 0.22, color: colour, alpha: 0.55 * Math.sin(Math.PI * u), cap: 'round' });
      }
    }
  }

  /**
   * Flame tongues licking up from the shoulders, elbows, hips, knees and back (Inferno's
   * living-flame body): small layered teardrops (red, orange, yellow) that flicker on their own
   * rhythms and stream back as he moves. Drawn additively with the head's flames.
   */
  private bodyTongues(s: ReturnType<typeof solveSkeleton>, t: number, w: number): void {
    const f = this.fire;
    const back = -this.motion;
    const spots: [Point, number][] = [
      [s.neck, 1.15],
      [s.chest, 1],
      [{ x: (s.chest.x + s.pelvis.x) / 2, y: (s.chest.y + s.pelvis.y) / 2 }, 0.9],
      [s.pelvis, 0.85],
      [s.armFront[1], 0.8],
      [s.armBack[1], 0.7],
      [s.legFront[1], 0.75],
      [s.legBack[1], 0.65],
      [s.armFront[2], 0.7],
    ];
    spots.forEach(([p, scale], i) => {
      const flick = 0.6 + 0.4 * Math.abs(Math.sin(t * (7 + i) + i * 1.9));
      const h = 0.24 * scale * flick;
      for (const [colour, k, a] of [
        [FLAME.deep, 1, 0.55],
        [0xff8c1e, 0.72, 0.65],
        [0xffd95a, 0.45, 0.75],
      ] as const) {
        const hw = w * 0.85 * scale * k;
        const tipX = p.x + (back * 0.6 + Math.sin(t * 13 + i) * 0.25) * h;
        const tipY = p.y - h * k * 1.2;
        // A teardrop: rounded base, bulging sides, a swaying tip.
        f.moveTo(p.x - hw, p.y)
          .bezierCurveTo(p.x - hw * 1.3, p.y - h * k * 0.35, p.x - hw * 0.3, p.y - h * k * 0.7, tipX, tipY)
          .bezierCurveTo(p.x + hw * 0.35, p.y - h * k * 0.65, p.x + hw * 1.3, p.y - h * k * 0.3, p.x + hw, p.y)
          .quadraticCurveTo(p.x, p.y + hw * 0.6, p.x - hw, p.y)
          .closePath()
          .fill({ color: colour, alpha: a });
      }
    });
  }

  /**
   * Where the fists and feet were last drawn: floor position (x, y) relative to the
   * fighter's feet, plus height z (for effects that follow the limbs, TD-039).
   */
  limbTips(): { fists: { x: number; y: number; z: number }[]; feet: { x: number; y: number; z: number }[] } {
    const l = this.last;
    if (!l) return { fists: [], feet: [] };
    const c = Math.cos(l.rot);
    const sn = Math.sin(l.rot);
    const at = (p: Point) => {
      const k = this.size;
      const lx = p.x * l.facing * k;
      const ly = p.y * k - l.heightM;
      const x = lx * c - ly * sn;
      const y = lx * sn + ly * c;
      return { x, y: 0, z: -y };
    };
    return {
      fists: [at(l.s.armFront[2]), at(l.s.armBack[2])],
      feet: [at(l.s.legFront[2]), at(l.s.legBack[2])],
    };
  }

  destroy(): void {
    this.root.destroy({ children: true });
  }
}

/** Blend a colour toward a target colour by k (0..1). */
function toward(colour: number, target: number, k: number): number {
  if (k <= 0) return colour;
  const t = Math.min(1, k);
  const ch = (shift: number): number => {
    const c = (colour >> shift) & 0xff;
    const g = (target >> shift) & 0xff;
    return Math.round(c + (g - c) * t);
  };
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}
