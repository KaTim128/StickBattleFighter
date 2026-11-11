import type { Pose } from './skeleton';

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
 * FIGHTING STANCE at all times (owner, 11/11/2026): hands up in a guard by the
 * chin (lead fist forward, rear fist tucked), knees bent, feet staggered with
 * the lead foot ahead, torso leaning into the fight. Idle breathes inside the
 * stance; it never relaxes into a casual pose.
 */
export function idlePose(timeS: number): Pose {
  const breath = 0.5 + 0.5 * Math.sin((timeS / 2.4) * TAU); // 0..1
  return {
    lean: deg(-10 - breath * 1.5),
    head: deg(10),
    armFront: { root: deg(84 - breath * 3), bend: deg(94 + breath * 4) },
    armBack: { root: deg(36), bend: deg(140 + breath * 2) },
    legFront: { root: deg(16), bend: deg(-26 - breath * 4) },
    legBack: { root: deg(-15), bend: deg(-16 - breath * 4) },
  };
}

/**
 * Fighting shuffle, sampled by phase (0..1 per cycle). The caller advances the
 * phase by distance travelled / stride, so feet keep pace with the ground.
 * Boxer footwork: the lead foot steps, the rear foot follows a quarter-cycle
 * later; feet stay low, keep their stagger and never cross. The guard stays up
 * with only a small bob: no swinging arms.
 */
export function walkPose(phase: number): Pose {
  const a = phase * TAU;
  const lead = Math.sin(a);
  const rear = Math.sin(a - Math.PI / 2);
  const leadLift = Math.max(0, Math.cos(a));
  const rearLift = Math.max(0, Math.cos(a - Math.PI / 2));
  const bob = 0.5 + 0.5 * Math.sin(2 * a);
  return {
    lean: deg(-13),
    head: deg(11),
    armFront: { root: deg(84 - bob * 4), bend: deg(94 + bob * 6) },
    armBack: { root: deg(36 + bob * 3), bend: deg(140) },
    legFront: { root: deg(17 + lead * 9), bend: deg(-26 - leadLift * 22) },
    legBack: { root: deg(-16 + rear * 9), bend: deg(-16 - rearLift * 22) },
  };
}

/** Distance (m) covered by one full shuffle cycle (lead step + rear follow). */
export const WALK_STRIDE_M = 1.1;

/** Airborne tuck: knees up, guard kept up. */
export const AIR_POSE: Pose = {
  lean: deg(-8),
  head: deg(6),
  armFront: { root: deg(95), bend: deg(85) },
  armBack: { root: deg(45), bend: deg(130) },
  legFront: { root: deg(60), bend: deg(-95) },
  legBack: { root: deg(15), bend: deg(-75) },
};
