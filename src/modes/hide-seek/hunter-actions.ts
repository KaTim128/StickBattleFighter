import { blendPose, type Limb, type Pose } from '../../animation/skeleton';
import type { HideKind } from './house-types';

/**
 * The hunter's search animations (Hide and Seek, owner 18/11/2026): he does not just walk up to a hiding
 * place, he opens the cupboard and looks in, kneels to look under the bed, lifts a chest's lid, pulls a
 * curtain aside, parts a bush, listens with his head cocked, drags his knife along a wall and, when he finds
 * someone, strikes. Each is a short keyframed sequence of whole-body poses (lean, arms, a deep crouch with a
 * knee down) eased into and out of a neutral stance, so every transition is smooth. Pure: a pose from a progress.
 */
export type HunterActionKind =
  | 'open-door'
  | 'look-under'
  | 'peer-behind'
  | 'pull-curtain'
  | 'lift-lid'
  | 'part-bush'
  | 'glance'
  | 'listen'
  | 'knife-scrape'
  | 'strike';

/** How long each takes, seconds. */
export const ACTION_DURATION_S: Readonly<Record<HunterActionKind, number>> = {
  'open-door': 2.2,
  'look-under': 2.8,
  'peer-behind': 1.7,
  'pull-curtain': 1.5,
  'lift-lid': 2.0,
  'part-bush': 1.5,
  glance: 0.7,
  listen: 1.5,
  'knife-scrape': 1.3,
  strike: 0.7,
};

/** The thorough way to check each kind of hiding place. */
const THOROUGH: Readonly<Record<HideKind, HunterActionKind>> = {
  'under-bed': 'look-under',
  'under-table': 'look-under',
  wardrobe: 'open-door',
  cupboard: 'open-door',
  'shed-cabinet': 'open-door',
  chest: 'lift-lid',
  box: 'lift-lid',
  'behind-sofa': 'peer-behind',
  curtain: 'pull-curtain',
  'shower-curtain': 'pull-curtain',
  bush: 'part-bush',
};

/** What he does at a hiding place: the thorough check, or (when he is not suspicious) a quick glance. */
export function actionFor(kind: HideKind, thorough: boolean): HunterActionKind {
  return thorough ? THOROUGH[kind] : 'glance';
}

const deg = (d: number): number => (d * Math.PI) / 180;
const limb = (root: number, bend: number): Limb => ({ root: deg(root), bend: deg(bend) });

/** Standing relaxed, knife hand a little forward: where every action starts and ends. */
export const NEUTRAL: Pose = {
  lean: deg(-6),
  head: 0,
  armFront: limb(14, 40),
  armBack: limb(-6, 14),
  legFront: limb(5, -8),
  legBack: limb(-5, -6),
};

interface Key {
  /** Progress 0..1. */
  readonly at: number;
  readonly pose: Pose;
}

/** Smooth interpolation through keyframes (ease in and out between each pair). */
function through(keys: readonly Key[], t: number): Pose {
  const x = Math.min(1, Math.max(0, t));
  let i = 0;
  while (i < keys.length - 2 && x > keys[i + 1]!.at) i++;
  const a = keys[i]!;
  const b = keys[i + 1]!;
  const k = b.at === a.at ? 1 : Math.min(1, Math.max(0, (x - a.at) / (b.at - a.at)));
  return blendPose(a.pose, b.pose, k * k * (3 - 2 * k));
}

const p = (
  lean: number,
  head: number,
  armFront: Limb,
  armBack: Limb,
  legFront: Limb,
  legBack: Limb,
  liftM?: number,
): Pose => ({
  lean: deg(lean),
  head: deg(head),
  armFront,
  armBack,
  legFront,
  legBack,
  ...(liftM ? { liftM } : {}),
});

/** A deep crouch with the back knee nearly to the floor (the posture for looking under a bed). */
const KNEEL = (leanDeg: number, headDeg: number): Pose =>
  p(leanDeg, headDeg, limb(-20, 60), limb(-34, 40), limb(84, -128), limb(-46, -118));

