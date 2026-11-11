import type { Limb, Pose } from './skeleton';

/**
 * Defensive and reaction poses (Phase 5), layered on the current stance so the
 * legs keep their footing. Each overrides only the joints it needs.
 */
const deg = (d: number): number => (d * Math.PI) / 180;
const limb = (root: number, bend: number): Limb => ({ root: deg(root), bend: deg(bend) });

/** Guard up: both forearms raised high in front of the face, chin down, slightly hunched. */
export function blockPose(base: Pose): Pose {
  return { ...base, lean: deg(-6), head: deg(26), armFront: limb(72, 122), armBack: limb(58, 132) };
}

/** Hit flinch: head snaps back, torso rocks back, guard knocked open. */
export function flinchPose(base: Pose): Pose {
  return { ...base, lean: deg(14), head: deg(-18), armFront: limb(35, 45), armBack: limb(-15, 70) };
}

/** Dodge dash: low and leaning hard into the direction of travel, guard tucked. */
export function dashPose(base: Pose): Pose {
  return { ...base, lean: deg(-34), head: deg(28), armFront: limb(82, 112), armBack: limb(40, 140) };
}

/** Lying on the floor after a knockdown or KO: a figure tilt applied by the renderer, in radians. */
export const KNOCKDOWN_TILT_RAD = 1.35;
