/**
 * Jointed 2D skeleton (REQ-ANI-6, TD-022). Angles are in radians; 0 points
 * straight down the screen and positive rotates towards the facing direction
 * (the figure is drawn facing right and mirrored to face left).
 *
 * Joints: pelvis → spine → neck → head; shoulder → ELBOW → hand and
 * hip → KNEE → foot on the front and back sides.
 */
export interface Limb {
  /** Upper bone angle relative to its parent (torso for arms, straight down for legs). */
  root: number;
  /** Middle joint bend (elbow or knee) relative to the upper bone. */
  bend: number;
}

export interface Pose {
  /** Torso lean: negative leans forward (towards the facing side). */
  lean: number;
  /** Head tilt relative to the torso. */
  head: number;
  armFront: Limb;
  armBack: Limb;
  legFront: Limb;
  legBack: Limb;
}

export interface BoneLengths {
  readonly spine: number;
  readonly neck: number;
  readonly headRadius: number;
  readonly upperArm: number;
  readonly foreArm: number;
  readonly thigh: number;
  readonly shin: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface SolvedSkeleton {
  pelvis: Point;
  chest: Point;
  neck: Point;
  head: Point;
  armFront: [Point, Point, Point];
  armBack: [Point, Point, Point];
  legFront: [Point, Point, Point];
  legBack: [Point, Point, Point];
}

const along = (from: Point, angle: number, length: number): Point => ({
  x: from.x + Math.sin(angle) * length,
  y: from.y + Math.cos(angle) * length,
});

/**
 * Forward kinematics. The skeleton is then lifted so its lowest foot rests on
 * the floor line y = 0 (the fighter's origin), so crouches and strides keep
 * the feet planted instead of floating or sinking.
 */
export function solveSkeleton(pose: Pose, bones: BoneLengths): SolvedSkeleton {
  const pelvis = { x: 0, y: 0 };
  const torso = Math.PI + pose.lean; // pointing up the screen
  const chest = along(pelvis, torso, bones.spine);
  const neck = along(chest, torso + pose.head, bones.neck);
  const head = along(neck, torso + pose.head, bones.headRadius);

  // Arms hang from the shoulder relative to the torso's "down" direction.
  const torsoDown = pose.lean;
  const arm = (l: Limb): [Point, Point, Point] => {
    const elbow = along(chest, torsoDown + l.root, bones.upperArm);
    return [chest, elbow, along(elbow, torsoDown + l.root + l.bend, bones.foreArm)];
  };
  const leg = (l: Limb): [Point, Point, Point] => {
    const knee = along(pelvis, l.root, bones.thigh);
    return [pelvis, knee, along(knee, l.root + l.bend, bones.shin)];
  };

  const solved: SolvedSkeleton = {
    pelvis,
    chest,
    neck,
    head,
    armFront: arm(pose.armFront),
    armBack: arm(pose.armBack),
    legFront: leg(pose.legFront),
    legBack: leg(pose.legBack),
  };

  const lowestFoot = Math.max(solved.legFront[2].y, solved.legBack[2].y);
  const lift = (p: Point): void => {
    p.y -= lowestFoot;
  };
  for (const p of [pelvis, chest, neck, head]) lift(p);
  for (const limb of [solved.armFront, solved.armBack, solved.legFront, solved.legBack]) {
    // pelvis/chest already lifted; they are shared references at index 0
    lift(limb[1]);
    lift(limb[2]);
  }
  return solved;
}

/** Per-joint blend of two poses (REQ-ANI-6: blending is joint by joint). t = 0 → a, 1 → b. */
export function blendPose(a: Pose, b: Pose, t: number): Pose {
  const m = (x: number, y: number): number => x + (y - x) * t;
  const limb = (p: Limb, q: Limb): Limb => ({ root: m(p.root, q.root), bend: m(p.bend, q.bend) });
  return {
    lean: m(a.lean, b.lean),
    head: m(a.head, b.head),
    armFront: limb(a.armFront, b.armFront),
    armBack: limb(a.armBack, b.armBack),
    legFront: limb(a.legFront, b.legFront),
    legBack: limb(a.legBack, b.legBack),
  };
}

/**
 * Two-bone leg IK (TD-022): angles that put the foot exactly at (footX, footY)
 * relative to the pelvis (+x towards facing, +y down), with the knee bending
 * forward over the toes like a real leg. Out-of-reach targets are approached
 * along the same line with the leg almost straight.
 */
export function legIk(footX: number, footY: number, thigh: number, shin: number): Limb {
  const reach = Math.min(Math.hypot(footX, footY), thigh + shin - 1e-4);
  const toFoot = Math.atan2(footX, footY);
  const cosHip = (thigh * thigh + reach * reach - shin * shin) / (2 * thigh * reach);
  const thighAngle = toFoot + Math.acos(Math.min(1, Math.max(-1, cosHip)));
  const kneeX = Math.sin(thighAngle) * thigh;
  const kneeY = Math.cos(thighAngle) * thigh;
  const shinAngle = Math.atan2(footX - kneeX, footY - kneeY);
  return { root: thighAngle, bend: shinAngle - thighAngle };
}

/**
 * Arm IK: shoulder and elbow angles that put the fist on a target, given
 * relative to the shoulder in the torso's frame (+x towards the facing side,
 * +y down the torso). The elbow points down and back with the forearm folding
 * forward (positive bend), like a guard. Used for gait arm swings so the FIST
 * moves where intended whatever the lean.
 */
export function armIk(handX: number, handY: number, upperArm: number, foreArm: number): Limb {
  const reach = Math.max(1e-4, Math.min(Math.hypot(handX, handY), upperArm + foreArm - 1e-4));
  const toHand = Math.atan2(handX, handY);
  const cosShoulder = (upperArm * upperArm + reach * reach - foreArm * foreArm) / (2 * upperArm * reach);
  const upper = toHand - Math.acos(Math.min(1, Math.max(-1, cosShoulder)));
  const elbowX = Math.sin(upper) * upperArm;
  const elbowY = Math.cos(upper) * upperArm;
  const fore = Math.atan2(handX - elbowX, handY - elbowY);
  let bend = fore - upper;
  if (bend < 0) bend += Math.PI * 2;
  return { root: upper, bend };
}
