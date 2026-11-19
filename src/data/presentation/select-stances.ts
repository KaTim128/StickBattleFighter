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
  /** Hangs this far above the floor (metres), bobbing a little (Psion floats). */
  readonly floatM?: number;
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
  /**
   * How much the shoulders spread with the turn (default 1). Heavy shoulder armour is built around
   * the profile shoulder line, so an armoured brute keeps its arms there (0) while its hips, legs
   * and chest turn.
   */
  readonly shoulderSpread?: number;
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
  // Vexoris: a threatening chemical soldier, one hand lifting the glowing poison jar, the other hand low and open,
  // ready to strike; feet planted in a karate stance.
  vexoris: {
    title: 'The Chemist of War',
    style: 'Poison specialist: builds toxicity, area denial and a karate string with a poison splash',
    pelvis: 0.84,
    leadFoot: 0.38,
    rearFoot: -0.34,
    lean: -6,
    head: 4,
    // The front hand low and forward, the back hand raised beside the head: the face is clear (owner, 21/11/2026).
    front: { x: 0.6, y: 0.66 },
    back: { x: -0.32, y: 0.1 },
    turn: 0.6,
    scale: 1,
    breath: { lean: 1, pelvis: 0.008, hands: 0.025 },
  },
  // Aerion: tall and light, weight on the toes, one wing-arm swept back and open, the other hand raised in invitation.
  aerion: {
    title: 'The Sky Sovereign',
    style: 'Aerial wind warrior: dives, wind blades, lifts enemies and outruns everything',
    pelvis: 0.96,
    leadFoot: 0.1,
    rearFoot: -0.14,
    lean: -1,
    head: -4,
    // Tall on straight legs with the arms spread low and open like wings settling.
    front: { x: 0.62, y: 0.5 },
    back: { x: -0.55, y: 0.46 },
    turn: 0.6,
    scale: 1,
    breath: { lean: 1.2, pelvis: 0.01, hands: 0.03 },
  },
  // Kenshiro: chudan-no-kamae: upright and still, the single katana in both hands at the belly, the blade levelled forward.
  kenshiro: {
    title: 'The Patient Blade',
    style: 'Sword duelist: perfect parries, counters and precise cuts',
    pelvis: 0.82,
    leadFoot: 0.36,
    rearFoot: -0.36,
    lean: -2,
    head: 2,
    front: { x: 0.4, y: 0.36 },
    back: { x: 0.3, y: 0.4 },
    turn: 0.6,
    scale: 1,
    breath: { lean: 0.6, pelvis: 0.006, hands: 0.012 },
  },
  // Psion: floating, still, both hands open and raised at his sides, palms forward, as if holding the room in place.
  psion: {
    title: 'The Quiet Storm',
    style: 'Telekinetic controller: crushes, hurls and holds from range, shields himself',
    pelvis: 0.96,
    leadFoot: 0.05,
    rearFoot: -0.1,
    lean: -1,
    head: 8,
    // Floating: he hangs above the floor with the legs loose, the hands raised and open in front of him.
    floatM: 0.3,
    front: { x: 0.5, y: 0.2 },
    back: { x: 0.34, y: 0.3 },
    turn: 0.6,
    scale: 1,
    breath: { lean: 1, pelvis: 0.012, hands: 0.04 },
  },
  // Geargrind: braced and low, the machine arm raised and forward, ready to fire; the other hand tucked back.
  geargrind: {
    title: 'The Field Engineer',
    style: 'Combat engineer: fires a rocket fist, flies a drone, lays magnetic mines, plates up',
    pelvis: 0.92,
    leadFoot: 0.3,
    rearFoot: -0.36,
    lean: -3,
    head: 0,
    // The machine arm straight out in front like a gun barrel, the other hand on the hip, the feet wide and planted.
    front: { x: 0.92, y: 0.1 },
    back: { x: 0.1, y: 0.56, elbowOut: true },
    turn: 0.5,
    scale: 1,
    breath: { lean: 1, pelvis: 0.01, hands: 0.02 },
  },
  // Reson: on the beat, weight rocking, both gauntlets raised in front of the chest.
  reson: {
    title: 'The Tuned Fist',
    style: 'Sonic specialist: a scream, launching punches, defence-breaking screeches and a shattering ultimate',
    pelvis: 0.9,
    leadFoot: 0.36,
    rearFoot: -0.1,
    lean: 4,
    head: -4,
    // Leaning back on the rear leg, one gauntlet thrust out toward you, the other hand raised at the ear.
    front: { x: 0.92, y: 0.2 },
    back: { x: 0.18, y: -0.04 },
    turn: 0.55,
    scale: 1,
    breath: { lean: 1.5, pelvis: 0.018, hands: 0.03 },
  },
  // Chronos: poised and exact, the dial arm raised out in front, the other folded behind.
  chronos: {
    title: 'The Second Hand',
    style: 'Time specialist: slowing fields, rewinds, afterimages, ageing and a world-stopping ultimate',
    pelvis: 0.97,
    leadFoot: 0.07,
    rearFoot: -0.08,
    lean: -1,
    head: 10,
    // Feet together and upright, the dial arm across the chest as if reading a watch, the other hand behind the back.
    front: { x: 0.34, y: 0.34 },
    back: { x: -0.22, y: 0.52 },
    turn: 0.55,
    scale: 1,
    breath: { lean: 1.5, pelvis: 0.01, hands: 0.02 },
  },
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
