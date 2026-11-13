import { blendPose, type Limb, type Pose } from './skeleton';

/**
 * Inferno's ability animations (REQ-ANI-3/4) on the jointed skeleton. Each
 * cast has an anticipation pose during the wind-up (`windup`, progress 0..1),
 * then a release pose that is held while the ability plays out and eased back
 * to the stance at the end of `recovery`. Facing right: armFront = lead hand.
 */
const deg = (d: number): number => (d * Math.PI) / 180;
const limb = (root: number, bend: number): Limb => ({ root: deg(root), bend: deg(bend) });
const ease = (x: number): number => {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
};

interface CastShape {
  windup: Partial<Pose>;
  release: Partial<Pose>;
  /** Fraction of the recovery spent easing back to the stance (at the end). */
  settle: number;
  /** Held while a leap carries the fighter through the air (then the release is the landing slam). */
  air?: Partial<Pose>;
  /**
   * Upper body held while a charge drives the fighter: the legs keep the gait's running cycle,
   * so it runs on two legs. Once the drive ends, `after` replaces the release (the collision).
   */
  run?: Partial<Pose>;
  after?: Partial<Pose>;
  /** The wind-up trembles with building power: lean wobble amplitude (radians), growing with progress. */
  tremble?: number;
  /**
   * A grab (owner, 13/11/2026: hit and miss animate differently): `slam` drives the held target
   * into the floor once it lands; `miss` replaces the release when the hands close on air.
   */
  slam?: Partial<Pose>;
  miss?: Partial<Pose>;
}

/** How a grab cast is going (see AbilityWorld.grabOutcome). */
export type GrabPhase =
  | { readonly state: 'miss' }
  | { readonly state: 'hold' }
  | { readonly state: 'slam'; readonly sinceS: number };

/** The slam snaps down this fast (seconds), is held, and the last part of the recovery eases out. */
const SLAM_DROP_S = 0.09;

const CROUCH: Partial<Pose> = { legFront: limb(50, -95), legBack: limb(-20, -70) };

