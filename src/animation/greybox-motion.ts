import { armIk, type BoneLengths, blendPose, legIk, type Pose } from './skeleton';

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

/**
 * HEAVYWEIGHT STANCE (style `proc.idle.heavyweight`, owner 12/11/2026: Braxon, "a heavy,
 * muscular fighting stance with a slightly forward leaning upper body"): a wide, planted base,
 * the chest leaning in over it, fists clenched in a lower, wider guard, and no bounce, only a slow
 * heavy breath that lifts the shoulders.
 */
export const HEAVYWEIGHT_STANCE = {
  leadFootX: 0.3,
  rearFootX: -0.4,
  pelvisM: 0.725,
  lean: -14,
  // Owner, 12/11/2026: "looking upwards constantly": the head now only partly offsets the lean, so
  // it sits on the spine's line and faces forward, never thrown back.
  head: 9,
  breathHz: 0.55,
  breathM: 0.012,
  guardLow: 0.45,
} as const;

/** Movement style: the stance, walk and run a fighter's Animation Profile picks (via its Idle clip). */
export type IdleStyle = 'boxer' | 'taekwondo' | 'heavyweight' | 'mage' | 'stalker';

/** The movement style for an Idle clip id (`proc.idle.<style>`); anything else is the boxer default. */
export function idleStyleFor(clipId: string | undefined): IdleStyle {
  if (clipId === 'proc.idle.taekwondo') return 'taekwondo';
  if (clipId === 'proc.idle.heavyweight') return 'heavyweight';
  if (clipId === 'proc.idle.mage') return 'mage';
  if (clipId === 'proc.idle.stalker') return 'stalker';
  return 'boxer';
}

/** Idle: planted wide stance with a light bounce on the balls of the feet (1.8 bounces per second). */
/**
 * STALKER (owner, 12/11/2026, Shroud: "a naturally hunched posture, with rounded shoulders, a
 * forward leaning upper body, slightly bent knees and a menacing head position ... avoid making him
 * stand upright"): bent well over the hips, shoulders rolled forward, knees soft, the knife hand low
 * and ready, the free arm hanging loose; he sways slowly side to side and the knife hand twitches.
 */
export const STALKER_STANCE = { lean: -28, pelvisM: 0.7, leadFootX: 0.2, rearFootX: -0.26 } as const;

function stalkerIdle(timeS: number, bones: BoneLengths): Pose {
  const sway = Math.sin(timeS * TAU * 0.4);
  const twitch = Math.max(0, Math.sin(timeS * TAU * 0.23)) ** 12; // now and then the knife hand flicks
  const s = STALKER_STANCE;
  return {
    lean: deg(s.lean + sway * 2),
    head: deg(0),
    armFront: { root: deg(42 + twitch * 22), bend: deg(70 - twitch * 30) },
    armBack: { root: deg(12 + sway * 3), bend: deg(26) },
    legFront: legIk(s.leadFootX, s.pelvisM - 0.01 * sway, bones.thigh, bones.shin),
    legBack: legIk(s.rearFootX, s.pelvisM + 0.01 * sway, bones.thigh, bones.shin),
  };
}