const SEQUENCES: Readonly<Record<HunterActionKind, readonly Key[]>> = {
  // Open a cupboard or wardrobe: square up, reach for the handle, pull it wide, lean in and look, ease back.
  'open-door': [
    { at: 0, pose: NEUTRAL },
    { at: 0.14, pose: p(-4, 0, limb(20, 40), limb(-8, 14), limb(8, -10), limb(-8, -8)) },
    { at: 0.3, pose: p(-16, 4, limb(78, 16), limb(-12, 18), limb(14, -16), limb(-12, -10)) }, // reach out
    { at: 0.46, pose: p(-12, 6, limb(86, 8), limb(-14, 18), limb(12, -14), limb(-10, -10)) }, // take the handle
    { at: 0.58, pose: p(-8, 4, limb(40, 34), limb(-18, 20), limb(6, -10), limb(-14, -10)) }, // pull: the door swings
    { at: 0.76, pose: p(-30, 14, limb(60, 30), limb(-8, 28), limb(14, -18), limb(-14, -12)) }, // lean in and look
    { at: 0.88, pose: p(-34, 16, limb(56, 34), limb(-8, 28), limb(16, -20), limb(-14, -12)) },
    { at: 1, pose: NEUTRAL },
  ],
  // Kneel by the bed, put a hand down and bend right over to look beneath it, then rise.
  'look-under': [
    { at: 0, pose: NEUTRAL },
    { at: 0.16, pose: p(-14, 6, limb(30, 40), limb(-10, 20), limb(30, -50), limb(-20, -34)) }, // start to lower
    { at: 0.32, pose: KNEEL(-46, 12) }, // down on one knee
    { at: 0.44, pose: p(-72, 24, limb(52, 8), limb(-30, 40), limb(88, -132), limb(-50, -122)) }, // hand to the floor, bend to look
    { at: 0.6, pose: p(-78, 28, limb(56, 6), limb(-32, 40), limb(90, -134), limb(-52, -124)) }, // hold, looking
    { at: 0.68, pose: p(-70, 20, limb(54, 8), limb(-30, 40), limb(88, -132), limb(-50, -122)) },
    { at: 0.8, pose: KNEEL(-40, 8) }, // pushes back up onto the knee
    { at: 0.9, pose: p(-20, 4, limb(30, 40), limb(-14, 22), limb(40, -60), limb(-24, -40)) }, // rising
    { at: 1, pose: NEUTRAL },
  ],
  // Lean over the back of a sofa or the edge of something to look behind it.
  'peer-behind': [
    { at: 0, pose: NEUTRAL },
    { at: 0.3, pose: p(-30, 10, limb(34, 36), limb(-10, 18), limb(12, -14), limb(-12, -10)) },
    { at: 0.55, pose: p(-52, 20, limb(70, 20), limb(-22, 30), limb(18, -22), limb(-16, -14)) }, // lean right over
    { at: 0.8, pose: p(-52, 20, limb(72, 18), limb(-22, 30), limb(18, -22), limb(-16, -14)) },
    { at: 1, pose: NEUTRAL },
  ],
  // Take hold of a curtain and sweep it aside.
  'pull-curtain': [
    { at: 0, pose: NEUTRAL },
    { at: 0.25, pose: p(-10, 0, limb(96, 14), limb(-8, 16), limb(8, -12), limb(-8, -8)) }, // reach up for it
    { at: 0.5, pose: p(-6, 6, limb(118, 8), limb(-12, 18), limb(14, -16), limb(-12, -10)) }, // sweep wide
    { at: 0.7, pose: p(-14, 10, limb(70, 24), limb(-12, 18), limb(12, -14), limb(-10, -10)) }, // look behind it
    { at: 1, pose: NEUTRAL },
  ],
  // Bend and lift a lid with both hands, look in, let it down.
  'lift-lid': [
    { at: 0, pose: NEUTRAL },
    { at: 0.22, pose: p(-38, 8, limb(64, 18), limb(30, 24), limb(20, -26), limb(-14, -14)) }, // bend to it
    { at: 0.42, pose: p(-30, 12, limb(104, 20), limb(70, 24), limb(16, -22), limb(-14, -14)) }, // heave the lid up
    { at: 0.62, pose: p(-52, 18, limb(100, 22), limb(66, 26), limb(22, -28), limb(-16, -16)) }, // lean over, rummage
    { at: 0.78, pose: p(-56, 18, limb(92, 30), limb(60, 34), limb(22, -28), limb(-16, -16)) },
    { at: 1, pose: NEUTRAL },
  ],
  // Push through a bush with a sweeping arm, a half step in.
  'part-bush': [
    { at: 0, pose: NEUTRAL },
    { at: 0.25, pose: p(-20, 4, limb(70, 14), limb(-14, 20), limb(20, -22), limb(-16, -12)) },
    { at: 0.5, pose: p(-26, 8, limb(110, 8), limb(-20, 24), limb(26, -26), limb(-18, -14)) }, // sweep it aside
    { at: 0.75, pose: p(-22, 10, limb(64, 20), limb(-10, 22), limb(18, -20), limb(-14, -12)) },
    { at: 1, pose: NEUTRAL },
  ],
  // A quick look without touching anything: a lean in and the head turned.
  glance: [
    { at: 0, pose: NEUTRAL },
    { at: 0.4, pose: p(-20, 14, limb(24, 40), limb(-8, 16), limb(10, -12), limb(-10, -8)) },
    { at: 0.7, pose: p(-18, -10, limb(20, 40), limb(-8, 16), limb(10, -12), limb(-10, -8)) },
    { at: 1, pose: NEUTRAL },
  ],
  // Freeze, head cocked, a hand up to an ear: listening for breathing.
  listen: [
    { at: 0, pose: NEUTRAL },
    { at: 0.25, pose: p(4, -18, limb(146, 124), limb(-6, 14), limb(4, -8), limb(-4, -6)) },
    { at: 0.75, pose: p(6, -22, limb(150, 128), limb(-6, 14), limb(4, -8), limb(-4, -6)) },
    { at: 1, pose: NEUTRAL },
  ],
  // Drag the knife along a wall as he passes: slow, deliberate, a little theatrical.
  'knife-scrape': [
    { at: 0, pose: NEUTRAL },
    { at: 0.25, pose: p(-8, 4, limb(70, 8), limb(-12, 16), limb(8, -10), limb(-8, -8)) },
    { at: 0.6, pose: p(-6, 6, limb(96, 4), limb(-12, 16), limb(10, -12), limb(-10, -8)) },
    { at: 0.8, pose: p(-8, 4, limb(78, 8), limb(-12, 16), limb(8, -10), limb(-8, -8)) },
    { at: 1, pose: NEUTRAL },
  ],
  // The kill: a lunge with the knife arm raised and driven forward.
  strike: [
    { at: 0, pose: NEUTRAL },
    { at: 0.3, pose: p(10, 0, limb(150, 30), limb(-30, 20), limb(-12, -14), limb(14, -10)) }, // knife raised, weight back
    { at: 0.62, pose: p(-42, 4, limb(70, 4), limb(-40, 30), limb(48, -50), limb(-30, -28)) }, // the lunge
    { at: 1, pose: p(-34, 6, limb(60, 8), limb(-32, 28), limb(42, -44), limb(-26, -26)) },
  ],
};