const SHAPES: Record<string, CastShape> = {
  // Fireball: the lead palm opens out to the side, drawing fire in from the air while the rear fist
  // pulls back to the hip; then the palm thrusts forward and the ball is hurled.
  fireball: {
    windup: { lean: deg(8), head: deg(6), armFront: limb(70, 35), armBack: limb(10, 130), legFront: limb(26, -20) },
    release: { lean: deg(-20), head: deg(16), armFront: limb(92, 8), armBack: limb(84, 18) },
    settle: 0.6,
  },
  // Coil low, then rush forward fist-first with the rear arm trailing.
  flameDash: {
    windup: { lean: deg(-24), head: deg(20), armFront: limb(60, 120), armBack: limb(30, 130), ...CROUCH },
    release: { lean: deg(-40), head: deg(30), armFront: limb(96, 8), armBack: limb(-35, 40) },
    settle: 0.35,
  },
  // Fire Beam (owner, 11/11/2026): planted wide and low, both palms drawn back to the hip as flames
  // gather around the body; then both palms thrust forward together, held while the beam pours out.
  fireBeam: {
    windup: { lean: deg(10), head: deg(4), armFront: limb(20, 120), armBack: limb(12, 128), ...CROUCH },
    release: { lean: deg(-12), head: deg(10), armFront: limb(86, 10), armBack: limb(80, 22), ...CROUCH },
    settle: 0.2,
  },
  // Ground Smash (Rampage): both fists raised high over the horn, then hammered into the floor in a deep squat.
  groundSmash: {
    windup: { lean: deg(14), head: deg(-12), armFront: limb(172, 40), armBack: limb(165, 48), legFront: limb(30, -40) },
    release: {
      lean: deg(-58),
      head: deg(40),
      armFront: limb(40, 8),
      armBack: limb(32, 14),
      legFront: limb(70, -120),
      legBack: limb(-20, -95),
    },
    settle: 0.35,
  },
  // Rampage Charge (owner, 12/11/2026: powerful, heavy, aggressive, always on two legs). WINDUP:
  // a sprinter's set, standing: the upper body leans hard in, shoulders dropped, both arms pulled
  // back, the rear leg braced far behind, trembling as the momentum builds. RUN (held while the
  // charge drives him): the legs keep their sprint cycle, the body stays bent forward behind a
  // lowered lead shoulder, the lead forearm up as a battering ram and the rear arm pumping back.
  // AFTER (the charge stops, in a target or a wall): the shoulder driven through, the body
  // compressed by the collision, then he straightens up.
  rampageCharge: {
    windup: {
      lean: deg(-40),
      head: deg(34),
      armFront: limb(-38, 70),
      armBack: limb(-58, 55),
      legFront: limb(48, -78),
      legBack: limb(-38, -22),
    },
    tremble: deg(3),
    run: { lean: deg(-44), head: deg(36), armFront: limb(72, 112), armBack: limb(-48, 72) },
    release: { lean: deg(-44), head: deg(36), armFront: limb(72, 112), armBack: limb(-48, 72) },
    after: {
      lean: deg(-52),
      head: deg(42),
      armFront: limb(96, 70),
      armBack: limb(-30, 90),
      legFront: limb(62, -96),
      legBack: limb(-34, -20),
    },
    settle: 0.3,
  },
  // Crushing Strike (Rampage): the rear fist cocked high behind the head, then brought straight down.
  crushingStrike: {
    windup: { lean: deg(18), head: deg(-10), armBack: limb(178, 70), armFront: limb(60, 110), legFront: limb(35, -50) },
    release: {
      lean: deg(-40),
      head: deg(30),
      armBack: limb(78, 10),
      armFront: limb(20, 100),
      legFront: limb(55, -90),
      legBack: limb(-20, -60),
    },
    settle: 0.4,
  },
  // Rampage Mode (Rampage): hunched and coiled, then rearing up with fists flexed out and roaring.
  rampageMode: {
    windup: { lean: deg(-30), head: deg(30), armFront: limb(40, 130), armBack: limb(30, 130), legFront: limb(55, -90) },
    release: {
      lean: deg(16),
      head: deg(-28),
      armFront: limb(120, 95),
      armBack: limb(110, 100),
      legFront: limb(30, -30),
    },
    settle: 0.5,
  },
  // Necro (owner, 12/11/2026). The staff is in his rear (left) hand; the lead hand is free for
  // spellwork. Soul Drain: the free hand draws souls in as the staff tilts back, then both point.
  soulDrain: {
    windup: { lean: deg(4), head: deg(2), armFront: limb(60, 40), armBack: limb(20, 60) },
    release: { lean: deg(-8), head: deg(6), armFront: limb(95, 6), armBack: limb(70, 30) },
    settle: 0.5,
  },
  // Curse of Decay (owner, 12/11/2026): the free hand clawed and pulled back to the shoulder as
  // the rot gathers, a hunch over it; then the hand flung open toward the target, leaning in.
  curseOfDecay: {
    windup: { lean: deg(10), head: deg(-4), armFront: limb(140, 120), armBack: limb(30, 50) },
    release: { lean: deg(-12), head: deg(8), armFront: limb(88, 2), armBack: limb(60, 30) },
    settle: 0.5,
  },
  // Death Eruption: the staff lifted, then driven down; the ground answers where he points.
  deathEruption: {
    windup: { lean: deg(4), head: deg(-6), armBack: limb(150, 20), armFront: limb(90, 10) },
    release: { lean: deg(-14), head: deg(14), armBack: limb(50, 20), armFront: limb(100, 10) },
    settle: 0.4,
  },
  // Undead Army (owner, 12/11/2026: "raise his free arm upward while levitating slightly off the
  // ground"): upright and still, the free arm rising overhead, the staff held out at his side, and
  // he lifts off the floor, toes hanging, as the dead claw up. Controlled, never flailing.
  undeadArmy: {
    windup: {
      lean: deg(2),
      head: deg(-6),
      armFront: limb(120, 20),
      armBack: limb(35, 40),
      legFront: limb(6, -12),
      legBack: limb(-4, -16),
      liftM: 0.12,
    },
    release: {
      lean: deg(4),
      head: deg(-14),
      armFront: limb(172, 6),
      armBack: limb(40, 30),
      legFront: limb(6, -14),
      legBack: limb(-4, -18),
      liftM: 0.26,
    },
    settle: 0.35,
  },
  // Shroud (owner, 12/11/2026): every cast stays hunched. Bloodfade (13/11/2026): coiled low with the
  // knife drawn back, then the stab and the spring away (assaultPose drives the stab and retreat).
  bloodfade: {
    windup: { lean: deg(-46), head: deg(-6), armFront: limb(-40, 120), armBack: limb(-20, 50), ...CROUCH },
    // Landed from the spring: low, wary, knife still pointed at the enemy.
    release: { lean: deg(-38), head: deg(-4), armFront: limb(64, 34), armBack: limb(-60, 50), ...CROUCH },
    run: { lean: deg(-54), armFront: limb(40, 80), armBack: limb(-50, 30) },
    settle: 0.35,
  },
  // Stalker Lunge: coiled low like a spring, knife back; then flat out at his prey, knife arm
  // cocked to strike (the three stabs themselves come from assaultPose).
  stalkerLunge: {
    windup: { lean: deg(-40), armFront: limb(-30, 110), armBack: limb(-20, 40), ...CROUCH },
    release: {
      lean: deg(-52),
      armFront: limb(94, 4),
      armBack: limb(-60, 20),
      legFront: limb(60, -40),
      legBack: limb(-50, -10),
    },
    run: { lean: deg(-52), armFront: limb(30, 100), armBack: limb(-60, 20) },
    settle: 0.35,
  },
  // Behind You: he folds in on himself as the shadow takes him, then rises behind his prey,
  // knife already raised.
  behindYou: {
    windup: { lean: deg(-46), armFront: limb(20, 140), armBack: limb(10, 140), ...CROUCH },
    release: { lean: deg(-24), armFront: limb(150, 60), armBack: limb(20, 40), legFront: limb(30, -40) },
    settle: 0.5,
  },
  // Rending Flurry: knife hand cocked across the chest, then a wild sweep out (the flurry's last cut).
  rendingFlurry: {
    windup: { lean: deg(-26), armFront: limb(60, 150), armBack: limb(30, 80), legFront: limb(40, -60) },
    release: {
      lean: deg(-36),
      armFront: limb(115, 10),
      armBack: limb(-30, 50),
      legFront: limb(56, -70),
      legBack: limb(-30, -20),
    },
    tremble: deg(4),
    settle: 0.4,
  },
  // Hunting Frenzy: he hunches lower and shakes, knife hand twitching; then snaps up, arms flung
  // back, head thrown forward.
  huntingFrenzy: {
    windup: { lean: deg(-50), armFront: limb(30, 120), armBack: limb(20, 120), ...CROUCH },
    tremble: deg(5),
    release: { lean: deg(-18), armFront: limb(-40, 40), armBack: limb(-50, 40), legFront: limb(30, -40) },
    settle: 0.5,
  },
  // Grave Chains (owner, 12/11/2026): the staff drawn back over the shoulder as the free hand
  // curls in, then the staff thrust straight out and the free hand yanking back, dragging the
  // caught enemy in.
  graveChains: {
    windup: { lean: deg(6), head: deg(-2), armBack: limb(130, 40), armFront: limb(40, 90) },
    release: { lean: deg(-14), head: deg(10), armBack: limb(92, 6), armFront: limb(-20, 100), legFront: limb(30, -30) },
    settle: 0.45,
  },
  // Flame Detonation (Inferno, owner 12/11/2026): both palms cupped together before his chest as
  // the fire swells between them, a slight crouch; then both arms flung wide and out as it bursts.
  flameDetonation: {
    windup: { lean: deg(10), head: deg(8), armFront: limb(70, 95), armBack: limb(64, 100), ...CROUCH },
    release: { lean: deg(-10), head: deg(6), armFront: limb(130, 8), armBack: limb(40, 10), legFront: limb(34, -40) },
    tremble: deg(2),
    settle: 0.45,
  },
  // Grapple Slam (Braxon, owner 12/11/2026): a lunging grab with the lead hand, then both arms
  // high overhead hoisting the enemy; the settle brings them crashing down for the slam.
  grappleSlam: {
    windup: { lean: deg(-26), head: deg(20), armFront: limb(96, 20), armBack: limb(70, 40), legFront: limb(46, -60) },
    release: {
      lean: deg(12),
      head: deg(-20),
      armFront: limb(170, 30),
      armBack: limb(162, 36),
      legFront: limb(26, -34),
      legBack: limb(-16, -20),
    },
    // The hit: whole body driven down and forward, both fists following the body into the floor.
    slam: {
      lean: deg(-52),
      head: deg(34),
      armFront: limb(58, 12),
      armBack: limb(48, 18),
      legFront: limb(62, -105),
      legBack: limb(-28, -80),
    },
    // The miss: hands clap shut on empty air at full stretch, the weight tips forward over the lead
    // foot and he catches himself with a stumbling step before squaring up again.
    miss: {
      lean: deg(-40),
      head: deg(28),
      armFront: limb(84, 72),
      armBack: limb(62, 96),
      legFront: limb(58, -46),
      legBack: limb(-34, -12),
    },
    settle: 0.4,
  },

  // Eruption (owner, 11/11/2026): squat deep and gather fire, spring up wrapped in flame (AIR),
  // then crash down fist-first into the floor (the release is the landing slam, held briefly).
  eruption: {
    windup: {
      lean: deg(-22),
      head: deg(18),
      armFront: limb(30, 120),
      armBack: limb(-30, 110),
      legFront: limb(70, -130),
      legBack: limb(-10, -120),
    },
    release: { lean: deg(-46), head: deg(34), armBack: limb(30, 6), armFront: limb(60, 110), ...CROUCH },
    settle: 0.2, // most of the recovery is the leap; the landing slam is held briefly at the end
    // In the air: rear fist cocked overhead, lead arm reaching, knees tucked.
    air: {
      lean: deg(-10),
      head: deg(14),
      armBack: limb(178, 55),
      armFront: limb(105, 20),
      legFront: limb(70, -120),
      legBack: limb(30, -110),
    },
  },
};

