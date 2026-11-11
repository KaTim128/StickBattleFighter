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

/** Idle: relaxed guard with a slow breathing sway (period 2.6 s); knees flex slightly on each breath. */
export function idlePose(timeS: number): Pose {
  const breath = Math.sin((timeS / 2.6) * TAU); // -1..1
  return {
    lean: deg(-4 - breath * 1.2),
    head: deg(2 + breath * 1),
    armFront: { root: deg(45 - breath * 3), bend: deg(75 + breath * 4) },
    armBack: { root: deg(-25 + breath * 2), bend: deg(65) },
    legFront: { root: deg(12), bend: deg(-10 - (breath + 1) * 2) },
    legBack: { root: deg(-12), bend: deg(-6 - (breath + 1) * 2) },
  };
}

/**
 * Walk cycle sampled by phase (0..1 per two steps). The caller advances the
 * phase by distance travelled / stride, so feet keep pace with the ground.
 * The knee folds while a leg swings through; arms counter-swing.
 */
export function walkPose(phase: number): Pose {
  const a = phase * TAU;
  const s = Math.sin(a);
  const frontSwinging = Math.max(0, Math.cos(a)); // front leg moving forward
  const backSwinging = Math.max(0, -Math.cos(a));
  return {
    lean: deg(-9),
    head: deg(4),
    armFront: { root: deg(15 - s * 30), bend: deg(35 + Math.max(0, -s) * 25) },
    armBack: { root: deg(15 + s * 30), bend: deg(35 + Math.max(0, s) * 25) },
    legFront: { root: deg(s * 28), bend: deg(-8 - frontSwinging * 55) },
    legBack: { root: deg(-s * 28), bend: deg(-8 - backSwinging * 55) },
  };
}

/** Distance (m) covered by one full walk cycle (two steps). */
export const WALK_STRIDE_M = 1.5;

/** Airborne tuck: knees up, arms rise for balance. */
export const AIR_POSE: Pose = {
  lean: deg(-6),
  head: deg(-2),
  armFront: { root: deg(120), bend: deg(30) },
  armBack: { root: deg(-60), bend: deg(40) },
  legFront: { root: deg(60), bend: deg(-95) },
  legBack: { root: deg(15), bend: deg(-75) },
};
