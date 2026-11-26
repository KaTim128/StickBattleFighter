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
  /**
   * A second blow `followAtS` seconds after the slam (Uppercut Combo: the other hand punches the rising target back down). It must match
   * the delivery's `followUp.atS`.
   */
  followUp?: Partial<Pose>;
  followAtS?: number;
}

/** How a grab cast is going (see AbilityWorld.grabOutcome). */
export type GrabPhase =
  | { readonly state: 'miss' }
  | { readonly state: 'hold' }
  | { readonly state: 'slam'; readonly sinceS: number };

/** The slam snaps down this fast (seconds), is held, and the last part of the recovery eases out. */
const SLAM_DROP_S = 0.09;
/** A follow-up punch snaps in over this long, ending at its own time. */
const FOLLOW_SNAP_S = 0.08;

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
  // Blue Inferno (Inferno): crouched with fists drawn in, then flung wide open as the blue fire surges.
  blueFire: {
    windup: { lean: deg(-22), head: deg(22), armFront: limb(30, 135), armBack: limb(25, 135), legFront: limb(50, -85) },
    release: {
      lean: deg(14),
      head: deg(-24),
      armFront: limb(115, 90),
      armBack: limb(105, 95),
      legFront: limb(28, -28),
    },
    settle: 0.45,
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
  // Bastion Anchor (Titan, B13): feet planted wide and low, fists drawn in, then both arms thrust down and
  // out as he braces.
  bastionAnchor: {
    windup: { lean: deg(-8), armFront: limb(40, 120), armBack: limb(35, 120), ...CROUCH },
    release: { lean: deg(8), armFront: limb(-15, 30), armBack: limb(-25, 30), legFront: limb(40, -50) },
    settle: 0.5,
  },
  // Soul Tether (Necro, B13): the free hand reaches out and hooks back, the staff held low.
  soulTether: {
    windup: { lean: deg(4), armBack: limb(110, 50), armFront: limb(50, 95) },
    release: { lean: deg(-12), head: deg(8), armBack: limb(92, 8), armFront: limb(-10, 40), legFront: limb(26, -26) },
    settle: 0.4,
  },
  // ---- Vexoris (TD-114): a soldier's drills, not a mage's gestures.
  // Venom Spray: the rear hand steadies the tank hose at the hip, the lead hand brings the nozzle up, then both arms
  // sweep out in one long spray.
  venomSpray: {
    windup: { lean: deg(-8), head: deg(4), armFront: limb(40, 80), armBack: limb(20, 90), legFront: limb(30, -30) },
    release: { lean: deg(-16), head: deg(6), armFront: limb(92, 6), armBack: limb(84, 14), legFront: limb(36, -26) },
    settle: 0.5,
  },
  // Toxic Jar: the jar hand wound back and high behind the head, then thrown overhead.
  toxicJar: {
    windup: { lean: deg(10), head: deg(-4), armBack: limb(168, 70), armFront: limb(40, 40), legFront: limb(20, -20) },
    release: {
      lean: deg(-24),
      head: deg(10),
      armBack: limb(100, 10),
      armFront: limb(-20, 40),
      legFront: limb(42, -32),
    },
    settle: 0.5,
  },
  // Chemical Trap: a low crouch, the canister placed ahead with a flat hand.
  chemicalTrap: {
    windup: { lean: deg(-30), armFront: limb(30, 90), armBack: limb(10, 80), ...CROUCH },
    release: { lean: deg(-38), armFront: limb(60, 8), armBack: limb(-30, 50), ...CROUCH },
    settle: 0.4,
  },
  // Vapour Step: the body dissolves backwards: he leans away with the arms thrown forward and the heels pushing off.
  vaporStep: {
    windup: { lean: deg(-6), armFront: limb(40, 90), armBack: limb(40, 90), legFront: limb(20, -20) },
    release: {
      lean: deg(22),
      head: deg(-8),
      armFront: limb(90, 20),
      armBack: limb(80, 20),
      legFront: limb(-30, -50),
      legBack: limb(30, -20),
    },
    run: { lean: deg(22), armFront: limb(70, 30), armBack: limb(60, 30) },
    settle: 0.3,
  },
  // Grenade: the free hand pulls the pin as the rear arm holds the grenade by the shoulder, then an underhand-to-overhand
  // lob: the throwing arm swings forward and up, the body turning with it.
  grenade: {
    windup: { lean: deg(8), head: deg(-4), armBack: limb(150, 90), armFront: limb(40, 100), legFront: limb(22, -22) },
    release: { lean: deg(-20), head: deg(8), armBack: limb(104, 6), armFront: limb(-30, 60), legFront: limb(40, -30) },
    settle: 0.45,
  },
  // Plague Bloom: arms drawn up and in over the chest as the poison gathers, then flung wide to vent it all.
  plagueBloom: {
    windup: { lean: deg(8), head: deg(-6), armFront: limb(120, 100), armBack: limb(120, 100), ...CROUCH },
    tremble: deg(3),
    release: { lean: deg(-6), head: deg(8), armFront: limb(80, 6), armBack: limb(-80, 6), legFront: limb(30, -30) },
    settle: 0.6,
  },
  // Death Mark (Shroud, 20/11/2026): sinking low, the free hand sweeping out to paint the symbol on his prey, then
  // settling into the stalking crouch (`stalkPose` holds it for the five seconds).
  deathMark: {
    windup: { lean: deg(-44), armFront: limb(30, 100), armBack: limb(20, 110), ...CROUCH },
    release: { lean: deg(-50), head: deg(-6), armFront: limb(52, 60), armBack: limb(100, 20), ...CROUCH },
    settle: 0.3,
  },
  // ---- Aerion (master plan section 4): elegant, open-armed, always a little off the ground.
  // Sky Dive: a crouch and spring, then folded in the air head-first for the dive (AIR), the landing is the release.
  skyDive: {
    windup: { lean: deg(-12), head: deg(10), armFront: limb(40, 100), armBack: limb(-20, 100), ...CROUCH },
    release: { lean: deg(-48), head: deg(30), armFront: limb(60, 8), armBack: limb(50, 12), ...CROUCH },
    settle: 0.3,
    air: {
      lean: deg(-60),
      head: deg(24),
      armFront: limb(120, 10),
      armBack: limb(110, 10),
      legFront: limb(20, -14),
      legBack: limb(10, -10),
    },
  },
  // Wind Blade: the wings thrown wide and the arms with them, held out level while he turns on the spot (the spin itself
  // is the view's turn and the wing blades the effects draw).
  windBlade: {
    windup: { lean: deg(6), head: deg(-4), armFront: limb(70, 60), armBack: limb(70, 60), legFront: limb(24, -26) },
    release: {
      lean: deg(-4),
      head: deg(0),
      armFront: limb(90, 6),
      armBack: limb(-90, 6),
      legFront: limb(26, -24),
      legBack: limb(-18, -18),
    },
    settle: 0.25,
  },
  // Tornado Surge: both hands drawn back to the hip, a whirl gathering between them, then thrown forward together.
  tornadoSurge: {
    windup: {
      lean: deg(10),
      head: deg(-4),
      armFront: limb(-20, 100),
      armBack: limb(-30, 100),
      legFront: limb(26, -26),
    },
    release: { lean: deg(-18), head: deg(6), armFront: limb(96, 6), armBack: limb(92, 10), legFront: limb(38, -30) },
    settle: 0.45,
  },
  // Tailwind: arms thrown back and chest out as the wings spread and the wind gathers.
  tailwind: {
    windup: { lean: deg(10), head: deg(-8), armFront: limb(-10, 30), armBack: limb(-30, 30), legFront: limb(20, -20) },
    release: { lean: deg(-6), head: deg(10), armFront: limb(-50, 12), armBack: limb(-70, 12), legFront: limb(30, -26) },
    settle: 0.4,
  },
  // Feather Guard: both arms crossed tight over the chest, the wings folded round him.
  featherGuard: {
    windup: { lean: deg(4), armFront: limb(100, 130), armBack: limb(110, 130), legFront: limb(30, -34) },
    release: {
      lean: deg(-4),
      head: deg(8),
      armFront: limb(120, 140),
      armBack: limb(124, 140),
      legFront: limb(34, -40),
    },
    settle: 0.4,
  },
  // Celestial Tempest: a deep crouch gathering the storm, then flung up with arms wide (AIR), the dive a hard landing.
  celestialTempest: {
    windup: { lean: deg(-14), head: deg(12), armFront: limb(30, 110), armBack: limb(-20, 110), ...CROUCH },
    tremble: deg(2),
    release: { lean: deg(-50), head: deg(32), armFront: limb(58, 8), armBack: limb(46, 12), ...CROUCH },
    settle: 0.3,
    air: {
      lean: deg(8),
      head: deg(-18),
      armFront: limb(130, 10),
      armBack: limb(-130, 10),
      legFront: limb(14, -14),
      legBack: limb(-8, -10),
    },
  },

  // ---- Kenshiro (spec section 4): upright, still, economical. The blade is the whole animation.
  // Sliding Slice: dropping low onto the heel, the body laid back and the lead leg shot out along the floor, the sword
  // held out level to cut whatever it slides through.
  slidingSlice: {
    windup: { lean: deg(-14), head: deg(6), armFront: limb(40, 80), legFront: limb(50, -100), legBack: limb(-20, -80) },
    release: { lean: deg(34), head: deg(-10), armFront: limb(96, 4), legFront: limb(88, -6), legBack: limb(-30, -120) },
    run: { lean: deg(34), head: deg(-10), armFront: limb(96, 4), legFront: limb(88, -6), legBack: limb(-30, -120) },
    settle: 0.45,
  },
  // Blade Tempest: the cast pose is a hand on the hilt; the cuts themselves are `swordCut`.
  bladeTempest: {
    windup: { lean: deg(-12), head: deg(6), armFront: limb(40, 70), armBack: limb(30, 80), ...CROUCH },
    release: { lean: deg(-30), head: deg(8), armFront: limb(100, 6), armBack: limb(30, 100), legFront: limb(50, -40) },
    settle: 0.4,
  },
  // Perfect Parry: the blade drawn across the body, the weight settled onto the back foot: still, ready.
  perfectParry: {
    windup: { lean: deg(4), head: deg(-2), armFront: limb(70, 100), armBack: limb(50, 110), legFront: limb(24, -30) },
    release: {
      lean: deg(8),
      head: deg(-4),
      armFront: limb(86, 90),
      armBack: limb(60, 100),
      legFront: limb(20, -34),
      legBack: limb(-24, -30),
    },
    settle: 0.5,
  },
  // Focus Stance: both blades lowered, the breath drawn in: a calm, wide, balanced stance.
  focusStance: {
    windup: { lean: deg(2), head: deg(0), armFront: limb(40, 60), armBack: limb(30, 60), legFront: limb(30, -28) },
    release: {
      lean: deg(-4),
      head: deg(2),
      armFront: limb(50, 30),
      armBack: limb(40, 36),
      legFront: limb(36, -34),
      legBack: limb(-34, -26),
    },
    settle: 0.4,
  },
  // Iaido Draw: weight low over the hip, hand on the hilt; then the whole body flows forward through the cut.
  iaidoDraw: {
    windup: { lean: deg(-18), head: deg(8), armFront: limb(10, 70), armBack: limb(-20, 90), ...CROUCH },
    release: {
      lean: deg(-40),
      head: deg(14),
      armFront: limb(102, 2),
      armBack: limb(-30, 60),
      legFront: limb(54, -50),
      legBack: limb(-44, -18),
    },
    run: { lean: deg(-40), head: deg(14), armFront: limb(102, 2), armBack: limb(-30, 60) },
    settle: 0.4,
  },
  // Final Judgement: a bow, a hand on the hilt; the rush and the cuts are `judgementPose`.
  finalJudgement: {
    windup: { lean: deg(-14), head: deg(10), armFront: limb(10, 70), armBack: limb(-10, 90), ...CROUCH },
    tremble: deg(1.5),
    release: { lean: deg(4), head: deg(0), armFront: limb(14, 70), armBack: limb(8, 80), legFront: limb(24, -26) },
    settle: 0.5,
  },

  // ---- Psion (master plan section 4): gestures, not blows. The hands do the work and the body hardly moves.
  // Gravity Vortex: both hands out, fingers spread, then swept in a slow circle as the well opens.
  gravityVortex: {
    windup: { lean: deg(0), head: deg(4), armFront: limb(96, 10), armBack: limb(86, 14), legFront: limb(14, -22) },
    release: { lean: deg(-6), head: deg(6), armFront: limb(92, 100), armBack: limb(84, 104), legFront: limb(16, -24) },
    settle: 0.4,
  },
  // Telekinetic Toss: one hand reaching out, palm up, then drawn up as if lifting.
  telekineticToss: {
    windup: { lean: deg(2), head: deg(2), armFront: limb(70, 20), armBack: limb(30, 80), legFront: limb(14, -22) },
    release: { lean: deg(-4), head: deg(6), armFront: limb(130, 30), armBack: limb(30, 80), legFront: limb(16, -24) },
    settle: 0.3,
  },
  // Psychic Rupture: both hands drawn to the temples in concentration, then thrust out flat toward the target.
  psychicRupture: {
    windup: { lean: deg(-4), head: deg(6), armFront: limb(150, 120), armBack: limb(140, 120), legFront: limb(14, -22) },
    release: { lean: deg(-14), head: deg(8), armFront: limb(96, 4), armBack: limb(90, 8), legFront: limb(24, -26) },
    settle: 0.4,
  },
  // Floating Prison: one hand lifted with the fingers curled, the other drawing a circle in the air.
  floatingPrison: {
    windup: { lean: deg(-2), head: deg(4), armFront: limb(130, 40), armBack: limb(40, 70), legFront: limb(14, -22) },
    release: { lean: deg(-8), head: deg(6), armFront: limb(150, 90), armBack: limb(60, 60), legFront: limb(16, -24) },
    settle: 0.4,
  },
  // Gravity Well: both arms flung wide, then drawn in hard to the chest.
  gravityWell: {
    windup: { lean: deg(8), head: deg(-2), armFront: limb(60, 130), armBack: limb(70, 130), legFront: limb(14, -22) },
    release: { lean: deg(-8), head: deg(6), armFront: limb(96, 6), armBack: limb(-96, 6), legFront: limb(20, -24) },
    settle: 0.3,
  },
  // Mindstorm: both arms raised overhead, fingers spread, held there trembling as the room lifts.
  mindstorm: {
    windup: { lean: deg(6), head: deg(-10), armFront: limb(120, 40), armBack: limb(110, 44), legFront: limb(14, -22) },
    tremble: deg(2),
    release: { lean: deg(4), head: deg(-14), armFront: limb(168, 12), armBack: limb(160, 14), legFront: limb(14, -22) },
    settle: 0.5,
  },

  // ---- Geargrind (master plan section 4): machine movements. The arm cranks back to spool, then punches; the gadgets are set
  // down with a crouch; plates lock with the arms pulled in and out.
  // Rocket Fist: the machine arm drawn back and cocked at the hip, then thrust dead straight.
  rocketFist: {
    windup: {
      lean: deg(10),
      head: deg(2),
      armFront: limb(-30, 120),
      armBack: limb(40, 100),
      legFront: limb(26, -40),
      legBack: limb(-30, -36),
    },
    release: {
      lean: deg(-18),
      head: deg(-4),
      armFront: limb(92, 0),
      armBack: limb(10, 96),
      legFront: limb(34, -34),
      legBack: limb(-30, -20),
    },
    settle: 0.4,
  },
  // Combat Drone: the backpack hatch opened with one hand, the other tossing the drone up.
  combatDrone: {
    windup: { lean: deg(-4), head: deg(8), armFront: limb(40, 100), armBack: limb(-60, 130), legFront: limb(20, -30) },
    release: {
      lean: deg(-2),
      head: deg(-10),
      armFront: limb(140, 40),
      armBack: limb(-30, 90),
      legFront: limb(20, -28),
    },
    settle: 0.35,
  },
  // Magnetic Mine: a crouch, the mine set on the floor with one hand and pressed down.
  magneticMine: {
    windup: {
      lean: deg(14),
      head: deg(10),
      armFront: limb(40, 110),
      armBack: limb(20, 100),
      legFront: limb(36, -70),
      legBack: limb(-30, -60),
    },
    release: {
      lean: deg(30),
      head: deg(16),
      armFront: limb(70, 10),
      armBack: limb(10, 90),
      legFront: limb(40, -80),
      legBack: limb(-30, -64),
    },
    settle: 0.4,
  },
  // Reinforced Plating: arms pulled in tight to the chest, then thrown out wide as the plates lock.
  reinforcedPlating: {
    windup: {
      lean: deg(8),
      head: deg(4),
      armFront: limb(40, 130),
      armBack: limb(30, 130),
      legFront: limb(22, -30),
      legBack: limb(-26, -28),
    },
    release: {
      lean: deg(-4),
      head: deg(-2),
      armFront: limb(70, 24),
      armBack: limb(-50, 30),
      legFront: limb(26, -30),
      legBack: limb(-30, -26),
    },
    settle: 0.4,
  },
  // Arc Coil: both fists clenched and pulled back as the coil charges, then both opened wide.
  arcCoil: {
    windup: {
      lean: deg(8),
      head: deg(2),
      armFront: limb(30, 130),
      armBack: limb(20, 130),
      legFront: limb(22, -30),
      legBack: limb(-26, -28),
    },
    release: {
      lean: deg(-6),
      head: deg(-4),
      armFront: limb(86, 16),
      armBack: limb(-80, 16),
      legFront: limb(26, -30),
      legBack: limb(-30, -24),
    },
    settle: 0.35,
  },
  // Overdrive Protocol: both arms thrown overhead as the machinery unfolds, shuddering, then slammed down.
  overdrive: {
    windup: {
      lean: deg(4),
      head: deg(-8),
      armFront: limb(150, 40),
      armBack: limb(140, 44),
      legFront: limb(24, -34),
      legBack: limb(-30, -30),
    },
    tremble: deg(2.4),
    release: {
      lean: deg(-22),
      head: deg(-4),
      armFront: limb(60, 4),
      armBack: limb(40, 6),
      legFront: limb(34, -34),
      legBack: limb(-30, -20),
    },
    settle: 0.5,
  },

  // ---- Reson (master plan section 4): the gauntlets do the work, tuned up and released.
  sonicBoom: {
    windup: {
      lean: deg(-10),
      head: deg(-24),
      armFront: limb(40, 20),
      armBack: limb(24, 24),
      legFront: limb(18, -30),
      legBack: limb(-22, -28),
    },
    tremble: deg(1.4),
    release: {
      lean: deg(14),
      head: deg(12),
      armFront: limb(18, 70),
      armBack: limb(-14, 80),
      legFront: limb(26, -34),
      legBack: limb(-30, -30),
    },
    settle: 0.2,
  },
  // Resonance Break: both hands cupped to the sides of the mouth, the head thrust forward and up for a thin, piercing screech.
  resonanceBreak: {
    windup: {
      lean: deg(-6),
      head: deg(-14),
      armFront: limb(120, 150),
      armBack: limb(110, 150),
      legFront: limb(16, -26),
      legBack: limb(-20, -24),
    },
    release: {
      lean: deg(8),
      head: deg(-4),
      armFront: limb(130, 140),
      armBack: limb(116, 142),
      legFront: limb(22, -28),
      legBack: limb(-24, -24),
    },
    settle: 0.35,
  },
  // Vibration Punch: the whole arm shuddering back, then one fist driven straight in.
  vibrationPunch: {
    windup: {
      lean: deg(10),
      head: deg(2),
      armFront: limb(-20, 124),
      armBack: limb(50, 110),
      legFront: limb(24, -36),
      legBack: limb(-30, -32),
    },
    tremble: deg(2.6),
    release: {
      lean: deg(-28),
      head: deg(-6),
      armFront: limb(92, 2),
      armBack: limb(40, 112),
      legFront: limb(36, -34),
      legBack: limb(-30, -20),
    },
    settle: 0.45,
  },
  // Resonance Barrier: both gauntlets crossed at the chest, then swept wide in a circle.
  harmonicShield: {
    windup: {
      lean: deg(4),
      head: deg(0),
      armFront: limb(60, 140),
      armBack: limb(54, 140),
      legFront: limb(22, -30),
      legBack: limb(-26, -28),
    },
    release: {
      lean: deg(0),
      head: deg(-2),
      armFront: limb(86, 24),
      armBack: limb(-70, 26),
      legFront: limb(24, -30),
      legBack: limb(-28, -26),
    },
    settle: 0.35,
  },
  // Feedback Pulse: both fists clenched in against the chest, then both hands thrown open and the body rocked back.
  dissonance: {
    windup: {
      lean: deg(10),
      head: deg(2),
      armFront: limb(50, 140),
      armBack: limb(46, 140),
      legFront: limb(22, -34),
      legBack: limb(-26, -30),
    },
    release: {
      lean: deg(-10),
      head: deg(-4),
      armFront: limb(84, 18),
      armBack: limb(-84, 18),
      legFront: limb(26, -32),
      legBack: limb(-30, -24),
    },
    settle: 0.35,
  },
  // Shatterwave: both gauntlets raised overhead and brought together, shuddering, then slammed apart and down.
  shatterwave: {
    windup: {
      lean: deg(2),
      head: deg(-8),
      armFront: limb(158, 50),
      armBack: limb(152, 54),
      legFront: limb(24, -36),
      legBack: limb(-30, -32),
    },
    tremble: deg(3),
    release: {
      lean: deg(-24),
      head: deg(-2),
      armFront: limb(40, 4),
      armBack: limb(-30, 6),
      legFront: limb(36, -36),
      legBack: limb(-32, -20),
    },
    settle: 0.55,
  },

  // ---- Chronos (master plan section 4): precise, with the dial arm doing the work.
  // Rewind Time: a palm strike, then the dial arm swept back in a slow circle as if winding the hands of a clock backwards.
  rewindTime: {
    windup: {
      lean: deg(8),
      head: deg(0),
      armFront: limb(-20, 120),
      armBack: limb(-10, 112),
      legFront: limb(22, -30),
      legBack: limb(-24, -28),
    },
    release: {
      lean: deg(-22),
      head: deg(-2),
      armFront: limb(90, 2),
      armBack: limb(-20, 100),
      legFront: limb(34, -32),
      legBack: limb(-28, -22),
    },
    settle: 0.4,
  },
  // Temporal Echo: the dial arm held out flat with the palm down, then drawn sharply back to the chest.
  temporalEcho: {
    windup: {
      lean: deg(2),
      head: deg(0),
      armFront: limb(90, 30),
      armBack: limb(-14, 112),
      legFront: limb(20, -30),
      legBack: limb(-24, -28),
    },
    release: {
      lean: deg(10),
      head: deg(6),
      armFront: limb(70, 6),
      armBack: limb(-14, 112),
      legFront: limb(24, -40),
      legBack: limb(-26, -34),
    },
    settle: 0.35,
  },
  // Chrono Slash: the arm drawn far back across the body, then swung out flat and wide in one sweeping cut, the body turning with it.
  chronoSlash: {
    windup: {
      lean: deg(14),
      head: deg(-4),
      armFront: limb(-80, 20),
      armBack: limb(30, 100),
      legFront: limb(24, -34),
      legBack: limb(-30, -30),
    },
    release: {
      lean: deg(-26),
      head: deg(8),
      armFront: limb(104, 2),
      armBack: limb(-30, 90),
      legFront: limb(38, -36),
      legBack: limb(-34, -20),
    },
    settle: 0.4,
  },
  // Afterimage: a low sprinter's crouch, then a lunge forward with both arms trailing.
  afterimage: {
    windup: {
      lean: deg(20),
      head: deg(6),
      armFront: limb(30, 120),
      armBack: limb(20, 120),
      legFront: limb(36, -64),
      legBack: limb(-30, -56),
    },
    release: {
      lean: deg(-28),
      head: deg(-4),
      armFront: limb(-50, 40),
      armBack: limb(-60, 40),
      legFront: limb(40, -50),
      legBack: limb(-44, -34),
    },
    settle: 0.25,
  },
  // Age Acceleration: the dial arm thrust at the target, the other hand turning a crank in the air.
  ageAcceleration: {
    windup: {
      lean: deg(4),
      head: deg(2),
      armFront: limb(96, 40),
      armBack: limb(60, 120),
      legFront: limb(22, -30),
      legBack: limb(-24, -28),
    },
    tremble: deg(1.2),
    release: {
      lean: deg(-10),
      head: deg(-2),
      armFront: limb(94, 6),
      armBack: limb(40, 80),
      legFront: limb(28, -32),
      legBack: limb(-28, -24),
    },
    settle: 0.4,
  },
  // Time Stop: the dial arm raised high, the hand turned as if pulling a lever, held still, then both arms thrown down and out.
  timeStop: {
    windup: {
      lean: deg(0),
      head: deg(-6),
      armFront: limb(168, 30),
      armBack: limb(150, 40),
      legFront: limb(22, -32),
      legBack: limb(-26, -30),
    },
    tremble: deg(1.6),
    release: {
      lean: deg(-6),
      head: deg(0),
      armFront: limb(60, 8),
      armBack: limb(-60, 8),
      legFront: limb(28, -34),
      legBack: limb(-32, -26),
    },
    settle: 0.45,
  },

  // ---- Prismor (all crystal): hands gather crystal, a low slide, a fan of shards, legs pinned, a palm on the floor.
  // Crystal Arsenal: both hands cupped low at the chest as crystal gathers, then opened forward as the weapon grows.
  shardBlade: {
    windup: {
      lean: deg(4),
      head: deg(-4),
      armFront: limb(46, 104),
      armBack: limb(40, 108),
      legFront: limb(24, -34),
      legBack: limb(-28, -30),
    },
    tremble: deg(1.4),
    release: {
      lean: deg(-6),
      head: deg(-2),
      armFront: limb(96, 40),
      armBack: limb(88, 46),
      legFront: limb(30, -36),
      legBack: limb(-34, -30),
    },
    settle: 0.1,
  },
  // Crystal Slide: crouched and coiled, then flat out on one leg with the other folded under, arms thrown back.
  crystalSlide: {
    windup: {
      lean: deg(14),
      head: deg(-6),
      armFront: limb(-30, 40),
      armBack: limb(-56, 36),
      legFront: limb(40, -70),
      legBack: limb(-44, -64),
    },
    release: {
      lean: deg(-48),
      head: deg(14),
      armFront: limb(-54, 20),
      armBack: limb(-70, 16),
      legFront: limb(76, -4),
      legBack: limb(-18, -110),
    },
    settle: 0.2,
  },
  // Shard Volley: both hands drawn in to the chest, then thrown wide open towards the foe.
  shardVolley: {
    windup: {
      lean: deg(6),
      head: deg(0),
      armFront: limb(34, 112),
      armBack: limb(28, 116),
      legFront: limb(26, -34),
      legBack: limb(-30, -30),
    },
    tremble: deg(1),
    release: {
      lean: deg(-10),
      head: deg(-2),
      armFront: limb(98, 8),
      armBack: limb(76, 14),
      legFront: limb(32, -38),
      legBack: limb(-34, -30),
    },
    settle: 0.15,
  },
  // Crystal Prison: both hands raised, then pressed down hard toward the ground in front of him as the crystal climbs.
  crystalPrison: {
    windup: {
      lean: deg(8),
      head: deg(-6),
      armFront: limb(134, 44),
      armBack: limb(126, 50),
      legFront: limb(26, -36),
      legBack: limb(-30, -32),
    },
    tremble: deg(1.4),
    release: {
      lean: deg(-26),
      head: deg(8),
      armFront: limb(44, 6),
      armBack: limb(36, 10),
      legFront: limb(42, -48),
      legBack: limb(-38, -36),
    },
    settle: 0.2,
  },
  // Crystal Groundstrike: a hand raised, then a deep lunge with the palm planted flat on the floor.
  crystalGroundstrike: {
    windup: {
      lean: deg(10),
      head: deg(-8),
      armFront: limb(158, 34),
      armBack: limb(-30, 50),
      legFront: limb(30, -44),
      legBack: limb(-36, -40),
    },
    tremble: deg(1.6),
    release: {
      lean: deg(-58),
      head: deg(14),
      armFront: limb(18, 0),
      armBack: limb(-60, 30),
      legFront: limb(58, -78),
      legBack: limb(-46, -46),
    },
    settle: 0.3,
  },
  // Crystal Sovereign: both arms flung out and up as armour grows over the whole body, then a firm plant.
  crystalSovereign: {
    windup: {
      lean: deg(0),
      head: deg(-8),
      armFront: limb(130, 20),
      armBack: limb(-120, 20),
      legFront: limb(22, -34),
      legBack: limb(-26, -30),
    },
    tremble: deg(2),
    release: {
      lean: deg(-4),
      head: deg(0),
      armFront: limb(70, 60),
      armBack: limb(30, 80),
      legFront: limb(28, -36),
      legBack: limb(-30, -30),
    },
    settle: 0.25,
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
  // ---- Bohemeth. Each ability poses all four arms, so every one reads differently.
  // Spin Cycle: the upper hands reach out wide to seize (the windup); the release is the level follow-through after the throw or the let-go,
  // all four arms flung forward; the miss closes all four hands on air. The swing itself is `spinPose`.
  spinCycle: {
    windup: {
      lean: deg(-18),
      head: deg(10),
      armFront: limb(104, 22),
      armBack: limb(96, 26),
      armFront2: limb(34, 44),
      armBack2: limb(22, 50),
      legFront: limb(36, -56),
      legBack: limb(-26, -40),
    },
    tremble: deg(1.5),
    release: {
      lean: deg(-26),
      head: deg(14),
      armFront: limb(98, 6),
      armBack: limb(94, 8),
      armFront2: limb(88, 8),
      armBack2: limb(84, 10),
      legFront: limb(44, -50),
      legBack: limb(-32, -34),
    },
    miss: {
      lean: deg(-34),
      head: deg(26),
      armFront: limb(86, 70),
      armBack: limb(80, 80),
      armFront2: limb(56, 88),
      armBack2: limb(48, 92),
    },
    settle: 0.4,
  },
  // Uppercut Combo: both upper hands reach out wide and low to seize; held up at the chest while both lower hands are drawn right back
  // (the release = the hold); then ONE lower hand (the front one) swings up from below the knee to high over the head (the slam = the
  // uppercut) while the upper hands let go and the other lower fist stays cocked; then that other fist drives forward and down (the
  // follow-up), the body turning into it.
  uppercutCombo: {
    windup: {
      lean: deg(-22),
      head: deg(14),
      armFront: limb(96, 26),
      armBack: limb(88, 34),
      armFront2: limb(10, 110),
      armBack2: limb(0, 114),
      legFront: limb(40, -56),
    },
    release: {
      lean: deg(-12),
      head: deg(8),
      armFront: limb(82, 52),
      armBack: limb(74, 58),
      armFront2: limb(-24, 108),
      armBack2: limb(-34, 112),
      legFront: limb(36, -64),
      legBack: limb(-28, -50),
    },
    slam: {
      lean: deg(10),
      head: deg(-20),
      armFront: limb(120, 40),
      armBack: limb(70, 70),
      armFront2: limb(170, 18),
      armBack2: limb(-44, 112),
      legFront: limb(20, -20),
      legBack: limb(-16, -12),
    },
    followUp: {
      lean: deg(-30),
      head: deg(18),
      armFront: limb(150, 50),
      armBack: limb(96, 60),
      armFront2: limb(66, 70),
      armBack2: limb(122, 6),
      legFront: limb(48, -60),
      legBack: limb(-34, -30),
    },
    followAtS: 0.3,
    miss: {
      lean: deg(-34),
      head: deg(26),
      armFront: limb(86, 70),
      armBack: limb(80, 80),
      armFront2: limb(56, 88),
      armBack2: limb(48, 92),
    },
    settle: 0.4,
  },
  // Thunder Clap: all four arms flung wide and up, the chest opened; then all four hands brought crashing together in front of him.
  thunderClap: {
    windup: {
      lean: deg(10),
      head: deg(-14),
      armFront: limb(150, 20),
      armBack: limb(-150, 24),
      armFront2: limb(112, 14),
      armBack2: limb(-110, 18),
      legFront: limb(30, -34),
      legBack: limb(-28, -28),
    },
    release: {
      lean: deg(-24),
      head: deg(14),
      armFront: limb(88, 8),
      armBack: limb(92, 10),
      armFront2: limb(78, 10),
      armBack2: limb(82, 12),
      legFront: limb(44, -48),
      legBack: limb(-30, -34),
    },
    settle: 0.5,
  },
  // Ground Smash: crouch and spring with all four arms thrown high; down, all four fists driven into the floor in a deep squat,
  // and held there crouched with the hands on the ground (the long settle).
  bohemethGroundSmash: {
    windup: {
      lean: deg(10),
      head: deg(-10),
      armFront: limb(-30, 70),
      armBack: limb(-40, 70),
      armFront2: limb(-50, 60),
      armBack2: limb(-56, 56),
      ...CROUCH,
    },
    air: {
      lean: deg(8),
      head: deg(-16),
      armFront: limb(172, 36),
      armBack: limb(166, 42),
      armFront2: limb(150, 40),
      armBack2: limb(142, 46),
      legFront: limb(30, -50),
      legBack: limb(-20, -44),
    },
    release: {
      lean: deg(-62),
      head: deg(40),
      armFront: limb(40, 8),
      armBack: limb(30, 14),
      armFront2: limb(34, 12),
      armBack2: limb(24, 18),
      legFront: limb(72, -122),
      legBack: limb(-22, -98),
    },
    settle: 0.5,
  },
  // Ground Smash in the ultimate: a deeper, more violent crouch with the fists already glowing, a higher and longer flight with the
  // arms thrown fully back, and a landing so heavy he drives his fists into the floor on his knees.
  bohemethGroundSmashEmpowered: {
    windup: {
      lean: deg(18),
      head: deg(-14),
      armFront: limb(-44, 70),
      armBack: limb(-54, 70),
      armFront2: limb(-64, 60),
      armBack2: limb(-70, 56),
      legFront: limb(58, -110),
      legBack: limb(-26, -84),
    },
    tremble: deg(4),
    air: {
      lean: deg(-6),
      head: deg(-22),
      armFront: limb(178, 20),
      armBack: limb(172, 24),
      armFront2: limb(162, 28),
      armBack2: limb(154, 30),
      legFront: limb(36, -64),
      legBack: limb(-24, -54),
    },
    release: {
      lean: deg(-74),
      head: deg(48),
      armFront: limb(34, 4),
      armBack: limb(24, 8),
      armFront2: limb(28, 6),
      armBack2: limb(18, 12),
      legFront: limb(84, -134),
      legBack: limb(-28, -112),
    },
    settle: 0.55,
  },
  // Chain Grab: one upper hand reaches across to unwind the chain from his body, whirls it, and throws it out straight; the other arms
  // brace. The release holds the throw; the pull is held with both upper hands hauling back.
  chainGrab: {
    windup: {
      lean: deg(6),
      head: deg(8),
      armFront: limb(-20, 100),
      armBack: limb(40, 120),
      armFront2: limb(30, 100),
      armBack2: limb(10, 100),
      legFront: limb(26, -30),
    },
    release: {
      lean: deg(-26),
      head: deg(10),
      armFront: limb(96, 6),
      armBack: limb(40, 110),
      armFront2: limb(34, 96),
      armBack2: limb(14, 96),
      legFront: limb(46, -52),
      legBack: limb(-36, -26),
    },
    settle: 0.35,
  },
  // Fiery Fists: all four arms raised and the fists clenched, trembling, then driven down and out in a roar as the flames take.
  fieryFists: {
    windup: {
      lean: deg(10),
      head: deg(-16),
      armFront: limb(165, 70),
      armBack: limb(-160, 70),
      armFront2: limb(120, 80),
      armBack2: limb(-120, 80),
      legFront: limb(28, -34),
      legBack: limb(-28, -30),
    },
    tremble: deg(2),
    release: {
      lean: deg(-6),
      head: deg(-6),
      armFront: limb(120, 90),
      armBack: limb(-110, 90),
      armFront2: limb(70, 100),
      armBack2: limb(-70, 100),
      legFront: limb(36, -42),
      legBack: limb(-34, -38),
    },
    settle: 0.4,
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
/**
 * Inkmaster's drawing motions: the brush is raised, then it traces what he is drawing in the air, the arm sweeping through the strokes
 * while the body leans into them, before easing back to the stance. `cycles` is how many strokes the recovery holds.
 */
const INK_DRAWING: Readonly<Record<string, { cycles: number; amp: number; lean: number }>> = {
  inkSerpent: { cycles: 2, amp: 38, lean: 6 }, // an S: two waves
  inkBull: { cycles: 1.5, amp: 60, lean: 10 }, // one great sweep out and back
  inkClone: { cycles: 4, amp: 26, lean: 4 }, // quick short strokes: head, body, arms, legs
  inkSpear: { cycles: 2, amp: 40, lean: 6 }, // the brush twirled, lengthening
  masterpiece: { cycles: 8, amp: 52, lean: 12 }, // a long, sweeping drawing
};

/**
 * Ink Slash: the brush is drawn back, then cuts three times (left to right, back again, then a wide finishing cut). The strikes
 * land at the start of recovery and 0.22 s and 0.44 s later (progress 0, 0.29, 0.59 of its 0.75 s), so the arm and the body
 * turn to each one in step with its streak of ink.
 */
function inkSlashPose(base: Pose, phase: 'windup' | 'recovery', progress: number): Pose {
  const cocked: Pose = { ...base, lean: deg(-6), head: deg(-4), armFront: limb(150, 30), armBack: limb(60, 70) };
  if (phase === 'windup') return blendPose(base, cocked, ease(Math.min(1, progress * 1.4)));
  const sweep = Math.cos((progress / 0.293) * Math.PI);
  const finale = progress > 0.45 ? 1.25 : 1;
  const cut: Pose = {
    ...cocked,
    lean: deg(-4 + 10 * sweep),
    head: deg(-2 * sweep),
    armFront: limb(95 + 55 * sweep * finale, 18 + 14 * (1 - Math.abs(sweep))),
    armBack: limb(55 - 20 * sweep, 66),
  };
  if (progress < 0.85) return cut;
  return blendPose(cut, base, ease((progress - 0.85) / 0.15));
}

function inkDrawingPose(base: Pose, id: string, phase: 'windup' | 'recovery', progress: number): Pose | null {
  if (id === 'inkSlash') return inkSlashPose(base, phase, progress);
  const d = INK_DRAWING[id];
  if (!d) return null;
  const raised: Pose = { ...base, lean: deg(-4), head: deg(-4), armFront: limb(112, 44), armBack: limb(60, 70) };
  if (phase === 'windup') return blendPose(base, raised, ease(Math.min(1, progress * 1.4)));
  // Drawing: the arm swings through its strokes (a sine for the sweep, a cosine for the elbow), the body leans with it.
  const t = Math.min(1, progress / 0.88);
  const w = Math.sin(t * Math.PI * 2 * d.cycles);
  const c = Math.cos(t * Math.PI * 2 * d.cycles);
  const drawing: Pose = {
    ...raised,
    lean: deg(-4 - d.lean * 0.5 + d.lean * 0.5 * w),
    head: deg(-2 + 4 * c),
    armFront: limb(100 + d.amp * w * 0.6, 40 + 22 * c),
    armBack: limb(54 + d.amp * 0.5 * c * 0.6, 66 - 14 * w),
  };
  if (progress < 0.88) return drawing;
  return blendPose(drawing, base, ease((progress - 0.88) / 0.12));
}

export function abilityPose(
  base: Pose,
  abilityId: string,
  phase: 'windup' | 'recovery',
  progress: number,
  airborne: boolean,
  driving = false,
  grab?: GrabPhase,
): Pose {
  const ink = inkDrawingPose(base, abilityId, phase, progress);
  if (ink) return ink;
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
    const first = blendPose(hoist, slam, ease(grab.sinceS / SLAM_DROP_S));
    if (shape.followUp && shape.followAtS !== undefined && grab.sinceS >= shape.followAtS - FOLLOW_SNAP_S) {
      // The other hand's punch follows straight on from the uppercut.
      const follow = { ...base, ...shape.followUp };
      return out(blendPose(slam, follow, ease((grab.sinceS - (shape.followAtS - FOLLOW_SNAP_S)) / FOLLOW_SNAP_S)));
    }
    return out(first);
  }
  return progress < 0.12 ? blendPose(windup, hoist, ease(progress / 0.12)) : hoist;
}


/** Spin Cycle's state for its animation (AbilityWorld.spinOf). */
export interface SpinPoseState {
  readonly variant: 'object' | 'opponent';
  readonly phase: 'clap' | 'grab' | 'spin';
  readonly elapsedS: number;
  readonly clapS: number;
  readonly grabS: number;
  readonly progress: number;
  readonly turns: number;
}

const SPIN_OPEN: Partial<Pose> = {
  lean: deg(8),
  head: deg(-8),
  armFront: limb(140, 14),
  armBack: limb(-130, 16),
  armFront2: limb(30, 40),
  armBack2: limb(20, 44),
  legFront: limb(34, -50),
  legBack: limb(-28, -40),
};
const SPIN_CLAP: Partial<Pose> = {
  lean: deg(-22),
  head: deg(12),
  armFront: limb(100, 70),
  armBack: limb(96, 74),
  armFront2: limb(34, 44),
  armBack2: limb(22, 50),
  legFront: limb(40, -56),
  legBack: limb(-28, -42),
};
/** The lower hands take hold of a leg: bent low over the body. */
const SPIN_LEG: Partial<Pose> = {
  lean: deg(-30),
  head: deg(16),
  armFront: limb(70, 90),
  armBack: limb(64, 96),
  armFront2: limb(54, 8),
  armBack2: limb(44, 12),
  legFront: limb(46, -80),
  legBack: limb(-28, -60),
};
/** Mid-swing: all four arms out level at arm's length, the body leaning back against the weight. */
const SPIN_SWING: Partial<Pose> = {
  lean: deg(14),
  head: deg(-8),
  armFront: limb(98, 8),
  armBack: limb(94, 10),
  armFront2: limb(90, 6),
  armBack2: limb(86, 8),
  legFront: limb(36, -48),
  legBack: limb(-34, -42),
};

/**
 * Spin Cycle's keyed animation (owner, 26/11/2026). Opponent form: the upper arms open wide and clap shut on the head, the lower arms
 * drop to a leg, then all four arms go out level and the body leans back as he turns, the lean pulsing with each turn. Object form:
 * straight from the carry into the swing. Each step blends from the one before, so nothing snaps.
 */
export function spinPose(base: Pose, st: SpinPoseState): Pose {
  const at = (p: Partial<Pose>): Pose => ({ ...base, ...p });
  const swing = (): Pose => {
    const w = Math.sin(st.progress * st.turns * Math.PI * 2 * 2);
    const s = at(SPIN_SWING);
    return { ...s, lean: s.lean + deg(4) * w, head: s.head - deg(3) * w };
  };
  if (st.variant === 'object') return blendPose(base, swing(), ease(Math.min(1, st.elapsedS / 0.2)));
  const e = st.elapsedS;
  const c = st.clapS;
  if (st.phase === 'clap') {
    if (e < 0.2 * c) return blendPose(at(SPIN_CLAP), at(SPIN_OPEN), ease(e / (0.2 * c)));
    if (e < 0.5 * c) return blendPose(at(SPIN_OPEN), at(SPIN_CLAP), ease((e - 0.2 * c) / (0.3 * c)));
    return at(SPIN_CLAP);
  }
  if (st.phase === 'grab') return blendPose(at(SPIN_CLAP), at(SPIN_LEG), ease((e - c) / st.grabS));
  const into = Math.min(1, (e - c - st.grabS) / 0.15);
  return blendPose(at(SPIN_LEG), swing(), ease(into));
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

/**
 * Rending Flurry (owner, 20/11/2026): three slashes that flow into one another. Two quick cuts across him (the first
 * a flat sweep from behind, the second a diagonal chop back), then a harder upward slash that starts low by the hip
 * and ends high above the shoulder. Arm angles are degrees from hanging straight down, forward is positive.
 * `chain`: each slash starts where the last one ended, not back at its own wind-up, so the three read as one motion.
 */
const FLURRY: readonly { cock: Partial<Pose>; strike: Partial<Pose> }[] = [
  {
    cock: { lean: deg(-34), armFront: limb(-35, 70), armBack: limb(40, 60), legFront: limb(30, -40) },
    strike: { lean: deg(-48), head: deg(-4), armFront: limb(98, 6), armBack: limb(-45, 40), legFront: limb(50, -50) },
  },
  {
    cock: { lean: deg(-44), armFront: limb(125, 40), armBack: limb(-40, 50) },
    strike: { lean: deg(-30), head: deg(4), armFront: limb(48, 8), armBack: limb(60, 30), legBack: limb(-40, -20) },
  },
  {
    cock: { lean: deg(-52), head: deg(-6), armFront: limb(8, 25), armBack: limb(30, 50), ...CROUCH },
    strike: { lean: deg(-18), head: deg(8), armFront: limb(172, 6), armBack: limb(-50, 40), legFront: limb(34, -30) },
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
export function assaultPose(base: Pose, a: AssaultState, abilityId?: string): Pose {
  if (a.phase === 'retreat') return blendPose(base, { ...base, ...RETREAT }, ease(a.t / 0.08));
  if (a.phase !== 'stab') return base;
  if (abilityId === 'rendingFlurry') return flurryPose(base, a);
  if (abilityId === 'bladeTempest') return swordCut(base, a, 0);
  const s = STABS[a.stab % STABS.length]!;
  const cock = { ...base, ...s.cock };
  const strike = { ...base, ...s.strike };
  // Snap in within the first 35% of the interval, hold the strike, then pull back toward the next cock.
  if (a.t < 0.35) return blendPose(cock, strike, ease(a.t / 0.35));
  if (a.t < 0.75) return strike;
  return blendPose(strike, cock, ease((a.t - 0.75) / 0.25) * 0.6);
}

/**
 * Kenshiro's cuts: horizontal, reverse diagonal, a low rising cut, an overhead cut, a spinning cut and a downward diagonal cut:
 * all slices, never a poke. Blade Tempest runs through all six, so no two cuts in a row look alike.
 */
const SWORD_CUTS: readonly { cock: Partial<Pose>; strike: Partial<Pose> }[] = [
  {
    cock: { lean: deg(-18), armFront: limb(-30, 70), armBack: limb(40, 100), legFront: limb(30, -34) },
    strike: { lean: deg(-34), head: deg(8), armFront: limb(98, 4), armBack: limb(20, 120), legFront: limb(48, -40) },
  },
  {
    cock: { lean: deg(-24), armFront: limb(135, 40), armBack: limb(30, 110) },
    strike: { lean: deg(-12), head: deg(2), armFront: limb(30, 6), armBack: limb(60, 100), legBack: limb(-38, -16) },
  },
  {
    cock: { lean: deg(-30), armFront: limb(0, 40), armBack: limb(30, 90), ...CROUCH },
    strike: { lean: deg(-16), head: deg(8), armFront: limb(150, 6), armBack: limb(-30, 60), legFront: limb(34, -30) },
  },
  {
    cock: { lean: deg(8), armFront: limb(176, 14), armBack: limb(170, 18) },
    strike: { lean: deg(-44), head: deg(20), armFront: limb(64, 4), armBack: limb(54, 8), legFront: limb(58, -52) },
  },
  {
    cock: { lean: deg(-36), head: deg(26), armFront: limb(-60, 50), armBack: limb(60, 90) },
    strike: { lean: deg(20), head: deg(-14), armFront: limb(110, 6), armBack: limb(-40, 40), legBack: limb(40, -20) },
  },
  {
    cock: { lean: deg(10), armFront: limb(150, 60) },
    strike: { lean: deg(-46), head: deg(18), armFront: limb(60, 4), legFront: limb(62, -46), legBack: limb(-46, -12) },
  },
];

/** One sword cut: snap in during the first part of the interval, hold, ease toward the next cock. */
function swordCut(base: Pose, a: AssaultState, offset: number): Pose {
  const c = SWORD_CUTS[(a.stab + offset) % SWORD_CUTS.length]!;
  const cock = { ...base, ...c.cock };
  const strike = { ...base, ...c.strike };
  if (a.t < 0.45) return blendPose(cock, strike, ease(a.t / 0.45));
  return strike;
}

/**
 * Final Judgement's body: the rush (flat out, blade forward), the cuts (each a different line, too fast to follow),
 * then the calm of the return: both hands back on the hilt as if nothing had happened, the blow still to land.
 */
export function judgementPose(
  base: Pose,
  j: { readonly phase: 'rush' | 'cut' | 'wait'; readonly cuts: number; readonly t: number },
): Pose {
  if (j.phase === 'rush')
    return {
      ...base,
      lean: deg(-58),
      head: deg(16),
      armFront: limb(96, 2),
      armBack: limb(-30, 50),
      legFront: limb(60, -40),
      legBack: limb(-50, -14),
    };
  if (j.phase === 'cut') {
    const c = SWORD_CUTS[j.cuts % SWORD_CUTS.length]!;
    return { ...base, ...c.strike };
  }
  return { ...base, lean: deg(2), head: deg(2), armFront: limb(14, 70), armBack: limb(8, 80), legFront: limb(24, -26) };
}

/**
 * Sky Dive's flight, `u` 0..1: the climb (arms swept up and back, legs trailing, body laid out), the bend over the top
 * (curled, wings beating), and the dive (head first, arms pinned back, legs together). Blended through the curve.
 */
export function swoopPose(base: Pose, u: number): Pose {
  const climb: Pose = {
    ...base,
    lean: deg(18),
    head: deg(-16),
    armFront: limb(150, 12),
    armBack: limb(140, 12),
    legFront: limb(-20, -20),
    legBack: limb(-30, -14),
  };
  const top: Pose = {
    ...base,
    lean: deg(-8),
    head: deg(4),
    armFront: limb(100, 20),
    armBack: limb(-100, 20),
    legFront: limb(10, -40),
    legBack: limb(-10, -50),
  };
  const dive: Pose = {
    ...base,
    lean: deg(-70),
    head: deg(22),
    armFront: limb(-30, 4),
    armBack: limb(-40, 4),
    legFront: limb(-20, -6),
    legBack: limb(-26, -6),
  };
  if (u < 0.28) return blendPose(climb, top, ease(u / 0.28));
  if (u < 0.5) return blendPose(top, dive, ease((u - 0.28) / 0.22));
  return dive;
}

/** One slash of the Flurry: snap through in the first 55% of its time, follow through, and flow into the next. */
function flurryPose(base: Pose, a: AssaultState): Pose {
  const i = Math.min(a.stab, FLURRY.length - 1);
  const s = FLURRY[i]!;
  const strike = { ...base, ...s.strike };
  // Slashes after the first begin where the one before ended, bent half-way to their own wind-up.
  const prev = i > 0 ? { ...base, ...FLURRY[i - 1]!.strike } : null;
  const cock = { ...base, ...s.cock };
  const start = prev ? blendPose(prev, cock, 0.6) : cock;
  if (a.t < 0.55) return blendPose(start, strike, ease(a.t / 0.55));
  return strike;
}

/**
 * The stalking crouch (Death Mark): low and forward, knife held low and ready, eyes on the prey. Blended in over the
 * walk or idle, so he can creep but never stand tall.
 */
export function stalkPose(base: Pose, amount: number): Pose {
  const crouch: Pose = {
    ...base,
    lean: deg(-52),
    head: deg(-6),
    armFront: limb(48, 60),
    armBack: limb(-30, 55),
    ...CROUCH,
  };
  return blendPose(base, crouch, Math.min(1, Math.max(0, amount)));
}

/** Abilities with an animation (tests check every kit ability has one). */
export function hasAbilityPose(abilityId: string): boolean {
  if (INK_DRAWING[abilityId] || abilityId === 'inkSlash') return true;
  return abilityId in SHAPES;
}