export function idlePose(timeS: number, bones: BoneLengths, style: IdleStyle = 'boxer'): Pose {
  if (style === 'stalker') return stalkerIdle(timeS, bones);
  if (style === 'mage') {
    // MAGE STANCE (owner, 12/11/2026, Necro: "a straight, confident idle stance, using the staff as
    // a support"): standing tall on nearly straight legs, chin level, the staff hand (rear, his left)
    // gripping the planted staff at chest height, the free hand loose at his side. Only a slow,
    // calm breath moves him.
    const breath = 0.5 + 0.5 * Math.sin(timeS * TAU * 0.35);
    return {
      lean: deg(1 + breath * 1.2),
      head: deg(-2),
      armBack: armIk(0.2, 0.32 - breath * 0.01, bones.upperArm, bones.foreArm),
      armFront: { root: deg(8), bend: deg(18 + breath * 4) },
      legFront: legIk(0.13, 0.775, bones.thigh, bones.shin),
      legBack: legIk(-0.15, 0.775, bones.thigh, bones.shin),
    };
  }
  if (style === 'heavyweight') {
    const t = HEAVYWEIGHT_STANCE;
    const breath = 0.5 + 0.5 * Math.sin(timeS * TAU * t.breathHz);
    return fightingStance(
      {
        pelvisM: t.pelvisM - breath * t.breathM,
        leadFootX: t.leadFootX,
        rearFootX: t.rearFootX,
        lean: t.lean + breath * 1.5, // the chest rises a little with each breath
        head: t.head,
        guard: breath * 0.5,
        guardLow: t.guardLow,
      },
      bones,
    );
  }
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
 * through with its foot lifted), and each arm swings opposite its leg.
 * `sway` rocks the chest a few degrees with each step: the swagger that
 * makes the gait read as confident rather than stiff (owner, 11/11/2026).
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
    sway: number;
    head: number;
    arms: ArmSwing;
    /** Heavy foot planting: the hips sink sharply at each heel strike, metres (0 = none). */
    plant?: number;
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
  // Up as the feet pass under the body, down at heel strike: a springy, proud bounce.
  const pelvisM = g.pelvisM + g.bob * Math.cos(2 * a) - (g.plant ?? 0) * Math.abs(s) ** 4;
  const arms = g.arms;
  return {
    // The chest drives forward a touch at each heel strike, then rises again.
    lean: deg(g.lean - g.sway * Math.abs(s)),
    head: deg(g.head),
    // Each fist swings opposite its leg, rising as it comes forward.
    armFront: armIk(arms.lead.x - arms.swingX * s, arms.lead.y + arms.swingY * s, bones.upperArm, bones.foreArm),
    armBack: armIk(arms.rear.x + arms.swingX * s, arms.rear.y - arms.swingY * s, bones.upperArm, bones.foreArm),
    legFront: legIk(leadFootX, pelvisM - leadLift, bones.thigh, bones.shin),
    legBack: legIk(rearFootX, pelvisM - rearLift, bones.thigh, bones.shin),
  };
}

/**
 * CONFIDENT WALK (owner, 11/11/2026: "strong and confident", replacing the
 * crouched guard-up shuffle, SUP-06): tall hips, chest up and nearly upright,
 * head level, long steps, and loose fists swinging freely opposite the legs
 * with a little chest roll on each step. The guard comes back up the moment
 * the fighter stops (idle stance) or attacks.
 */
export function walkPose(phase: number, bones: BoneLengths, style: IdleStyle = 'boxer', strideM = WALK_STRIDE_M): Pose {
  // A longer stride (a brisk walk) reaches further with each step, within what a walk can do.
  const k = Math.min(1.45, Math.max(1, strideM / WALK_STRIDE_M));
  if (style === 'heavyweight') return heavyWalkPose(phase, bones, k);
  if (style === 'stalker') {
    // A creeping prowl: bent over, knees soft, feet kept low, the knife hand low in front barely
    // moving while the free arm swings loose and limp.
    return gaitPose(phase, bones, {
      pelvisM: 0.69,
      bob: 0.01,
      leadX: 0.02,
      rearX: -0.04,
      reach: 0.24 * k,
      lift: 0.06,
      lean: -27,
      sway: 3,
      head: 0,
      arms: { lead: { x: 0.24, y: 0.36 }, rear: { x: 0.0, y: 0.48 }, swingX: 0.08, swingY: 0.03 },
    });
  }
  // A PROPER WALK (owner, 12/11/2026: "a proper walking animation rather than a slowed down
  // running animation ... natural alternating arm and leg movement, with straighter knees and a
  // more upright posture"): hips high over nearly straight legs, the chest upright, the head level,
  // one foot always on the floor (low lift, no flight), and loose, nearly straight arms swinging
  // from the shoulders opposite the legs.
  const legs = bones.thigh + bones.shin;
  const arm = bones.upperArm + bones.foreArm;
  return gaitPose(phase, bones, {
    pelvisM: legs * 0.94,
    bob: 0.015,
    leadX: 0.02,
    rearX: -0.02,
    reach: 0.25 * k,
    lift: 0.07,
    lean: -1,
    sway: 1.5,
    head: 0,
    arms: {
      lead: { x: 0.05, y: arm * 0.86 },
      rear: { x: 0.03, y: arm * 0.86 },
      swingX: 0.17 * k,
      swingY: 0.03,
    },
  });
}

