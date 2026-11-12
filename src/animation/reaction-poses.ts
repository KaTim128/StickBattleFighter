import { blendPose, type Limb, type Pose } from './skeleton';

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

/** Dodge roll (owner, 11/11/2026): tucked into a ball, knees to chest, arms hugging the shins. */
export function tuckPose(base: Pose): Pose {
  return {
    ...base,
    lean: deg(-40),
    head: deg(40),
    armFront: limb(55, 95),
    armBack: limb(40, 110),
    legFront: limb(105, -150),
    legBack: limb(95, -150),
  };
}

/** Carrying overhead (Phase 7): both arms up, elbows slightly bent, chest up under the load. */
export function carryPose(base: Pose): Pose {
  return { ...base, lean: deg(-2), head: deg(4), armFront: limb(168, 18), armBack: limb(160, 26) };
}

/** Throw follow-through: arms whipped forward and down, leaning into it. */
export function throwPose(base: Pose): Pose {
  return { ...base, lean: deg(-22), head: deg(14), armFront: limb(100, 8), armBack: limb(84, 18) };
}

/** Dodge dash: low and leaning hard into the direction of travel, guard tucked. */
export function dashPose(base: Pose): Pose {
  return { ...base, lean: deg(-34), head: deg(28), armFront: limb(82, 112), armBack: limb(40, 140) };
}

/**
 * The default quick dodge (owner, 11/11/2026: "a quick dodge movement rather than a rolling
 * animation"; 12/11/2026: always backwards, facing kept): a fast back-step with the guard kept up,
 * leaning away from the opponent, the rear leg driving back and the front foot sliding out ahead.
 */
export function quickDodgePose(base: Pose): Pose {
  return {
    ...base,
    lean: deg(16),
    head: deg(-10),
    armFront: limb(70, 118),
    armBack: limb(52, 128),
    legFront: limb(34, -18),
    legBack: limb(-14, -62),
  };
}

/**
 * Shroud's shade dodge (owner, 12/11/2026): he drops low and skitters backwards, bent double, the
 * knife held out in front and the free hand trailing near the floor.
 */
export function shadeDodgePose(base: Pose): Pose {
  return {
    ...base,
    lean: deg(-40),
    head: deg(10),
    armFront: limb(70, 30),
    armBack: limb(-30, 40),
    legFront: limb(60, -110),
    legBack: limb(-30, -90),
  };
}

/** A whole-body frame for falling and getting up: pose, figure tilt about the feet, and lift off the floor. */
export interface DownFrame {
  pose: Pose;
  /** Backwards tilt in radians (about 1.5 = flat on the floor). */
  tiltRad: number;
  /** Height of the feet above the floor while airborne in the fall, metres. */
  liftM: number;
}

const ease = (x: number): number => {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
};

/** The tumble lasts this long before the body hits the floor. */
export const FALL_S = 0.32;
const LYING_TILT = deg(86);

/** Tumbling backwards: arms flung up, lead leg kicked up by the blow, head whipped back. */
function tumblePose(base: Pose): Pose {
  return {
    ...base,
    lean: deg(22),
    head: deg(-28),
    armFront: limb(150, 35),
    armBack: limb(172, 20),
    legFront: limb(55, -35),
    legBack: limb(12, -25),
  };
}

/** Flat on the back: limbs sprawled, one knee up, head resting. */
function lyingPose(base: Pose): Pose {
  return {
    ...base,
    lean: deg(4),
    head: deg(8),
    armFront: limb(105, 35),
    armBack: limb(150, 15),
    legFront: limb(35, -75),
    legBack: limb(-4, -12),
  };
}

/** Sitting up: rear hand planted behind, lead knee drawn up, curling forward. */
function sitUpPose(base: Pose): Pose {
  return {
    ...base,
    lean: deg(-26),
    head: deg(22),
    armFront: limb(60, 95),
    armBack: limb(-40, 25),
    legFront: limb(75, -125),
    legBack: limb(45, -110),
  };
}

/** Rising from a crouch: weight forward over the feet, guard coming back up. */
function risePose(base: Pose): Pose {
  return { ...base, lean: deg(-28), head: deg(20), legFront: limb(45, -90), legBack: limb(-8, -65) };
}

/**
 * Knocked down (or KO): tumble backwards through the air for FALL_S, land with
 * a small bounce, then lie still. `base` is the fighter's normal pose.
 */
export function knockdownFrame(base: Pose, downTimeS: number): DownFrame {
  if (downTimeS < FALL_S) {
    const t = downTimeS / FALL_S;
    return {
      pose: blendPose(base, tumblePose(base), ease(t * 2.2)),
      tiltRad: deg(12) + (LYING_TILT - deg(12)) * t * t, // gravity: rotates faster as it falls
      liftM: 0.35 * Math.sin(Math.PI * t),
    };
  }
  const since = downTimeS - FALL_S;
  const bounce = since < 0.3 ? deg(9) * Math.sin((since / 0.3) * Math.PI) * (1 - since / 0.3) : 0;
  return {
    pose: blendPose(tumblePose(base), lyingPose(base), ease(since / 0.25)),
    tiltRad: LYING_TILT - bounce,
    liftM: 0,
  };
}

/** Getting up (progress 0..1): sit up onto the rear hand, draw a knee, rise into the stance. */
export function getUpFrame(base: Pose, progress: number): DownFrame {
  const p = Math.min(1, Math.max(0, progress));
  if (p < 0.45) {
    const t = ease(p / 0.45);
    return {
      pose: blendPose(lyingPose(base), sitUpPose(base), t),
      tiltRad: LYING_TILT + (deg(40) - LYING_TILT) * t,
      liftM: 0,
    };
  }
  if (p < 0.75) {
    const t = ease((p - 0.45) / 0.3);
    return { pose: blendPose(sitUpPose(base), risePose(base), t), tiltRad: deg(40) * (1 - t), liftM: 0 };
  }
  return { pose: blendPose(risePose(base), base, ease((p - 0.75) / 0.25)), tiltRad: 0, liftM: 0 };
}