/**
 * Pose for an ability cast. `airborne` is true while a leap carries the fighter
 * (a leap shows its air pose, then the landing slam).
 */
export function abilityPose(
  base: Pose,
  abilityId: string,
  phase: 'windup' | 'recovery',
  progress: number,
  airborne: boolean,
  driving = false,
  grab?: GrabPhase,
): Pose {
  const shape = SHAPES[abilityId];
  if (!shape) return base;
  const windup = { ...base, ...shape.windup };
  if (phase === 'windup') {
    const pose = blendPose(base, windup, ease(progress * 1.6));
    if (!shape.tremble) return pose;
    // Building power: a fast, growing shudder through the body.
    return { ...pose, lean: pose.lean + Math.sin(progress * 70) * shape.tremble * progress };
  }
  if (shape.air && airborne) return { ...base, ...shape.air };
  if (grab && (shape.slam || shape.miss)) return grabPose(base, shape, windup, progress, grab);
  if (shape.run && driving) return { ...base, ...shape.run };
  const release = { ...base, ...(shape.run && shape.after ? shape.after : shape.release) };
  // Snap into the release quickly, hold it, then ease back to the stance.
  const settleFrom = 1 - shape.settle;
  if (progress < 0.12) return blendPose(windup, release, ease(progress / 0.12));
  if (progress < settleFrom) return release;
  return blendPose(release, base, ease((progress - settleFrom) / shape.settle));
}