/** The pose at `progress` (0..1) of an action. */
export function actionPose(kind: HunterActionKind, progress: number): Pose {
  return through(SEQUENCES[kind], progress);
}

/**
 * How far open the hiding place is at `progress`, 0..1 (the cupboard door swinging, the chest lid rising, the
 * curtain sweeping, the bush shaking). It opens at the moment of the pull and stays open to the end.
 */
export function openAmount(kind: HunterActionKind, progress: number): number {
  const ramp = (from: number, to: number): number => {
    const k = Math.min(1, Math.max(0, (progress - from) / (to - from)));
    return k * k * (3 - 2 * k);
  };
  switch (kind) {
    case 'open-door':
      return ramp(0.46, 0.66);
    case 'lift-lid':
      return ramp(0.3, 0.46);
    case 'pull-curtain':
      return ramp(0.3, 0.55);
    case 'part-bush':
      return Math.sin(Math.min(1, progress) * Math.PI) ** 0.6; // it shakes and settles
    default:
      return 0;
  }
}

/** The moment, 0..1 through an action, when the thing he does makes its noise (a door creaking, a lid thumping). */
export const NOISE_AT: Readonly<Partial<Record<HunterActionKind, number>>> = {
  'open-door': 0.5,
  'lift-lid': 0.34,
  'pull-curtain': 0.4,
  'part-bush': 0.3,
  'knife-scrape': 0.4,
  'look-under': 0.2,
};

/** For the figure: how much of the look-under crouch is on (so the camera and shadow can follow). */
export const isLowAction = (kind: HunterActionKind): boolean => kind === 'look-under' || kind === 'lift-lid';

/**
 * While he looks into the place (after the door is open, while he is down at the bed) his eyes are right at the
 * opening, so what is inside is far easier to see: his awareness fills this many times faster in that window
 * (progress from, to). A quick glance has no such window.
 */
export const LOOK_WINDOW: Readonly<Partial<Record<HunterActionKind, { from: number; to: number; boost: number }>>> = {
  'open-door': { from: 0.5, to: 0.95, boost: 6 },
  'look-under': { from: 0.36, to: 0.72, boost: 5 },
  'lift-lid': { from: 0.42, to: 0.9, boost: 4 },
  'pull-curtain': { from: 0.5, to: 0.9, boost: 3.5 },
  'peer-behind': { from: 0.45, to: 0.85, boost: 2.5 },
  'part-bush': { from: 0.45, to: 0.85, boost: 2.5 },
};

/** How much faster he notices what is inside at this moment of an action (1 outside the look window). */
export function lookBoost(kind: HunterActionKind, progress: number): number {
  const w = LOOK_WINDOW[kind];
  return w && progress >= w.from && progress <= w.to ? w.boost : 1;
}

/** How loud the noise of an action is, 0..1 (a door creaking, a lid thumping, a knife scraping). */
export const ACTION_LOUDNESS: Readonly<Partial<Record<HunterActionKind, number>>> = {
  'open-door': 0.5,
  'lift-lid': 0.5,
  'pull-curtain': 0.3,
  'part-bush': 0.4,
  'knife-scrape': 0.32,
  'look-under': 0.15,
};
