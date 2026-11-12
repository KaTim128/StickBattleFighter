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
}

/** Built-in code-driven motions (the animator and reaction code implement them). */
export const PROCEDURAL_CLIPS = [
  'proc.idle.boxer',
  'proc.idle.taekwondo',
  'proc.idle.heavyweight',
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
] as const;
export type ProceduralClipId = (typeof PROCEDURAL_CLIPS)[number];

export interface ProceduralClip {
  readonly kind: 'procedural';
  readonly id: ProceduralClipId;
}

export type Clip = StrikeClip | ProceduralClip;

const strike = (chamber: Partial<Pose>, hit: Partial<Pose>): StrikeClip => ({ kind: 'strike', chamber, strike: hit });

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
  if (progress < tWind) return blendPose(base, chamber, ease(progress / tWind));
  if (progress < tWind + tActive) {
    // Full extension in the first 40% of the active window: a snap, then hold.
    return blendPose(chamber, hit, ease(((progress - tWind) / tActive) * 2.5));
  }
  return blendPose(hit, base, ease((progress - tWind - tActive) / (1 - tWind - tActive)));
}
