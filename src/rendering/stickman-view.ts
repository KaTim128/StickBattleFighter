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
   */
  draw(pose: Pose, facing: 1 | -1, heightM: number, tiltRad = 0): void {
    const s = solveSkeleton(pose, this.bones);
    const { limb, limbBack, outline, limbWidthM: w, outlineWidthM: o } = this.look;

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

  destroy(): void {
    this.root.destroy({ children: true });
  }
}
