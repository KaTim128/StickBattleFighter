/**
 * Fighter select presentation (owner, 13/11/2026: "Stickman Selection Screen and Unique 2.5D
 * Fighter Stances"): each fighter's title, fighting style and its own selection stance, struck
 * on the fighter's real rig (src/animation/stance.ts). Every fighter faces the same diagonal on
 * the select screen; the stance carries its personality. A new playable fighter adds its entry
 * here (tested: every playable fighter has one, and no two share a stance).
 *
 * Units: feet as a fraction of leg length (thigh + shin) from the pelvis, forward positive; hands
 * as a fraction of arm length (upper arm + forearm) from the shoulders, forward and down
 * positive; angles in degrees (lean: negative leans forward).
 */
export interface SelectStance {
  /** Shown under the fighter's name, e.g. "The Living Flame". */
  readonly title: string;
  /** How it fights, in one line. */
  readonly style: string;
  readonly pelvis: number;
  readonly leadFoot: number;
  readonly rearFoot: number;
  readonly lean: number;
  readonly head: number;
  /** Near hand (the knife hand). `elbowOut`: the elbow points forward instead of back (hands on hips). */
  readonly front: { readonly x: number; readonly y: number; readonly elbowOut?: boolean };
  /** Far hand (the staff hand). */
  readonly back: { readonly x: number; readonly y: number; readonly elbowOut?: boolean };
  /**
   * How far the body is turned towards the camera, as the sine of the angle (owner, 13/11/2026:
   * "face diagonally towards the camera at approximately 30 to 45 degrees"): 0.5 is 30°, 0.71 is 45°.
   */
  readonly turn: number;
  /** Drawn size on the select screen (1 = as in the arena; the giant is larger). */
  readonly scale: number;
  /** How far a breath moves it: lean (deg), pelvis (fraction of leg), hands (fraction of arm, up). */
  readonly breath: { readonly lean: number; readonly pelvis: number; readonly hands: number };
}

export const SELECT_STANCES: Readonly<Record<string, SelectStance>> = {
  // Aggressive and ready, like the owner's reference: a wide, coiled kicker's base, weight forward,
  // lead fist up and out, rear fist chambered at the ribs for the next strike.
  inferno: {
    title: 'The Living Flame',
    style: 'Fire taekwondo: controlled kicks and flame bursts at every range',
    pelvis: 0.84,
    leadFoot: 0.42,
    rearFoot: -0.5,
    lean: -12,
    head: 4,
    front: { x: 0.72, y: -0.08 },
    back: { x: 0.28, y: 0.32 },
    turn: 0.62,
    scale: 1,
    breath: { lean: 2, pelvis: 0.012, hands: 0.03 },
  },
  // Heavy, grounded and sure of himself (owner, 13/11/2026: "significantly larger, standing
  // confidently with both hands on his waist"): a wide planted base, chest up, fists on his hips
  // with the elbows thrown out to both sides.
  rampage: {
    title: 'The Unbroken Wall',
    style: 'Heavyweight brawler: charges, grabs and crushing slams',
    pelvis: 0.86,
    leadFoot: 0.36,
    rearFoot: -0.4,
    lean: 2,
    head: -4,
    front: { x: -0.08, y: 0.72 },
    back: { x: 0.06, y: 0.72, elbowOut: true },
    turn: 0.6,
    scale: 1.3,
    breath: { lean: 1.5, pelvis: 0.01, hands: 0.02 },
  },
  // Tall and dominant: nearly straight legs, chest up and chin raised, the skull staff planted in
  // his far hand, the near hand lifted with the fingers spread as if a curse is already forming.
  necro: {
    title: 'Keeper of the Grave',
    style: 'Ranged curse-caster: drains, chains and an army of the dead',
    pelvis: 0.96,
    leadFoot: 0.18,
    rearFoot: -0.2,
    lean: 4,
    head: -6,
    front: { x: 0.62, y: -0.3 },
    back: { x: 0.34, y: 0.6 },
    turn: 0.6,
    scale: 1,
    breath: { lean: 1, pelvis: 0.006, hands: 0.04 },
  },
  // Crouched and hunched, coiled to pounce: knees deep, back curled over, the knife held low and
  // forward, the empty hand trailing behind for balance.
  shroud: {
    title: 'The Unseen Blade',
    style: 'Stealth assassin: vanishes, ambushes and strikes from the dark',
    pelvis: 0.72,
    leadFoot: 0.34,
    rearFoot: -0.44,
    lean: -34,
    head: 12,
    front: { x: 0.56, y: 0.5 },
    back: { x: -0.36, y: 0.52 },
    turn: 0.5,
    scale: 1,
    breath: { lean: 2.5, pelvis: 0.014, hands: 0.03 },
  },
};
