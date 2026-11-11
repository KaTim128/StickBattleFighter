import { Container, Graphics } from 'pixi.js';
import type { BoneLengths, Point, Pose } from '../animation/skeleton';
import { solveSkeleton } from '../animation/skeleton';

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

  constructor(
    private readonly bones: BoneLengths,
    private readonly look: StickmanLook,
  ) {
    this.root.label = 'stickman';
    this.figure.addChild(this.body);
    this.root.addChild(this.shadow, this.figure);
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

    const shrink = 1 / (1 + heightM * 0.8);
    this.shadow
      .clear()
      .ellipse(0, 0, 0.42 * shrink, 0.13 * shrink)
      .fill({ color: 0x000000, alpha: 0.32 * shrink });

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
    g.circle(s.head.x, s.head.y, this.bones.headRadius)
      .fill(limb)
      .stroke({ width: o * 1.4, color: outline });
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
