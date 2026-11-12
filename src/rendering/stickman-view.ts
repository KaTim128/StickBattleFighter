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

/** Armoured body colours (Rampage, owner 12/11/2026). */
const ARMOUR = { rage: 0xd8281a } as const;

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
  ) {
    this.root.label = 'stickman';
    this.fire.blendMode = 'add';
    this.figure.addChild(this.body, this.fire, this.fireCore, this.status, this.burnMask);
    this.root.addChild(this.shadow, this.trail, this.figure);
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
    const shrink = 1 / (1 + heightM * 0.8);
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
      this.figure.y = -heightM;
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
    const armoured = this.bodyStyle === 'armour';
    limbs.forEach(([pts, rawColour], i) => {
      // Rampage Mode flushes the hide red (owner, 12/11/2026).
      const colour = this.rage > 0 ? toward(rawColour, ARMOUR.rage, this.rage * 0.3) : rawColour;
      if (!fiery) {
        stroke(pts, outline, w + o * 2);
        stroke(pts, colour, w);
        if (armoured) this.armourDetail(g, pts, w, colour, outline, i === 2);
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
    else if (this.head === 'rhino') this.rhinoHead(g, s, limb, outline, o);
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
   * Armoured hide (Rampage, owner 12/11/2026: "thick armour-like skin", muscular): darker plates
   * over the forearms and shins with a light top edge, bulging muscle where the upper arms and thighs
   * meet the body, and on the torso a broad chest plate with heavy shoulder pads.
   */
  private armourDetail(
    g: Graphics,
    pts: readonly Point[],
    w: number,
    colour: number,
    outline: number,
    torso: boolean,
  ): void {
    const plate = toward(colour, 0x000000, 0.28);
    const shine = toward(colour, 0xffffff, 0.35);
    if (torso) {
      const [pelvis, chest] = pts;
      if (!pelvis || !chest) return;
      // A broad chest plate along the spine, and round shoulder pads at the top.
      g.moveTo(pelvis.x, pelvis.y)
        .lineTo(chest.x, chest.y)
        .stroke({ width: w * 2.1, color: outline, cap: 'round' })
        .moveTo(pelvis.x, pelvis.y)
        .lineTo(chest.x, chest.y)
        .stroke({ width: w * 1.75, color: plate, cap: 'round' });
      for (const k of [0.35, 0.65]) {
        const x = pelvis.x + (chest.x - pelvis.x) * k;
        const y = pelvis.y + (chest.y - pelvis.y) * k;
        g.moveTo(x - w * 0.7, y)
          .lineTo(x + w * 0.7, y)
          .stroke({ width: w * 0.12, color: shine, alpha: 0.5 });
      }
      g.circle(chest.x, chest.y, w * 1.05)
        .fill(plate)
        .stroke({ width: w * 0.3, color: outline });
      g.circle(chest.x - w * 0.25, chest.y - w * 0.3, w * 0.35).fill({ color: shine, alpha: 0.5 });
      return;
    }
    const [root, mid, end] = pts;
    if (!root || !mid || !end) return;
    // Muscle: a bulge on the upper segment.
    g.moveTo(root.x + (mid.x - root.x) * 0.25, root.y + (mid.y - root.y) * 0.25)
      .lineTo(root.x + (mid.x - root.x) * 0.7, root.y + (mid.y - root.y) * 0.7)
      .stroke({ width: w * 1.45, color: colour, cap: 'round' });
    // A plate over the lower segment (forearm or shin) with a bright top edge.
    const a = { x: mid.x + (end.x - mid.x) * 0.2, y: mid.y + (end.y - mid.y) * 0.2 };
    const b = { x: mid.x + (end.x - mid.x) * 0.85, y: mid.y + (end.y - mid.y) * 0.85 };
    g.moveTo(a.x, a.y)
      .lineTo(b.x, b.y)
      .stroke({ width: w * 1.3, color: outline, cap: 'round' });
    g.moveTo(a.x, a.y)
      .lineTo(b.x, b.y)
      .stroke({ width: w * 1.05, color: plate, cap: 'round' });
    g.moveTo(a.x, a.y - w * 0.25)
      .lineTo(b.x, b.y - w * 0.25)
      .stroke({ width: w * 0.16, color: shine, alpha: 0.6 });
  }

  /**
   * A rhino's head (Rampage): a big heavy skull pushed forward, a great curved horn rising from the
   * snout with a smaller one behind it, a small ear, a heavy brow over a narrow eye that glows red in
   * Rampage Mode. Drawn in the figure's frame (+x = forward).
   */
  private rhinoHead(
    g: Graphics,
    s: ReturnType<typeof solveSkeleton>,
    colour: number,
    outline: number,
    o: number,
  ): void {
    const r = this.bones.headRadius;
    const hx = s.head.x;
    const hy = s.head.y;
    const skin = this.rage > 0 ? toward(colour, ARMOUR.rage, this.rage * 0.3) : colour;
    const horn = 0xe8dcc0;
    // Ear behind.
    g.ellipse(hx - r * 0.55, hy - r * 0.85, r * 0.22, r * 0.38)
      .fill(skin)
      .stroke({ width: o, color: outline });
    // Skull and long snout.
    g.ellipse(hx, hy, r * 1.08, r * 0.95)
      .fill(skin)
      .stroke({ width: o * 1.4, color: outline });
    g.roundRect(hx + r * 0.2, hy - r * 0.25, r * 1.15, r * 0.95, r * 0.4)
      .fill(skin)
      .stroke({ width: o * 1.4, color: outline });
    // The great horn: a curved cone from the end of the snout, and a small one behind it.
    g.moveTo(hx + r * 0.95, hy - r * 0.2)
      .quadraticCurveTo(hx + r * 1.55, hy - r * 0.6, hx + r * 1.35, hy - r * 1.55)
      .quadraticCurveTo(hx + r * 1.2, hy - r * 0.7, hx + r * 0.55, hy - r * 0.25)
      .closePath()
      .fill(horn)
      .stroke({ width: o, color: outline });
    g.moveTo(hx + r * 0.45, hy - r * 0.35)
      .quadraticCurveTo(hx + r * 0.7, hy - r * 0.75, hx + r * 0.6, hy - r * 1.05)
      .quadraticCurveTo(hx + r * 0.45, hy - r * 0.7, hx + r * 0.2, hy - r * 0.45)
      .closePath()
      .fill(horn)
      .stroke({ width: o * 0.8, color: outline });
    // Heavy brow and a narrow eye (red-hot in Rampage Mode), and a nostril.
    g.moveTo(hx - r * 0.05, hy - r * 0.42)
      .lineTo(hx + r * 0.5, hy - r * 0.3)
      .stroke({ width: o * 1.6, color: outline, cap: 'round' });
    const eye = this.rage > 0 ? toward(0xfff1c0, 0xff2a1a, this.rage) : 0xfff1c0;
    if (this.rage > 0)
      g.circle(hx + r * 0.25, hy - r * 0.15, r * 0.3).fill({ color: 0xff3a1a, alpha: 0.35 * this.rage });
    g.ellipse(hx + r * 0.25, hy - r * 0.15, r * 0.14, r * 0.08)
      .fill(eye)
      .stroke({ width: o * 0.6, color: outline });
    g.circle(hx + r * 1.1, hy + r * 0.25, r * 0.07).fill(outline);
    // Wrinkled, armour-thick hide: a few creases on the neck.
    for (const k of [0, 1]) {
      g.moveTo(hx - r * 0.7, hy + r * (0.25 + k * 0.25))
        .quadraticCurveTo(hx - r * 0.45, hy + r * (0.45 + k * 0.25), hx - r * 0.15, hy + r * (0.35 + k * 0.25))
        .stroke({ width: o * 0.7, color: toward(skin, 0x000000, 0.35), alpha: 0.7 });
    }
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
      const lx = p.x * l.facing;
      const ly = p.y - l.heightM;
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