/**
 * RELAXED STANDING IDLE (owner, 12/11/2026: "The fighting stance must not be the default idle
 * animation ... After 3 seconds without fighting, automatically transition into the relaxed idle
 * state"): standing tall on straight legs, feet about hip width, shoulders down, arms hanging
 * loosely at the sides with a slight bend, and a slow breath with a gentle weight shift. The mage
 * keeps his staff stance (already a calm standing pose). The heavyweight stands wide with heavy
 * arms hanging a little out from his body.
 */
export function relaxedPose(timeS: number, bones: BoneLengths, style: IdleStyle = 'boxer'): Pose {
  // The mage keeps his staff stance; the stalker never stands up straight.
  if (style === 'mage' || style === 'stalker') return idlePose(timeS, bones, style);
  const breath = 0.5 + 0.5 * Math.sin(timeS * TAU * 0.3);
  const shift = Math.sin(timeS * TAU * 0.11);
  const legs = bones.thigh + bones.shin;
  const arm = bones.upperArm + bones.foreArm;
  const heavy = style === 'heavyweight';
  return {
    lean: deg((heavy ? -3 : 0) + breath * 1.2),
    head: deg(heavy ? 4 : 1),
    armFront: armIk(heavy ? 0.1 : 0.05, arm * (heavy ? 0.88 : 0.93) - breath * 0.01, bones.upperArm, bones.foreArm),
    armBack: armIk(heavy ? 0.04 : 0.0, arm * (heavy ? 0.88 : 0.93) - breath * 0.01, bones.upperArm, bones.foreArm),
    legFront: legIk((heavy ? 0.15 : 0.1) + shift * 0.01, legs * 0.975, bones.thigh, bones.shin),
    legBack: legIk((heavy ? -0.16 : -0.11) + shift * 0.01, legs * 0.975, bones.thigh, bones.shin),
  };
}

/**
 * HEAVYWEIGHT WALK (owner, 12/11/2026: Braxon "should walk like a massive heavyweight
 * fighter", "powerful, aggressive and intimidating rather than exaggerated or overly bouncy"):
 * hips high and steady (legs nearly straight) with almost no bounce, the chest leaning forward over the stride, shorter,
 * deliberate steps with the feet kept low and planted hard (the hips sink at each heel strike),
 * the weight rolling side to side with each step, and clenched fists swinging firmly and
 * compactly opposite the legs, carried high and wide like a guard that never fully drops.
 */
function heavyWalkPose(phase: number, bones: BoneLengths, k = 1): Pose {
  // Owner, 12/11/2026: "reducing the excessive knee bending ... straighter legs": the hips ride
  // close to full leg length (0.79 m for Rampage), so the planted leg is nearly straight.
  return gaitPose(phase, bones, {
    pelvisM: 0.775,
    bob: 0.004,
    plant: 0.01,
    leadX: 0.04,
    rearX: -0.05,
    reach: 0.2 * k,
    lift: 0.04,
    lean: -10,
    sway: 3.5,
    head: 6,
    arms: { lead: { x: 0.2, y: 0.36 }, rear: { x: 0.1, y: 0.38 }, swingX: 0.13, swingY: 0.05 },
  });
}