/**
 * A grab's recovery: on a miss the miss pose (snapped in, held, eased out); while hoisting the
 * release (arms overhead); once the target lands, a fast drop into the slam pose, held, then eased
 * back to the stance over the shape's settle.
 */
function grabPose(base: Pose, shape: CastShape, windup: Pose, progress: number, grab: GrabPhase): Pose {
  const settleFrom = 1 - shape.settle;
  const out = (pose: Pose): Pose =>
    progress < settleFrom ? pose : blendPose(pose, base, ease((progress - settleFrom) / shape.settle));
  if (grab.state === 'miss' && shape.miss) {
    const miss = { ...base, ...shape.miss };
    if (progress < 0.15) return blendPose(windup, miss, ease(progress / 0.15));
    return out(miss);
  }
  const hoist = { ...base, ...shape.release };
  if (grab.state === 'slam' && shape.slam) {
    const slam = { ...base, ...shape.slam };
    return out(blendPose(hoist, slam, ease(grab.sinceS / SLAM_DROP_S)));
  }
  return progress < 0.12 ? blendPose(windup, hoist, ease(progress / 0.12)) : hoist;
}

/** A knife assault under way (AbilityWorld.assaultOf). */
export interface AssaultState {
  readonly phase: 'approach' | 'stab' | 'retreat';
  readonly stab: number;
  readonly t: number;
}

