import { Container, Graphics } from 'pixi.js';
import type { BoneLengths, Point, Pose } from '../animation/skeleton';
import { solveSkeleton } from '../animation/skeleton';
import type { HeadStyle } from '../characters/schema';

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
export class StickmanView {
  private last: { s: ReturnType<typeof solveSkeleton>; facing: 1 | -1; heightM: number; rot: number } | null = null;
  readonly root = new Container();
  private readonly shadow = new Graphics();
  private readonly body = new Graphics();
  private readonly figure = new Container();
  /** The flame head (head style 'flame'): drawn additively so overlapping tongues glow. */
  private readonly fire = new Graphics();
  private readonly fireCore = new Graphics();
  /** 0..1 how fast the fighter is moving: the flames stream back. */
  motion = 0;
  private readonly t0 = typeof performance === 'undefined' ? 0 : performance.now();

  constructor(
    private readonly bones: BoneLengths,
    private readonly look: StickmanLook,
    private readonly head: HeadStyle = 'round',
  ) {
    this.root.label = 'stickman';
    this.fire.blendMode = 'add';
    this.figure.addChild(this.body, this.fire, this.fireCore);
    this.root.addChild(this.shadow, this.figure);
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
  draw(pose: Pose, facing: 1 | -1, heightM: number, tiltRad = 0, flash = 0, flashColour = 0xffffff): void {
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
    this.figure.y = -heightM;
    // Falling backwards, away from the facing direction.
    this.figure.rotation = -facing * tiltRad;

    const g = this.body.clear();
    const stroke = (pts: readonly Point[], color: number, width: number): void => {
      const [first, ...rest] = pts;
      if (!first) return;
      g.moveTo(first.x, first.y);
      for (const p of rest) g.lineTo(p.x, p.y);
      g.stroke({ width, color, cap: 'round', join: 'round' });
    };
    const limbStroke = (pts: readonly Point[], color: number): void => {
      stroke(pts, outline, w + o * 2);
      stroke(pts, color, w);
    };

    // Back limbs first (darker), then torso, front limbs, head.
    limbStroke(s.armBack, limbBack);
    limbStroke(s.legBack, limbBack);
    limbStroke([s.pelvis, s.chest, s.neck], limb);
    limbStroke(s.legFront, limb);
    limbStroke(s.armFront, limb);
    if (this.head === 'flame') this.flameHead(s.head.x, s.head.y, this.bones.headRadius * 1.15, flash);
    else {
      this.fire.clear();
      this.fireCore.clear();
      g.circle(s.head.x, s.head.y, this.bones.headRadius)
        .fill(limb)
        .stroke({ width: o * 1.4, color: outline });
    }
  }

  /**
   * A living flame for a head (owner-approved mockup, TD-045): layered tongues (red, orange,
   * yellow) that flicker on their own rhythms and stream back as the fighter moves, a glowing
   * ball of fire, a blue base on the neck, rising embers and two calm white eyes.
   * Original procedural design; drawn in the figure's frame (it mirrors with the facing).
   */
  private flameHead(x: number, y: number, r: number, flash: number): void {
    const t = this.clockS;
    const back = -this.motion; // the figure is mirrored by facing, so "back" is always -x here
    const f = this.fire.clear();
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
    const c = this.fireCore.clear();
    // The ball of fire, a white-hot centre and a blue base where it sits on the neck.
    c.circle(x, y, r).fill({ color: 0xff8c1e, alpha: 0.9 });
    c.circle(x - r * 0.15, y - r * 0.12, r * 0.68).fill({ color: 0xffc94a, alpha: 0.95 });
    c.circle(x - r * 0.2, y - r * 0.2, r * 0.35).fill({ color: 0xfff6d2, alpha: 0.95 });
    c.ellipse(x, y + r * 0.72, r * 0.62, r * 0.3).fill({ color: 0x6ea8ff, alpha: 0.55 });
    // Eyes: two calm white slits in the fire.
    c.ellipse(x + r * 0.28, y - r * 0.05, r * 0.1, r * 0.22).fill(0xffffff);
    c.ellipse(x + r * 0.62, y - r * 0.02, r * 0.09, r * 0.2).fill(0xffffff);
    if (flash > 0) c.circle(x, y, r).fill({ color: 0xffffff, alpha: flash * 0.6 });
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
