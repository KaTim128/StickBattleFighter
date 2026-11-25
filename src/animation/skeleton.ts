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
  /**
   * The second, lower pair of arms of a four-armed fighter (Bohemeth; only used when the rig's `lowerArms` is set). Absent: they hang
   * and trail the upper pair (`lowerArmFrom`), so every existing pose and clip still gives a sensible lower pair.
   */
  armFront2?: Limb;
  armBack2?: Limb;
  /**
   * Raise the whole figure this far after its lowest foot is put on the floor, metres: the
   * flight phase of a run, when both feet are off the ground (owner, 11/11/2026). Default 0.
   */
  liftM?: number;
}

export interface BoneLengths {
  readonly spine: number;
  readonly neck: number;
  readonly headRadius: number;
  readonly upperArm: number;
  readonly foreArm: number;
  readonly thigh: number;
  readonly shin: number;
  /** Four-armed rigs: how far below the chest (metres, down the spine) the lower arms' shoulders sit. Absent: two arms. */
  readonly lowerArms?: number;
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
  armFront2?: [Point, Point, Point];
  armBack2?: [Point, Point, Point];
}

/** The lower arm that follows an upper arm when a pose gives it no angles of its own: hanging lower and trailing a little behind it. */
export function lowerArmFrom(upper: Limb): Limb {
  return { root: upper.root * 0.5 + 0.3, bend: upper.bend * 0.6 + 0.35 };
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
  // Heads sit centred on the torso's axis for every stickman (owner, 12/11/2026: "perfectly centered
  // heads, naturally aligned with their torsos"): the neck and head continue the spine's line, so a
  // pose can never push the head forward, back or off the shoulders. (`pose.head` is kept in poses
  // for tilting head-mounted parts, but no longer moves the head.)
  const neck = along(chest, torso, bones.neck);
  const head = along(neck, torso, bones.headRadius);

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

  // The lower pair of a four-armed rig hangs from a second shoulder line further down the torso.
  const shoulder2 = bones.lowerArms ? along(chest, torso + Math.PI, bones.lowerArms) : null;
  const arm2 = (l: Limb): [Point, Point, Point] => {
    const elbow = along(shoulder2!, torsoDown + l.root, bones.upperArm * 0.95);
    return [shoulder2!, elbow, along(elbow, torsoDown + l.root + l.bend, bones.foreArm * 0.95)];
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
    ...(shoulder2
      ? {
          armFront2: arm2(pose.armFront2 ?? lowerArmFrom(pose.armFront)),
          armBack2: arm2(pose.armBack2 ?? lowerArmFrom(pose.armBack)),
        }
      : {}),
  };

  const lowestFoot = Math.max(solved.legFront[2].y, solved.legBack[2].y) + (pose.liftM ?? 0);
  const lift = (p: Point): void => {
    p.y -= lowestFoot;
  };
  if (shoulder2) lift(shoulder2);
  for (const p of [pelvis, chest, neck, head]) lift(p);
  const limbs = [solved.armFront, solved.armBack, solved.legFront, solved.legBack];
  if (solved.armFront2 && solved.armBack2) limbs.push(solved.armFront2, solved.armBack2);
  for (const limb of limbs) {
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
    ...(a.armFront2 || b.armFront2 || a.armBack2 || b.armBack2
      ? {
          armFront2: limb(a.armFront2 ?? lowerArmFrom(a.armFront), b.armFront2 ?? lowerArmFrom(b.armFront)),
          armBack2: limb(a.armBack2 ?? lowerArmFrom(a.armBack), b.armBack2 ?? lowerArmFrom(b.armBack)),
        }
      : {}),
    ...(a.liftM || b.liftM ? { liftM: m(a.liftM ?? 0, b.liftM ?? 0) } : {}),
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
