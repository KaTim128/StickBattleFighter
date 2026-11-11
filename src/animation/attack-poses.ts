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

/**
 * Facing right: armFront = lead (left) hand, armBack = rear (right) hand.
 * Each attack has COMBO_VARIANTS looks (owner, 11/11/2026: "variations but same
 * damage"). They share the attack's timing, reach and damage; only the body
 * mechanics differ, so the combo does not look the same every time.
 */
const SHAPES: Record<AttackId, readonly AttackShape[]> = {
  jab: [
    // Straight left jab: lead fist snaps out at chin height.
    {
      chamber: { lean: deg(-14), armFront: limb(70, 105) },
      strike: { lean: deg(-22), armFront: limb(92, 4), armBack: limb(40, 140) },
    },
    // Body jab: dips low and drives the lead fist into the midsection.
    {
      chamber: { lean: deg(-20), armFront: limb(55, 110) },
      strike: { lean: deg(-34), head: deg(24), armFront: limb(72, 6), armBack: limb(50, 135) },
    },
    // High snapping jab: tall, quick, aimed over the guard.
    {
      chamber: { lean: deg(-10), head: deg(10), armFront: limb(85, 120) },
      strike: { lean: deg(-18), head: deg(12), armFront: limb(104, 8), armBack: limb(30, 145) },
    },
  ],
  hook: [
    // Right hook: rear arm winds back, then swings round wide and level, torso turning into it.
    {
      chamber: { lean: deg(-6), armBack: limb(-15, 95), armFront: limb(60, 120) },
      strike: { lean: deg(-32), armBack: limb(96, 42), armFront: limb(35, 130), head: deg(22) },
    },
    // Rear uppercut: dips, then drives the fist up under the chin.
    {
      chamber: { lean: deg(4), armBack: limb(5, 120), armFront: limb(65, 120) },
      strike: { lean: deg(-20), head: deg(-8), armBack: limb(128, 78), armFront: limb(45, 125) },
    },
    // Lead hook: the front arm swings round, rear hand stays home on guard.
    {
      chamber: { lean: deg(-4), armFront: limb(30, 110), armBack: limb(60, 130) },
      strike: { lean: deg(-30), head: deg(20), armFront: limb(98, 48), armBack: limb(55, 135) },
    },
  ],
  heavy: [
    // Rear straight: deep load, then a full-body punch with a step-in lunge.
    {
      chamber: { lean: deg(-4), head: deg(8), armBack: limb(-10, 125), armFront: limb(80, 95) },
      strike: { lean: deg(-32), head: deg(22), armBack: limb(98, 0), armFront: limb(30, 120), legBack: limb(-40, -8) },
    },
    // Front push kick: knee chambers high, then the lead foot drives straight through.
    {
      chamber: { lean: deg(8), legFront: limb(80, -115), armFront: limb(70, 110), armBack: limb(50, 130) },
      strike: { lean: deg(16), head: deg(-6), legFront: limb(96, -4), armFront: limb(40, 90), armBack: limb(-30, 60) },
    },
    // Overhand smash: the rear fist loops up over the head and crashes down and forward.
    {
      chamber: { lean: deg(8), head: deg(-4), armBack: limb(160, 70), armFront: limb(70, 110) },
      strike: {
        lean: deg(-40),
        head: deg(30),
        armBack: limb(105, 8),
        armFront: limb(25, 120),
        legBack: limb(-35, -10),
      },
    },
  ],
  flyingKick: [
    // Flying kick: lead leg driven out straight, rear leg tucked, arms out.
    {
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
    // Flying knee: both arms pull down as the lead knee drives forward and up.
    {
      chamber: { lean: deg(-2), legFront: limb(70, -130), legBack: limb(15, -100), armFront: limb(70, 60) },
      strike: {
        lean: deg(-14),
        head: deg(10),
        legFront: limb(105, -125),
        legBack: limb(5, -110),
        armFront: limb(100, 40),
        armBack: limb(80, 50),
      },
    },
    // Side kick: leaning far back, the heel shoots out level.
    {
      chamber: { lean: deg(10), legFront: limb(95, -125), legBack: limb(25, -100) },
      strike: {
        lean: deg(28),
        head: deg(-14),
        legFront: limb(98, -2),
        legBack: limb(30, -90),
        armFront: limb(10, 60),
        armBack: limb(-40, 40),
      },
    },
  ],
};

const shapeOf = (id: AttackId, variant: number): AttackShape => {
  const list = SHAPES[id];
  return list[((variant % list.length) + list.length) % list.length]!;
};

function apply(base: Pose, over: PartialPose): Pose {
  return { ...base, ...over };
}

/**
 * Pose for an attack at progress 0..1 of its whole duration, layered on the
 * pose the body would otherwise have (`base`), in the given look (`variant`).
 */
export function attackPose(base: Pose, attack: AttackDef, progress: number, variant = 0): Pose {
  const shape = shapeOf(attack.id, variant);
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
export function attackJoints(id: AttackId, variant = 0): (keyof Pose)[] {
  return Object.keys(shapeOf(id, variant).strike) as (keyof Pose)[];
}

/** How many looks an attack has (tests check it matches COMBO_VARIANTS). */
export function attackVariantCount(id: AttackId): number {
  return SHAPES[id].length;
}
