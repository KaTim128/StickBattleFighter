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
  /** The lower pair of a four-armed fighter (Bohemeth): near and far lower hands. Absent: they trail the upper pair. */
  readonly front2?: { readonly x: number; readonly y: number; readonly elbowOut?: boolean };
  readonly back2?: { readonly x: number; readonly y: number; readonly elbowOut?: boolean };
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
    // The shoulders spread only part of the way with the turn, so the chest does not look wider than the body under it (owner, 25/11/2026).
    shoulderSpread: 0.1,
    scale: 1.28,
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
    pelvis: 0.86,
    leadFoot: 0.36,
    rearFoot: -0.36,
    lean: -4,
    head: 2,
    // A swordfighter's guard: the front hand reaches forward at chest height, the back hand is raised beside the jaw to cover the head; feet a shoulder-width apart, weight forward (owner, 21/11/2026).
    front: { x: 0.95, y: 0.28 },
    back: { x: 0.34, y: -0.16 },
    turn: 0.6,
    scale: 1,
    breath: { lean: 1, pelvis: 0.008, hands: 0.025 },
  },
  // Aerion: tall and light, weight on the toes, one wing-arm swept back and open, the other hand raised in invitation.
  aerion: {
    title: 'The Sky Sovereign',
    style: 'Aerial wind warrior: dives, wind blades, lifts enemies and outruns everything',
    pelvis: 0.86,
    leadFoot: 0.28,
    rearFoot: -0.3,
    lean: -5,
    head: 0,
    // Balanced on bent knees, weight on the balls of the feet, both fists up in a loose guard with the wings settled behind.
    front: { x: 0.82, y: 0.28 },
    back: { x: 0.5, y: 0.04 },
    turn: 0.6,
    scale: 1,
    breath: { lean: 1.2, pelvis: 0.01, hands: 0.03 },
  },
  // Kenshiro: hasso-no-kamae, the samurai's ready guard: the katana held in both hands with the arms stretched out in front, the blade rising
  // diagonally upward, a wide stance with the knees bent and the front foot ahead. Ready to cut down in one stroke.
  kenshiro: {
    title: 'The Patient Blade',
    style: 'Sword duelist: perfect parries, counters and precise cuts',
    pelvis: 0.74,
    leadFoot: 0.4,
    rearFoot: -0.42,
    lean: -3,
    head: 2,
    front: { x: 0.74, y: 0.14 },
    back: { x: 0.5, y: 0.22 },
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
    pelvis: 0.86,
    leadFoot: 0.3,
    rearFoot: -0.28,
    lean: -2,
    head: -3,
    // Listening: the far hand cups his ear (elbow raised out to the side) while the lead gauntlet points dead straight ahead.
    front: { x: 0.99, y: 0.0 },
    back: { x: 0.12, y: -0.42, elbowOut: true },
    turn: 0.55,
    scale: 1,
    breath: { lean: 1, pelvis: 0.014, hands: 0.012 },
  },
  // Voltar: a Wing Chun guard, narrow stance, lead hand up on the centreline, rear hand tucked behind it, elbows in.
  voltar: {
    title: 'The Living Storm',
    style: 'Lightning speedster: flashes through enemies, zaps to stun, rushes from every side and gathers the sky',
    pelvis: 0.84,
    leadFoot: 0.26,
    rearFoot: -0.2,
    lean: -8,
    head: 4,
    front: { x: 0.7, y: -0.1 },
    back: { x: 0.4, y: 0.2 },
    turn: 0.55,
    scale: 1,
    breath: { lean: 1.4, pelvis: 0.016, hands: 0.02 },
  },
  chronos: {
    title: 'The Second Hand',
    style: 'Time specialist: slowing fields, rewinds, afterimages, ageing and a world-stopping ultimate',
    // Upright, formal and unhurried: standing tall with the feet nearly together, the head level, the dial arm held at the chest as if
    // checking a watch, the other hand clasped behind his back.
    pelvis: 0.97,
    leadFoot: 0.1,
    rearFoot: -0.1,
    lean: 0,
    head: 0,
    front: { x: 0.5, y: 0.2 },
    back: { x: -0.1, y: 0.58 },
    turn: 0.5,
    scale: 1,
    breath: { lean: 0.5, pelvis: 0.006, hands: 0.012 },
  },
  // Prismor: planted wide like a monument, the oversized crystal arm raised across his chest, the other hand loose and open.
  prismor: {
    title: 'The Grown Armoury',
    style: 'Crystal weaponsmith: greatsword, shield, dual blades, lance and warhammer grown from his arms',
    pelvis: 0.93,
    leadFoot: 0.3,
    rearFoot: -0.32,
    lean: -2,
    head: -3,
    front: { x: 0.62, y: 0.32 },
    back: { x: -0.08, y: 0.66 },
    turn: 0.55,
    scale: 1.04,
    breath: { lean: 1, pelvis: 0.01, hands: 0.02 },
  },
  // Inkmaster: upright and composed before a fresh page, the oversized brush held low in front of him, the free hand tucked at the waist.
  inkmaster: {
    title: 'The Living Brush',
    style: 'Ink painter: waves, a serpent, a bull, clones and a drawn monster',
    // Kung fu bow stance: wide and low, the brush hand forward and low like a guard, the free hand raised in an open palm by the chin.
    pelvis: 0.74,
    leadFoot: 0.42,
    rearFoot: -0.46,
    lean: -7,
    head: 4,
    front: { x: 0.66, y: 0.32 },
    back: { x: 0.28, y: -0.2 },
    turn: 0.52,
    scale: 1,
    breath: { lean: 1, pelvis: 0.01, hands: 0.025 },
  },
  // Magix: a showman's pose, hat tipped, wand flourished out front and the other hand behind his back.
  magix: {
    title: 'The Master Illusionist',
    style: 'Illusionist: vanishing, a rabbit, cards, curses and a borrowed face',
    pelvis: 0.8,
    leadFoot: 0.3,
    rearFoot: -0.34,
    lean: -6,
    head: -3,
    front: { x: 0.7, y: 0.18 },
    back: { x: -0.05, y: 0.55 },
    turn: 0.5,
    scale: 1,
    breath: { lean: 1, pelvis: 0.01, hands: 0.03 },
  },
  // Bohemeth (owner, 26/11/2026, after the "Behemoth, the Quadruple Colossus" reference): a wide, planted power pose facing the viewer.
  // Both upper fists are raised high and out at the sides, elbows bent, like a double flex; both lower fists hang clenched out low and wide,
  // clear of the legs; the face is open. A little taller than before.
  bohemeth: {
    title: 'The Four Armed Brute',
    style: 'Four-armed heavyweight: spins, uppercuts, claps, smashes and unleashes rapid four-fisted barrages',
    pelvis: 0.84,
    leadFoot: 0.44,
    rearFoot: -0.44,
    lean: 0,
    head: 0,
    front: { x: 0.82, y: -0.24 },
    back: { x: -0.52, y: -0.52 },
    front2: { x: 0.7, y: 0.4 },
    back2: { x: -0.62, y: 0.44 },
    turn: 0.5,
    scale: 1.06,
    breath: { lean: 1.2, pelvis: 0.012, hands: 0.03 },
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