/** A running stride's shape (run and sprint share the cycle, with different strength). */
interface RunStyle {
  /** Hip height at mid-stance and how far it rises into the flight, metres. */
  pelvisM: number;
  bob: number;
  /** Where the foot lands ahead of the hips and where it pushes off behind, metres. */
  reachM: number;
  pushM: number;
  /** Fraction of each leg's cycle spent on the ground (under 0.5 leaves a flight phase). */
  stance: number;
  /** How high the swinging foot rises: heel kicked up behind, then the knee driven through. */
  swingLiftM: number;
  lean: number;
  /** Extra forward lean at push-off, degrees. */
  drive: number;
  head: number;
  /**
   * The arm pump as joint angles, degrees (shoulder from straight down, + forward; elbow bend):
   * in front the fist drives up towards the chin, behind the elbow drives back past the hip.
   */
  pumpFront: { shoulder: number; elbow: number };
  pumpBack: { shoulder: number; elbow: number };
}

const smooth = (u: number): number => {
  const c = Math.min(1, Math.max(0, u));
  return c * c * (3 - 2 * c);
};

/**
 * One leg through a running cycle, `q` 0..1 from foot strike: on the ground the foot sweeps
 * back under the hips to push off behind; in the air the heel kicks up towards the seat, the
 * knee drives forward high, and the foot reaches out ahead to land. Returns the foot's
 * position ahead of the hips and its height off the ground.
 */
function runFoot(q: number, r: RunStyle): { x: number; lift: number } {
  if (q < r.stance) {
    const u = q / r.stance;
    return { x: r.reachM - (r.reachM + r.pushM) * u, lift: 0 };
  }
  const u = (q - r.stance) / (1 - r.stance);
  // The foot lingers behind as the heel folds up, then whips through and forward.
  const x = -r.pushM + (r.reachM + r.pushM) * smooth((u - 0.12) / 0.78);
  // Lifts straight off the ground after toe-off (heel kicked up behind), then drops to land.
  const lift = r.swingLiftM * Math.sin(Math.PI * u ** 0.7);
  return { x, lift };
}

/**
 * RUNNING CYCLE (owner, 11/11/2026: "it should have a better running movement", not a sped-up
 * walk): foot strike ahead, push-off behind, a flight phase with both feet off the ground, the
 * heel kicked up behind and the knee driven high, the chest leaning into it with an extra push
 * at each drive, and a strong elbows-bent arm pump (fists to the chin in front, past the hip
 * behind), each arm opposite its leg. Phase 0.25 = lead foot striking (matches the walk).
 */
function runningPose(phase: number, bones: BoneLengths, r: RunStyle): Pose {
  const q = (((phase - 0.25) % 1) + 1) % 1; // lead leg: 0 at its foot strike
  const lead = runFoot(q, r);
  const rear = runFoot((q + 0.5) % 1, r);
  // Hips lowest mid-stance, highest mid-flight (twice per cycle).
  const pelvisM = r.pelvisM + r.bob * (1 - Math.cos(TAU * 2 * (q - r.stance / 2))) * 0.5;
  // Push-off (late stance) leans the chest into the stride.
  const pushing = (k: number) => (k < r.stance ? smooth(k / r.stance) * (1 - smooth((k - r.stance * 0.85) / 0.1)) : 0);
  const drive = Math.max(pushing(q), pushing((q + 0.5) % 1));
  // Arm pump: the lead fist is back when the lead foot strikes, forward when the rear foot does.
  const pump = (k: number) => smooth(0.5 - 0.5 * Math.cos(TAU * k));
  const arm = (k: number) => {
    const t = pump(k);
    return {
      root: deg(r.pumpBack.shoulder + (r.pumpFront.shoulder - r.pumpBack.shoulder) * t),
      bend: deg(r.pumpBack.elbow + (r.pumpFront.elbow - r.pumpBack.elbow) * t),
    };
  };
  return {
    lean: deg(r.lean - r.drive * drive),
    head: deg(r.head),
    armFront: arm(q),
    armBack: arm((q + 0.5) % 1),
    legFront: legIk(lead.x, pelvisM - lead.lift, bones.thigh, bones.shin),
    legBack: legIk(rear.x, pelvisM - rear.lift, bones.thigh, bones.shin),
    // The solver grounds the lowest foot; give back its real height so the flight shows.
    liftM: Math.min(lead.lift, rear.lift),
  };
}

