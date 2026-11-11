import { blendPose, type Limb, type Pose } from './skeleton';

/**
 * Inferno's ability animations (REQ-ANI-3/4) on the jointed skeleton. Each
 * cast has an anticipation pose during the wind-up (`windup`, progress 0..1),
 * then a release pose that is held while the ability plays out and eased back
 * to the stance at the end of `recovery`. Facing right: armFront = lead hand.
 */
const deg = (d: number): number => (d * Math.PI) / 180;
const limb = (root: number, bend: number): Limb => ({ root: deg(root), bend: deg(bend) });
const ease = (x: number): number => {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
};

interface CastShape {
  windup: Partial<Pose>;
  release: Partial<Pose>;
  /** Fraction of the recovery spent easing back to the stance (at the end). */
  settle: number;
}

const CROUCH: Partial<Pose> = { legFront: limb(50, -95), legBack: limb(-20, -70) };

const SHAPES: Record<string, CastShape> = {
  // Fireball: the lead palm opens out to the side, drawing fire in from the air while the rear fist
  // pulls back to the hip; then the palm thrusts forward and the ball is hurled.
  fireball: {
    windup: { lean: deg(8), head: deg(6), armFront: limb(70, 35), armBack: limb(10, 130), legFront: limb(26, -20) },
    release: { lean: deg(-20), head: deg(16), armFront: limb(92, 8), armBack: limb(84, 18) },
    settle: 0.6,
  },
  // Coil low, then rush forward fist-first with the rear arm trailing.
  flameDash: {
    windup: { lean: deg(-24), head: deg(20), armFront: limb(60, 120), armBack: limb(30, 130), ...CROUCH },
    release: { lean: deg(-40), head: deg(30), armFront: limb(96, 8), armBack: limb(-35, 40) },
    settle: 0.35,
  },
  // Both fists raised high, then slammed into the floor; held while the ring warns, then rise.
  eruption: {
    windup: { lean: deg(8), head: deg(-10), armFront: limb(168, 30), armBack: limb(160, 40) },
    release: { lean: deg(-42), head: deg(32), armFront: limb(22, 10), armBack: limb(14, 16), ...CROUCH },
    settle: 0.3,
  },
  // Deep crouch to spring; in the air it uses METEOR_AIR, then this release pose is the landing slam.
  meteorFist: {
    windup: { lean: deg(-18), head: deg(18), armFront: limb(40, 110), armBack: limb(-20, 100), ...CROUCH },
    release: { lean: deg(-44), head: deg(34), armBack: limb(30, 6), armFront: limb(60, 110), ...CROUCH },
    settle: 0.2, // most of the recovery is the leap; the landing slam is held briefly at the end
  },
};

/** In the air during Meteor Fist: rear fist cocked overhead, lead arm reaching, knees tucked. */
const METEOR_AIR: Partial<Pose> = {
  lean: deg(-10),
  head: deg(14),
  armBack: limb(178, 55),
  armFront: limb(105, 20),
  legFront: limb(70, -120),
  legBack: limb(30, -110),
};

/**
 * Pose for an ability cast. `airborne` is true while a leap carries the fighter
 * (Meteor Fist shows its air pose, then the landing slam).
 */
export function abilityPose(
  base: Pose,
  abilityId: string,
  phase: 'windup' | 'recovery',
  progress: number,
  airborne: boolean,
): Pose {
  const shape = SHAPES[abilityId];
  if (!shape) return base;
  const windup = { ...base, ...shape.windup };
  if (phase === 'windup') return blendPose(base, windup, ease(progress * 1.6));
  if (abilityId === 'meteorFist' && airborne) return { ...base, ...METEOR_AIR };
  const release = { ...base, ...shape.release };
  // Snap into the release quickly, hold it, then ease back to the stance.
  const settleFrom = 1 - shape.settle;
  if (progress < 0.12) return blendPose(windup, release, ease(progress / 0.12));
  if (progress < settleFrom) return release;
  return blendPose(release, base, ease((progress - settleFrom) / shape.settle));
}

/** Abilities with an animation (tests check every kit ability has one). */
export function hasAbilityPose(abilityId: string): boolean {
  return abilityId in SHAPES;
}
