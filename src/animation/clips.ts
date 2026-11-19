import { blendPose, type Limb, type Pose } from './skeleton';

/**
 * CLIP LIBRARY: the animation assets of this 2D engine (TD-022, TD-039).
 * Animation Profiles map gameplay states to these clip ids; adding a clip
 * here makes it assignable from data. Two kinds:
 *  - `strike` clips: keyframed shapes (anticipation chamber → snap to the
 *    strike → ease back), played over the move's own timing data, layered on
 *    the current stance so footwork keeps going;
 *  - `procedural` clips: code-driven motions (stances, gait, jumps, guard,
 *    reactions, falls), chosen by id.
 * Facing right: armFront/legFront = lead side.
 */
const deg = (d: number): number => (d * Math.PI) / 180;
const limb = (root: number, bend: number): Limb => ({ root: deg(root), bend: deg(bend) });
const ease = (x: number): number => {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
};

export interface StrikeClip {
  readonly kind: 'strike';
  readonly chamber: Partial<Pose>;
  readonly strike: Partial<Pose>;
  /**
   * An optional first keyframe before the chamber (Vexoris's jar smash: the rear hand reaches behind into the coat
   * pocket, then comes up into the cocked swing). The first part of the wind-up goes base -> prelude, the rest
   * prelude -> chamber.
   */
  readonly prelude?: Partial<Pose>;
}

/** Built-in code-driven motions (the animator and reaction code implement them). */
export const PROCEDURAL_CLIPS = [
  'proc.idle.boxer',
  'proc.idle.taekwondo',
  'proc.idle.mage',
  'proc.idle.heavyweight',
  'proc.idle.stalker',
  'proc.idle.samurai',
  'proc.idle.karate',
  'proc.idle.aerial',
  'proc.idle.pyro',
  'proc.idle.psychic',
  'proc.idle.mechanic',
  'proc.walk',
  'proc.run',
  'proc.air.rise',
  'proc.air.fall',
  'proc.land',
  'proc.block',
  'proc.flinch',
  'proc.knockdown',
  'proc.getup',
  'proc.safe',
  // Dodges (owner, 11/11/2026): a quick dash by default (it replaced the roll, which stays
  // available to profiles); Inferno turns into a streaking flame.
  'proc.dodge.quick',
  'proc.dodge.roll',
  'proc.dodge.flame',
  // Shroud (owner, 12/11/2026): a low, skittering backward slide that trails dark smoke.
  'proc.dodge.shade',
] as const;
export type ProceduralClipId = (typeof PROCEDURAL_CLIPS)[number];

export interface ProceduralClip {
  readonly kind: 'procedural';
  readonly id: ProceduralClipId;
}

export type Clip = StrikeClip | ProceduralClip;

const strike = (chamber: Partial<Pose>, hit: Partial<Pose>, prelude?: Partial<Pose>): StrikeClip => ({
  kind: 'strike',
  chamber,
  strike: hit,
  ...(prelude ? { prelude } : {}),
});

