import type { AttackDef, AttackId } from '../combat/attacks';
import { blendPose, type Limb, type Pose } from './skeleton';

/**
 * Attack animations for the greybox stickman, built on the jointed skeleton.
 * Every attack moves through three beats matching its timing data:
 *   wind-up  → ease from the current pose into an anticipation (chamber) pose
 *   active   → snap out to the strike pose
 *   recovery → ease back to the current pose (the stance or the jump pose)
 * Only the joints an attack uses are overridden; the rest keep moving
 * (footwork, jump pose), so attacks blend with movement and the jump.
 */
const deg = (d: number): number => (d * Math.PI) / 180;
const ease = (x: number): number => {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
};

type PartialPose = Partial<Pose>;

interface AttackShape {
  chamber: PartialPose;
  strike: PartialPose;
}

const limb = (root: number, bend: number): Limb => ({ root: deg(root), bend: deg(bend) });

/** Facing right: armFront = lead (left) hand, armBack = rear (right) hand. */
const SHAPES: Record<AttackId, AttackShape> = {
  // 1. Left jab: lead fist snaps straight out at chin height.
  jab: {
    chamber: { lean: deg(-14), armFront: limb(70, 105) },
    strike: { lean: deg(-22), armFront: limb(92, 4), armBack: limb(40, 140) },
  },
  // 2. Right hook: rear arm winds back, then swings round wide and level, elbow bent,
  //    torso turning hard into it so the arm sweeps across in front of the body.
  hook: {
    chamber: { lean: deg(-6), armBack: limb(-15, 95), armFront: limb(60, 120) },
    strike: { lean: deg(-32), armBack: limb(96, 42), armFront: limb(35, 130), head: deg(22) },
  },
  // 3. Heavy finisher: deep load, then a full-body rear straight with a step-in lunge.
  heavy: {
    chamber: { lean: deg(-4), head: deg(8), armBack: limb(-10, 125), armFront: limb(80, 95) },
    strike: { lean: deg(-32), head: deg(22), armBack: limb(98, 0), armFront: limb(30, 120), legBack: limb(-40, -8) },
  },
  // Air: flying kick, lead leg driven out straight, rear leg tucked, arms out.
  flyingKick: {
    chamber: { lean: deg(4), legFront: limb(85, -120), legBack: limb(20, -110), armFront: limb(60, 70) },
    strike: {
      lean: deg(12),
      head: deg(-4),
      legFront: limb(92, -4),
      legBack: limb(10, -120),
      armFront: limb(40, 40),
      armBack: limb(-70, 30),
    },
  },
};

function apply(base: Pose, over: PartialPose): Pose {
  return { ...base, ...over };
}

/**
 * Pose for an attack at progress 0..1 of its whole duration, layered on the
 * pose the body would otherwise have (`base`).
 */
export function attackPose(base: Pose, attack: AttackDef, progress: number): Pose {
  const shape = SHAPES[attack.id];
  const total = attack.windupS + attack.activeS + attack.recoveryS;
  const tWind = attack.windupS / total;
  const tActive = attack.activeS / total;
  const chamber = apply(base, shape.chamber);
  const strike = apply(base, shape.strike);
  if (progress < tWind) return blendPose(base, chamber, ease(progress / tWind));
  if (progress < tWind + tActive) {
    // Reach full extension in the first 40% of the active window: a snap, then hold.
    return blendPose(chamber, strike, ease(((progress - tWind) / tActive) * 2.5));
  }
  return blendPose(strike, base, ease((progress - tWind - tActive) / (1 - tWind - tActive)));
}

/** The joints each attack drives (exported for tests). */
export function attackJoints(id: AttackId): (keyof Pose)[] {
  return Object.keys(SHAPES[id].strike) as (keyof Pose)[];
}
