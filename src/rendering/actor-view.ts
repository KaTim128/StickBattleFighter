import { StickmanAnimator } from '../animation/animator';
import { idleStyleFor } from '../animation/greybox-motion';
import { blendPose, type Pose } from '../animation/skeleton';
import type { FighterDef } from '../data/fighters/fighter-def';
import { StickmanView } from './stickman-view';

const limb = (root: number, bend: number) => ({ root: (root * Math.PI) / 180, bend: (bend * Math.PI) / 180 });

/**
 * A stickman for the Hide and Seek scene (Phase 2): the same view, rig and animator the fighters use,
 * without any combat state. It walks, runs and crouches by what the game says it is doing.
 */
export class ActorView {
  readonly view: StickmanView;
  private readonly animator: StickmanAnimator;
  /** 0..1 how far into a crouch (eased). */
  private crouch = 0;

  constructor(readonly def: FighterDef) {
    const idle = def.animation.clips.Idle[0];
    this.animator = new StickmanAnimator(def.bones, idleStyleFor(idle?.kind === 'procedural' ? idle.id : undefined));
    this.view = new StickmanView(
      def.bones,
      def.look,
      def.effects.head === 'flame' && !def.capabilities.usesFireEffects ? 'round' : (def.effects.head ?? 'round'),
      (def.effects.body === 'flame' || def.effects.body === 'magma') && !def.capabilities.usesFireEffects
        ? 'solid'
        : (def.effects.body ?? 'solid'),
      def.sizeScale ?? 1,
      def.effects.held ?? null,
    );
  }

  /** Draw the pose for what it is doing now. `crouching` lowers it; `extra` replaces the pose entirely (a kill animation). */
  draw(
    dtS: number,
    motion: { speedMps: number; running: boolean; crouching: boolean },
    facing: 1 | -1,
    heightM: number,
    override?: Pose,
  ): void {
    const crouchGoal = motion.crouching ? 1 : 0;
    this.crouch += (crouchGoal - this.crouch) * Math.min(1, dtS * 10);
    let pose = this.animator.update(dtS, {
      speedMps: motion.speedMps,
      maxSpeedMps: this.def.movement.maxSpeedMps,
      heightM: 0,
      peakHeightM: 0,
      sprinting: motion.running,
      relaxed: true,
    });
    if (this.crouch > 0.01) {
      const low: Pose = {
        ...pose,
        lean: pose.lean - 0.42,
        head: pose.head + 0.2,
        legFront: limb(58, -105),
        legBack: limb(-25, -85),
      };
      pose = blendPose(pose, low, this.crouch);
    }
    this.view.draw(override ?? pose, facing, heightM);
  }

  get footfalls(): number {
    return this.animator.takeFootfalls();
  }

  destroy(): void {
    this.view.root.destroy({ children: true });
  }
}
