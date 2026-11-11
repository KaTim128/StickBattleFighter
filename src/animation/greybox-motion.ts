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
 * UNARMED DEFAULT: BOXER STANCE (owner, 11/11/2026: "a slightly bent,
 * boxer-like fighting stance if the stickman has no weapon"). Knees only
 * slightly bent, a shoulder-width-plus stagger (~0.62 m), chin tucked behind
 * a high guard, a light lean in. Armed fighters will get their own stances
 * (see `stanceFor`), chosen by the fighter's `weapon` field.
 */
export const BOXER_STANCE = {
  leadFootX: 0.26,
  rearFootX: -0.36,
  /** Hip height: 0.67 m on 0.8 m legs, so knees are slightly bent, not crouched. */
  pelvisM: 0.67,
  lean: -11,
  head: 15,
  walkLean: -13,
} as const;

export type StanceStyle = typeof BOXER_STANCE;
export type Weapon = null | 'sword' | 'claws' | 'staff';

/** Stance used for a fighter's weapon. Unarmed (null) = boxer; armed stances arrive with their fighters. */
export function stanceFor(weapon: Weapon): StanceStyle {
  switch (weapon) {
    case null:
      return BOXER_STANCE;
    default:
      return BOXER_STANCE; // placeholder until weapon stances are designed (Phase 8–9)
  }
}

const LEAD_FOOT_X = BOXER_STANCE.leadFootX;
const REAR_FOOT_X = BOXER_STANCE.rearFootX;
const CROUCH_M = BOXER_STANCE.pelvisM;

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
      lean: BOXER_STANCE.lean,
      head: BOXER_STANCE.head,
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
      lean: BOXER_STANCE.walkLean,
      head: BOXER_STANCE.head + 1,
      guard: 0.5 + 0.5 * Math.sin(2 * a),
    },
    bones,
  );
}

/** Distance (m) covered by one full shuffle cycle (lead step + rear follow). */
export const WALK_STRIDE_M = 1.1;

/**
 * JUMP STANCE (owner request, 11/11/2026), its own look rather than a squashed
 * stand. Rising: lead knee driven up, rear leg trailing, arms lifting with the
 * guard. Falling: both knees tucked, arms opening for balance, ready to land.
 * The animator blends between them by vertical speed.
 */
export const AIR_RISE_POSE: Pose = {
  lean: deg(-10),
  head: deg(8),
  armFront: { root: deg(120), bend: deg(70) },
  armBack: { root: deg(70), bend: deg(115) },
  legFront: { root: deg(70), bend: deg(-105) },
  legBack: { root: deg(-25), bend: deg(-35) },
};

export const AIR_FALL_POSE: Pose = {
  lean: deg(-4),
  head: deg(4),
  armFront: { root: deg(75), bend: deg(55) },
  armBack: { root: deg(-35), bend: deg(60) },
  legFront: { root: deg(45), bend: deg(-80) },
  legBack: { root: deg(10), bend: deg(-85) },
};

/** Kept for blending code that wants a single air pose. */
export const AIR_POSE: Pose = AIR_FALL_POSE;

/** Landing: a quick deeper crouch that absorbs the drop, then springs back to stance. */
export function landingPose(bones: BoneLengths): Pose {
  return fightingStance(
    {
      pelvisM: CROUCH_M - 0.14,
      leadFootX: LEAD_FOOT_X + 0.04,
      rearFootX: REAR_FOOT_X - 0.04,
      lean: -22,
      head: 20,
      guard: 1,
    },
    bones,
  );
}
