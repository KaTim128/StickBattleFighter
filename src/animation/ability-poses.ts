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
}

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
  // Teleport: a still, gathering moment (the staff lifted a little, the free hand drawn in), then
  // he is gone; he reforms in the same calm stance.
  teleport: {
    windup: { lean: deg(2), head: deg(-4), armFront: limb(60, 70), armBack: limb(30, 40) },
    release: { lean: deg(0), head: deg(-2), armFront: limb(20, 30), armBack: limb(30, 40) },
    settle: 0.6,
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
  if (shape.run && driving) return { ...base, ...shape.run };
  const release = { ...base, ...(shape.run && shape.after ? shape.after : shape.release) };
  // Snap into the release quickly, hold it, then ease back to the stance.
  const settleFrom = 1 - shape.settle;
  if (progress < 0.12) return blendPose(windup, release, ease(progress / 0.12));
  if (progress < settleFrom) return release;
  return blendPose(release, base, ease((progress - settleFrom) / shape.settle));
}

/** Abilities with an animation (tests check every kit ability has one). */
export function hasAbilityPose(abilityId: string): boolean {
  return abilityId in SHAPES;
}