/** Keyframed strikes. */
const STRIKES = {
  // ---- Boxing (the existing greybox set, unchanged).
  'boxing.jab.straight': strike(
    { lean: deg(-14), armFront: limb(70, 105) },
    { lean: deg(-22), armFront: limb(92, 4), armBack: limb(40, 140) },
  ),
  'boxing.jab.body': strike(
    { lean: deg(-20), armFront: limb(55, 110) },
    { lean: deg(-34), head: deg(24), armFront: limb(72, 6), armBack: limb(50, 135) },
  ),
  'boxing.jab.high': strike(
    { lean: deg(-10), head: deg(10), armFront: limb(85, 120) },
    { lean: deg(-18), head: deg(12), armFront: limb(104, 8), armBack: limb(30, 145) },
  ),
  'boxing.cross': strike(
    { lean: deg(-6), armBack: limb(20, 120), armFront: limb(70, 110) },
    { lean: deg(-28), head: deg(18), armBack: limb(94, 4), armFront: limb(40, 125) },
  ),
  'boxing.hook.rear': strike(
    { lean: deg(-6), armBack: limb(-15, 95), armFront: limb(60, 120) },
    { lean: deg(-32), armBack: limb(96, 42), armFront: limb(35, 130), head: deg(22) },
  ),
  'boxing.uppercut': strike(
    { lean: deg(4), armBack: limb(5, 120), armFront: limb(65, 120) },
    { lean: deg(-20), head: deg(-8), armBack: limb(128, 78), armFront: limb(45, 125) },
  ),
  'boxing.hook.lead': strike(
    { lean: deg(-4), armFront: limb(30, 110), armBack: limb(60, 130) },
    { lean: deg(-30), head: deg(20), armFront: limb(98, 48), armBack: limb(55, 135) },
  ),
  'boxing.straight.rear': strike(
    { lean: deg(-4), head: deg(8), armBack: limb(-10, 125), armFront: limb(80, 95) },
    { lean: deg(-32), head: deg(22), armBack: limb(98, 0), armFront: limb(30, 120), legBack: limb(-40, -8) },
  ),
  'boxing.overhand': strike(
    { lean: deg(8), head: deg(-4), armBack: limb(160, 70), armFront: limb(70, 110) },
    { lean: deg(-40), head: deg(30), armBack: limb(105, 8), armFront: limb(25, 120), legBack: limb(-35, -10) },
  ),

  // ---- Vexoris (owner, 20/11/2026): sharp, angular karate: tight guard, snapping limbs, no flourishes. The tap string is
  // a knife-hand chop, a spinning backfist, a side kick and a roundhouse; the heavy is the back-pocket jar smash.
  'vexoris.knife-hand': strike(
    { lean: deg(-8), head: deg(6), armFront: limb(112, 124), armBack: limb(52, 120), legFront: limb(30, -34) },
    {
      lean: deg(-26),
      head: deg(10),
      armFront: limb(96, 4),
      armBack: limb(18, 138),
      legFront: limb(40, -36),
      legBack: limb(-28, -10),
    },
  ),
  'vexoris.backfist': strike(
    {
      lean: deg(-34),
      head: deg(28),
      armFront: limb(-64, 96),
      armBack: limb(34, 118),
      legFront: limb(28, -44),
      legBack: limb(-30, -30),
    },
    {
      lean: deg(22),
      head: deg(-16),
      armFront: limb(102, 6),
      armBack: limb(-54, 44),
      legFront: limb(46, -50),
      legBack: limb(-34, -18),
    },
  ),
  'vexoris.side-kick': strike(
    { lean: deg(22), head: deg(-4), legFront: limb(96, -138), armFront: limb(60, 104), armBack: limb(-6, 70) },
    { lean: deg(42), head: deg(-20), legFront: limb(100, -2), armFront: limb(-4, 56), armBack: limb(-64, 40) },
  ),
  'vexoris.roundhouse': strike(
    { lean: deg(12), legFront: limb(78, -138), armFront: limb(74, 100), armBack: limb(24, 112) },
    { lean: deg(34), head: deg(-16), legFront: limb(116, -8), armFront: limb(-14, 66), armBack: limb(-66, 38) },
  ),
  // Heavy: the rear hand reaches behind into the coat pocket, comes up with the jar cocked high behind the head
  // (the lead arm braces forward for balance), then swings the jar down and across in one wide arc.
  'vexoris.jar-smash': strike(
    {
      lean: deg(14),
      head: deg(-6),
      armBack: limb(168, 62),
      armFront: limb(76, 44),
      legFront: limb(34, -30),
      legBack: limb(-22, -22),
    },
    {
      lean: deg(-44),
      head: deg(22),
      armBack: limb(104, 8),
      armFront: limb(-22, 64),
      legFront: limb(58, -64),
      legBack: limb(-44, -18),
    },
    { lean: deg(-6), head: deg(4), armBack: limb(-78, 22), armFront: limb(60, 56), legFront: limb(30, -26) },
  ),

  // ---- Aerion's combo (spec section 4): light, sweeping, a lot of arm and wing. Each pose shows the wings' work.
  // 1. Wing-assisted palm strike: the rear shoulder drives through, an open palm thrust forward.
  'aerion.palm': strike(
    { lean: deg(6), head: deg(-2), armFront: limb(60, 130), armBack: limb(120, 50), legFront: limb(26, -28) },
    {
      lean: deg(-22),
      head: deg(8),
      armFront: limb(92, 4),
      armBack: limb(-30, 40),
      legFront: limb(42, -34),
      legBack: limb(-30, -8),
    },
  ),
  // 2. Spinning kick: a full turn of the body whipping the rear leg round.
  'aerion.spin-kick': strike(
    {
      lean: deg(-30),
      head: deg(22),
      armFront: limb(-40, 90),
      armBack: limb(80, 70),
      legFront: limb(20, -50),
      legBack: limb(-34, -50),
    },
    {
      lean: deg(24),
      head: deg(-16),
      armFront: limb(120, 50),
      armBack: limb(-60, 30),
      legFront: limb(36, -20),
      legBack: limb(100, -8),
    },
  ),
  // 3. Horizontal wing slash: the arm flung out level, the whole wing cutting through the air in one flat arc.
  'aerion.wing-slash': strike(
    { lean: deg(-24), head: deg(14), armFront: limb(-80, 40), armBack: limb(40, 100), legFront: limb(30, -40) },
    {
      lean: deg(18),
      head: deg(-12),
      armFront: limb(100, 4),
      armBack: limb(20, 110),
      legFront: limb(46, -34),
      legBack: limb(-34, -10),
    },
  ),
  // 4. Upward launching strike: crouching low, then driving the fist up and the body off the ground.
  'aerion.rising-strike': strike(
    {
      lean: deg(-18),
      head: deg(16),
      armFront: limb(30, 120),
      armBack: limb(60, 120),
      legFront: limb(56, -96),
      legBack: limb(-18, -74),
    },
    {
      lean: deg(14),
      head: deg(-22),
      armFront: limb(168, 8),
      armBack: limb(-40, 50),
      legFront: limb(14, -12),
      legBack: limb(-14, -8),
    },
  ),
  // Heavy: both arms spread wide (the wings with them) and brought down together in one great downward smash.
  'aerion.wing-smash': strike(
    {
      lean: deg(10),
      head: deg(-8),
      armFront: limb(170, 20),
      armBack: limb(160, 26),
      legFront: limb(30, -30),
      legBack: limb(-24, -22),
    },
    {
      lean: deg(-40),
      head: deg(22),
      armFront: limb(40, 8),
      armBack: limb(30, 12),
      legFront: limb(56, -60),
      legBack: limb(-40, -18),
    },
    { lean: deg(-4), head: deg(-4), armFront: limb(120, 40), armBack: limb(120, 40), legFront: limb(26, -22) },
  ),

  // ---- Kenshiro's sword clips (owner 21/11/2026): one katana held in both hands, only the lead arm is posed (the view puts
  // the rear hand on the hilt). Each cut is its own motion; none is shared with another fighter.
  // 1. Horizontal slash: from the right hip, a flat cut level across the body.
  'kenshiro.slash-1': strike(
    { lean: deg(8), head: deg(0), armFront: limb(-40, 60), legFront: limb(26, -30), legBack: limb(-22, -20) },
    { lean: deg(-30), head: deg(8), armFront: limb(100, 4), legFront: limb(46, -40), legBack: limb(-34, -10) },
  ),
  // 2. Second horizontal slash: straight back the other way, a backhand cut swept past the hip.
  'kenshiro.slash-2': strike(
    { lean: deg(-24), head: deg(6), armFront: limb(96, 6), legFront: limb(46, -40), legBack: limb(-34, -10) },
    { lean: deg(14), head: deg(-4), armFront: limb(-46, 14), legFront: limb(30, -34), legBack: limb(-40, -22) },
  ),
  // 3. Rising diagonal slash: from low by the hip, up and across to above the head, the body lifting with it.
  'kenshiro.rising': strike(
    { lean: deg(-32), head: deg(10), armFront: limb(-10, 40), legFront: limb(52, -90), legBack: limb(-20, -70) },
    { lean: deg(-6), head: deg(-4), armFront: limb(166, 6), legFront: limb(26, -22), legBack: limb(-18, -14) },
  ),
  // Heavy: a slow, deliberate overhead slice from a high stance, the blade drawn back behind the head, held, then dropped through the target in a deep step.
  'kenshiro.overhead': strike(
    { lean: deg(18), head: deg(-12), armFront: limb(150, 80), legFront: limb(24, -26), legBack: limb(-20, -18) },
    { lean: deg(-44), head: deg(20), armFront: limb(76, 4), legFront: limb(58, -56), legBack: limb(-44, -16) },
    { lean: deg(8), head: deg(-6), armFront: limb(168, 30), legFront: limb(26, -24) },
  ),
  // Forward tap: a lunging diagonal slash, the sword raised high behind the shoulder then cut down across the body in a deep step.
  'kenshiro.lunge-slash': strike(
    { lean: deg(8), head: deg(-4), armFront: limb(150, 50), legFront: limb(24, -26), legBack: limb(-22, -20) },
    { lean: deg(-48), head: deg(16), armFront: limb(70, 4), legFront: limb(64, -48), legBack: limb(-48, -10) },
  ),
  // In the air: a diagonal cut carried through the jump.
  'kenshiro.air-slash': strike(
    { lean: deg(-10), head: deg(4), armFront: limb(150, 30), legFront: limb(60, -110), legBack: limb(30, -100) },
    { lean: deg(-34), head: deg(14), armFront: limb(76, 4), legFront: limb(50, -90), legBack: limb(10, -80) },
  ),
  // Falling: a downward slash, the sword brought up over the head and cut down across the fall.
  'kenshiro.plunge': strike(
    { lean: deg(-8), head: deg(0), armFront: limb(170, 30), legFront: limb(50, -100), legBack: limb(20, -90) },
    { lean: deg(-30), head: deg(16), armFront: limb(56, 4), legFront: limb(34, -80), legBack: limb(-4, -70) },
  ),

  // ---- Inferno's fire style (spec REQ-ANI-7: no fighter shares a clip): hot, direct, explosive.
  'inferno.jab-1': strike(
    { lean: deg(-4), armFront: limb(60, 120), armBack: limb(40, 130), legFront: limb(24, -26) },
    {
      lean: deg(-26),
      head: deg(6),
      armFront: limb(94, 2),
      armBack: limb(30, 130),
      legFront: limb(40, -32),
      legBack: limb(-26, -10),
    },
  ),
  'inferno.jab-2': strike(
    { lean: deg(0), armFront: limb(30, 110), armBack: limb(50, 120), legFront: limb(20, -24) },
    {
      lean: deg(-22),
      head: deg(4),
      armFront: limb(104, 10),
      armBack: limb(36, 126),
      legFront: limb(36, -30),
      legBack: limb(-20, -8),
    },
  ),
  'inferno.cross': strike(
    {
      lean: deg(8),
      armFront: limb(40, 120),
      armBack: limb(-20, 100),
      legFront: limb(22, -24),
      legBack: limb(-26, -26),
    },
    {
      lean: deg(-34),
      head: deg(10),
      armFront: limb(54, 124),
      armBack: limb(96, 2),
      legFront: limb(36, -26),
      legBack: limb(-34, -6),
    },
  ),
  'inferno.hook-1': strike(
    { lean: deg(-18), armFront: limb(30, 90), armBack: limb(70, 100), legFront: limb(30, -30) },
    {
      lean: deg(16),
      head: deg(-6),
      armFront: limb(100, 60),
      armBack: limb(44, 120),
      legFront: limb(36, -30),
      legBack: limb(-30, -18),
    },
  ),
  'inferno.hook-2': strike(
    { lean: deg(-22), armFront: limb(-10, 80), armBack: limb(60, 100), legFront: limb(28, -28) },
    {
      lean: deg(20),
      head: deg(-8),
      armFront: limb(110, 50),
      armBack: limb(40, 120),
      legFront: limb(40, -32),
      legBack: limb(-36, -16),
    },
  ),
  'inferno.front-kick': strike(
    { lean: deg(6), legFront: limb(70, -120), armFront: limb(80, 100), armBack: limb(30, 120) },
    { lean: deg(-18), legFront: limb(96, -4), legBack: limb(-8, -10), armFront: limb(60, 110), armBack: limb(20, 130) },
  ),
  'inferno.side-kick': strike(
    { lean: deg(-8), legFront: limb(80, -118), armFront: limb(90, 100), armBack: limb(20, 120) },
    {
      lean: deg(-26),
      legFront: limb(92, -2),
      legBack: limb(-14, -16),
      armFront: limb(100, 90),
      armBack: limb(-10, 120),
    },
  ),
  'inferno.spin-kick': strike(
    {
      lean: deg(-32),
      head: deg(20),
      legFront: limb(26, -50),
      legBack: limb(-30, -60),
      armFront: limb(-30, 90),
      armBack: limb(60, 90),
    },
    {
      lean: deg(22),
      head: deg(-14),
      legFront: limb(30, -20),
      legBack: limb(104, -6),
      armFront: limb(110, 40),
      armBack: limb(-60, 40),
    },
  ),
  'inferno.jump-kick': strike(
    {
      lean: deg(-6),
      legFront: limb(76, -120),
      legBack: limb(40, -110),
      armFront: limb(80, 100),
      armBack: limb(40, 120),
    },
    {
      lean: deg(-22),
      legFront: limb(98, -6),
      legBack: limb(34, -100),
      armFront: limb(60, 110),
      armBack: limb(20, 130),
    },
  ),

  // ---- Vexoris's karate: grounded, short, hard.
  'vexoris.front-kick': strike(
    { lean: deg(-4), legFront: limb(60, -110), armFront: limb(84, 40), armBack: limb(-2, 130) },
    { lean: deg(-14), legFront: limb(88, -2), legBack: limb(-10, -8), armFront: limb(70, 40), armBack: limb(0, 130) },
  ),
  'vexoris.jump-kick': strike(
    { lean: deg(-4), legFront: limb(70, -116), legBack: limb(34, -104), armFront: limb(90, 50), armBack: limb(0, 120) },
    { lean: deg(-18), legFront: limb(94, -2), legBack: limb(30, -96), armFront: limb(80, 50), armBack: limb(4, 124) },
  ),
  'vexoris.stomp': strike(
    { lean: deg(-6), legFront: limb(50, -118), legBack: limb(24, -100), armFront: limb(70, 60), armBack: limb(0, 120) },
    { lean: deg(-20), legFront: limb(70, -6), legBack: limb(10, -80), armFront: limb(60, 70), armBack: limb(0, 124) },
  ),

  // ---- Aerion's air style: light, sweeping, with the wings.
  'aerion.front-kick': strike(
    { lean: deg(4), legFront: limb(64, -112), armFront: limb(120, 40), armBack: limb(-50, 40) },
    {
      lean: deg(-16),
      legFront: limb(92, -4),
      legBack: limb(-14, -14),
      armFront: limb(140, 30),
      armBack: limb(-70, 30),
    },
  ),
  'aerion.jump-kick': strike(
    {
      lean: deg(8),
      legFront: limb(72, -118),
      legBack: limb(40, -108),
      armFront: limb(130, 40),
      armBack: limb(-60, 40),
    },
    { lean: deg(-12), legFront: limb(98, -6), legBack: limb(20, -90), armFront: limb(150, 30), armBack: limb(-80, 30) },
  ),
  'aerion.dive-kick': strike(
    { lean: deg(0), legFront: limb(50, -100), legBack: limb(26, -90), armFront: limb(150, 30), armBack: limb(-60, 30) },
    {
      lean: deg(-44),
      legFront: limb(30, -10),
      legBack: limb(14, -12),
      armFront: limb(-30, 20),
      armBack: limb(-40, 20),
    },
  ),

  // ---- Psion's psychic style: spare, slow-burning movements, the hands glowing, the body floating through them.
  // 1. Psychic palm strike: one open palm pushed out.
  'psion.palm': strike(
    { lean: deg(4), head: deg(6), armFront: limb(50, 90), armBack: limb(-20, 70), legFront: limb(14, -20) },
    {
      lean: deg(-18),
      head: deg(10),
      armFront: limb(96, 4),
      armBack: limb(-30, 60),
      legFront: limb(26, -26),
      legBack: limb(-18, -20),
    },
  ),
  // 2. Telekinetic elbow: the elbow driven forward and the hand turning over.
  'psion.elbow': strike(
    { lean: deg(8), head: deg(4), armFront: limb(-20, 130), armBack: limb(30, 100), legFront: limb(16, -22) },
    {
      lean: deg(-22),
      head: deg(12),
      armFront: limb(86, 118),
      armBack: limb(-20, 80),
      legFront: limb(30, -30),
      legBack: limb(-24, -24),
    },
  ),
  // 3. Floating spin kick: he turns in the air, the rear leg swept round with nothing under him.
  'psion.spin-kick': strike(
    {
      lean: deg(-24),
      head: deg(16),
      armFront: limb(60, 60),
      armBack: limb(-40, 70),
      legFront: limb(16, -50),
      legBack: limb(-30, -70),
    },
    {
      lean: deg(18),
      head: deg(-12),
      armFront: limb(110, 40),
      armBack: limb(-70, 30),
      legFront: limb(20, -24),
      legBack: limb(96, -8),
    },
  ),
  // 4. Double palm energy blast: both palms drawn to the hip then thrust out together.
  'psion.double-palm': strike(
    {
      lean: deg(12),
      head: deg(4),
      armFront: limb(-10, 100),
      armBack: limb(-10, 100),
      legFront: limb(16, -26),
      legBack: limb(-22, -22),
    },
    {
      lean: deg(-34),
      head: deg(14),
      armFront: limb(94, 2),
      armBack: limb(88, 4),
      legFront: limb(34, -32),
      legBack: limb(-30, -14),
    },
  ),
  // Heavy: the hands gathered high and together, the energy built, then both arms swept out and down in a wide wave.
  'psion.force-wave': strike(
    {
      lean: deg(6),
      head: deg(-6),
      armFront: limb(150, 90),
      armBack: limb(146, 92),
      legFront: limb(14, -24),
      legBack: limb(-18, -22),
    },
    {
      lean: deg(-30),
      head: deg(10),
      armFront: limb(84, 4),
      armBack: limb(70, 8),
      legFront: limb(30, -30),
      legBack: limb(-30, -16),
    },
    { lean: deg(-4), head: deg(-2), armFront: limb(120, 70), armBack: limb(116, 72), legFront: limb(16, -22) },
  ),
  // Forward tap: a flat push, the palm striking the air in front of him.
  'psion.push': strike(
    { lean: deg(0), head: deg(4), armFront: limb(60, 100), armBack: limb(-10, 90), legFront: limb(14, -22) },
    {
      lean: deg(-26),
      head: deg(10),
      armFront: limb(100, 6),
      armBack: limb(-20, 70),
      legFront: limb(30, -28),
      legBack: limb(-26, -18),
    },
  ),
  // In the air: a downward-angled palm thrust.
  'psion.air-palm': strike(
    {
      lean: deg(-6),
      head: deg(6),
      armFront: limb(90, 80),
      armBack: limb(-30, 70),
      legFront: limb(30, -60),
      legBack: limb(10, -50),
    },
    {
      lean: deg(-22),
      head: deg(12),
      armFront: limb(60, 4),
      armBack: limb(-40, 60),
      legFront: limb(36, -50),
      legBack: limb(0, -40),
    },
  ),
  // Falling: both palms pressed down, driving the air beneath him.
  'psion.down-slam': strike(
    {
      lean: deg(-4),
      head: deg(6),
      armFront: limb(130, 60),
      armBack: limb(120, 60),
      legFront: limb(20, -50),
      legBack: limb(0, -44),
    },
    {
      lean: deg(-20),
      head: deg(14),
      armFront: limb(20, 4),
      armBack: limb(10, 6),
      legFront: limb(30, -44),
      legBack: limb(-6, -40),
    },
  ),

  // ---- Geargrind's engineer style: short, heavy, piston-driven blows from a braced stance, the machine arm leading.
  // 1. Mechanical jab: the machine arm punched straight out like a piston.
  'gear.jab': strike(
    {
      lean: deg(-2),
      head: deg(-2),
      armFront: limb(70, 100),
      armBack: limb(10, 100),
      legFront: limb(18, -26),
      legBack: limb(-22, -24),
    },
    {
      lean: deg(-14),
      head: deg(-4),
      armFront: limb(88, 2),
      armBack: limb(0, 100),
      legFront: limb(28, -30),
      legBack: limb(-24, -22),
    },
  ),
  // 2. Reinforced cross: the rear arm drives across with the hips turned into it.
  'gear.cross': strike(
    {
      lean: deg(6),
      head: deg(-4),
      armFront: limb(60, 110),
      armBack: limb(-30, 120),
      legFront: limb(20, -28),
      legBack: limb(-24, -26),
    },
    {
      lean: deg(-24),
      head: deg(-6),
      armFront: limb(30, 90),
      armBack: limb(92, 4),
      legFront: limb(30, -30),
      legBack: limb(-14, -30),
    },
  ),
  // 3. Rotating elbow: the whole upper body winds round and the elbow comes through flat, with the forearm locked.
  'gear.elbow': strike(
    {
      lean: deg(-14),
      head: deg(8),
      armFront: limb(-40, 130),
      armBack: limb(20, 110),
      legFront: limb(22, -30),
      legBack: limb(-26, -28),
    },
    {
      lean: deg(22),
      head: deg(-10),
      armFront: limb(100, 126),
      armBack: limb(-30, 90),
      legFront: limb(30, -34),
      legBack: limb(-20, -30),
    },
  ),
  // 4. Hydraulic uppercut: dropped low, then the machine arm driven up from the hip with the whole body rising.
  'gear.uppercut': strike(
    {
      lean: deg(14),
      head: deg(2),
      armFront: limb(-30, 90),
      armBack: limb(30, 110),
      legFront: limb(26, -50),
      legBack: limb(-28, -44),
    },
    {
      lean: deg(-26),
      head: deg(-14),
      armFront: limb(150, 16),
      armBack: limb(-10, 100),
      legFront: limb(16, -16),
      legBack: limb(-14, -14),
    },
  ),
  // Heavy: the arm compresses back and in, shuddering, then the hydraulic fist smashes down in front of him.
  'gear.smash': strike(
    {
      lean: deg(16),
      head: deg(6),
      armFront: limb(160, 120),
      armBack: limb(40, 110),
      legFront: limb(24, -44),
      legBack: limb(-30, -40),
    },
    {
      lean: deg(-34),
      head: deg(-6),
      armFront: limb(46, 6),
      armBack: limb(10, 96),
      legFront: limb(34, -34),
      legBack: limb(-28, -22),
    },
    { lean: deg(-18), head: deg(-2), armFront: limb(60, 20), armBack: limb(10, 96), legFront: limb(28, -30) },
  ),
  // Forward tap: a piston shove, the machine arm straight out, the shoulder behind it.
  'gear.shove': strike(
    { lean: deg(4), head: deg(-2), armFront: limb(50, 120), armBack: limb(10, 100), legFront: limb(20, -26) },
    {
      lean: deg(-30),
      head: deg(-4),
      armFront: limb(94, 0),
      armBack: limb(0, 96),
      legFront: limb(34, -34),
      legBack: limb(-28, -18),
    },
  ),
  // In the air: a rocket-boosted knee driven up and forward, the arm swung back for balance.
  'gear.rocket-knee': strike(
    {
      lean: deg(4),
      head: deg(2),
      armFront: limb(60, 100),
      armBack: limb(-40, 90),
      legFront: limb(50, -90),
      legBack: limb(-10, -40),
    },
    {
      lean: deg(-12),
      head: deg(-4),
      armFront: limb(40, 80),
      armBack: limb(-50, 80),
      legFront: limb(100, -100),
      legBack: limb(-14, -30),
    },
  ),
  // Falling: both fists clasped overhead and driven down like a drop hammer.
  'gear.drop-hammer': strike(
    {
      lean: deg(-2),
      head: deg(-6),
      armFront: limb(160, 70),
      armBack: limb(156, 74),
      legFront: limb(20, -46),
      legBack: limb(-4, -42),
    },
    {
      lean: deg(-24),
      head: deg(8),
      armFront: limb(30, 6),
      armBack: limb(24, 8),
      legFront: limb(30, -40),
      legBack: limb(-8, -36),
    },
  ),

  // ---- Standard kicks (shared default: a plain, readable version of each).
  'std.front-kick': strike(
    { lean: deg(8), legFront: limb(80, -115), armFront: limb(70, 110), armBack: limb(50, 130) },
    { lean: deg(16), head: deg(-6), legFront: limb(96, -4), armFront: limb(40, 90), armBack: limb(-30, 60) },
  ),
  'std.side-kick': strike(
    { lean: deg(14), legFront: limb(95, -125), armFront: limb(60, 100) },
    { lean: deg(30), head: deg(-14), legFront: limb(98, -2), armFront: limb(10, 60), armBack: limb(-40, 40) },
  ),
  'std.roundhouse': strike(
    { lean: deg(10), legFront: limb(70, -120), armFront: limb(80, 100), armBack: limb(30, 120) },
    { lean: deg(24), head: deg(-10), legFront: limb(104, -18), armFront: limb(20, 70), armBack: limb(-30, 50) },
  ),
  'std.back-kick': strike(
    { lean: deg(-30), head: deg(20), legBack: limb(-20, -110), armFront: limb(70, 110) },
    { lean: deg(-44), head: deg(30), legBack: limb(-95, -4), armFront: limb(60, 100), armBack: limb(20, 90) },
  ),
  'std.axe-kick': strike(
    { lean: deg(18), legFront: limb(150, -10), armFront: limb(40, 80), armBack: limb(-20, 60) },
    { lean: deg(-10), head: deg(18), legFront: limb(60, -4), armFront: limb(70, 110), armBack: limb(40, 120) },
  ),
  'std.spinning-kick': strike(
    { lean: deg(-26), head: deg(24), legBack: limb(-40, -100), armFront: limb(100, 40), armBack: limb(-60, 30) },
    {
      lean: deg(28),
      head: deg(-16),
      legFront: limb(102, -6),
      legBack: limb(10, -60),
      armFront: limb(-30, 40),
      armBack: limb(-80, 30),
    },
  ),
  'std.jump-front-kick': strike(
    { lean: deg(4), legFront: limb(85, -120), legBack: limb(20, -110), armFront: limb(60, 70) },
    {
      lean: deg(12),
      head: deg(-4),
      legFront: limb(92, -4),
      legBack: limb(10, -120),
      armFront: limb(40, 40),
      armBack: limb(-70, 30),
    },
  ),
  'std.jump-knee': strike(
    { lean: deg(-2), legFront: limb(70, -130), legBack: limb(15, -100), armFront: limb(70, 60) },
    {
      lean: deg(-14),
      head: deg(10),
      legFront: limb(105, -125),
      legBack: limb(5, -110),
      armFront: limb(100, 40),
      armBack: limb(80, 50),
    },
  ),
  'std.jump-side-kick': strike(
    { lean: deg(10), legFront: limb(95, -125), legBack: limb(25, -100) },
    {
      lean: deg(28),
      head: deg(-14),
      legFront: limb(98, -2),
      legBack: limb(30, -90),
      armFront: limb(10, 60),
      armBack: limb(-40, 40),
    },
  ),
  'std.jump-roundhouse': strike(
    { lean: deg(6), legFront: limb(60, -125), legBack: limb(20, -110), armFront: limb(70, 60) },
    {
      lean: deg(22),
      head: deg(-8),
      legFront: limb(100, -20),
      legBack: limb(15, -115),
      armFront: limb(10, 50),
      armBack: limb(-50, 40),
    },
  ),
  'std.downward-kick': strike(
    {
      lean: deg(16),
      legFront: limb(140, -30),
      legBack: limb(20, -100),
      armFront: limb(30, 60),
      armBack: limb(-30, 50),
    },
    {
      lean: deg(-12),
      head: deg(16),
      legFront: limb(40, -6),
      legBack: limb(10, -110),
      armFront: limb(80, 70),
      armBack: limb(50, 80),
    },
  ),
  'std.aerial-spin': strike(
    { lean: deg(-20), legBack: limb(-30, -100), legFront: limb(30, -110), armFront: limb(100, 40) },
    {
      lean: deg(26),
      head: deg(-12),
      legFront: limb(100, -10),
      legBack: limb(0, -100),
      armFront: limb(-20, 40),
      armBack: limb(-70, 30),
    },
  ),

  // ---- Taekwondo (crisper chambers, higher knees, more turn of the hips).
  'tkd.front-kick': strike(
    { lean: deg(10), legFront: limb(95, -135), armFront: limb(55, 95), armBack: limb(40, 125) },
    { lean: deg(18), head: deg(-8), legFront: limb(100, -2), armFront: limb(30, 80), armBack: limb(-20, 70) },
  ),
  'tkd.side-kick': strike(
    { lean: deg(20), legFront: limb(105, -135), armFront: limb(50, 90), armBack: limb(-10, 60) },
    { lean: deg(36), head: deg(-18), legFront: limb(100, 0), armFront: limb(0, 50), armBack: limb(-50, 40) },
  ),
  'tkd.roundhouse': strike(
    { lean: deg(14), legFront: limb(85, -135), armFront: limb(70, 90), armBack: limb(20, 110) },
    { lean: deg(30), head: deg(-14), legFront: limb(112, -12), armFront: limb(5, 60), armBack: limb(-40, 45) },
  ),
  'tkd.spinning-hook': strike(
    { lean: deg(-30), head: deg(26), legBack: limb(-50, -110), armFront: limb(110, 40), armBack: limb(-70, 30) },
    {
      lean: deg(32),
      head: deg(-18),
      legFront: limb(115, -30),
      legBack: limb(15, -50),
      armFront: limb(-40, 40),
      armBack: limb(-90, 30),
    },
  ),
  'tkd.jump-front-kick': strike(
    { lean: deg(2), legFront: limb(95, -135), legBack: limb(35, -120), armFront: limb(80, 60), armBack: limb(-20, 50) },
    {
      lean: deg(14),
      head: deg(-6),
      legFront: limb(98, -2),
      legBack: limb(20, -125),
      armFront: limb(30, 40),
      armBack: limb(-80, 30),
    },
  ),

  // ---- Inferno's own (fire, taekwondo-based; more lift and lean for drama).
  'inferno.fire-roundhouse': strike(
    { lean: deg(18), head: deg(-4), legFront: limb(95, -140), armFront: limb(80, 80), armBack: limb(10, 100) },
    { lean: deg(36), head: deg(-18), legFront: limb(118, -8), armFront: limb(-10, 50), armBack: limb(-55, 40) },
  ),
  'inferno.meteor-kick': strike(
    {
      lean: deg(24),
      legFront: limb(160, -20),
      legBack: limb(30, -110),
      armFront: limb(140, 30),
      armBack: limb(120, 40),
    },
    {
      lean: deg(-18),
      head: deg(22),
      legFront: limb(30, -4),
      legBack: limb(10, -115),
      armFront: limb(90, 60),
      armBack: limb(70, 70),
    },
  ),
  'inferno.flame-uppercut': strike(
    { lean: deg(10), head: deg(-6), armBack: limb(-5, 130), armFront: limb(70, 110), legFront: limb(40, -80) },
    { lean: deg(-26), head: deg(-14), armBack: limb(150, 30), armFront: limb(40, 120), legBack: limb(-45, -6) },
  ),

  // ---- Heavy Attacks (owner, 12/11/2026): one per fighter, in its own style.
  // Inferno: the lead leg swung high overhead, then axed down through the target in a blaze.
  'inferno.blazing-axe-kick': strike(
    {
      lean: deg(16),
      legFront: limb(168, -18),
      legBack: limb(-8, -30),
      armFront: limb(120, 60),
      armBack: limb(-30, 50),
    },
    { lean: deg(-22), legFront: limb(48, -6), legBack: limb(-30, -40), armFront: limb(40, 80), armBack: limb(-50, 60) },
  ),
  // Braxon: both fists raised far overhead, the whole body arched back, then hammered down together.
  'rampage.sledgehammer': strike(
    { lean: deg(22), armFront: limb(176, 36), armBack: limb(170, 44), legFront: limb(30, -40) },
    { lean: deg(-56), armFront: limb(46, 6), armBack: limb(38, 12), legFront: limb(72, -118), legBack: limb(-22, -90) },
  ),
  // Necro: the staff swept back over his shoulder, then driven forward in a soul-charged thrust.
  'necro.soul-rend': strike(
    { lean: deg(14), armBack: limb(-60, 110), armFront: limb(150, 40), legFront: limb(26, -24) },
    { lean: deg(-30), armBack: limb(96, 4), armFront: limb(90, 10), legFront: limb(46, -60), legBack: limb(-34, -10) },
  ),
  // Shroud: sinking low with the knife drawn back to the hip, then an upward, gutting stab.
  'shroud.gutting-stab': strike(
    {
      lean: deg(-44),
      armFront: limb(-40, 120),
      armBack: limb(20, 60),
      legFront: limb(60, -100),
      legBack: limb(-20, -80),
    },
    {
      lean: deg(-18),
      armFront: limb(110, 20),
      armBack: limb(-30, 50),
      legFront: limb(40, -50),
      legBack: limb(-40, -20),
    },
  ),

  // ---- Shroud's own (owner, 12/11/2026): a hunched knife fighter. The knife is in his lead hand;
  // every strike starts low and close, the body staying bent over (never upright).
  'shroud.knife-slash': strike(
    { lean: deg(-18), armFront: limb(-10, 120), armBack: limb(20, 60), legFront: limb(30, -40) },
    { lean: deg(-30), armFront: limb(100, 10), armBack: limb(-10, 50), legFront: limb(40, -50) },
  ),
  'shroud.backhand-slash': strike(
    { lean: deg(-28), armFront: limb(130, 120), armBack: limb(30, 70), legFront: limb(36, -46) },
    { lean: deg(-20), armFront: limb(20, 20), armBack: limb(50, 80), legBack: limb(-30, -30) },
  ),
  // The third and fourth cuts of the five-hit string (B15): a low rising cut, then a crossing slash.
  'shroud.rising-cut': strike(
    {
      lean: deg(-34),
      armFront: limb(-30, 60),
      armBack: limb(30, 80),
      legFront: limb(34, -56),
      legBack: limb(-20, -50),
    },
    { lean: deg(-22), armFront: limb(130, 15), armBack: limb(-20, 60), legFront: limb(44, -46) },
  ),
  'shroud.cross-slash': strike(
    { lean: deg(-24), armFront: limb(120, 130), armBack: limb(40, 80), legFront: limb(30, -50) },
    {
      lean: deg(-34),
      armFront: limb(-20, 10),
      armBack: limb(60, 70),
      legFront: limb(50, -50),
      legBack: limb(-36, -24),
    },
  ),
  'shroud.lunging-stab': strike(
    {
      lean: deg(-12),
      armFront: limb(-40, 140),
      armBack: limb(40, 90),
      legFront: limb(30, -70),
      legBack: limb(-10, -60),
    },
    { lean: deg(-44), armFront: limb(92, 2), armBack: limb(-40, 40), legFront: limb(70, -60), legBack: limb(-40, -10) },
  ),
  'shroud.knife-plunge': strike(
    {
      lean: deg(-10),
      armFront: limb(170, 40),
      armBack: limb(120, 50),
      legFront: limb(60, -100),
      legBack: limb(20, -90),
    },
    { lean: deg(-40), armFront: limb(40, 6), armBack: limb(30, 60), legFront: limb(50, -80) },
  ),

  // ---- Necro's own (owner, 12/11/2026): a staff fighter. Both hands on the staff, the lead hand
  // leading the swing; magic in the thrust, the whole body behind the finishing slam.
  // The staff is in his rear (left) hand (owner, 12/11/2026): that arm swings it.
  'necro.staff-sweep': strike(
    { lean: deg(8), head: deg(2), armBack: limb(-20, 90), armFront: limb(20, 60) },
    { lean: deg(-14), head: deg(10), armBack: limb(100, 20), armFront: limb(40, 50) },
  ),
  'necro.soul-thrust': strike(
    { lean: deg(10), head: deg(-4), armBack: limb(30, 130), armFront: limb(60, 40), legFront: limb(28, -26) },
    { lean: deg(-20), head: deg(14), armBack: limb(92, 4), armFront: limb(100, 10), legBack: limb(-28, -10) },
  ),
  'necro.grave-slam': strike(
    { lean: deg(12), head: deg(-12), armBack: limb(172, 20), armFront: limb(150, 30), legFront: limb(26, -30) },
    {
      lean: deg(-36),
      head: deg(28),
      armBack: limb(60, 10),
      armFront: limb(40, 30),
      legFront: limb(48, -80),
      legBack: limb(-25, -50),
    },
  ),
  'necro.staff-plunge': strike(
    {
      lean: deg(-8),
      armBack: limb(160, 30),
      armFront: limb(140, 40),
      legFront: limb(60, -100),
      legBack: limb(20, -90),
    },
    { lean: deg(-30), head: deg(22), armBack: limb(50, 10), armFront: limb(40, 30), legFront: limb(40, -70) },
  ),

  // ---- Rampage's own (a heavyweight brawler: big wind-ups, his whole mass behind every blow).
  'rampage.hammer-jab': strike(
    { lean: deg(8), head: deg(4), armFront: limb(60, 120), armBack: limb(45, 125) },
    { lean: deg(-18), head: deg(14), armFront: limb(92, 12), armBack: limb(40, 120) },
  ),
  'rampage.haymaker': strike(
    { lean: deg(16), head: deg(-4), armBack: limb(-40, 100), armFront: limb(60, 120) },
    { lean: deg(-26), head: deg(18), armBack: limb(100, 25), armFront: limb(30, 110) },
  ),
  'rampage.double-hammer': strike(
    { lean: deg(20), head: deg(-16), armFront: limb(175, 40), armBack: limb(170, 45), legFront: limb(30, -40) },
    {
      lean: deg(-48),
      head: deg(36),
      armFront: limb(70, 20),
      armBack: limb(64, 26),
      legFront: limb(55, -95),
      legBack: limb(-25, -70),
    },
  ),
  'rampage.body-slam': strike(
    {
      lean: deg(-10),
      armFront: limb(150, 50),
      armBack: limb(140, 60),
      legFront: limb(70, -110),
      legBack: limb(30, -100),
    },
    {
      lean: deg(-38),
      head: deg(28),
      armFront: limb(60, 20),
      armBack: limb(50, 30),
      legFront: limb(40, -80),
      legBack: limb(-10, -70),
    },
  ),

  // ---- Safe fallback: a plain push of the lead hand (used only when nothing else resolves).
  'safe.strike': strike({ armFront: limb(70, 100) }, { lean: deg(-12), armFront: limb(88, 20) }),
} as const satisfies Record<string, StrikeClip>;

