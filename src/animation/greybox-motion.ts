import { type BoneLengths, legIk, type Pose } from './skeleton';

/**
 * GREYBOX idle, walk and airborne motion for the Phase 2 test stickman.
 * Procedural, eased cycles so motion is smooth (REQ-ANI-6). Each roster
 * fighter replaces these with its OWN stance, gait and attacks (REQ-ANI-7).
 */
const deg = (d: number): number => (d * Math.PI) / 180;
const TAU = Math.PI * 2;

// Sign guide (see skeleton.ts): positive root = towards the facing side; elbows bend
// positive (forearm forward), knees bend negative (shin backward), like real joints.

/**
 * FIGHTING STANCE at all times (owner, 11/11/2026): a wide, low, staggered
 * base with both feet planted (leg IK), knees bent over the toes, torso leaning
 * in, chin tucked, guard up (lead fist forward at chin height, rear fist by
 * the jaw). Idle bounces lightly on the balls of the feet; it never relaxes.
 */
interface StanceShape {
  /** Pelvis height above the floor (lower = deeper crouch). */
  pelvisM: number;
  /** Foot positions relative to the pelvis (+x towards facing). */
  leadFootX: number;
  rearFootX: number;
  leadLiftM?: number;
  rearLiftM?: number;
  lean: number;
  head: number;
  /** 0..1 small guard bob. */
  guard: number;
}

/**
 * Wide stagger, about 0.74 m between the feet: the lead knee does the bending,
 * the rear leg stays long and nearly straight, driving from the ball of the foot.
 */
const LEAD_FOOT_X = 0.3;
const REAR_FOOT_X = -0.44;
const CROUCH_M = 0.62;

function fightingStance(s: StanceShape, bones: BoneLengths): Pose {
  return {
    lean: deg(s.lean),
    head: deg(s.head),
    armFront: { root: deg(88 - s.guard * 4), bend: deg(90 + s.guard * 6) },
    armBack: { root: deg(42 + s.guard * 3), bend: deg(138) },
    legFront: legIk(s.leadFootX, s.pelvisM - (s.leadLiftM ?? 0), bones.thigh, bones.shin),
    legBack: legIk(s.rearFootX, s.pelvisM - (s.rearLiftM ?? 0), bones.thigh, bones.shin),
  };
}

/** Idle: planted wide stance with a light bounce on the balls of the feet (1.8 bounces per second). */
export function idlePose(timeS: number, bones: BoneLengths): Pose {
  const bounce = 0.5 + 0.5 * Math.sin(timeS * TAU * 1.8);
  return fightingStance(
    {
      pelvisM: CROUCH_M - bounce * 0.025,
      leadFootX: LEAD_FOOT_X,
      rearFootX: REAR_FOOT_X,
      lean: -16,
      head: 16,
      guard: bounce,
    },
    bones,
  );
}

/**
 * Fighting shuffle, sampled by phase (0..1 per cycle). The caller advances the
 * phase by distance travelled / stride, so feet keep pace with the ground.
 * The lead foot steps, the rear foot follows a quarter-cycle later; feet stay
 * low, keep the wide stagger and never cross. The guard only bobs.
 */
export function walkPose(phase: number, bones: BoneLengths): Pose {
  const a = phase * TAU;
  return fightingStance(
    {
      pelvisM: CROUCH_M - 0.015 * Math.sin(2 * a),
      leadFootX: LEAD_FOOT_X + 0.06 * Math.sin(a),
      rearFootX: REAR_FOOT_X + 0.02 * Math.sin(a - Math.PI / 2),
      leadLiftM: 0.07 * Math.max(0, Math.cos(a)),
      rearLiftM: 0.07 * Math.max(0, Math.cos(a - Math.PI / 2)),
      lean: -18,
      head: 17,
      guard: 0.5 + 0.5 * Math.sin(2 * a),
    },
    bones,
  );
}

/** Distance (m) covered by one full shuffle cycle (lead step + rear follow). */
export const WALK_STRIDE_M = 1.1;

/** Airborne tuck: knees up, guard kept up. */
export const AIR_POSE: Pose = {
  lean: deg(-12),
  head: deg(12),
  armFront: { root: deg(95), bend: deg(85) },
  armBack: { root: deg(45), bend: deg(130) },
  legFront: { root: deg(60), bend: deg(-95) },
  legBack: { root: deg(15), bend: deg(-75) },
};
