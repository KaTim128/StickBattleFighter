import { armIk, type BoneLengths, legIk, type Pose } from './skeleton';

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
  /** Guard height: 0 = the boxer's high guard, 1 = a lower, looser kicking guard. */
  guardLow?: number;
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
    armFront: {
      root: deg(88 - s.guard * 4 - (s.guardLow ?? 0) * 18),
      bend: deg(90 + s.guard * 6 - (s.guardLow ?? 0) * 10),
    },
    armBack: { root: deg(42 + s.guard * 3 - (s.guardLow ?? 0) * 8), bend: deg(138 - (s.guardLow ?? 0) * 18) },
    legFront: legIk(s.leadFootX, s.pelvisM - (s.leadLiftM ?? 0), bones.thigh, bones.shin),
    legBack: legIk(s.rearFootX, s.pelvisM - (s.rearLiftM ?? 0), bones.thigh, bones.shin),
  };
}

/**
 * TAEKWONDO STANCE (style profile `proc.idle.taekwondo`, TD-039): taller and
 * lighter, more side-on with a longer stagger, hands a little lower and looser
 * (the legs do the work), bouncing quicker on the balls of the feet.
 */
export const TAEKWONDO_STANCE = {
  leadFootX: 0.3,
  rearFootX: -0.42,
  pelvisM: 0.7,
  lean: -6,
  head: 10,
  bounceHz: 2.4,
  bounceM: 0.035,
  guardLow: 1,
} as const;

export type IdleStyle = 'boxer' | 'taekwondo';

/** Idle: planted wide stance with a light bounce on the balls of the feet (1.8 bounces per second). */
export function idlePose(timeS: number, bones: BoneLengths, style: IdleStyle = 'boxer'): Pose {
  if (style === 'taekwondo') {
    const t = TAEKWONDO_STANCE;
    const b = 0.5 + 0.5 * Math.sin(timeS * TAU * t.bounceHz);
    return fightingStance(
      {
        pelvisM: t.pelvisM - b * t.bounceM,
        leadFootX: t.leadFootX,
        rearFootX: t.rearFootX,
        lean: t.lean,
        head: t.head,
        guard: b,
        guardLow: t.guardLow,
      },
      bones,
    );
  }
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
 * Arms for walking and running (owner, 11/11/2026): where each FIST sits, relative to the
 * shoulder in the torso's frame (+x forward, +y down), at the middle of its swing, and how far
 * it swings forward and back (and up and down). Arm IK turns these into joint angles.
 */
interface ArmSwing {
  lead: { x: number; y: number };
  rear: { x: number; y: number };
  swingX: number;
  swingY: number;
}

/**
 * A real stride, sampled by phase (0..1 per cycle = two steps). The caller
 * advances the phase by distance travelled / stride, so feet keep pace with
 * the ground. Legs move in opposition (one plants while the other swings
 * through with its foot lifted), and each arm swings opposite its leg,
 * elbows bent so the fists stay up like a fighter's.
 */
function gaitPose(
  phase: number,
  bones: BoneLengths,
  g: {
    pelvisM: number;
    bob: number;
    leadX: number;
    rearX: number;
    reach: number;
    lift: number;
    lean: number;
    head: number;
    arms: ArmSwing;
  },
): Pose {
  const a = phase * TAU;
  const s = Math.sin(a);
  const c = Math.cos(a);
  // Lead leg forward when s > 0 and swinging (lifted) while it moves forward (c > 0); the rear leg is opposite.
  const leadFootX = g.leadX + g.reach * s;
  const rearFootX = g.rearX - g.reach * s;
  const leadLift = g.lift * Math.max(0, c);
  const rearLift = g.lift * Math.max(0, -c);
  const pelvisM = g.pelvisM + g.bob * Math.cos(2 * a); // up at mid-stance, down as the feet pass
  const arms = g.arms;
  return {
    lean: deg(g.lean),
    head: deg(g.head),
    // Each fist swings opposite its leg: the lead fist forward as the rear leg comes forward (s < 0).
    armFront: armIk(arms.lead.x - arms.swingX * s, arms.lead.y + arms.swingY * s, bones.upperArm, bones.foreArm),
    armBack: armIk(arms.rear.x + arms.swingX * s, arms.rear.y - arms.swingY * s, bones.upperArm, bones.foreArm),
    legFront: legIk(leadFootX, pelvisM - leadLift, bones.thigh, bones.shin),
    legBack: legIk(rearFootX, pelvisM - rearLift, bones.thigh, bones.shin),
  };
}

/** Walking: alternating steps, arms pumping opposite the legs with the guard still up. */
export function walkPose(phase: number, bones: BoneLengths): Pose {
  return gaitPose(phase, bones, {
    pelvisM: CROUCH_M,
    bob: 0.018,
    leadX: 0.08,
    rearX: -0.12,
    reach: 0.22,
    lift: 0.1,
    lean: BOXER_STANCE.walkLean,
    head: BOXER_STANCE.head + 1,
    arms: { lead: { x: 0.32, y: -0.03 }, rear: { x: 0.17, y: -0.06 }, swingX: 0.07, swingY: 0.02 },
  });
}

/** Running: longer strides with a high knee, more lean, and a strong elbows-bent arm pump. */
export function runPose(phase: number, bones: BoneLengths): Pose {
  return gaitPose(phase, bones, {
    pelvisM: CROUCH_M - 0.04,
    bob: 0.035,
    leadX: 0.08,
    rearX: -0.1,
    reach: 0.32,
    lift: 0.2,
    lean: -24,
    head: 24,
    arms: { lead: { x: 0.24, y: 0.08 }, rear: { x: 0.1, y: 0.1 }, swingX: 0.19, swingY: 0.05 },
  });
}

/** Distance (m) covered by one walk cycle (two steps) and one run cycle. */
export const WALK_STRIDE_M = 1.2;
export const RUN_STRIDE_M = 2.2;
/** Walking blends into running between these speeds, m/s. */
export const RUN_FROM_MPS = 2.6;
export const RUN_FULL_MPS = 4.2;

/** 0 = walking, 1 = running, by ground speed. */
export function runAmount(speedMps: number): number {
  return Math.min(1, Math.max(0, (speedMps - RUN_FROM_MPS) / (RUN_FULL_MPS - RUN_FROM_MPS)));
}

/** Distance per gait cycle at this speed (walk stride blending into run stride). */
export function strideAt(speedMps: number): number {
  return WALK_STRIDE_M + (RUN_STRIDE_M - WALK_STRIDE_M) * runAmount(speedMps);
}

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
