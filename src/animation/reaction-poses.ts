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

/**
 * Falling from a height (owner, 13/11/2026: a physical fall, never a frozen pose): arms thrown up
 * and out for balance, the legs reaching down for the floor, the head looking down at it.
 */
export function fallPose(base: Pose): Pose {
  return {
    ...base,
    lean: deg(-6),
    head: deg(18),
    armFront: limb(128, 40),
    armBack: limb(150, 30),
    legFront: limb(26, -38),
    legBack: limb(-14, -22),
  };
}

/** Landing squat: knees and hips folded to soak up the drop, arms forward for balance. */
export function landSquatPose(base: Pose): Pose {
  return {
    ...base,
    lean: deg(-24),
    head: deg(18),
    armFront: limb(70, 40),
    armBack: limb(42, 55),
    legFront: limb(64, -118),
    legBack: limb(-6, -104),
  };
}

/** Flat on the front: chest down, arms bent with the hands by the shoulders, legs straight back. */
function pronePose(base: Pose): Pose {
  return {
    ...base,
    lean: deg(-4),
    head: deg(-20),
    armFront: limb(150, -120),
    armBack: limb(160, -110),
    legFront: limb(6, -10),
    legBack: limb(-8, -6),
  };
}

/** Pushing up off the floor: arms straight under the chest, knees drawing in. */
function pushUpPose(base: Pose): Pose {
  return {
    ...base,
    lean: deg(-8),
    head: deg(-10),
    armFront: limb(92, 4),
    armBack: limb(84, 8),
    legFront: limb(70, -120),
    legBack: limb(10, -60),
  };
}

/** How long a big-fall collapse takes from touching down to lying flat. */
const COLLAPSE_S = 0.3;

/**
 * A big-fall collapse (owner, 13/11/2026): the knees buckle on impact, then the body pitches over
 * flat (onto the back, or face down when landing on the move), hits with a small bounce and lies.
 */
export function collapseFrame(base: Pose, downTimeS: number, faceDown: boolean): DownFrame {
  const sign = faceDown ? -1 : 1;
  const lying = faceDown ? pronePose(base) : lyingPose(base);
  const squat = landSquatPose(base);
  if (downTimeS < 0.1) {
    const t = ease(downTimeS / 0.1);
    return { pose: blendPose(base, squat, t), tiltRad: sign * deg(10) * t, liftM: 0 };
  }
  if (downTimeS < COLLAPSE_S) {
    const t = (downTimeS - 0.1) / (COLLAPSE_S - 0.1);
    return {
      pose: blendPose(squat, lying, ease(t * 1.3)),
      tiltRad: sign * (deg(10) + (LYING_TILT - deg(10)) * t * t), // gravity: faster as it goes over
      liftM: 0,
    };
  }
  const since = downTimeS - COLLAPSE_S;
  const bounce = since < 0.25 ? deg(8) * Math.sin((since / 0.25) * Math.PI) * (1 - since / 0.25) : 0;
  return { pose: lying, tiltRad: sign * (LYING_TILT - bounce), liftM: 0 };
}

/**
 * Getting up from face down (progress 0..1): push up on straight arms, draw the knees under,
 * then rise into the stance.
 */
export function pushUpFrame(base: Pose, progress: number): DownFrame {
  const p = Math.min(1, Math.max(0, progress));
  if (p < 0.4) {
    const t = ease(p / 0.4);
    return {
      pose: blendPose(pronePose(base), pushUpPose(base), t),
      tiltRad: -LYING_TILT + (LYING_TILT - deg(50)) * t,
      liftM: 0,
    };
  }
  if (p < 0.75) {
    const t = ease((p - 0.4) / 0.35);
    return {
      pose: blendPose(pushUpPose(base), landSquatPose(base), t),
      tiltRad: -deg(50) * (1 - t),
      liftM: 0,
    };
  }
  return { pose: blendPose(landSquatPose(base), base, ease((p - 0.75) / 0.25)), tiltRad: 0, liftM: 0 };
}