const RUN: RunStyle = {
  pelvisM: 0.665,
  bob: 0.035,
  reachM: 0.34,
  pushM: 0.36,
  stance: 0.38,
  swingLiftM: 0.42,
  lean: -11,
  drive: 4,
  head: 5,
  pumpFront: { shoulder: 62, elbow: 105 },
  pumpBack: { shoulder: -38, elbow: 80 },
};

/** Sprinting (hold Shift): lower and leaning harder, longer bounding strides, heels kicked high, a bigger pump. */
const SPRINT_STYLE: RunStyle = {
  pelvisM: 0.65,
  bob: 0.045,
  reachM: 0.34,
  pushM: 0.38,
  stance: 0.32,
  swingLiftM: 0.5,
  lean: -15,
  drive: 5,
  head: 7,
  pumpFront: { shoulder: 75, elbow: 100 },
  pumpBack: { shoulder: -50, elbow: 85 },
};

/**
 * HEAVYWEIGHT RUN (owner, 12/11/2026): a driving, ground-bound run rather than a bounding one:
 * longer foot contact and little flight, knees kept lower, hips steady, the chest leaning hard
 * into it, and a short, firm pump of clenched fists close to the body.
 */
const HEAVY_RUN: RunStyle = {
  pelvisM: 0.66,
  bob: 0.015,
  reachM: 0.3,
  pushM: 0.32,
  stance: 0.46,
  swingLiftM: 0.26,
  lean: -16,
  drive: 3,
  head: 9,
  pumpFront: { shoulder: 52, elbow: 112 },
  pumpBack: { shoulder: -30, elbow: 96 },
};

/** Heavyweight sprint (and his charge): lower and leaning further, stronger drive, still grounded. */
const HEAVY_SPRINT: RunStyle = {
  pelvisM: 0.645,
  bob: 0.02,
  reachM: 0.32,
  pushM: 0.36,
  stance: 0.4,
  swingLiftM: 0.32,
  lean: -21,
  drive: 4,
  head: 13,
  pumpFront: { shoulder: 62, elbow: 108 },
  pumpBack: { shoulder: -42, elbow: 92 },
};

/**
 * STALKER RUN (Shroud): a low, predatory lope, bent nearly double, long quick strides, the knife
 * arm held low and back, the free arm hanging and swinging.
 */
const STALKER_RUN: RunStyle = {
  pelvisM: 0.62,
  bob: 0.03,
  reachM: 0.36,
  pushM: 0.38,
  stance: 0.36,
  swingLiftM: 0.4,
  lean: -34,
  drive: 4,
  head: 0,
  pumpFront: { shoulder: 30, elbow: 70 },
  pumpBack: { shoulder: -40, elbow: 40 },
};

const runStyleFor = (style: IdleStyle, sprint: boolean): RunStyle =>
  style === 'heavyweight'
    ? sprint
      ? HEAVY_SPRINT
      : HEAVY_RUN
    : style === 'stalker'
      ? STALKER_RUN
      : sprint
        ? SPRINT_STYLE
        : RUN;

/** POWER RUN: the running cycle at a run. */
export function runPose(phase: number, bones: BoneLengths, style: IdleStyle = 'boxer'): Pose {
  return runningPose(phase, bones, runStyleFor(style, false));
}

