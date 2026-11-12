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
  // Rhino Charge (Rampage): drops onto all fours, head down and horn forward, pawing the ground for a
  // second; then charges low on all fours (held while the charge carries him).
  rhinoCharge: {
    windup: {
      lean: deg(-74),
      head: deg(55),
      armFront: limb(80, 8),
      armBack: limb(62, 14),
      legFront: limb(35, -55),
      legBack: limb(-20, -40),
    },
    release: {
      lean: deg(-78),
      head: deg(60),
      armFront: limb(95, 12),
      armBack: limb(45, 30),
      legFront: limb(45, -70),
      legBack: limb(-35, -25),
    },
    settle: 0.2,
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
): Pose {
  const shape = SHAPES[abilityId];
  if (!shape) return base;
  const windup = { ...base, ...shape.windup };
  if (phase === 'windup') return blendPose(base, windup, ease(progress * 1.6));
  if (shape.air && airborne) return { ...base, ...shape.air };
  const release = { ...base, ...shape.release };
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