export type StrikeClipId = keyof typeof STRIKES;

/** Every clip by id. */
export const CLIPS: Readonly<Record<string, Clip>> = {
  ...STRIKES,
  ...Object.fromEntries(PROCEDURAL_CLIPS.map((id) => [id, { kind: 'procedural', id } as ProceduralClip])),
};

export function isClip(id: string): boolean {
  return id in CLIPS;
}

/**
 * Pose for a strike clip at progress 0..1 of a move with these phase lengths,
 * layered on the pose the body would otherwise have (`base`).
 */
export function strikePose(
  base: Pose,
  clip: StrikeClip,
  progress: number,
  timing: { readonly windupS: number; readonly activeS: number; readonly recoveryS: number },
): Pose {
  const total = timing.windupS + timing.activeS + timing.recoveryS;
  const tWind = timing.windupS / total;
  const tActive = timing.activeS / total;
  const chamber = { ...base, ...clip.chamber };
  const hit = { ...base, ...clip.strike };
  if (clip.prelude && progress < tWind) {
    const reach = { ...base, ...clip.prelude };
    const split = tWind * 0.45;
    return progress < split
      ? blendPose(base, reach, ease(progress / split))
      : blendPose(reach, chamber, ease((progress - split) / (tWind - split)));
  }
  if (progress < tWind) return blendPose(base, chamber, ease(progress / tWind));
  if (progress < tWind + tActive) {
    // Full extension in the first 40% of the active window: a snap, then hold.
    return blendPose(chamber, hit, ease(((progress - tWind) / tActive) * 2.5));
  }
  return blendPose(hit, base, ease((progress - tWind - tActive) / (1 - tWind - tActive)));
}