/** SPRINT: the running cycle at full effort. */
export function sprintPose(phase: number, bones: BoneLengths, style: IdleStyle = 'boxer'): Pose {
  return runningPose(phase, bones, runStyleFor(style, true));
}

/** Distance (m) covered by one walk cycle (two steps) and one run cycle. */
export const WALK_STRIDE_M = 1.1;
export const RUN_STRIDE_M = 2.2;
export const SPRINT_STRIDE_M = 3.0;
/** Walking blends into running between these speeds, m/s. */
export const RUN_FROM_MPS = 2.6;
export const RUN_FULL_MPS = 4.2;

/** 0 = walking, 1 = running, by ground speed. */
export function runAmount(speedMps: number): number {
  return Math.min(1, Math.max(0, (speedMps - RUN_FROM_MPS) / (RUN_FULL_MPS - RUN_FROM_MPS)));
}

/** Running blends into sprinting between these speeds, m/s (sprint tops out near 7.3 m/s). */
export const SPRINT_FROM_MPS = 5.3;
export const SPRINT_FULL_MPS = 6.8;

/** 0 = running, 1 = sprinting, by ground speed. */
export function sprintAmount(speedMps: number): number {
  return Math.min(1, Math.max(0, (speedMps - SPRINT_FROM_MPS) / (SPRINT_FULL_MPS - SPRINT_FROM_MPS)));
}

/** Distance per gait cycle at this speed (walk stride into run stride into sprint stride). */
export function strideAt(speedMps: number): number {
  const run = WALK_STRIDE_M + (RUN_STRIDE_M - WALK_STRIDE_M) * runAmount(speedMps);
  return run + (SPRINT_STRIDE_M - RUN_STRIDE_M) * sprintAmount(speedMps);
}

/** A walk never steps faster than this many cycles a second (two steps each): a brisk pace. */
export const WALK_MAX_CADENCE_HZ = 2.1;