/**
 * Three distinct stabs (owner, 13/11/2026), cycled by stab index: a straight thrust from the hip,
 * a rising gut stab under the guard, and an overhand downward plunge. Each pulls back (cock),
 * drives in (strike) and holds a beat.
 */
const STABS: readonly { cock: Partial<Pose>; strike: Partial<Pose> }[] = [
  {
    cock: { lean: deg(-40), armFront: limb(-20, 120), armBack: limb(30, 60) },
    strike: { lean: deg(-56), armFront: limb(92, 4), armBack: limb(-50, 30), legFront: limb(55, -40) },
  },
  {
    cock: { lean: deg(-48), armFront: limb(-50, 70), armBack: limb(-30, 40) },
    strike: { lean: deg(-42), head: deg(6), armFront: limb(118, -20), armBack: limb(-70, 20), legBack: limb(-50, -10) },
  },
  {
    cock: { lean: deg(-30), head: deg(-8), armFront: limb(160, 40), armBack: limb(20, 40) },
    strike: { lean: deg(-62), armFront: limb(62, 10), armBack: limb(-40, 60), ...CROUCH },
  },
];

/** The springing retreat: low and wary, knife held out toward the enemy he is leaving. */
const RETREAT: Partial<Pose> = {
  lean: deg(-34),
  head: deg(-4),
  armFront: limb(70, 30),
  armBack: limb(-60, 50),
  legFront: limb(30, -60),
  legBack: limb(-40, -50),
};

/** Overlays a knife assault on the cast pose: each stab its own motion, then the backward spring. */
export function assaultPose(base: Pose, a: AssaultState): Pose {
  if (a.phase === 'retreat') return blendPose(base, { ...base, ...RETREAT }, ease(a.t / 0.08));
  if (a.phase !== 'stab') return base;
  const s = STABS[a.stab % STABS.length]!;
  const cock = { ...base, ...s.cock };
  const strike = { ...base, ...s.strike };
  // Snap in within the first 35% of the interval, hold the strike, then pull back toward the next cock.
  if (a.t < 0.35) return blendPose(cock, strike, ease(a.t / 0.35));
  if (a.t < 0.75) return strike;
  return blendPose(strike, cock, ease((a.t - 0.75) / 0.25) * 0.6);
}

/** Abilities with an animation (tests check every kit ability has one). */
export function hasAbilityPose(abilityId: string): boolean {
  return abilityId in SHAPES;
}