/** A walking stride at this speed: longer at a brisk pace, so the feet keep up without scurrying. */
export function walkStrideAt(speedMps: number): number {
  return Math.max(WALK_STRIDE_M, speedMps / WALK_MAX_CADENCE_HZ);
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

/**
 * CLIMBING (owner, 12/11/2026: "visibly raise one elbow above the ledge and use that arm to push
 * its body upwards ... the other arm helps pull the body onto the platform ... rather than simply
 * snapping onto the platform"), by climb progress. Joint angles: arm roots from the torso's down
 * axis (+ forward, 180 = overhead), elbows bend + to curl the forearm; the ledge is ahead.
 *
 * 0     HANG: both arms reaching up and forward, hands gripping the top, legs dangling.
 * 0.35  PULL: a pull-up; elbows driven down, forearms up to the hands, chin to the edge, knees up.
 * 0.6   ELBOW OVER: the lead elbow hooks up over the ledge (upper arm forward, forearm flat on the
 *       top) while the rear arm keeps pulling; the chest tips forward onto the edge.
 * 0.82  PRESS: the lead elbow is high above the top, its hand planted, and the arm drives down;
 *       the rear hand is planted too; the torso leans far over as the hips rise.
 * 1     MANTLE: both arms locked straight down on the top, the lead knee up onto it.
 * 1..2  STAND: rising off the hands onto the feet as the body moves in over the top.
 */
const CLIMB_KEYS: readonly [number, Pose][] = [
  [
    0,
    {
      lean: deg(-8),
      head: deg(-4),
      armFront: { root: deg(146), bend: deg(8) },
      armBack: { root: deg(136), bend: deg(14) },
      legFront: { root: deg(12), bend: deg(-24) },
      legBack: { root: deg(-6), bend: deg(-14) },
    },
  ],
  [
    0.35,
    {
      lean: deg(-12),
      head: deg(6),
      armFront: { root: deg(34), bend: deg(150) },
      armBack: { root: deg(30), bend: deg(152) },
      legFront: { root: deg(48), bend: deg(-90) },
      legBack: { root: deg(8), bend: deg(-56) },
    },
  ],
  [
    0.6,
    {
      lean: deg(-24),
      head: deg(14),
      armFront: { root: deg(130), bend: deg(-26) },
      armBack: { root: deg(36), bend: deg(128) },
      legFront: { root: deg(62), bend: deg(-104) },
      legBack: { root: deg(-4), bend: deg(-40) },
    },
  ],
  [
    0.82,
    {
      lean: deg(-36),
      head: deg(24),
      // A dip: the lead elbow up behind and above the planted hand, driving it down; the rear arm
      // pressing beside it.
      armFront: { root: deg(-64), bend: deg(100) },
      armBack: { root: deg(-48), bend: deg(84) },
      legFront: { root: deg(78), bend: deg(-118) },
      legBack: { root: deg(-14), bend: deg(-28) },
    },
  ],
  [
    1,
    {
      lean: deg(-40),
      head: deg(28),
      armFront: { root: deg(-14), bend: deg(8) },
      armBack: { root: deg(-6), bend: deg(10) },
      legFront: { root: deg(95), bend: deg(-122) },
      legBack: { root: deg(-12), bend: deg(-30) },
    },
  ],
  [
    2,
    {
      lean: deg(-6),
      head: deg(4),
      armFront: { root: deg(20), bend: deg(40) },
      armBack: { root: deg(14), bend: deg(46) },
      legFront: { root: deg(14), bend: deg(-20) },
      legBack: { root: deg(-10), bend: deg(-14) },
    },
  ],
];

const smoothStep = (t: number): number => t * t * (3 - 2 * t);

/** The climbing pose at progress 0..1, then 1..2 while stepping up onto the top. */
export function climbPose(progress: number, timeS = 0): Pose {
  const p = Math.min(2, Math.max(0, progress));
  let i = 0;
  while (i < CLIMB_KEYS.length - 2 && p > CLIMB_KEYS[i + 1]![0]) i++;
  const [p0, a] = CLIMB_KEYS[i]!;
  const [p1, b] = CLIMB_KEYS[i + 1]!;
  const base = blendPose(a, b, smoothStep(Math.min(1, Math.max(0, (p - p0) / (p1 - p0)))));
  // Hanging sways a little; the legs kick and scrabble at the wall while pulling.
  const sway = Math.sin(timeS * TAU * 0.7) * deg(4) * Math.max(0, 1 - p * 3);
  const scrabble = Math.sin(timeS * TAU * 3.2) * deg(9) * Math.max(0, Math.min(1, p * 3) * (1 - Math.min(1, p)));
  return {
    ...base,
    legFront: { root: base.legFront.root + sway + scrabble, bend: base.legFront.bend },
    legBack: { root: base.legBack.root + sway * 0.6 - scrabble, bend: base.legBack.bend },
  };
}

/**
 * How far the body has risen (0 hanging, 1 standing on the top) at a climb progress 0..2, keyed to
 * the poses so the hands stay on the ledge through every stage: slow through the pull-up and the
 * elbow hook, then the press and the step up carry it over.
 */
const CLIMB_RISE: readonly [number, number][] = [
  [0, 0],
  [0.35, 0.3],
  [0.6, 0.37],
  [0.82, 0.55],
  [1, 0.66],
  [2, 1],
];

export function climbRise(progress: number): number {
  const p = Math.min(2, Math.max(0, progress));
  for (let i = 0; i + 1 < CLIMB_RISE.length; i++) {
    const [p0, r0] = CLIMB_RISE[i]!;
    const [p1, r1] = CLIMB_RISE[i + 1]!;
    if (p <= p1) return r0 + (r1 - r0) * smoothStep((p - p0) / (p1 - p0));
  }
  return 1;
}
