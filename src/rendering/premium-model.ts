import type { Graphics } from 'pixi.js';
import type { Point, solveSkeleton } from '../animation/skeleton';
import { shadedBall } from './shaded-ball';

/**
 * Premium fighter models (owner, 13/11/2026: approved on Inferno, then "the same styling for
 * everything"; reference images 2 and 3). One painter, drawn on the same jointed rig as every
 * fighter, so every existing animation, attack, ability, dodge, reaction and KO drives it unchanged;
 * each fighter's look is a SKIN (palette, build and gear), chosen by its body style:
 * - anatomy: deltoid caps, biceps and forearm masses, chest and abdominals, a narrow waist, quads and
 *   calves (scaled by the skin's `muscle`); head, neck, trapezius, shoulders and pelvis are one body;
 * - materials: skin or fabric painted in three tones with a rim light and thick dark outlines;
 *   armour, cuffs, wraps, belts, trunks or long trousers, boots or bare feet;
 * - garments: a robe or a tattered cloak falling from the waist over both legs;
 * - element details: glowing seams, a chest core, pulsing veins and glowing fists (fire skins), a
 *   bone ribcage plate and pauldron (death skins), a flame crest for hair.
 * Light comes from the top-left of the screen whichever way the fighter faces.
 */

type Skel = ReturnType<typeof solveSkeleton>;

export interface PremiumPalette {
  readonly outline: number;
  readonly skin: number;
  readonly skinLit: number;
  readonly skinShade: number;
  readonly skinBack: number;
  readonly rim: number;
  readonly armour: number;
  readonly armourLit: number;
  readonly armourEdge: number;
  /** Glow colours (null: no glowing seams, veins or core). */
  readonly seam: number | null;
  readonly lava: number | null;
  readonly glow: number | null;
  /** Hands, if not skin (gloves, bone). */
  readonly hand?: number;
}

export interface PremiumSkin {
  readonly palette: PremiumPalette;
  /** Width multiplier over the rig's limb line. */
  readonly bulk: number;
  /** 0 = smooth (fabric, mannequin), 1 = athletic, more = brute. */
  readonly muscle: number;
  readonly gear: {
    readonly shoulder: 'guard' | 'bone' | 'none';
    readonly bracers: boolean;
    /** Lower-body clothing: short trunks, full trousers, or nothing. */
    readonly legs: 'trunks' | 'trousers' | 'none';
    readonly kneeGuards: boolean;
    readonly shinGuards: boolean;
    readonly feet: 'boots' | 'bare';
    readonly belt: boolean;
    /** Bone ribcage plate on the chest. */
    readonly ribcage?: boolean;
    /** Ball joints at the shoulders, elbows and knees (a mannequin). */
    readonly joints?: boolean;
  };
  readonly fire: { readonly core: boolean; readonly veins: boolean; readonly fists: boolean };
  /** A long garment from the waist over both legs: a robe, or a cloak with a tattered hem. */
  readonly garment?: {
    readonly hem: 'robe' | 'tattered' | 'coat';
    readonly trim?: number;
    /** The cloth's own colours (base, lit, shade); default: the skin's. */
    readonly cloth?: readonly [number, number, number];
  };
  /**
   * The sculpted head (drawn here): a flame crest, a bald brawler, a hood with glowing eyes, a hood
   * and white mask, a mannequin egg; or 'own' (the view draws its head style).
   */
  readonly head: 'crest' | 'brute' | 'cowl' | 'mask' | 'egg' | 'gasmask' | 'own';
  /** A light panel slanting across the chest (owner, 13/11/2026, Titan: grey body, white chest). */
  readonly chestPanel?: number;
  /** A round ball at the pelvis, like the mannequin joints (Titan). */
  readonly pelvisBall?: boolean;
  /** One glowing eye on the round head (Titan's reference: a white slanted eye). */
  readonly eye?: number;
  /** Layered feathered wings from the shoulder blades (Aerion). */
  readonly wings?: {
    readonly feather: number;
    readonly featherShade: number;
    readonly edge: number;
    readonly glow: number;
  };
  /** A samurai helmet over the head: a bowl and brow, a neck guard, and crescent horns (Kenshiro). */
  readonly helm?: { readonly armour: number; readonly trim: number };
  /** Waist cloth: two flaps of cloth from the belt to the thighs, with a trimmed hem (Kenshiro). */
  readonly tassets?: { readonly cloth: number; readonly shade: number; readonly trim: number };
  /** A circular structure floating behind the upper body, turning slowly (Psion). */
  readonly halo?: { readonly ring: number; readonly glow: number };
  /** Geometric fragments orbiting the body (Psion). */
  readonly fragments?: { readonly colour: number; readonly glow: number };
  /** One glowing eye on the head (profile view shows one), in this colour (Psion). */
  readonly psyEye?: number;
  /** A soft psychic glow round both hands (Psion). */
  readonly handGlow?: number;
  /** A compact tool backpack with an antenna and a status light behind the shoulders (Geargrind). */
  readonly backpack?: { readonly shell: number; readonly trim: number; readonly light: number };
  /** The near arm is a machine: steel segments, a piston, bolts and an orange stripe (Geargrind). */
  readonly machineArm?: { readonly steel: number; readonly stripe: number };
  /** A circular resonance device on each forearm (Reson): a steel ring with a pulsing cyan core and wave rings. */
  readonly gauntlets?: { readonly steel: number; readonly ring: number };
  /** Geometric sound-amplification gear: hexagonal emitter plates on the shoulders and wave arcs on the chest (Reson). */
  readonly soundGear?: { readonly plate: number; readonly glow: number };
  /** A bronze clock face behind the shoulders with turning hands and a ticking second hand (Chronos). */
  readonly clockDisc?: { readonly bronze: number; readonly cyan: number };
  /** A temporal device on the near forearm: a bronze dial with cyan hands and a glowing crystal (Chronos). */
  readonly dial?: { readonly bronze: number; readonly cyan: number };
  /** The near arm is an oversized crystal limb: a huge faceted forearm and fist, a shoulder crystal (Prismor). */
  readonly crystalArm?: { readonly body: number; readonly edge: number; readonly glow: number };
  /** A crystal crown of sharp points on the head (Prismor). */
  readonly crown?: { readonly body: number; readonly glow: number };
  /** Hovers this far above the floor when standing (render only; Aerion), metres. */
  readonly hoverM?: number;
}

/** Fire (the approved Inferno look). */
export const MAGMA: PremiumPalette = {
  outline: 0x2a0c04,
  skin: 0xe2692c,
  skinLit: 0xffa057,
  skinShade: 0xa8381a,
  skinBack: 0xb9471f,
  rim: 0xffd27a,
  armour: 0x2b2524,
  armourLit: 0x5a504c,
  armourEdge: 0x0d0a0a,
  seam: 0xffa230,
  lava: 0xffe27a,
  glow: 0xff6a1a,
};

/**
 * The fighter redesign (owner, 13/11/2026: "recreate the look" of Inferno for the others; approved
 * and made the default the same day). Every fighter gets Inferno's full treatment (the
 * painted three-tone body, the armour set with glowing seams, element core, veins and glowing
 * hands), themed to the fighter. Keyed by body style (no character names in shared code).
 */
export const PREMIUM_SKINS: Readonly<Record<string, PremiumSkin>> = {
  // Titan (owner, 13/11/2026: "recreate Titan exactly like the image"): a dark grey mannequin
  // brawler with thick black outlines. Big ball shoulders, ball knees and a ball at the pelvis, a
  // V-shaped torso with a white panel slanting across the chest, blocky abdominals, plated shins,
  // grey boots; a round shaded head with one white eye.
  muscle: {
    palette: {
      outline: 0x0a0b0d,
      skin: 0x5d626b,
      skinLit: 0x868b95,
      skinShade: 0x3a3e46,
      skinBack: 0x4a4f57,
      rim: 0xc9ced8,
      armour: 0x5d626b,
      armourLit: 0x8a8f99,
      armourEdge: 0x0a0b0d,
      seam: null,
      lava: null,
      glow: null,
    },
    bulk: 1.7,
    muscle: 1.3,
    gear: {
      shoulder: 'none',
      bracers: false,
      legs: 'none',
      kneeGuards: false,
      shinGuards: true,
      feet: 'boots',
      belt: false,
      joints: true,
    },
    fire: { core: false, veins: false, fists: false },
    head: 'brute',
    chestPanel: 0xe9ebef,
    pelvisBall: true,
    eye: 0xffffff,
  },
  // Death mage: ash-violet skin, violet-black armour with glowing violet seams, a soul core, violet
  // veins and glowing hands; a robe falling from the sash; a hood with two glowing eyes.
  robe: {
    // Mage of Death (owner, 13/11/2026): deep black and dark purple, cursed-violet seams with a thin
    // sickly-green core, kept dark and sinister rather than bright.
    palette: {
      outline: 0x050308,
      skin: 0x1d1426,
      skinLit: 0x3a2a4f,
      skinShade: 0x0c0812,
      skinBack: 0x150e1c,
      rim: 0x8c62c0,
      armour: 0x16101d,
      armourLit: 0x352845,
      armourEdge: 0x050308,
      seam: 0x7b3fc4,
      lava: 0xa9e07c,
      glow: 0x5a1f9a,
    },
    bulk: 1.35,
    muscle: 0,
    gear: {
      shoulder: 'guard',
      bracers: true,
      legs: 'none',
      kneeGuards: false,
      shinGuards: false,
      feet: 'boots',
      belt: true,
    },
    fire: { core: true, veins: true, fists: true },
    garment: { hem: 'robe', trim: 0x6a34a8, cloth: [0x1f1229, 0x3b2350, 0x0d0712] },
    head: 'cowl',
  },
  // Masked stalker: a black bodysuit with a crimson rim light, black leather armour with crimson
  // seams and veins, a tattered black cloak from the belt, and the white mask under a hood.
  cloak: {
    palette: {
      outline: 0x050507,
      skin: 0x2d2d35,
      skinLit: 0x585862,
      skinShade: 0x15151a,
      skinBack: 0x212128,
      rim: 0xff6b6b,
      armour: 0x1c1616,
      armourLit: 0x433434,
      armourEdge: 0x050303,
      seam: 0xe5242e,
      lava: 0xff9a9a,
      glow: 0xb3101a,
      hand: 0x17171c,
    },
    bulk: 1.35,
    muscle: 0.75,
    gear: {
      shoulder: 'guard',
      bracers: true,
      legs: 'none',
      kneeGuards: true,
      shinGuards: true,
      feet: 'boots',
      belt: true,
    },
    fire: { core: false, veins: true, fists: false },
    garment: { hem: 'tattered', trim: 0x8c1018 },
    head: 'mask',
  },
  // Chemical-warfare soldier (Vexoris, 19/11/2026, spec B1): a worn olive jacket and trousers, dark
  // leather straps and pouches, gloves and boots, toxic-green glowing details, and a gas mask for a face.
  soldier: {
    palette: {
      outline: 0x0b0e07,
      skin: 0x4a5330,
      skinLit: 0x76824a,
      skinShade: 0x2c3319,
      skinBack: 0x39422a,
      rim: 0xb8f06a,
      armour: 0x2e2a1f,
      armourLit: 0x5a523b,
      armourEdge: 0x0e0c07,
      seam: 0x7dff3a,
      lava: 0xd5ff9a,
      glow: 0x4fd81c,
      hand: 0x231f15,
    },
    bulk: 1.3,
    muscle: 0.7,
    gear: {
      shoulder: 'guard',
      bracers: true,
      legs: 'trousers',
      kneeGuards: true,
      shinGuards: false,
      feet: 'boots',
      belt: true,
    },
    fire: { core: false, veins: true, fists: false },
    // The long dark green coat to the shins (owner, 20/11/2026), trimmed in a dull toxic green.
    garment: { hem: 'coat', trim: 0x4a7a22, cloth: [0x233a1e, 0x3e5c32, 0x101a0d] },
    head: 'gasmask',
  },
  // Aerion (master plan section 4): an elegant silver and white winged warrior in streamlined plate with pale blue
  // light, and layered feathered wings from the shoulder blades. Light and tall; he never quite touches the ground.
  winged: {
    palette: {
      outline: 0x26323f,
      skin: 0xdbe4ee,
      skinLit: 0xffffff,
      skinShade: 0xa9b8c9,
      skinBack: 0xb7c5d6,
      rim: 0xd4eeff,
      armour: 0xeef3f9,
      armourLit: 0xffffff,
      armourEdge: 0x3a4a5c,
      seam: 0x8fc4f4,
      lava: 0xd4eeff,
      glow: 0x8fc4f4,
      hand: 0xe2eaf3,
    },
    bulk: 1.15,
    muscle: 0.3,
    gear: {
      shoulder: 'guard',
      bracers: true,
      legs: 'trousers',
      kneeGuards: true,
      shinGuards: true,
      feet: 'boots',
      belt: true,
    },
    fire: { core: false, veins: true, fists: false },
    head: 'own',
    wings: { feather: 0xf2f8ff, featherShade: 0xb8cce2, edge: 0x2f4157, glow: 0x8fc4f4 },
    hoverM: 0.14,
  },
  // Kenshiro (master plan section 4): dark red and black lacquered armour, black pauldrons, a waist cloth of crimson,
  // a horned kabuto, lean and balanced. Two katana are drawn by the view.
  samurai: {
    palette: {
      outline: 0x120406,
      skin: 0x8a1c28,
      skinLit: 0xc03244,
      skinShade: 0x4c0c14,
      skinBack: 0x5e1019,
      rim: 0xff7a84,
      armour: 0x1b1315,
      armourLit: 0x4b3b3e,
      armourEdge: 0x090405,
      seam: 0xd02438,
      lava: 0xff8a92,
      glow: 0xd02438,
      hand: 0x1b1315,
    },
    bulk: 1.2,
    muscle: 0.55,
    gear: {
      shoulder: 'guard',
      bracers: true,
      legs: 'trousers',
      kneeGuards: true,
      shinGuards: true,
      feet: 'boots',
      belt: true,
    },
    fire: { core: false, veins: false, fists: false },
    head: 'own',
    helm: { armour: 0x1b1315, trim: 0xc9a34a },
    tassets: { cloth: 0x9c1d2c, shade: 0x5a0f18, trim: 0xc9a34a },
  },
  // Psion (master plan section 4): a slim dark purple psychic warrior, one glowing violet eye, psychic light round the hands, geometric
  // fragments orbiting his body and a turning ring behind his shoulders. Not Necro: no hood, no bones, no robe, no death.
  psychic: {
    palette: {
      outline: 0x0d0618,
      skin: 0x3d2468,
      skinLit: 0x6a45a8,
      skinShade: 0x24133f,
      skinBack: 0x2e1a52,
      rim: 0xc7a1ff,
      armour: 0x1f1236,
      armourLit: 0x4c3380,
      armourEdge: 0x0a0414,
      seam: 0x9a66ff,
      lava: 0xe4d2ff,
      glow: 0x8a4fe0,
      hand: 0x3d2468,
    },
    bulk: 1.05,
    muscle: 0.2,
    gear: {
      shoulder: 'none',
      bracers: true,
      legs: 'trousers',
      kneeGuards: false,
      shinGuards: false,
      feet: 'bare',
      belt: false,
    },
    fire: { core: false, veins: true, fists: false },
    head: 'own',
    halo: { ring: 0xc7a1ff, glow: 0x8a4fe0 },
    fragments: { colour: 0xb88cff, glow: 0x8a4fe0 },
    psyEye: 0xe4d2ff,
    handGlow: 0xc7a1ff,
    hoverM: 0.3,
  },
  // Geargrind (master plan section 4): a dark steel and orange combat engineer. One arm is a machine, a tool backpack rides on his
  // back, and plates extend from it on command. Compact and a little broad, bolts and hydraulics rather than a generic robot.
  mechanic: {
    palette: {
      outline: 0x0d0f12,
      skin: 0x3a3f48,
      skinLit: 0x68707d,
      skinShade: 0x22262c,
      skinBack: 0x2c3036,
      rim: 0xffb455,
      armour: 0x2f343c,
      armourLit: 0x5d6572,
      armourEdge: 0x0b0c0f,
      seam: 0xff7a1a,
      lava: 0xffd9a0,
      glow: 0xff7a1a,
      hand: 0x3a3f48,
    },
    bulk: 1.2,
    muscle: 0.5,
    gear: {
      shoulder: 'guard',
      bracers: true,
      legs: 'trousers',
      kneeGuards: true,
      shinGuards: true,
      feet: 'boots',
      belt: true,
      joints: true,
    },
    fire: { core: false, veins: false, fists: false },
    head: 'own',
    backpack: { shell: 0x3a3f48, trim: 0xff7a1a, light: 0xffb455 },
    machineArm: { steel: 0x586070, stripe: 0xff7a1a },
  },
  // Reson (master plan section 4): a dark charcoal stickman with glowing cyan soundwave patterns, a resonance device on each
  // forearm and geometric amplification plates on the shoulders. Not Geargrind: no backpack, no machine arm, no orange.
  sonic: {
    palette: {
      outline: 0x07090b,
      skin: 0x2e333a,
      skinLit: 0x56606c,
      skinShade: 0x1a1d22,
      skinBack: 0x23272d,
      rim: 0x7ae8ff,
      armour: 0x20242a,
      armourLit: 0x424a55,
      armourEdge: 0x07090b,
      seam: 0x19c4e0,
      lava: 0xeafcff,
      glow: 0x19c4e0,
      hand: 0x2e333a,
    },
    bulk: 1.1,
    muscle: 0.4,
    gear: {
      shoulder: 'none',
      bracers: false,
      legs: 'trousers',
      kneeGuards: false,
      shinGuards: true,
      feet: 'boots',
      belt: true,
    },
    fire: { core: false, veins: true, fists: false },
    head: 'own',
    gauntlets: { steel: 0x586070, ring: 0x19c4e0 },
    soundGear: { plate: 0x3a424c, glow: 0x7ae8ff },
  },
  // Chronos (master plan section 4): dark silver with bronze details and cyan temporal energy; a clock face behind the shoulders, a
  // dial device on one forearm, bronze clockwork fragments drifting round him. Not Geargrind: no backpack, no machine arm.
  temporal: {
    palette: {
      outline: 0x10151a,
      skin: 0x5b6672,
      skinLit: 0x93a0ad,
      skinShade: 0x38414b,
      skinBack: 0x46505b,
      rim: 0x8defff,
      armour: 0x3d4650,
      armourLit: 0x7a8794,
      armourEdge: 0x10151a,
      seam: 0xb98a4a,
      lava: 0xf0fdff,
      glow: 0x19b8d6,
      hand: 0x5b6672,
    },
    bulk: 1.0,
    muscle: 0.25,
    gear: {
      shoulder: 'none',
      bracers: true,
      legs: 'trousers',
      kneeGuards: false,
      shinGuards: false,
      feet: 'boots',
      belt: true,
    },
    fire: { core: false, veins: true, fists: false },
    head: 'own',
    clockDisc: { bronze: 0xb98a4a, cyan: 0x19b8d6 },
    dial: { bronze: 0xb98a4a, cyan: 0x8defff },
    fragments: { colour: 0xb98a4a, glow: 0x19b8d6 },
  },
  // Prismor (owner 21/11/2026): a crystal weapon specialist in translucent purple and blue, with one oversized crystalline arm and a
  // crown of sharp points. No ice, no snow: faceted, glassy, internal light. Not Frostweld.
  crystal: {
    palette: {
      outline: 0x120d38,
      skin: 0x5a4bbf,
      skinLit: 0x9f8cff,
      skinShade: 0x2f2680,
      skinBack: 0x453a9c,
      rim: 0xc9bfff,
      armour: 0x453a9c,
      armourLit: 0x8f86ff,
      armourEdge: 0x120d38,
      seam: 0x4aa8ff,
      lava: 0xe9e2ff,
      glow: 0x7b5cff,
      hand: 0x5a4bbf,
    },
    bulk: 1.2,
    muscle: 0.7,
    gear: {
      shoulder: 'none',
      bracers: false,
      legs: 'trousers',
      kneeGuards: true,
      shinGuards: true,
      feet: 'boots',
      belt: true,
      joints: true,
    },
    fire: { core: false, veins: true, fists: false },
    head: 'own',
    crystalArm: { body: 0x7b6cff, edge: 0x2a2266, glow: 0x4aa8ff },
    crown: { body: 0x9f8cff, glow: 0x4aa8ff },
  },
  // Training mannequin: a pale shell, ball joints, grey guards with hazard-yellow seams.
  solid: {
    palette: {
      outline: 0x2e333d,
      skin: 0xc9ced8,
      skinLit: 0xf1f3f7,
      skinShade: 0x8c93a1,
      skinBack: 0xa7adba,
      rim: 0xffffff,
      armour: 0x5d6472,
      armourLit: 0x8f97a6,
      armourEdge: 0x232730,
      seam: 0xffc83a,
      lava: 0xfff0b0,
      glow: 0xffb000,
    },
    bulk: 1.35,
    muscle: 0.5,
    gear: {
      shoulder: 'guard',
      bracers: true,
      legs: 'none',
      kneeGuards: true,
      shinGuards: false,
      feet: 'bare',
      belt: true,
      joints: true,
    },
    fire: { core: false, veins: false, fists: false },
    head: 'egg',
  },
};

export interface PremiumDrawState {
  /** 1 = facing right (the figure is mirrored in x by its container). */
  readonly facing: 1 | -1;
  /** Render clock, seconds (pulses and flicker). */
  readonly t: number;
  /** 0..1 hit flash toward `flashColour`. */
  readonly flash: number;
  readonly flashColour: number;
  /** The rig's limb width, metres. */
  readonly w: number;
  readonly headRadius: number;
  /** 0..1 how fast it moves (a flame crest streams back). */
  readonly motion: number;
  /** 0..1 red glow in a mask's eyes (Shroud's charged Death Mark). */
  readonly eyeGlow?: number;
  /** A temporary tint over the whole body (a fury buff flushing red), 0..1. */
  readonly tint?: { readonly colour: number; readonly k: number };
  /** Draws the fighter's own head style (skins with `head: 'own'`), after the body, before the near arm. */
  readonly drawHead?: () => void;
  /** 0..1 how far the wings are spread (0 folded against the back); winged skins only. */
  readonly wingSpread?: number;
  /** 0..1 how hard the wings beat (momentum, flight). */
  readonly wingFlap?: number;
  /** 0..1 how far the armour plates have extended and locked (Reinforced Plating); 0 = folded away. */
  readonly plating?: number;
  /** A crystal weapon grown from his arms (Prismor): which one, and how fully formed (0..1). */
  readonly weapon?: { readonly kind: string; readonly form: number } | null;
  /** 0..1 how fully the crystal armour has grown over his body (Prismor's Crystal Sovereign). */
  readonly crystalArmour?: number;
  /** The mouth is open in a roar or a thin screech (Reson), with how wide (0..1). */
  readonly shout?: { readonly kind: 'scream' | 'screech'; readonly k: number } | null;
  /**
   * The body turned towards the camera (select screen, owner 13/11/2026): the torso and garment
   * are drawn this much wider, as the chest is seen more from the front. 1 = profile.
   */
  readonly bodyWidthK?: number;
}

const toward = (colour: number, target: number, k: number): number => {
  if (k <= 0) return colour;
  const kk = Math.min(1, k);
  const ch = (c: number, s: number) => (c >> s) & 0xff;
  const mix = (s: number) => Math.round(ch(colour, s) + (ch(target, s) - ch(colour, s)) * kk);
  return (mix(16) << 16) | (mix(8) << 8) | mix(0);
};

const lerp = (p: Point, q: Point, k: number): Point => ({ x: p.x + (q.x - p.x) * k, y: p.y + (q.y - p.y) * k });

/** Unit direction and normal of p→q. */
function frame(p: Point, q: Point): { ux: number; uy: number; nx: number; ny: number; l: number } {
  const dx = q.x - p.x;
  const dy = q.y - p.y;
  const l = Math.hypot(dx, dy) || 1e-6;
  return { ux: dx / l, uy: dy / l, nx: -dy / l, ny: dx / l, l };
}

/** A filled tapered capsule p→q with end radii ra, rb. */
function capsule(g: Graphics, p: Point, q: Point, ra: number, rb: number, colour: number, alpha = 1): void {
  const { nx, ny } = frame(p, q);
  g.poly([
    p.x + nx * ra,
    p.y + ny * ra,
    q.x + nx * rb,
    q.y + ny * rb,
    q.x - nx * rb,
    q.y - ny * rb,
    p.x - nx * ra,
    p.y - ny * ra,
  ])
    .circle(p.x, p.y, ra)
    .circle(q.x, q.y, rb)
    .fill({ color: colour, alpha });
}

/** A tapered band p→q with flat ends (shorts legs, bracers, guards). */
function sleeveQuad(g: Graphics, p: Point, q: Point, ra: number, rb: number, colour: number, alpha = 1): void {
  const { nx, ny } = frame(p, q);
  g.poly([
    p.x + nx * ra,
    p.y + ny * ra,
    q.x + nx * rb,
    q.y + ny * rb,
    q.x - nx * rb,
    q.y - ny * rb,
    p.x - nx * ra,
    p.y - ny * ra,
  ]).fill({
    color: colour,
    alpha,
  });
}

/** An oval centred at c, its long axis along (ux, uy), half-lengths a (along) and b (across). */
/** The mask's lean (its oval axes): a little forward, so the face tips down. */
const MASK_TILT = 0.34;

function oval(g: Graphics, c: Point, ux: number, uy: number, a: number, b: number, colour: number, alpha = 1): void {
  const pts: number[] = [];
  for (let i = 0; i < 18; i++) {
    const th = (i / 18) * Math.PI * 2;
    const ca = Math.cos(th) * a;
    const sb = Math.sin(th) * b;
    pts.push(c.x + ux * ca - uy * sb, c.y + uy * ca + ux * sb);
  }
  g.poly(pts).fill({ color: colour, alpha });
}

/** A band along p→q on one side of the axis, between fractions `from`..`to` of the radius. */
function band(
  g: Graphics,
  p: Point,
  q: Point,
  ra: number,
  rb: number,
  side: number,
  from: number,
  to: number,
  colour: number,
  alpha: number,
): void {
  const { nx, ny } = frame(p, q);
  const s = side;
  g.poly([
    p.x + nx * ra * from * s,
    p.y + ny * ra * from * s,
    q.x + nx * rb * from * s,
    q.y + ny * rb * from * s,
    q.x + nx * rb * to * s,
    q.y + ny * rb * to * s,
    p.x + nx * ra * to * s,
    p.y + ny * ra * to * s,
  ]).fill({ color: colour, alpha });
}

export class PremiumModel {
  private readonly P: PremiumPalette;

  constructor(private readonly skin: PremiumSkin) {
    this.P = skin.palette;
  }

  /** Local light direction (toward the light): up and to the screen's left whichever way he faces. */
  private lx = -0.55;
  private ly = -0.83;
  private st!: PremiumDrawState;

  /**
   * Draw the whole body. `g` is the body layer (normal blending), `fire` the additive glow layer.
   * Order: far arm and leg, torso, near leg, head, near arm (the head sits behind the near arm).
   */
  draw(g: Graphics, fire: Graphics, s: Skel, st: PremiumDrawState): void {
    // The model's width unit is the rig's thin limb line times the skin's build.
    this.st = { ...st, w: st.w * this.skin.bulk };
    this.lx = -0.55 * st.facing;
    this.ly = -0.83;
    if (this.skin.halo) this.halo(g, fire, s);
    if (this.skin.backpack) this.backpack(g, fire, s);
    if (this.skin.clockDisc) this.clockDisc(g, fire, s);
    if (this.skin.fragments) this.fragments(g, fire, s, false);
    if (this.skin.wings) this.wings(g, fire, s);
    this.arm(g, fire, s.armBack, true);
    if (this.skin.gauntlets) this.gauntlet(g, fire, s.armBack, true);
    const coated = this.skin.garment?.hem === 'coat';
    // An open coat wraps the legs: its back tail and lining first (behind both legs), the front panels and belt last.
    if (coated) this.coatBack(g, s);
    this.leg(g, fire, s.legBack, true);
    if (coated) {
      this.leg(g, fire, s.legFront, false);
      this.torso(g, fire, s);
      this.coatFront(g, s);
    } else if (this.skin.garment) {
      // A long garment hangs over both legs, under the torso.
      this.leg(g, fire, s.legFront, false);
      this.garment(g, s);
      this.torso(g, fire, s);
    } else {
      this.torso(g, fire, s);
      this.leg(g, fire, s.legFront, false);
      if (this.skin.tassets) this.tassets(g, s);
    }
    const hs = this.skin.head;
    if (hs === 'crest' || hs === 'brute') this.head(g, fire, s, hs);
    else if (hs === 'cowl' || hs === 'mask') this.hooded(g, fire, s, hs);
    else if (hs === 'egg') this.egg(g, s);
    else if (hs === 'gasmask') this.gasMask(g, fire, s);
    else {
      this.neck(g, s);
      st.drawHead?.();
      if (this.skin.helm) this.helm(g, s);
      if (this.skin.psyEye !== undefined) this.psyEye(g, fire, s);
      if (this.skin.crown) this.crown(g, fire, s);
      if (this.st.shout) this.shoutMouth(g, fire, s);
    }
    this.arm(g, fire, s.armFront, false);
    if (this.skin.gauntlets) this.gauntlet(g, fire, s.armFront, false);
    if (this.skin.dial) this.dial(g, fire, s.armFront);
    if (this.skin.soundGear) this.soundGear(g, fire, s);
    if (this.skin.machineArm) this.machineArm(g, fire, s.armFront);
    if (this.skin.crystalArm) this.crystalArm(g, fire, s.armFront);
    if ((this.st.crystalArmour ?? 0) > 0.02) this.crystalArmourOverlay(g, fire, s);
    if (this.st.weapon) this.crystalWeapon(g, fire, s);
    if ((this.st.plating ?? 0) > 0.02) this.platingOverlay(g, fire, s);
    if (this.skin.handGlow !== undefined) this.handGlow(fire, s);
    if (this.skin.fragments) this.fragments(g, fire, s, true);
  }

  /** The ring behind the shoulders: two turning rings with tick marks and a core glow, always facing us. */
  private halo(g: Graphics, fire: Graphics, s: Skel): void {
    const h = this.skin.halo;
    if (!h) return;
    const { t, w } = this.st;
    const cx = s.chest.x - 0.1;
    const cy = s.chest.y - 0.08;
    const r = 0.48;
    fire.circle(cx, cy, r * 1.15).fill({ color: h.glow, alpha: 0.12 });
    g.circle(cx, cy, r).stroke({ width: w * 0.2, color: this.c(h.ring), alpha: 0.9 });
    g.circle(cx, cy, r * 0.82).stroke({ width: w * 0.12, color: this.c(h.glow), alpha: 0.8 });
    fire.circle(cx, cy, r).stroke({ width: w * 0.35, color: h.glow, alpha: 0.3 });
    // Tick marks turning on the outer ring, and three segments turning the other way on the inner one.
    for (let i = 0; i < 12; i++) {
      const a = t * 0.5 + (i * Math.PI) / 6;
      g.moveTo(cx + Math.cos(a) * r * 0.92, cy + Math.sin(a) * r * 0.92)
        .lineTo(cx + Math.cos(a) * r * 1.08, cy + Math.sin(a) * r * 1.08)
        .stroke({ width: w * 0.1, color: this.c(h.ring), alpha: 0.9 });
    }
    for (let i = 0; i < 3; i++) {
      const a = -t * 0.8 + (i * Math.PI * 2) / 3;
      const pts: number[] = [];
      for (let k = 0; k <= 6; k++)
        pts.push(cx + Math.cos(a + k * 0.12) * r * 0.62, cy + Math.sin(a + k * 0.12) * r * 0.62);
      g.poly(pts, false).stroke({ width: w * 0.16, color: this.c(h.glow), alpha: 0.9 });
    }
  }

  /** The clock face behind him: a bronze rim with twelve marks, an hour and a minute hand turning slowly, a quick second hand. */
  private clockDisc(g: Graphics, fire: Graphics, s: Skel): void {
    const cd = this.skin.clockDisc;
    if (!cd) return;
    const { t, w } = this.st;
    const cx = s.chest.x - 0.14;
    const cy = s.chest.y - 0.05;
    const r = 0.46;
    fire.circle(cx, cy, r * 1.15).fill({ color: cd.cyan, alpha: 0.1 });
    g.circle(cx, cy, r + w * 0.15).fill(this.c(this.P.outline));
    g.circle(cx, cy, r).fill({ color: this.c(cd.bronze), alpha: 0.28 });
    g.circle(cx, cy, r).stroke({ width: w * 0.2, color: this.c(cd.bronze), alpha: 0.9 });
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      const r0 = r * (i % 3 === 0 ? 0.74 : 0.84);
      g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0)
        .lineTo(cx + Math.cos(a) * r * 0.96, cy + Math.sin(a) * r * 0.96)
        .stroke({ width: w * (i % 3 === 0 ? 0.16 : 0.1), color: this.c(cd.bronze), alpha: 0.9 });
    }
    const hand = (a: number, len: number, wd: number, colour: number) =>
      g
        .moveTo(cx, cy)
        .lineTo(cx + Math.cos(a - Math.PI / 2) * r * len, cy + Math.sin(a - Math.PI / 2) * r * len)
        .stroke({ width: w * wd, color: colour, alpha: 0.95, cap: 'round' });
    hand(t * 0.05, 0.5, 0.17, this.c(cd.bronze));
    hand(t * 0.6, 0.72, 0.12, this.c(cd.bronze));
    hand(Math.round(t * 1) * 0.6, 0.8, 0.07, cd.cyan);
    g.circle(cx, cy, w * 0.2).fill(cd.cyan);
  }

  /** The temporal device: a dial on the forearm, bronze rim, cyan hands, a crystal that pulses. */
  private dial(g: Graphics, fire: Graphics, pts: readonly Point[]): void {
    const d = this.skin.dial;
    if (!d) return;
    const [, el, hand] = pts as [Point, Point, Point];
    const { w, t } = this.st;
    const c = lerp(el, hand, 0.5);
    const r = w * 1.15;
    const out = this.c(this.P.outline);
    g.circle(c.x, c.y, r + w * 0.2).fill(out);
    g.circle(c.x, c.y, r).fill(this.c(d.bronze));
    g.circle(c.x, c.y, r * 0.78).fill(0x0c1a1f);
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      g.moveTo(c.x + Math.cos(a) * r * 0.62, c.y + Math.sin(a) * r * 0.62)
        .lineTo(c.x + Math.cos(a) * r * 0.74, c.y + Math.sin(a) * r * 0.74)
        .stroke({ width: w * 0.06, color: d.cyan, alpha: 0.8 });
    }
    const a1 = t * 0.9;
    const a2 = Math.round(t * 2) * 0.5;
    g.moveTo(c.x, c.y)
      .lineTo(c.x + Math.cos(a1) * r * 0.62, c.y + Math.sin(a1) * r * 0.62)
      .stroke({ width: w * 0.1, color: d.cyan, cap: 'round' });
    g.moveTo(c.x, c.y)
      .lineTo(c.x + Math.cos(a2) * r * 0.4, c.y + Math.sin(a2) * r * 0.4)
      .stroke({ width: w * 0.1, color: this.c(d.bronze), cap: 'round' });
    g.circle(c.x, c.y, w * 0.13).fill(0xf0fdff);
    fire.circle(c.x, c.y, r * (1.3 + 0.3 * Math.sin(t * 4))).fill({ color: d.cyan, alpha: 0.2 });
  }

  /** A resonance device on the forearm: a dark steel ring round the arm, a cyan core pulsing, and wave rings spreading off it. */
  private gauntlet(g: Graphics, fire: Graphics, pts: readonly Point[], far: boolean): void {
    const gt = this.skin.gauntlets;
    if (!gt) return;
    const [, el, hand] = pts as [Point, Point, Point];
    const { w, t } = this.st;
    const out = this.c(this.P.outline);
    const c = lerp(el, hand, 0.52);
    const r = w * 0.95;
    const pulse = 0.5 + 0.5 * Math.sin(t * 6 + (far ? 1.2 : 0));
    g.circle(c.x, c.y, r + w * 0.2).fill(out);
    g.circle(c.x, c.y, r).fill(this.c(gt.steel));
    g.circle(c.x, c.y, r * 0.66).fill(out);
    g.circle(c.x, c.y, r * 0.5).fill({ color: gt.ring, alpha: 0.5 + 0.5 * pulse });
    fire.circle(c.x, c.y, r * (1.4 + 0.5 * pulse)).fill({ color: gt.ring, alpha: far ? 0.1 : 0.16 });
    fire
      .circle(c.x, c.y, r * (1.5 + 0.9 * ((t * 1.6) % 1)))
      .stroke({ width: w * 0.12, color: gt.ring, alpha: 0.5 * (1 - ((t * 1.6) % 1)) });
  }

  /** Geometric sound gear: hexagonal emitter plates on the shoulders and cyan wave arcs across the chest. */
  private soundGear(g: Graphics, fire: Graphics, s: Skel): void {
    const sg = this.skin.soundGear;
    if (!sg) return;
    const { w, t } = this.st;
    const out = this.c(this.P.outline);
    const hex = (x: number, y: number, r: number, colour: number) =>
      g
        .poly(
          Array.from({ length: 6 }, (_, n) => [
            x + Math.cos((n * Math.PI) / 3) * r,
            y + Math.sin((n * Math.PI) / 3) * r,
          ]).flat(),
        )
        .fill(colour);
    for (const sh of [s.armFront[0]!, s.armBack[0]!]) {
      hex(sh.x, sh.y - w * 0.3, w * 0.95, out);
      hex(sh.x, sh.y - w * 0.3, w * 0.75, this.c(sg.plate));
      hex(sh.x, sh.y - w * 0.3, w * 0.35, sg.glow);
    }
    const cx = s.chest.x + 0.02;
    const cy = s.chest.y + 0.03;
    for (let i = 0; i < 3; i++) {
      const ph = (t * 1.2 + i / 3) % 1;
      fire.arc(cx, cy, 0.05 + ph * 0.16, -0.9, 0.9).stroke({ width: w * 0.1, color: sg.glow, alpha: 0.7 * (1 - ph) });
    }
  }

  /** An open mouth on the face side of the head: a wide dark oval for a roar, a small tight one for a screech, with rings of sound leaving it. */
  private shoutMouth(g: Graphics, fire: Graphics, s: Skel): void {
    const sh = this.st.shout;
    if (!sh) return;
    const { headRadius: r, w, t } = this.st;
    const open = sh.k * (0.7 + 0.3 * Math.sin(t * (sh.kind === 'scream' ? 22 : 40)));
    const mx = s.head.x + r * 0.62;
    const my = s.head.y + r * 0.34;
    const wide = sh.kind === 'scream' ? 0.5 : 0.22;
    const tall = sh.kind === 'scream' ? 0.62 : 0.3;
    g.ellipse(mx, my, r * wide * (0.6 + open * 0.4), r * tall * (0.4 + open * 0.6)).fill(0x04080a);
    g.ellipse(mx, my, r * wide * (0.6 + open * 0.4), r * tall * (0.4 + open * 0.6)).stroke({
      width: w * 0.1,
      color: this.c(this.P.rim),
      alpha: 0.9,
    });
    for (let i = 0; i < 2; i++) {
      const ph = (t * (sh.kind === 'scream' ? 2.2 : 3.4) + i * 0.5) % 1;
      fire
        .arc(mx, my, r * (0.5 + ph * 1.4), -0.7, 0.7)
        .stroke({ width: w * 0.12, color: this.P.glow ?? 0x19c4e0, alpha: sh.k * 0.7 * (1 - ph) });
    }
  }

  /** One faceted crystal piece: a translucent purple-blue body, a lit facet, a dark edge and a pale inner highlight. */
  private crystal(g: Graphics, fire: Graphics, pts: readonly Point[], body: number, glow: number, alpha = 0.82): void {
    const flat = pts.flatMap((p) => [p.x, p.y]);
    const { w } = this.st;
    g.poly(flat).fill({ color: body, alpha });
    // The lit facet: the first half of the points, lighter.
    const half = pts.slice(0, Math.max(3, Math.ceil(pts.length / 2)));
    const c = pts.reduce((a, p) => ({ x: a.x + p.x / pts.length, y: a.y + p.y / pts.length }), { x: 0, y: 0 });
    g.poly([c.x, c.y, ...half.flatMap((p) => [p.x, p.y])]).fill({ color: 0xe9e2ff, alpha: 0.28 });
    g.poly(flat).stroke({ width: w * 0.12, color: 0x1b1450, alpha: 0.95, join: 'round' });
    fire.poly(flat).fill({ color: glow, alpha: 0.12 });
  }

  /** A blade grown from `at` along `ang`: faceted, tapering to a point, `len` long when full, `wid` wide. */
  private crystalBlade(
    g: Graphics,
    fire: Graphics,
    at: Point,
    ang: number,
    len: number,
    wid: number,
    form: number,
  ): void {
    const L = len * form;
    if (L < 0.03) return;
    const ux = Math.cos(ang);
    const uy = Math.sin(ang);
    const nx = -uy;
    const ny = ux;
    const q = (a: number, b: number): Point => ({ x: at.x + ux * a + nx * b, y: at.y + uy * a + ny * b });
    this.crystal(
      g,
      fire,
      [
        q(0, -wid / 2),
        q(L * 0.18, -wid * 0.62),
        q(L * 0.92, -wid * 0.2),
        q(L, 0),
        q(L * 0.92, wid * 0.2),
        q(L * 0.18, wid * 0.62),
        q(0, wid / 2),
      ],
      0x6f64ff,
      0x4aa8ff,
    );
    g.moveTo(q(L * 0.05, 0).x, q(L * 0.05, 0).y)
      .lineTo(q(L * 0.95, 0).x, q(L * 0.95, 0).y)
      .stroke({ width: this.st.w * 0.08, color: 0xe9e2ff, alpha: 0.7 });
    // The growing tip glows while the blade is still forming.
    if (form < 0.98)
      fire
        .circle(q(L, 0).x, q(L, 0).y, wid * (0.6 + (1 - form)))
        .fill({ color: 0x9fd8ff, alpha: 0.5 * (1 - form) + 0.1 });
  }

  /** The direction a forearm points, radians. */
  private armAngle(pts: readonly Point[]): number {
    const [, el, hand] = pts as [Point, Point, Point];
    return Math.atan2(hand.y - el.y, hand.x - el.x);
  }

  /** Crystal weapons, each grown from the arm or arms it belongs to and held in them (Prismor). */
  private crystalWeapon(g: Graphics, fire: Graphics, s: Skel): void {
    const wp = this.st.weapon;
    if (!wp) return;
    const { w } = this.st;
    const f = wp.form;
    const handF = s.armFront[2]!;
    const handB = s.armBack[2]!;
    const angF = this.armAngle(s.armFront);
    const angB = this.armAngle(s.armBack);
    const mid = { x: (handF.x + handB.x) / 2, y: (handF.y + handB.y) / 2 };
    // Both hands carry one blade: the average of the two forearm directions.
    const both = Math.atan2(Math.sin(angF) + Math.sin(angB), Math.cos(angF) + Math.cos(angB));
    switch (wp.kind) {
      case 'greatsword': {
        this.crystalBlade(g, fire, mid, both, 1.6, 0.3, f);
        // A crossguard of two crystal wings where the hands grip, and both fists wrapped round the hilt.
        const nx = -Math.sin(both);
        const ny = Math.cos(both);
        this.crystal(
          g,
          fire,
          [
            { x: mid.x + nx * 0.28 * f, y: mid.y + ny * 0.28 * f },
            { x: mid.x + Math.cos(both) * 0.1, y: mid.y + Math.sin(both) * 0.1 },
            { x: mid.x - nx * 0.28 * f, y: mid.y - ny * 0.28 * f },
          ],
          0x4aa8ff,
          0x7b5cff,
          0.9,
        );
        break;
      }
      case 'dualBlades':
        this.crystalBlade(g, fire, handF, angF, 0.8, 0.14, f);
        this.crystalBlade(g, fire, handB, angB, 0.8, 0.14, f);
        break;
      case 'lance': {
        const el = s.armFront[1]!;
        const start = { x: el.x + (handF.x - el.x) * 0.4, y: el.y + (handF.y - el.y) * 0.4 };
        const reach = Math.hypot(handF.x - start.x, handF.y - start.y);
        this.crystalBlade(g, fire, start, angF, (reach + 1.9) * 1, 0.2, f);
        break;
      }
      case 'warhammer': {
        const el = s.armFront[1]!;
        const ux = Math.cos(angF);
        const uy = Math.sin(angF);
        const nx = -uy;
        const ny = ux;
        const hs = { x: el.x + (handF.x - el.x) * 0.25, y: el.y + (handF.y - el.y) * 0.25 };
        const he = { x: handF.x + ux * 0.5 * f, y: handF.y + uy * 0.5 * f };
        g.moveTo(hs.x, hs.y)
          .lineTo(he.x, he.y)
          .stroke({ width: w * 0.5, color: 0x1b1450, cap: 'round' });
        g.moveTo(hs.x, hs.y)
          .lineTo(he.x, he.y)
          .stroke({ width: w * 0.32, color: 0x8a7cff, alpha: 0.9, cap: 'round' });
        const q = (a: number, b: number): Point => ({
          x: handF.x + ux * a * f + nx * b * f,
          y: handF.y + uy * a * f + ny * b * f,
        });
        // The head forms round the fist: a heavy faceted block.
        this.crystal(
          g,
          fire,
          [
            q(-0.2, -0.42),
            q(0.12, -0.5),
            q(0.42, -0.34),
            q(0.46, 0.0),
            q(0.42, 0.34),
            q(0.12, 0.5),
            q(-0.2, 0.42),
            q(-0.28, 0),
          ],
          0x6f64ff,
          0x4aa8ff,
          0.88,
        );
        break;
      }
      case 'shield':
      case 'sovereign':
        this.crystalShield(g, fire, s, wp.kind === 'sovereign' ? 0.62 : 1, f);
        if (wp.kind === 'sovereign') this.crystalBlade(g, fire, handB, angB, 1.05, 0.17, f);
        break;
    }
  }

  /** A large angular shield growing from the oversized forearm, standing across the way the arm points. */
  private crystalShield(g: Graphics, fire: Graphics, s: Skel, size: number, form: number): void {
    const [, el, hand] = s.armFront as [Point, Point, Point];
    const ang = Math.atan2(hand.y - el.y, hand.x - el.x);
    const ux = Math.cos(ang);
    const uy = Math.sin(ang);
    const nx = -uy;
    const ny = ux;
    const k = size * form;
    const c = { x: hand.x + ux * 0.04, y: hand.y + uy * 0.04 };
    const q = (a: number, b: number): Point => ({ x: c.x + ux * a * k + nx * b * k, y: c.y + uy * a * k + ny * b * k });
    this.crystal(
      g,
      fire,
      [q(0.2, 0.64), q(0.3, 0.2), q(0.22, -0.52), q(0.02, -0.68), q(-0.12, -0.05), q(0, 0.56)],
      0x6f64ff,
      0x4aa8ff,
      0.8,
    );
    g.moveTo(q(0.12, 0.5).x, q(0.12, 0.5).y)
      .lineTo(q(0.18, -0.55).x, q(0.18, -0.55).y)
      .stroke({ width: this.st.w * 0.08, color: 0xe9e2ff, alpha: 0.6 });
  }

  /** The oversized crystal arm: a thick faceted upper arm, a huge forearm and a fist of crystal, a crystal at the shoulder. */
  private crystalArm(g: Graphics, fire: Graphics, pts: readonly Point[]): void {
    const ca = this.skin.crystalArm;
    if (!ca) return;
    const [sh, el, hand] = pts as [Point, Point, Point];
    const { w, t } = this.st;
    sleeveQuad(g, lerp(sh, el, 0.05), lerp(sh, el, 0.95), w * 1.3, w * 1.2, 0x1b1450);
    sleeveQuad(g, lerp(sh, el, 0.05), lerp(sh, el, 0.95), w * 1.05, w * 0.95, ca.body, 0.9);
    sleeveQuad(g, lerp(el, hand, 0.0), lerp(el, hand, 0.8), w * 1.8, w * 1.6, 0x1b1450);
    sleeveQuad(g, lerp(el, hand, 0.0), lerp(el, hand, 0.8), w * 1.5, w * 1.3, ca.body, 0.9);
    const ang = Math.atan2(hand.y - el.y, hand.x - el.x);
    const q = (a: number, b: number): Point => ({
      x: hand.x + Math.cos(ang) * a - Math.sin(ang) * b,
      y: hand.y + Math.sin(ang) * a + Math.cos(ang) * b,
    });
    this.crystal(
      g,
      fire,
      [q(-0.12, -0.2), q(0.1, -0.26), q(0.26, -0.1), q(0.28, 0.12), q(0.1, 0.26), q(-0.12, 0.2)],
      ca.edge,
      ca.glow,
      0.92,
    );
    this.crystal(
      g,
      fire,
      [
        { x: sh.x - w * 0.2, y: sh.y - w * 1.6 },
        { x: sh.x + w * 0.9, y: sh.y - w * 0.2 },
        { x: sh.x - w * 0.6, y: sh.y + w * 0.2 },
      ],
      ca.edge,
      ca.glow,
      0.9,
    );
    // Light turning slowly inside the crystal.
    const lit = lerp(el, hand, 0.4 + 0.2 * Math.sin(t * 1.5));
    fire.circle(lit.x, lit.y, w * 1.1).fill({ color: ca.glow, alpha: 0.18 });
  }

  /** Crystal armour grown over the body: a chest crystal, shoulder crystals and thigh plates, flashing where it takes a blow. */
  private crystalArmourOverlay(g: Graphics, fire: Graphics, s: Skel): void {
    const k = Math.min(1, this.st.crystalArmour ?? 0);
    const { w } = this.st;
    const c = { x: (s.chest.x + s.pelvis.x) / 2, y: (s.chest.y + s.pelvis.y) / 2 };
    const sc = (p: Point, o: Point): Point => ({
      x: c.x + (p.x - c.x) * k + o.x * k,
      y: c.y + (p.y - c.y) * k + o.y * k,
    });
    this.crystal(
      g,
      fire,
      [
        sc(c, { x: 0, y: -0.34 }),
        sc(c, { x: 0.2, y: -0.1 }),
        sc(c, { x: 0.12, y: 0.22 }),
        sc(c, { x: -0.12, y: 0.22 }),
        sc(c, { x: -0.2, y: -0.1 }),
      ],
      0x6f64ff,
      0x4aa8ff,
      0.7,
    );
    for (const arm of [s.armFront, s.armBack]) {
      const sh = arm[0]!;
      this.crystal(
        g,
        fire,
        [
          { x: sh.x - w * 0.9 * k, y: sh.y - w * 1.5 * k },
          { x: sh.x + w * 0.9 * k, y: sh.y - w * 0.3 * k },
          { x: sh.x - w * 0.5 * k, y: sh.y + w * 0.5 * k },
        ],
        0x6f64ff,
        0x4aa8ff,
        0.8,
      );
    }
    for (const leg of [s.legFront, s.legBack]) {
      const th = lerp(leg[0]!, leg[1]!, 0.5);
      this.crystal(
        g,
        fire,
        [
          { x: th.x - w * 0.9 * k, y: th.y - w * 1.2 * k },
          { x: th.x + w * 0.9 * k, y: th.y },
          { x: th.x - w * 0.4 * k, y: th.y + w * 1.2 * k },
        ],
        0x4aa8ff,
        0x7b5cff,
        0.7,
      );
    }
  }

  /** The crystal crown: five sharp points rising from the head. */
  private crown(g: Graphics, fire: Graphics, s: Skel): void {
    const cr = this.skin.crown;
    if (!cr) return;
    const { headRadius: r } = this.st;
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.42;
      const base = { x: s.head.x + Math.cos(a) * r * 0.95, y: s.head.y + Math.sin(a) * r * 0.95 };
      const tip = {
        x: s.head.x + Math.cos(a) * r * (1.55 + (i % 2 === 0 ? 0.35 : 0)),
        y: s.head.y + Math.sin(a) * r * (1.55 + (i % 2 === 0 ? 0.35 : 0)),
      };
      const nx = -Math.sin(a) * r * 0.2;
      const ny = Math.cos(a) * r * 0.2;
      this.crystal(
        g,
        fire,
        [{ x: base.x - nx, y: base.y - ny }, tip, { x: base.x + nx, y: base.y + ny }],
        cr.body,
        cr.glow,
        0.88,
      );
    }
  }

  /** The tool backpack: a boxy steel shell on the back with a tool rack, an antenna and a blinking status light. */
  private backpack(g: Graphics, fire: Graphics, s: Skel): void {
    const b = this.skin.backpack;
    if (!b) return;
    const { t, w } = this.st;
    const out = this.c(this.P.outline);
    const cx = s.chest.x - 0.2;
    const cy = (s.chest.y + s.pelvis.y) / 2 - 0.03;
    const hw = 0.13;
    const hh = 0.24;
    g.roundRect(cx - hw - w * 0.18, cy - hh - w * 0.18, hw * 2 + w * 0.36, hh * 2 + w * 0.36, 0.05).fill(out);
    g.roundRect(cx - hw, cy - hh, hw * 2, hh * 2, 0.04).fill(this.c(b.shell));
    g.roundRect(cx - hw * 0.7, cy - hh * 0.8, hw * 0.5, hh * 1.2, 0.02).fill({ color: this.c(b.trim), alpha: 0.9 });
    g.moveTo(cx - hw, cy)
      .lineTo(cx + hw, cy)
      .stroke({ width: w * 0.14, color: out });
    g.moveTo(cx + hw * 0.4, cy - hh)
      .lineTo(cx + hw * 0.7, cy - hh - 0.26)
      .stroke({ width: w * 0.12, color: this.c(b.trim) });
    const blink = 0.5 + 0.5 * Math.sin(t * 3.2);
    g.circle(cx + hw * 0.7, cy - hh - 0.26, w * 0.2).fill(b.light);
    fire.circle(cx + hw * 0.7, cy - hh - 0.26, w * (0.5 + blink * 0.6)).fill({ color: b.light, alpha: 0.35 });
    g.circle(cx + hw * 0.3, cy + hh * 0.55, w * 0.16).fill(b.light);
  }

  /** The machine arm: steel segments over the near arm, a piston along the forearm, a blocky fist, bolts and a stripe. */
  private machineArm(g: Graphics, fire: Graphics, pts: readonly Point[]): void {
    const m = this.skin.machineArm;
    if (!m) return;
    const [sh, el, hand] = pts as [Point, Point, Point];
    const { w, t } = this.st;
    const out = this.c(this.P.outline);
    const steel = this.c(m.steel);
    const upperA = lerp(sh, el, 0.1);
    const upperB = lerp(sh, el, 0.9);
    sleeveQuad(g, upperA, upperB, w * 0.86, w * 0.78, out);
    sleeveQuad(g, upperA, upperB, w * 0.7, w * 0.64, steel);
    const fa = lerp(el, hand, 0.08);
    const fb = lerp(el, hand, 0.78);
    sleeveQuad(g, fa, fb, w * 0.98, w * 0.9, out);
    sleeveQuad(g, fa, fb, w * 0.8, w * 0.72, steel);
    // The orange stripe, the piston rod alongside, and a joint ring at the elbow.
    const f = frame(el, hand);
    const s1 = lerp(el, hand, 0.2);
    const s2 = lerp(el, hand, 0.72);
    g.moveTo(s1.x, s1.y)
      .lineTo(s2.x, s2.y)
      .stroke({ width: w * 0.2, color: m.stripe });
    g.moveTo(s1.x + f.nx * w * 0.5, s1.y + f.ny * w * 0.5)
      .lineTo(s2.x + f.nx * w * 0.5, s2.y + f.ny * w * 0.5)
      .stroke({ width: w * 0.1, color: this.c(this.P.armourLit) });
    g.circle(el.x, el.y, w * 0.62).fill(out);
    g.circle(el.x, el.y, w * 0.46).fill(steel);
    g.circle(el.x, el.y, w * 0.2).fill(m.stripe);
    // The fist: a squared block with knuckle bolts.
    const fist = lerp(el, hand, 1);
    const fu = { x: f.ux, y: f.uy };
    const fw = w * 0.95;
    g.poly([
      fist.x - fu.x * w * 0.5 + f.nx * fw,
      fist.y - fu.y * w * 0.5 + f.ny * fw,
      fist.x + fu.x * w * 0.7 + f.nx * fw * 0.9,
      fist.y + fu.y * w * 0.7 + f.ny * fw * 0.9,
      fist.x + fu.x * w * 0.7 - f.nx * fw * 0.9,
      fist.y + fu.y * w * 0.7 - f.ny * fw * 0.9,
      fist.x - fu.x * w * 0.5 - f.nx * fw,
      fist.y - fu.y * w * 0.5 - f.ny * fw,
    ]).fill(steel);
    g.poly([
      fist.x - fu.x * w * 0.5 + f.nx * fw,
      fist.y - fu.y * w * 0.5 + f.ny * fw,
      fist.x + fu.x * w * 0.7 + f.nx * fw * 0.9,
      fist.y + fu.y * w * 0.7 + f.ny * fw * 0.9,
      fist.x + fu.x * w * 0.7 - f.nx * fw * 0.9,
      fist.y + fu.y * w * 0.7 - f.ny * fw * 0.9,
      fist.x - fu.x * w * 0.5 - f.nx * fw,
      fist.y - fu.y * w * 0.5 - f.ny * fw,
    ]).stroke({ width: w * 0.2, color: out, join: 'round' });
    for (const k of [-0.5, 0.5])
      g.circle(fist.x + fu.x * w * 0.3 + f.nx * fw * k, fist.y + fu.y * w * 0.3 + f.ny * fw * k, w * 0.14).fill(
        m.stripe,
      );
    // Idle glow in the fist, and a glow in the elbow that pulses.
    fire.circle(fist.x, fist.y, w * (1.2 + 0.2 * Math.sin(t * 4))).fill({ color: m.stripe, alpha: 0.18 });
    fire.circle(el.x, el.y, w * 0.55).fill({ color: m.stripe, alpha: 0.18 + 0.1 * Math.sin(t * 3) });
  }

  /** Reinforced Plating: plates slide out from the backpack and lock on the shoulder, chest and arms as `plating` rises. */
  private platingOverlay(g: Graphics, fire: Graphics, s: Skel): void {
    const k = Math.min(1, this.st.plating ?? 0);
    const { w } = this.st;
    const out = this.c(this.P.outline);
    const plate = this.c(this.P.armourLit);
    const lit = this.c(0x9aa3b2);
    const slide = (1 - k) * 0.25; // plates start tucked in toward the back and slide forward
    const chest = { x: s.chest.x + slide * 0.5, y: s.chest.y };
    const hw = 0.21 * (0.5 + 0.5 * k);
    const hh = 0.34;
    g.roundRect(chest.x - hw - w * 0.15, chest.y - hh * 0.45 - w * 0.15, hw * 2 + w * 0.3, hh + w * 0.3, 0.04).fill(
      out,
    );
    g.roundRect(chest.x - hw, chest.y - hh * 0.45, hw * 2, hh, 0.035).fill(plate);
    g.roundRect(chest.x - hw * 0.6, chest.y - hh * 0.1, hw * 1.2, hh * 0.25, 0.02).fill({ color: lit, alpha: 0.9 });
    if (this.P.seam !== null)
      g.moveTo(chest.x - hw, chest.y + hh * 0.6)
        .lineTo(chest.x + hw, chest.y + hh * 0.6)
        .stroke({ width: w * 0.12, color: this.P.seam });
    for (const arm of [s.armFront, s.armBack]) {
      const [sh, el, hand] = arm as [Point, Point, Point];
      const a = lerp(sh, el, 0.05);
      const b = lerp(sh, el, 0.7);
      sleeveQuad(g, a, b, w * 1.0 * k, w * 0.85 * k, out);
      sleeveQuad(g, a, b, w * 0.8 * k, w * 0.68 * k, plate);
      const c = lerp(el, hand, 0.2);
      const d = lerp(el, hand, 0.8);
      sleeveQuad(g, c, d, w * 0.9 * k, w * 0.8 * k, out);
      sleeveQuad(g, c, d, w * 0.7 * k, w * 0.6 * k, lit);
      g.circle(sh.x, sh.y, w * 1.15 * k).fill(out);
      g.circle(sh.x, sh.y, w * 0.95 * k).fill(plate);
      g.circle(sh.x, sh.y, w * 0.4 * k).fill(this.P.seam ?? lit);
    }
    // A flash as each plate locks.
    if (k > 0.85 && k < 1)
      fire.circle(chest.x, chest.y, 0.35).fill({ color: this.P.glow ?? 0xff7a1a, alpha: (1 - k) * 4 });
  }

  /** Geometric fragments (small triangles and diamonds) orbiting the body, half behind it and half in front. */
  private fragments(g: Graphics, fire: Graphics, s: Skel, front: boolean): void {
    const f = this.skin.fragments;
    if (!f) return;
    const { t, w } = this.st;
    const cx = (s.pelvis.x + s.chest.x) / 2;
    const cy = (s.pelvis.y + s.chest.y) / 2;
    for (let i = 0; i < 8; i++) {
      const ang = t * (0.7 + (i % 3) * 0.15) + (i * Math.PI * 2) / 8;
      const inFront = Math.cos(ang) > 0;
      if (inFront !== front) continue;
      const rad = 0.5 + 0.12 * Math.sin(t * 1.3 + i);
      const px = cx + Math.sin(ang) * rad * 0.9;
      const py = cy + Math.cos(t * 0.9 + i * 1.7) * 0.42 - 0.05;
      const sz = w * (0.55 + 0.25 * ((i * 0.37) % 1));
      const rot = t * 1.4 + i;
      const pts = (i % 2 === 0 ? [0, -1, 0.9, 0.8, -0.9, 0.8] : [0, -1, 0.8, 0, 0, 1, -0.8, 0]).map((v, n) =>
        n % 2 === 0 ? px + (v * Math.cos(rot) - 0) * sz : py + v * sz,
      );
      fire.circle(px, py, sz * 1.6).fill({ color: f.glow, alpha: 0.18 });
      g.poly(pts).fill({ color: this.c(f.colour), alpha: 0.95 });
      g.poly(pts).stroke({ width: w * 0.1, color: this.c(this.P.outline), alpha: 0.9 });
    }
  }

  /** One glowing slanted eye on the head, towards the facing side. */
  private psyEye(g: Graphics, fire: Graphics, s: Skel): void {
    const colour = this.skin.psyEye;
    if (colour === undefined) return;
    const { headRadius: r, w } = this.st;
    const ex = s.head.x + r * 0.42;
    const ey = s.head.y - r * 0.1;
    fire.circle(ex, ey, r * 0.55).fill({ color: this.P.glow ?? 0x8a4fe0, alpha: 0.35 });
    g.poly([
      ex - r * 0.28,
      ey + r * 0.06,
      ex + r * 0.3,
      ey - r * 0.16,
      ex + r * 0.24,
      ey + r * 0.04,
      ex - r * 0.2,
      ey + r * 0.14,
    ]).fill(colour);
    fire.circle(ex + r * 0.04, ey - r * 0.04, r * 0.18).fill({ color: 0xffffff, alpha: 0.8 });
    g.moveTo(ex - r * 0.3, ey + r * 0.06)
      .lineTo(ex + r * 0.32, ey - r * 0.17)
      .stroke({ width: w * 0.1, color: this.c(this.P.outline) });
  }

  /** Psychic light pulsing round both hands. */
  private handGlow(fire: Graphics, s: Skel): void {
    const colour = this.skin.handGlow;
    if (colour === undefined) return;
    const { t, w } = this.st;
    for (const arm of [s.armFront, s.armBack]) {
      const h = arm[arm.length - 1]!;
      const pulse = 0.7 + 0.3 * Math.sin(t * 5 + h.x * 9);
      fire.circle(h.x, h.y, w * 1.9 * pulse).fill({ color: colour, alpha: 0.22 });
      fire.circle(h.x, h.y, w * 0.9 * pulse).fill({ color: 0xf4eaff, alpha: 0.5 });
    }
  }

  /** The kabuto: a domed bowl with a peak, a flaring neck guard behind, and two crescent horns on the brow. */
  private helm(g: Graphics, s: Skel): void {
    const helm = this.skin.helm;
    if (!helm) return;
    const { w, headRadius: r } = this.st;
    const hx = s.head.x;
    const hy = s.head.y;
    const dome: number[] = [];
    for (let i = 0; i <= 12; i++) {
      const a = Math.PI + (i / 12) * Math.PI * 1.04;
      dome.push(hx + Math.cos(a) * r * 1.14, hy - r * 0.05 + Math.sin(a) * r * 1.1);
    }
    const outline = this.c(this.P.outline);
    const neckGuard = [
      hx - r * 1.1,
      hy - r * 0.1,
      hx - r * 1.75,
      hy + r * 1.0,
      hx - r * 0.5,
      hy + r * 1.35,
      hx + r * 0.2,
      hy + r * 0.8,
    ];
    g.poly(neckGuard).fill(this.c(helm.armour));
    g.poly(neckGuard).stroke({ width: w * 0.3, color: outline, join: 'round' });
    for (let k = 1; k < 3; k++) {
      g.moveTo(hx - r * (1.2 + k * 0.2), hy + r * (0.2 + k * 0.3))
        .lineTo(hx - r * 0.2, hy + r * (0.55 + k * 0.28))
        .stroke({ width: w * 0.1, color: this.c(helm.trim), alpha: 0.9 });
    }
    g.poly(dome).fill(this.c(helm.armour));
    g.poly(dome).stroke({ width: w * 0.32, color: outline, join: 'round' });
    const peak = [hx + r * 0.9, hy - r * 0.25, hx + r * 1.55, hy - r * 0.05, hx + r * 0.9, hy + r * 0.12];
    g.poly(peak).fill(this.c(helm.armour));
    g.poly(peak).stroke({ width: w * 0.28, color: outline, join: 'round' });
    g.moveTo(hx - r * 1.05, hy - r * 0.15)
      .quadraticCurveTo(hx, hy - r * 0.3, hx + r * 1.2, hy - r * 0.12)
      .stroke({ width: w * 0.16, color: this.c(helm.trim) });
    for (const side of [-1, 1]) {
      g.moveTo(hx + r * 0.35, hy - r * 1.0)
        .quadraticCurveTo(hx + r * (0.5 + side * 0.15), hy - r * 1.9, hx + r * (1.25 + side * 0.65), hy - r * 2.15)
        .stroke({ width: w * 0.24, color: this.c(helm.trim), cap: 'round' });
    }
  }

  /** The waist cloth: a front and a rear flap from the belt, each following its leg to mid-thigh, with a gold-trimmed hem. */
  private tassets(g: Graphics, s: Skel): void {
    const t = this.skin.tassets;
    if (!t) return;
    const { w } = this.st;
    const flap = (leg: readonly Point[], far: boolean) => {
      const knee = leg[1]!;
      const tipX = s.pelvis.x + (knee.x - s.pelvis.x) * 0.78;
      const tipY = s.pelvis.y + (knee.y - s.pelvis.y) * 0.78;
      const half = w * 1.5;
      const pts = [
        s.pelvis.x - half,
        s.pelvis.y - w * 0.2,
        s.pelvis.x + half,
        s.pelvis.y - w * 0.2,
        tipX + half * 0.9,
        tipY,
        tipX - half * 0.9,
        tipY + w * 0.1,
      ];
      g.poly(pts).fill(this.c(far ? t.shade : t.cloth));
      g.poly(pts).stroke({ width: w * 0.22, color: this.c(this.P.outline), join: 'round' });
      g.moveTo(tipX - half * 0.9, tipY + w * 0.1)
        .lineTo(tipX + half * 0.9, tipY)
        .stroke({ width: w * 0.14, color: this.c(t.trim) });
    };
    flap(s.legBack, true);
    flap(s.legFront, false);
  }

  /** Where the hover lifts the figure when standing (render only). */
  get hoverM(): number {
    return this.skin.hoverM ?? 0;
  }

  /**
   * Layered feathered wings from the shoulder blades, behind the whole body. Folded (spread 0) they hang down the
   * back; spread (1) the leading edge lifts up and back and the feathers fan out. A beat sweeps the whole wing, and
   * the far wing sits a little higher, darker and out of step, so they read as a pair from the side.
   */
  private wings(g: Graphics, fire: Graphics, s: Skel): void {
    const wing = this.skin.wings;
    if (!wing) return;
    const { t, w } = this.st;
    const spread = Math.min(1, Math.max(-0.2, this.st.wingSpread ?? 0.3));
    const flap = this.st.wingFlap ?? 0;
    const root = {
      x: s.neck.x + (s.chest.x - s.neck.x) * 0.3 - w * 0.55,
      y: s.neck.y + (s.chest.y - s.neck.y) * 0.3,
    };
    const feathers = 7;
    for (const far of [true, false]) {
      const beat = Math.sin(t * (1.6 + flap * 5) + (far ? 0.9 : 0)) * (0.07 + flap * 0.2);
      // Angle from straight up, turning backward (so 180 degrees hangs straight down).
      const lead =
        ((165 - 105 * Math.max(0, spread)) * Math.PI) / 180 +
        beat -
        (far ? 0.14 : 0) +
        (spread < 0 ? -spread * 0.5 : 0);
      const fan = ((5 + 8 * Math.max(0, spread)) * Math.PI) / 180;
      const reach = 0.78 + 0.5 * Math.max(0, spread);
      const colour = this.c(far ? wing.featherShade : wing.feather);
      const ox = far ? w * 0.4 : 0;
      const oy = far ? -w * 0.5 : 0;
      for (let k = feathers - 1; k >= 0; k--) {
        const a = lead + k * fan;
        const len = reach * (1 - 0.38 * (k / (feathers - 1)));
        const ux = -Math.sin(a);
        const uy = -Math.cos(a);
        const px = -uy;
        const py = ux;
        const wd = w * (2.1 - 0.4 * (k / feathers));
        const sx = root.x + ox + ux * w * 0.5;
        const sy = root.y + oy + uy * w * 0.5;
        const mx = sx + ux * len * 0.55;
        const my = sy + uy * len * 0.55;
        const tx = sx + ux * len;
        const ty = sy + uy * len;
        const pts = [
          sx + px * wd * 0.35,
          sy + py * wd * 0.35,
          mx + px * wd,
          my + py * wd,
          tx,
          ty,
          mx - px * wd * 0.8,
          my - py * wd * 0.8,
          sx - px * wd * 0.35,
          sy - py * wd * 0.35,
        ];
        g.poly(pts).fill({ color: colour, alpha: 1 });
        g.poly(pts).stroke({ width: w * 0.28, color: this.c(wing.edge), alpha: far ? 0.8 : 1, join: 'round' });
        // The quill and a pale-blue light along each tip.
        g.moveTo(sx, sy)
          .lineTo(tx, ty)
          .stroke({ width: w * 0.1, color: this.c(wing.featherShade), alpha: 0.9 });
        fire
          .moveTo(mx, my)
          .lineTo(tx, ty)
          .stroke({ width: w * 0.22, color: wing.glow, alpha: (far ? 0.2 : 0.35) + flap * 0.25, cap: 'round' });
      }
    }
  }

  // ---------------------------------------------------------------- colour helpers

  private c(colour: number): number {
    const tinted = this.st.tint ? toward(colour, this.st.tint.colour, this.st.tint.k) : colour;
    return toward(tinted, this.st.flashColour, this.st.flash);
  }

  /** Which side of p→q faces the light: +1 or −1 (sign of the normal). */
  private litSide(p: Point, q: Point): number {
    const { nx, ny } = frame(p, q);
    return nx * this.lx + ny * this.ly >= 0 ? 1 : -1;
  }

  /**
   * A painted skin segment: outline, mid tone, shadow side, lit side, and a warm rim of fire-light
   * on the shadow edge. `far` darkens it (the limb on the far side of the body).
   */
  private flesh(g: Graphics, p: Point, q: Point, ra: number, rb: number, far: boolean): void {
    const o = this.st.w * 0.32;
    const base = this.c(far ? this.P.skinBack : this.P.skin);
    capsule(g, p, q, ra + o, rb + o, this.c(this.P.outline));
    capsule(g, p, q, ra, rb, base);
    const side = this.litSide(p, q);
    band(
      g,
      p,
      q,
      ra,
      rb,
      -side,
      0.2,
      1,
      this.c(far ? toward(this.P.skinShade, 0x000000, 0.25) : this.P.skinShade),
      0.85,
    );
    band(g, p, q, ra, rb, side, 0.1, 0.75, this.c(this.P.skinLit), far ? 0.35 : 0.7);
    band(g, p, q, ra, rb, -side, 0.84, 0.98, this.c(this.P.rim), far ? 0.25 : 0.55);
  }

  /** An armour plate along p→q (charcoal with a lit edge and a glowing seam). */
  private plate(
    g: Graphics,
    fire: Graphics,
    p: Point,
    q: Point,
    ra: number,
    rb: number,
    far: boolean,
    seam = true,
    sleeve = false,
  ): void {
    const o = this.st.w * 0.3;
    const shape = sleeve ? sleeveQuad : capsule;
    shape(g, p, q, ra + o, rb + o, this.c(this.P.armourEdge));
    shape(g, p, q, ra, rb, this.c(far ? toward(this.P.armour, 0x000000, 0.3) : this.P.armour));
    band(g, p, q, ra, rb, this.litSide(p, q), 0.25, 0.85, this.c(this.P.armourLit), far ? 0.4 : 0.8);
    if (!seam || this.P.seam === null) return;
    // The glowing seam down the plate's middle.
    const { nx, ny } = frame(p, q);
    const off = -this.litSide(p, q) * 0.15;
    fire
      .moveTo(p.x + nx * ra * off, p.y + ny * ra * off)
      .lineTo(q.x + nx * rb * off, q.y + ny * rb * off)
      .stroke({ width: this.st.w * 0.16, color: this.P.seam, alpha: far ? 0.35 : 0.75, cap: 'round' });
  }

  /** A muscle mass: an outlined oval, lit on the light side. */
  private muscle(g: Graphics, c: Point, ux: number, uy: number, a: number, b: number, far: boolean): void {
    const o = this.st.w * 0.28;
    oval(g, c, ux, uy, a + o, b + o, this.c(this.P.outline));
    oval(g, c, ux, uy, a, b, this.c(far ? this.P.skinBack : this.P.skin));
    // Highlight toward the light.
    const lit = { x: c.x + this.lx * b * 0.35, y: c.y + this.ly * b * 0.35 };
    oval(g, lit, ux, uy, a * 0.62, b * 0.5, this.c(this.P.skinLit), far ? 0.3 : 0.65);
  }

  /** A pulsing lava vein: a jagged glowing line from p to q. */
  private vein(fire: Graphics, p: Point, q: Point, seed: number, far: boolean): void {
    if (this.P.glow === null || this.P.lava === null) return;
    const { nx, ny } = frame(p, q);
    const t = this.st.t;
    const pulse = 0.55 + 0.3 * Math.sin(t * 5 + seed * 2.1) + 0.15 * Math.sin(t * 13 + seed);
    const pts: Point[] = [];
    for (let i = 0; i <= 4; i++) {
      const k = i / 4;
      const j = (i % 2 ? 1 : -1) * this.st.w * 0.12 * (0.6 + 0.4 * Math.sin(seed * 3 + i));
      pts.push({ x: p.x + (q.x - p.x) * k + nx * j, y: p.y + (q.y - p.y) * k + ny * j });
    }
    for (const [width, colour, alpha] of [
      [this.st.w * 0.34, this.P.glow, 0.25],
      [this.st.w * 0.12, this.P.lava, 0.9],
    ] as const) {
      fire.moveTo(pts[0]!.x, pts[0]!.y);
      for (const v of pts.slice(1)) fire.lineTo(v.x, v.y);
      fire.stroke({ width, color: colour, alpha: alpha * pulse * (far ? 0.5 : 1), cap: 'round', join: 'round' });
    }
  }

  // ---------------------------------------------------------------- body parts

  /** A ball joint (mannequin skins): a shaded sphere at the joint. */
  private joint(g: Graphics, c: Point, r: number, far: boolean): void {
    if (!this.skin.gear.joints) return;
    g.circle(c.x, c.y, r + this.st.w * 0.2).fill(this.c(this.P.outline));
    g.circle(c.x, c.y, r).fill(this.c(far ? toward(this.P.armour, 0x000000, 0.25) : this.P.armour));
    g.circle(c.x + this.lx * r * 0.3, c.y + this.ly * r * 0.3, r * 0.45).fill({
      color: this.c(this.P.armourLit),
      alpha: 0.8,
    });
  }

  private arm(g: Graphics, fire: Graphics, pts: readonly Point[], far: boolean): void {
    const [sh, el, hand] = pts as [Point, Point, Point];
    const w = this.st.w;
    const m = this.skin.muscle;
    const gear = this.skin.gear;
    // Upper arm with the biceps/triceps mass and a deltoid cap over the shoulder.
    this.flesh(g, sh, el, w * (0.5 + 0.16 * Math.min(1.4, m)), w * 0.47, far);
    const u = frame(sh, el);
    const bi = lerp(sh, el, 0.45);
    const front = this.litSide(sh, el);
    if (m > 0)
      this.muscle(
        g,
        { x: bi.x + u.nx * w * 0.08 * front, y: bi.y + u.ny * w * 0.08 * front },
        u.ux,
        u.uy,
        u.l * 0.3 * Math.min(1.25, m),
        w * 0.5 * m,
        far,
      );
    // Forearm, tapering to the wrist; bracers or wraps over its lower part; a flared sleeve cuff
    // on a robe or cloak.
    this.flesh(g, el, hand, w * 0.52, w * 0.4, far);
    if (gear.bracers)
      this.plate(g, fire, lerp(el, hand, 0.35), lerp(el, hand, 0.92), w * 0.5, w * 0.44, far, true, true);
    if (this.skin.garment) this.cuff(g, el, hand, far);
    if (this.skin.fire.veins) this.vein(fire, lerp(sh, el, 0.15), lerp(sh, el, 0.85), far ? 3 : 1, far);
    this.joint(g, el, w * 0.3, far);
    // The shoulder: an armour guard, a bone pauldron, a mannequin joint, or a deltoid cap.
    const capR = w * 0.55;
    const capC = lerp(sh, el, 0.12);
    if (!far && gear.shoulder === 'guard') {
      g.circle(capC.x, capC.y, capR + w * 0.22).fill(this.c(this.P.armourEdge));
      g.circle(capC.x, capC.y, capR).fill(this.c(this.P.armour));
      g.circle(capC.x + this.lx * capR * 0.3, capC.y + this.ly * capR * 0.3, capR * 0.55).fill({
        color: this.c(this.P.armourLit),
        alpha: 0.8,
      });
      if (this.P.seam !== null)
        fire.arc(capC.x, capC.y, capR * 0.82, Math.PI * 0.15, Math.PI * 0.95).stroke({
          width: w * 0.14,
          color: this.P.seam,
          alpha: 0.75,
        });
    } else if (!far && gear.shoulder === 'bone') {
      this.bonePauldron(g, sh);
    } else if (gear.joints) {
      // A brute's shoulder is a big round ball (Titan's reference); a mannequin's a small joint.
      this.joint(g, m > 1.2 ? capC : sh, m > 1.2 ? w * 0.66 : w * 0.36, far);
    } else if (m > 0) {
      this.muscle(g, capC, u.ux, u.uy, capR * Math.min(1.3, m), capR * 0.85 * Math.min(1.3, m), far);
    }
    this.fist(g, fire, el, hand, far);
  }

  /** A flared sleeve cuff at the wrist (robes and cloaks). */
  private cuff(g: Graphics, el: Point, hand: Point, far: boolean): void {
    const w = this.st.w;
    const u = frame(el, hand);
    const a = lerp(el, hand, 0.62);
    const b = lerp(el, hand, 1.02);
    const flare = this.skin.garment?.hem === 'tattered' ? 0.85 : 0.75;
    const pts = (grow: number) => [
      a.x + u.nx * (w * 0.5 + grow),
      a.y + u.ny * (w * 0.5 + grow),
      b.x + u.nx * (w * flare + grow),
      b.y + u.ny * (w * flare + grow),
      b.x - u.nx * (w * flare + grow),
      b.y - u.ny * (w * flare + grow),
      a.x - u.nx * (w * 0.5 + grow),
      a.y - u.ny * (w * 0.5 + grow),
    ];
    g.poly(pts(w * 0.22)).fill(this.c(this.P.outline));
    g.poly(pts(0)).fill(this.c(far ? this.P.skinBack : this.P.skin));
    band(g, a, b, w * 0.5, w * flare, -this.litSide(a, b), 0.2, 1, this.c(this.P.skinShade), 0.8);
    const trim = this.skin.garment?.trim;
    if (trim !== undefined)
      g.moveTo(b.x + u.nx * w * flare, b.y + u.ny * w * flare)
        .lineTo(b.x - u.nx * w * flare, b.y - u.ny * w * flare)
        .stroke({ width: w * 0.16, color: this.c(trim), alpha: far ? 0.5 : 0.9, cap: 'round' });
  }

  /** A clenched fist: a rounded block with knuckles (glowing with heat on fire skins). */
  private fist(g: Graphics, fire: Graphics, el: Point, hand: Point, far: boolean): void {
    const w = this.st.w;
    const u = frame(el, hand);
    const c = { x: hand.x + u.ux * w * 0.35, y: hand.y + u.uy * w * 0.35 };
    const r = w * 0.62 * (this.skin.muscle > 1.2 ? 0.85 : 1);
    const handColour = this.P.hand ?? this.P.skin;
    const glowing = this.skin.fire.fists && this.P.glow !== null && this.P.lava !== null;
    if (glowing)
      fire.circle(c.x, c.y, r * 2.1).fill({
        color: this.P.glow as number,
        alpha: (far ? 0.12 : 0.22) * (0.8 + 0.2 * Math.sin(this.st.t * 9)),
      });
    oval(g, c, u.ux, u.uy, r * 1.1 + w * 0.28, r + w * 0.28, this.c(this.P.outline));
    oval(g, c, u.ux, u.uy, r * 1.1, r, this.c(far ? toward(handColour, 0x000000, 0.2) : handColour));
    oval(
      g,
      { x: c.x + this.lx * r * 0.3, y: c.y + this.ly * r * 0.3 },
      u.ux,
      u.uy,
      r * 0.6,
      r * 0.5,
      this.c(toward(handColour, 0xffffff, 0.35)),
      far ? 0.3 : 0.7,
    );
    // Knuckle ridge across the front of the fist.
    const k0 = { x: c.x + u.ux * r * 0.7 + u.nx * r * 0.7, y: c.y + u.uy * r * 0.7 + u.ny * r * 0.7 };
    const k1 = { x: c.x + u.ux * r * 0.7 - u.nx * r * 0.7, y: c.y + u.uy * r * 0.7 - u.ny * r * 0.7 };
    g.moveTo(k0.x, k0.y)
      .lineTo(k1.x, k1.y)
      .stroke({ width: w * 0.12, color: this.c(toward(handColour, 0x000000, 0.35)), alpha: 0.8, cap: 'round' });
    if (glowing)
      fire
        .circle(c.x + u.ux * r * 0.4, c.y + u.uy * r * 0.4, r * 0.45)
        .fill({ color: this.P.lava as number, alpha: far ? 0.2 : 0.4 });
  }

  private leg(g: Graphics, fire: Graphics, pts: readonly Point[], far: boolean): void {
    const [hip, knee, ankle] = pts as [Point, Point, Point];
    const w = this.st.w;
    const m = this.skin.muscle;
    const gear = this.skin.gear;
    const trousers = gear.legs === 'trousers';
    // Thigh with the quadriceps mass toward the front (cloth over it for trousers).
    if (trousers) this.plate(g, fire, hip, knee, w * 0.74, w * 0.56, far, false, false);
    else this.flesh(g, hip, knee, w * 0.8, w * 0.55, far);
    const u = frame(hip, knee);
    const quad = lerp(hip, knee, 0.5);
    const fwd = u.nx >= 0 ? 1 : -1; // toward +x (the front)
    if (m > 0 && !trousers)
      this.muscle(
        g,
        { x: quad.x + u.nx * w * 0.14 * fwd, y: quad.y + u.ny * w * 0.14 * fwd },
        u.ux,
        u.uy,
        u.l * 0.34,
        w * 0.62 * Math.min(1.2, m),
        far,
      );
    if (gear.legs === 'trunks')
      this.plate(g, fire, lerp(hip, knee, -0.05), lerp(hip, knee, 0.24), w * 0.84, w * 0.78, far, false, true);
    // Shin with the calf behind.
    if (trousers) this.plate(g, fire, knee, lerp(knee, ankle, 0.92), w * 0.54, w * 0.46, far, false, false);
    else this.flesh(g, knee, ankle, w * 0.58, w * 0.42, far);
    const v = frame(knee, ankle);
    const calf = lerp(knee, ankle, 0.32);
    const back = v.nx >= 0 ? -1 : 1;
    if (m > 0 && !trousers)
      this.muscle(
        g,
        { x: calf.x + v.nx * w * 0.16 * back, y: calf.y + v.ny * w * 0.16 * back },
        v.ux,
        v.uy,
        v.l * 0.24,
        w * 0.5 * Math.min(1.2, m),
        far,
      );
    if (trousers) {
      // Cloth folds behind the knee and a lit crease down the front.
      g.moveTo(knee.x - v.nx * w * 0.2, knee.y - v.ny * w * 0.2)
        .lineTo(lerp(knee, ankle, 0.25).x, lerp(knee, ankle, 0.25).y)
        .stroke({ width: w * 0.08, color: this.c(this.P.armourEdge), alpha: 0.6, cap: 'round' });
    }
    if (gear.shinGuards)
      this.plate(g, fire, lerp(knee, ankle, 0.5), lerp(knee, ankle, 0.9), w * 0.5, w * 0.45, far, true, true);
    if (this.skin.fire.veins) this.vein(fire, lerp(hip, knee, 0.42), lerp(hip, knee, 0.92), far ? 7 : 5, far);
    if (gear.kneeGuards) {
      const kr = w * 0.4;
      g.circle(knee.x, knee.y, kr + w * 0.2).fill(this.c(this.P.armourEdge));
      g.circle(knee.x, knee.y, kr).fill(this.c(far ? toward(this.P.armour, 0x000000, 0.3) : this.P.armour));
      g.circle(knee.x + this.lx * kr * 0.3, knee.y + this.ly * kr * 0.3, kr * 0.5).fill({
        color: this.c(this.P.armourLit),
        alpha: 0.8,
      });
    }
    this.joint(g, knee, w * 0.34, far);
    this.boot(g, fire, knee, ankle, far);
  }

  /** A foot pointing forward along the floor from the ankle: a boot, or a bare/mannequin foot. */
  private boot(g: Graphics, fire: Graphics, knee: Point, ankle: Point, far: boolean): void {
    const w = this.st.w;
    const v = frame(knee, ankle);
    const bare = this.skin.gear.feet === 'bare';
    // The foot points "forward" (+x in the fighter's frame), turned with the shin a little.
    const fx = Math.abs(v.uy) > 0.35 ? 1 : Math.sign(v.ux) || 1;
    const sole = { x: ankle.x + v.ux * w * 0.3, y: ankle.y + v.uy * w * 0.3 };
    const toe = { x: sole.x + fx * w * (bare ? 1.05 : 1.3), y: sole.y + w * 0.06 };
    const heel = { x: sole.x - fx * w * (bare ? 0.3 : 0.36), y: sole.y + w * 0.04 };
    const top = { x: ankle.x - v.ux * w * (bare ? 0.1 : 0.3), y: ankle.y - v.uy * w * (bare ? 0.1 : 0.3) };
    const outline = this.c(bare ? this.P.outline : this.P.armourEdge);
    const shape = (grow: number) => [
      top.x - fx * (w * 0.34 + grow),
      top.y - grow,
      top.x + fx * (w * 0.38 + grow),
      top.y - grow,
      toe.x + fx * grow,
      toe.y - w * (bare ? 0.22 : 0.3) - grow,
      toe.x + fx * grow,
      toe.y + grow,
      heel.x - fx * grow,
      heel.y + grow,
    ];
    const base = bare ? this.P.skin : this.P.armour;
    const lit = bare ? this.P.skinLit : this.P.armourLit;
    g.poly(shape(w * 0.2)).fill(outline);
    g.poly(shape(0)).fill(this.c(far ? toward(base, 0x000000, 0.3) : base));
    // Lit upper (and a glowing sole line on fire skins).
    g.poly([
      top.x - fx * w * 0.14,
      top.y + w * 0.05,
      top.x + fx * w * 0.34,
      top.y + w * 0.05,
      toe.x - fx * w * 0.2,
      toe.y - w * 0.18,
    ]).fill({
      color: this.c(lit),
      alpha: far ? 0.35 : 0.7,
    });
    if (!bare && this.P.seam !== null)
      fire
        .moveTo(heel.x, heel.y - w * 0.06)
        .lineTo(toe.x, toe.y - w * 0.06)
        .stroke({
          width: w * 0.14,
          color: this.P.seam,
          alpha: far ? 0.35 : 0.8,
          cap: 'round',
        });
  }

  /**
   * A long garment from the waist over both legs, swaying with them: a robe to the ankles with a
   * trimmed hem, or a cloak whose hem hangs in ragged tatters. Folds run down from the waist.
   */
  /** Shared measurements of the coat for both halves (so the two always agree). */
  private coatFrame(s: Skel) {
    const w = this.st.w * (this.st.bodyWidthK ?? 1);
    const shin = (leg: readonly Point[], k: number) => lerp(leg[1]!, leg[2]!, k);
    // The coat hangs nearly straight: its hem follows only part of each leg's reach, so a wide stance steps out of it.
    // A kick throws a leg out and the panel over it flares with it, sharply (owner, 20/11/2026: snaps and flares in kicks).
    const hangs = (leg: readonly Point[]) => {
      const p = shin(leg, 0.9);
      const reach = Math.abs(p.x - s.pelvis.x) / w;
      const flare = Math.min(1, Math.max(0, (reach - 2.6) / 3.2));
      return { x: s.pelvis.x + (p.x - s.pelvis.x) * (0.55 + 0.45 * flare), y: p.y };
    };
    // A torso twist or lunge (the chest well ahead of the hips) whips the tails back.
    const lunge = Math.min(1, Math.max(0, (s.chest.x - s.pelvis.x) / (w * 3)));
    const hemF = hangs(s.legFront);
    const hemB = hangs(s.legBack);
    const motion = this.st.motion;
    const t = this.st.t;
    // A tailored trench: it hangs straight down, and trails back only a little with speed and the stride's swing.
    const trail = w * (0.12 + 0.9 * motion + 0.9 * lunge) + Math.sin(t * 7) * w * 0.1 * (0.3 + motion + lunge);
    const sway = (i: number) => Math.sin(t * 6 + i * 1.7) * w * 0.07 * (0.4 + motion);
    return { w, waist: s.pelvis, hemF, hemB, hemY: Math.max(hemF.y, hemB.y) + w * 0.12, trail, sway };
  }

  /**
   * The coat's back half (Vexoris, owner 20/11/2026): the back tail and a dark lining, drawn BEHIND both legs so they
   * stand inside the coat's volume. It hangs straight from the waist to the shins and trails with the stride.
   */
  private coatBack(g: Graphics, s: Skel): void {
    const { w, waist, hemF, hemB, hemY, trail, sway } = this.coatFrame(s);
    const gm = this.skin.garment!;
    const [cloth, , clothShade] = gm.cloth ?? [this.P.skin, this.P.skinLit, this.P.skinShade];
    const top = waist.y - w * 0.4;
    const front = Math.max(hemF.x, hemB.x) + w * 0.5;
    const back = Math.min(hemF.x, hemB.x) - w * 0.7 - trail;
    const shape = (grow: number): number[] => {
      const pts = [
        waist.x - w * 0.95 - grow,
        top - grow,
        waist.x + w * 0.9 + grow,
        top - grow,
        front + grow,
        hemY - w * 0.2,
      ];
      for (let i = 1; i < 5; i++) pts.push(front + ((back - front) * i) / 5, hemY + sway(i) + grow);
      pts.push(back - grow, hemY - w * 0.25 + sway(5));
      return pts;
    };
    g.poly(shape(w * 0.22)).fill(this.c(this.P.outline));
    g.poly(shape(0)).fill(this.c(cloth));
    // The lining inside: the darkest tone, filling the interior the legs stand in.
    const lining = [
      waist.x - w * 0.8,
      top + w * 0.2,
      waist.x + w * 0.75,
      top + w * 0.2,
      front - w * 0.15,
      hemY - w * 0.3,
      back + w * 0.3,
      hemY - w * 0.3,
    ];
    g.poly(lining).fill({ color: this.c(clothShade), alpha: 0.95 });
    // A vertical fold or two on the lining, for depth.
    for (const k of [0.3, 0.62]) {
      const x0 = waist.x - w * 0.6 + w * 1.2 * k;
      const x1 = back + w * 0.4 + (front - back - w * 0.6) * k;
      g.moveTo(x0, top + w * 0.5)
        .lineTo(x1, hemY - w * 0.35)
        .stroke({ width: w * 0.07, color: this.c(this.P.outline), alpha: 0.5, cap: 'round' });
    }
  }

  /**
   * The coat's front half: a waist belt that seals the hips, and two narrow open panels, one over the back leg's rear
   * edge and one over the lead leg's front edge. The centre front stays open, so the lead leg steps out of the slit.
   * Each panel's hem follows its own leg, so the coat parts with every stride, punch and kick.
   */
  private coatFront(g: Graphics, s: Skel): void {
    const { w, waist, hemF, hemB, hemY, trail, sway } = this.coatFrame(s);
    const gm = this.skin.garment!;
    const [cloth, clothLit, clothShade] = gm.cloth ?? [this.P.skin, this.P.skinLit, this.P.skinShade];
    const top = waist.y - w * 0.4;
    const lightRight = this.lx > 0;
    const panel = (x0: number, x1: number, h0: number, h1: number, hy: number, lit: boolean) => {
      // A straight, slightly tapered drape: top edge at the waist, hem tracking the leg.
      const pts = (grow: number): number[] => [
        x0 - grow,
        top - grow,
        x1 + grow,
        top - grow,
        h1 + grow,
        hy - w * 0.05,
        h1 + grow * 0.5,
        hy + w * 0.08 + grow,
        h0 - grow * 0.5,
        hy + w * 0.08 + grow,
        h0 - grow,
        hy - w * 0.05,
      ];
      g.poly(pts(w * 0.2)).fill(this.c(this.P.outline));
      g.poly(pts(0)).fill(this.c(cloth));
      // The edge facing the opening catches the light; the outer edge falls into shade.
      const inner = x1 === Math.max(x0, x1) && lit;
      g.moveTo(inner ? x1 - w * 0.06 : x0 + w * 0.06, top + w * 0.3)
        .lineTo(inner ? h1 - w * 0.06 : h0 + w * 0.06, hy - w * 0.1)
        .stroke({ width: w * 0.12, color: this.c(clothLit), alpha: 0.6, cap: 'round' });
      g.moveTo((x0 + x1) / 2, top + w * 0.5)
        .lineTo((h0 + h1) / 2, hy - w * 0.15)
        .stroke({ width: w * 0.07, color: this.c(clothShade), alpha: 0.85, cap: 'round' });
      // A trimmed hem.
      if (gm.trim !== undefined)
        g.moveTo(h0, hy + w * 0.05)
          .lineTo(h1, hy + w * 0.05)
          .stroke({ width: w * 0.1, color: this.c(gm.trim), alpha: 0.75, cap: 'round' });
    };
    // The rear panel: over the back leg's rear edge, trailing a little.
    panel(
      waist.x - w * 1.0,
      waist.x - w * 0.15,
      hemB.x - w * 1.0 - trail,
      hemB.x + w * 0.1,
      Math.min(hemB.y + w * 0.16, hemY) + sway(1),
      !lightRight,
    );
    // The front lapel: ahead of the lead leg's front edge, which steps out of the open centre.
    panel(
      waist.x + w * 0.22,
      waist.x + w * 0.98,
      hemF.x + w * 0.2,
      hemF.x + w * 1.0,
      Math.min(hemF.y + w * 0.16, hemY) + sway(3),
      lightRight,
    );
    // The belt: a dark band across the hips with a buckle, so no gap shows where the coat meets the torso.
    const belt = [
      waist.x - w * 1.05,
      top + w * 0.05,
      waist.x + w * 1.0,
      top + w * 0.05,
      waist.x + w * 1.0,
      top + w * 0.62,
      waist.x - w * 1.05,
      top + w * 0.62,
    ];
    g.poly(
      belt.map((v, i) =>
        i % 2 ? v + (v > top + w * 0.3 ? w * 0.1 : -w * 0.1) : v + (v > waist.x ? w * 0.1 : -w * 0.1),
      ),
    ).fill(this.c(this.P.outline));
    g.poly(belt).fill(this.c(this.P.armour));
    g.moveTo(waist.x - w * 0.95, top + w * 0.13)
      .lineTo(waist.x + w * 0.9, top + w * 0.13)
      .stroke({ width: w * 0.08, color: this.c(this.P.armourLit), alpha: 0.7, cap: 'round' });
    g.roundRect(waist.x + w * 0.35, top + w * 0.1, w * 0.4, w * 0.45, w * 0.06).fill(this.c(this.P.skinShade));
    g.roundRect(waist.x + w * 0.4, top + w * 0.16, w * 0.3, w * 0.33, w * 0.05).stroke({
      width: w * 0.05,
      color: this.c(this.P.rim),
      alpha: 0.7,
    });
  }

  private garment(g: Graphics, s: Skel): void {
    const w = this.st.w * (this.st.bodyWidthK ?? 1);
    const gm = this.skin.garment!;
    const [cloth, clothLit, clothShade] = gm.cloth ?? [this.P.skin, this.P.skinLit, this.P.skinShade];
    const waist = s.pelvis;
    const shin = (leg: readonly Point[], k: number) => lerp(leg[1]!, leg[2]!, k);
    const hemF = shin(s.legFront, 0.86);
    const hemB = shin(s.legBack, 0.86);
    const left = Math.min(hemF.x, hemB.x) - w * 0.7;
    const right = Math.max(hemF.x, hemB.x) + w * 0.7;
    const hem = Math.max(hemF.y, hemB.y);
    const top = waist.y - w * 0.3;
    // Outline of the skirt: the waist, flaring out to the hem; a tattered hem zig-zags.
    const shape = (grow: number): number[] => {
      const pts: number[] = [waist.x - w * 0.95 - grow, top - grow, waist.x + w * 0.95 + grow, top - grow];
      pts.push(right + grow, hem - w * 0.2);
      if (gm.hem === 'tattered') {
        const n = 7;
        for (let i = 1; i < n; i++) {
          const x = right + ((left - right) * i) / n;
          const drop = i % 2 ? w * (0.55 + 0.2 * Math.sin(i * 2.3 + this.st.t * 2)) : -w * 0.05;
          pts.push(x, hem + drop + grow);
        }
      } else {
        pts.push((left + right) / 2 + w * 0.3, hem + w * 0.18 + grow);
      }
      pts.push(left - grow, hem - w * 0.1);
      return pts;
    };
    g.poly(shape(w * 0.24)).fill(this.c(this.P.outline));
    g.poly(shape(0)).fill(this.c(cloth));
    // Shade the side away from the light, light the near panel, rim the far edge.
    const lightRight = this.lx > 0;
    const shadeX = lightRight ? left : right;
    const litX = lightRight ? right : left;
    g.poly([waist.x, top, shadeX, hem - w * 0.1, (left + right) / 2, hem]).fill({
      color: this.c(clothShade),
      alpha: 0.75,
    });
    // Each edge light runs down its own side of the skirt (owner, 13/11/2026: no lines crossing the
    // robe, which read as overlapping pieces of cloth).
    g.moveTo(waist.x + (lightRight ? 1 : -1) * w * 0.9, top)
      .lineTo(litX, hem - w * 0.25)
      .stroke({ width: w * 0.18, color: this.c(clothLit), alpha: 0.55, cap: 'round' });
    g.moveTo(waist.x + (lightRight ? -1 : 1) * w * 0.9, top)
      .lineTo(shadeX, hem - w * 0.2)
      .stroke({ width: w * 0.1, color: this.c(this.P.rim), alpha: 0.35, cap: 'round' });
    // Folds.
    for (const k of [0.3, 0.55, 0.78]) {
      const x0 = waist.x - w * 0.7 + w * 1.4 * k;
      const x1 = left + (right - left) * k;
      g.moveTo(x0, top + w * 0.2)
        .quadraticCurveTo((x0 + x1) / 2 + w * 0.15, (top + hem) / 2, x1, hem - w * 0.1)
        .stroke({ width: w * 0.1, color: this.c(clothShade), alpha: 0.85, cap: 'round' });
    }
    // A trimmed hem: along the hem itself (a tattered hem's trim follows its points, so it never
    // runs straight across the cloth above them).
    if (gm.trim !== undefined) {
      const edge = shape(0).slice(4);
      g.moveTo(edge[0]!, edge[1]!);
      for (let i = 2; i < edge.length; i += 2) g.lineTo(edge[i]!, edge[i + 1]!);
      g.stroke({ width: w * 0.14, color: this.c(gm.trim), alpha: 0.85, cap: 'round', join: 'round' });
    }
  }

  /** Three overlapping bone plates over the near shoulder. */
  private bonePauldron(g: Graphics, sh: Point): void {
    const w = this.st.w;
    const bone = this.P.hand ?? 0xd8cdb6;
    for (const [dx, dy, r] of [
      [-w * 0.3, -w * 0.08, w * 0.72],
      [0, -w * 0.2, w * 0.62],
      [w * 0.28, -w * 0.3, w * 0.48],
    ] as const) {
      g.circle(sh.x + dx, sh.y + dy, r + w * 0.2).fill(this.c(this.P.outline));
      g.circle(sh.x + dx, sh.y + dy, r).fill(this.c(bone));
      g.circle(sh.x + dx + this.lx * r * 0.25, sh.y + dy + this.ly * r * 0.25, r * 0.45).fill({
        color: 0xffffff,
        alpha: 0.4,
      });
      g.arc(sh.x + dx, sh.y + dy, r * 0.8, Math.PI * 0.2, Math.PI * 0.8).stroke({
        width: w * 0.06,
        color: this.c(toward(bone, 0x000000, 0.4)),
        alpha: 0.7,
      });
    }
  }

  /**
   * A brute's back and shoulder definition: the trapezius ridge from neck to shoulder point on both
   * sides, the deltoid groove, and the lats flaring under the arms, so the muscles read as one body.
   */
  private bruteDefinition(g: Graphics, at: (k: number, n: number) => Point, w: number): void {
    const line = (pts: Point[], width: number, colour: number, alpha: number): void => {
      g.moveTo(pts[0]!.x, pts[0]!.y);
      for (let i = 1; i + 1 < pts.length; i += 2)
        g.quadraticCurveTo(pts[i]!.x, pts[i]!.y, pts[i + 1]!.x, pts[i + 1]!.y);
      g.stroke({ width, color: this.c(colour), alpha, cap: 'round' });
    };
    for (const side of [1, -1]) {
      // Trapezius ridge: lit along the top, a shadow groove under it where it meets the shoulder.
      line([at(1.15, 0.5 * side), at(1.08, 1.0 * side), at(0.99, 1.42 * side)], w * 0.16, this.P.skinLit, 0.6);
      line([at(1.07, 0.45 * side), at(1.0, 0.95 * side), at(0.93, 1.3 * side)], w * 0.08, this.P.skinShade, 0.75);
      // The lats flaring out under the shoulder, a shadow down the side.
      line([at(0.86, 1.45 * side), at(0.6, 1.25 * side), at(0.36, 0.78 * side)], w * 0.1, this.P.skinShade, 0.7);
    }
    // The spine's groove between the shoulder blades, on the back.
    line([at(1.05, -0.55), at(0.8, -0.75), at(0.5, -0.6)], w * 0.07, this.P.skinShade, 0.6);
  }

  /** The neck, for skins whose head the view draws (its own head style sits on top). */
  private neck(g: Graphics, s: Skel): void {
    const w = this.st.w;
    capsule(g, s.neck, s.head, w * 0.42 + w * 0.3, w * 0.4 + w * 0.3, this.c(this.P.outline));
    capsule(g, s.neck, s.head, w * 0.42, w * 0.4, this.c(this.P.skin));
  }

  /**
   * Pelvis to neck: one sculpted body (or the garment's bodice) with, by skin, the chest and
   * abdominals, a belt, a bone ribcage plate and a molten core.
   */
  private torso(g: Graphics, fire: Graphics, s: Skel): void {
    const w = this.st.w * (this.st.bodyWidthK ?? 1);
    const m = this.skin.muscle;
    const base = s.pelvis;
    const top = s.chest;
    const u = frame(base, top);
    // The torso's outline as a smooth profile: hips, waist, ribcage, shoulders (half-widths). A brute
    // has a broader chest; cloth hangs straighter.
    // A brute (owner, 13/11/2026: "a properly structured muscular body, not a semicircle"): a V from
    // a narrow waist out to broad shoulder points, then the trapezius sloping in to a thick neck.
    const brute = m > 1.2;
    const chestK = m === 0 ? 0.9 : 1;
    const prof: [number, number][] = brute
      ? [
          [-0.06, 0.8],
          [0.08, 0.82],
          [0.3, 0.7],
          [0.52, 1.05],
          [0.74, 1.38],
          [0.9, 1.55],
          [0.99, 1.52],
          [1.05, 1.3],
          [1.11, 0.92],
          [1.17, 0.62],
        ]
      : [
          [-0.06, 0.82],
          [0.08, 0.86],
          [0.3, m === 0 ? 0.82 : 0.72],
          [0.55, 1.02 * chestK],
          [0.8, 1.27 * chestK],
          [0.92, 1.3 * chestK],
          [1.0, 1.2 * chestK],
          [1.05, 1.02 + 0.1 * (chestK - 1)],
          [1.09, 0.8],
        ];
    const outline = (grow: number): number[] => {
      const left: number[] = [];
      const right: number[] = [];
      for (const [k, half] of prof) {
        const p = lerp(base, top, k);
        const h = half * w + grow;
        left.push(p.x + u.nx * h, p.y + u.ny * h);
        right.unshift(p.x - u.nx * h, p.y - u.ny * h);
      }
      const r: number[] = [];
      for (let i = 0; i < right.length; i += 2) r.push(right[i]!, right[i + 1]!);
      return [...left, ...r];
    };
    g.poly(outline(w * 0.32)).fill(this.c(this.P.outline));
    g.poly(outline(0)).fill(this.c(this.P.skin));
    // Trapezius up into the neck (a brute's is part of the profile's slope).
    const neckTop = lerp(top, s.neck, 0.9);
    if (!brute) {
      capsule(g, top, neckTop, w * 0.62 + w * 0.3, w * 0.42 + w * 0.3, this.c(this.P.outline));
      capsule(g, top, neckTop, w * 0.62, w * 0.42, this.c(this.P.skin));
      band(g, top, neckTop, w * 0.62, w * 0.42, -this.litSide(top, neckTop), 0.2, 1, this.c(this.P.skinShade), 0.8);
    }
    // Shading: the far side in shadow, the near side lit, a rim light on the shadow edge.
    const side = this.litSide(base, top);
    const shadeBand = (from: number, to: number, sgn: number, colour: number, alpha: number) => {
      const pts: number[] = [];
      for (const [k, half] of prof) {
        const p = lerp(base, top, k);
        pts.push(p.x + u.nx * half * w * from * sgn, p.y + u.ny * half * w * from * sgn);
      }
      for (let i = prof.length - 1; i >= 0; i--) {
        const [k, half] = prof[i]!;
        const p = lerp(base, top, k);
        pts.push(p.x + u.nx * half * w * to * sgn, p.y + u.ny * half * w * to * sgn);
      }
      g.poly(pts).fill({ color: colour, alpha });
    };
    shadeBand(0.15, 1, -side, this.c(this.P.skinShade), 0.8);
    shadeBand(0.05, 0.7, side, this.c(this.P.skinLit), 0.55);
    shadeBand(0.85, 0.98, -side, this.c(this.P.rim), 0.5);
    const chestC = lerp(base, top, 0.78);
    const fwd = u.nx >= 0 ? 1 : -1; // toward +x (the front)
    // Points on the torso in its own frame: k along the spine, n across it toward the front.
    const at = (k: number, n: number): Point => {
      const p = lerp(base, top, k);
      return { x: p.x + u.nx * w * n * fwd, y: p.y + u.ny * w * n * fwd };
    };
    if (brute) this.bruteDefinition(g, at, w);
    if (this.skin.chestPanel !== undefined) {
      // The light chest panel: from the collar down to a point above the navel, shaded like the skin.
      // A white panel slanting from the collar across the near pectoral down to the abdomen.
      const panel = [at(1.08, 0.05), at(1.03, 1.0), at(0.82, 1.42), at(0.5, 1.0), at(0.44, 0.55), at(0.8, 0.25)];
      const pc = this.skin.chestPanel;
      g.poly(panel.flatMap((p) => [p.x, p.y])).fill(this.c(pc));
      g.poly([at(1.04, 0.2), at(1.0, 0.95), at(0.84, 1.25), at(0.78, 0.55)].flatMap((p) => [p.x, p.y])).fill({
        color: this.c(0xffffff),
        alpha: 0.6,
      });
      g.poly([at(0.82, 1.42), at(0.5, 1.0), at(0.44, 0.55), at(0.62, 0.95)].flatMap((p) => [p.x, p.y])).fill({
        color: this.c(toward(pc, 0x000000, 0.28)),
        alpha: 0.6,
      });
    }
    if (m > 0) {
      // Chest: two pectoral masses under the shoulders, split down the middle.
      const k2 = Math.min(1.3, m);
      for (const [off, k] of [
        [0.45, 1],
        [-0.25, 0.75],
      ] as const) {
        const c = { x: chestC.x + u.nx * w * off * fwd, y: chestC.y + u.ny * w * off * fwd };
        oval(g, c, u.nx, u.ny, w * 0.62 * k * k2, w * 0.4 * k2, this.c(this.P.skinShade), 0.55);
        oval(
          g,
          { x: c.x + this.lx * w * 0.08, y: c.y + this.ly * w * 0.08 },
          u.nx,
          u.ny,
          w * 0.5 * k * k2,
          w * 0.28 * k2,
          this.c(this.P.skinLit),
          0.55,
        );
      }
      // Abdominals: three rows of two, toward the front.
      for (let row = 0; row < 3; row++) {
        const p = lerp(base, top, 0.22 + row * 0.13);
        for (const col of [0.18, 0.55]) {
          const c = { x: p.x + u.nx * w * col * fwd, y: p.y + u.ny * w * col * fwd };
          oval(g, c, u.ux, u.uy, w * 0.2, w * 0.17, this.c(this.P.skinShade), 0.45);
          oval(
            g,
            { x: c.x + this.lx * w * 0.04, y: c.y + this.ly * w * 0.04 },
            u.ux,
            u.uy,
            w * 0.13,
            w * 0.11,
            this.c(this.P.skinLit),
            0.5,
          );
        }
      }
    } else {
      // Cloth: a fold from the shoulder down across the chest, and a lit lapel edge.
      const a = lerp(base, top, 0.95);
      const b = lerp(base, top, 0.3);
      g.moveTo(a.x + u.nx * w * 0.9 * fwd, a.y + u.ny * w * 0.9 * fwd)
        .quadraticCurveTo(b.x + u.nx * w * 0.5 * fwd, b.y + u.ny * w * 0.5 * fwd, b.x - u.nx * w * 0.2 * fwd, b.y)
        .stroke({ width: w * 0.1, color: this.c(this.P.skinShade), alpha: 0.85, cap: 'round' });
      g.moveTo(a.x + u.nx * w * 0.7 * fwd, a.y + u.ny * w * 0.7 * fwd)
        .lineTo(b.x + u.nx * w * 0.35 * fwd, b.y + u.ny * w * 0.35 * fwd)
        .stroke({ width: w * 0.08, color: this.c(this.P.skinLit), alpha: 0.6, cap: 'round' });
    }
    if (this.skin.gear.ribcage) {
      // A bone ribcage plate across the chest, a sternum down the middle.
      const bone = this.P.hand ?? 0xd8cdb6;
      for (const k of [0.62, 0.74, 0.86]) {
        const p0 = lerp(base, top, k);
        const a = { x: p0.x - u.nx * w * 0.6 * fwd, y: p0.y - u.ny * w * 0.6 * fwd };
        const b = { x: p0.x + u.nx * w * 0.95 * fwd + u.ux * w * 0.05, y: p0.y + u.ny * w * 0.95 * fwd - w * 0.06 };
        g.moveTo(a.x, a.y)
          .lineTo(b.x, b.y)
          .stroke({ width: w * 0.24, color: this.c(this.P.outline), cap: 'round' });
        g.moveTo(a.x, a.y)
          .lineTo(b.x, b.y)
          .stroke({ width: w * 0.15, color: this.c(bone), cap: 'round' });
        g.moveTo(a.x, a.y - w * 0.03)
          .lineTo(b.x, b.y - w * 0.03)
          .stroke({ width: w * 0.05, color: 0xffffff, alpha: 0.45, cap: 'round' });
      }
      const st0 = lerp(base, top, 0.92);
      const st1 = lerp(base, top, 0.55);
      const off = { x: u.nx * w * 0.25 * fwd, y: u.ny * w * 0.25 * fwd };
      g.moveTo(st0.x + off.x, st0.y + off.y)
        .lineTo(st1.x + off.x, st1.y + off.y)
        .stroke({ width: w * 0.2, color: this.c(toward(bone, 0x000000, 0.25)), cap: 'round' });
    }
    if (this.skin.gear.belt) {
      // A belt (or sash) just above the hips, with a buckle (glowing on fire skins).
      const b0 = lerp(base, top, 0.02);
      const b1 = lerp(base, top, 0.14);
      const beltHalf = w * 0.9;
      const beltPts = (grow: number) => [
        b0.x + u.nx * (beltHalf + grow),
        b0.y + u.ny * (beltHalf + grow),
        b1.x + u.nx * (beltHalf + grow),
        b1.y + u.ny * (beltHalf + grow),
        b1.x - u.nx * (beltHalf + grow),
        b1.y - u.ny * (beltHalf + grow),
        b0.x - u.nx * (beltHalf + grow),
        b0.y - u.ny * (beltHalf + grow),
      ];
      g.poly(beltPts(w * 0.22)).fill(this.c(this.P.armourEdge));
      g.poly(beltPts(0)).fill(this.c(this.P.armour));
      const buckle = lerp(b0, b1, 0.5);
      const bc = { x: buckle.x + u.nx * w * 0.45 * fwd, y: buckle.y + u.ny * w * 0.45 * fwd };
      g.circle(bc.x, bc.y, w * 0.32).fill(this.c(this.P.armourLit));
      if (this.P.seam !== null) fire.circle(bc.x, bc.y, w * 0.2).fill({ color: this.P.seam, alpha: 0.9 });
    }
    if (this.skin.pelvisBall) {
      // The mannequin's hip ball, in front of the pelvis.
      const hb = at(-0.02, 0.3);
      const pr = w * 0.62;
      g.circle(hb.x, hb.y, pr + w * 0.28).fill(this.c(this.P.outline));
      g.circle(hb.x, hb.y, pr).fill(this.c(this.P.skin));
      g.circle(hb.x + this.lx * pr * 0.3, hb.y + this.ly * pr * 0.3, pr * 0.55).fill({
        color: this.c(this.P.skinLit),
        alpha: 0.75,
      });
    }
    if (this.skin.fire.core && this.P.glow !== null && this.P.lava !== null) {
      // The molten core in the chest: a glowing heart of fire with cracks running out of it.
      const t = this.st.t;
      const pulse = 0.75 + 0.25 * Math.sin(t * 4);
      const core = {
        x: chestC.x + u.nx * w * 0.18 * fwd - u.ux * w * 0.05,
        y: chestC.y + u.ny * w * 0.18 * fwd - u.uy * w * 0.05,
      };
      g.circle(core.x, core.y, w * 0.42).fill(this.c(this.P.armourEdge));
      for (const [r, colour, alpha] of [
        [w * 1.1, this.P.glow, 0.18 * pulse],
        [w * 0.36, this.P.glow, 0.85],
        [w * 0.24, this.P.lava, 0.95],
        [w * 0.11, 0xffffff, 0.9 * pulse],
      ] as const)
        fire.circle(core.x, core.y, r).fill({ color: colour, alpha });
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.6;
        const len = w * (0.55 + 0.15 * Math.sin(t * 3 + i));
        fire
          .moveTo(core.x + Math.cos(a) * w * 0.3, core.y + Math.sin(a) * w * 0.3)
          .lineTo(core.x + Math.cos(a + 0.25) * len, core.y + Math.sin(a + 0.25) * len)
          .stroke({ width: w * 0.08, color: this.P.lava, alpha: 0.7 * pulse, cap: 'round' });
      }
    }
  }

  /**
   * The head (owner, 13/11/2026: "a round circle with shadings"): a round, shaded ball on the neck
   * with no face; a crest of flame on top for the fire skin.
   */
  private head(g: Graphics, fire: Graphics, s: Skel, style: 'crest' | 'brute' = 'crest'): void {
    const r = this.st.headRadius;
    const w = this.st.w;
    const h = s.head;
    // Neck (a brute's thick and short, rising out of the trapezius).
    const nk = style === 'brute' ? 0.62 : 0.42;
    capsule(g, s.neck, h, w * nk + w * 0.3, w * (nk - 0.02) + w * 0.3, this.c(this.P.outline));
    capsule(g, s.neck, h, w * nk, w * (nk - 0.02), this.c(this.P.skin));
    shadedBall(
      g,
      h.x,
      h.y - r * 0.05,
      r,
      w * 0.32,
      {
        outline: this.c(this.P.outline),
        shade: this.c(this.P.skinShade),
        base: this.c(this.P.skin),
        lit: this.c(this.P.skinLit),
        rim: this.c(this.P.rim),
      },
      this.lx,
      this.ly,
    );
    if (style === 'crest') this.crest(fire, h, r);
    if (this.skin.eye !== undefined) {
      // One white eye, a sharp slanted leaf toward the front of the face (Titan's reference).
      const ex = h.x + r * 0.42;
      const ey = h.y - r * 0.08;
      const eye = [ex - r * 0.26, ey - r * 0.14, ex + r * 0.3, ey + r * 0.04, ex - r * 0.16, ey + r * 0.12];
      g.poly(eye).fill(this.c(this.skin.eye));
      fire.poly(eye).fill({ color: this.skin.eye, alpha: 0.35 });
    }
  }

  /**
   * A hood over the head: a peaked cowl with folds, a lit crown and a rim light. `cowl` hides a dark
   * void with two glowing eyes; `mask` shows a white mask with dark eye hollows in the opening.
   */
  private hooded(g: Graphics, fire: Graphics, s: Skel, style: 'cowl' | 'mask'): void {
    const r = this.st.headRadius * 1.15;
    const w = this.st.w;
    const h = s.head;
    this.neck(g, s);
    const shape: [number, number][] = [
      [0.95, -0.55],
      [0.55, -1.05],
      [-0.25, -1.25],
      [-1.0, -1.5],
      [-0.95, -0.7],
      [-1.15, 0.1],
      [-1.05, 0.95],
      [-0.35, 1.25],
      [0.55, 1.1],
      [0.98, 0.65],
    ];
    const hood = (grow: number): number[] =>
      shape.flatMap(([x, y]) => {
        const len = Math.hypot(x, y) || 1;
        return [h.x + x * r + (x / len) * grow, h.y + y * r + (y / len) * grow];
      });
    g.poly(hood(w * 0.3)).fill(this.c(this.P.outline));
    g.poly(hood(0)).fill(this.c(this.P.armour));
    g.poly([
      h.x - 1.0 * r,
      h.y - 1.5 * r,
      h.x - 0.95 * r,
      h.y - 0.7 * r,
      h.x - 1.15 * r,
      h.y + 0.1 * r,
      h.x - 1.05 * r,
      h.y + 0.95 * r,
      h.x - 0.35 * r,
      h.y + 1.2 * r,
      h.x - 0.2 * r,
      h.y - 0.6 * r,
    ]).fill({ color: this.c(this.P.armourEdge), alpha: 0.55 });
    g.moveTo(h.x - 0.2 * r, h.y - 1.15 * r)
      .quadraticCurveTo(h.x + 0.5 * r, h.y - 1.0 * r, h.x + 0.85 * r, h.y - 0.55 * r)
      .stroke({ width: r * 0.16, color: this.c(this.P.armourLit), alpha: 0.85, cap: 'round' });
    g.moveTo(h.x - 0.98 * r, h.y - 1.38 * r)
      .lineTo(h.x - 1.08 * r, h.y + 0.85 * r)
      .stroke({ width: r * 0.08, color: this.c(this.P.rim), alpha: 0.5, cap: 'round' });
    for (const k of [0.25, 0.55]) {
      g.moveTo(h.x - (0.2 + k) * r, h.y - 0.9 * r)
        .quadraticCurveTo(h.x - (0.5 + k) * r, h.y + 0.1 * r, h.x - (0.3 + k * 0.6) * r, h.y + 1.0 * r)
        .stroke({ width: r * 0.06, color: this.c(this.P.armourEdge), alpha: 0.8, cap: 'round' });
    }
    // A glowing seam along the hood's edge, like Inferno's armour.
    if (this.P.seam !== null)
      fire
        .moveTo(h.x + 0.95 * r, h.y - 0.5 * r)
        .quadraticCurveTo(h.x + 1.1 * r, h.y + 0.1 * r, h.x + 0.95 * r, h.y + 0.62 * r)
        .stroke({ width: r * 0.06, color: this.P.seam, alpha: 0.75, cap: 'round' });
    if (style === 'cowl') {
      // Owner, 13/11/2026: Necro has no eyes; the hood holds only darkness.
      const oc = { x: h.x + 0.5 * r, y: h.y + 0.1 * r };
      oval(g, oc, 0.3, 1, r * 0.68, r * 0.46, this.c(this.P.outline));
      oval(g, oc, 0.3, 1, r * 0.6, r * 0.38, this.c(0x060408));
      return;
    }
    this.maskInHood(g, fire, h, r, w);
  }

  /**
   * Shroud's face (owner, 13/11/2026: "a clearly defined face opening, the mask filling it, curved
   * outward, not a small flat sticker"): a deep opening cut in the hood with a lit lip round it and
   * the hood's shadow falling across its top; the mask fills it and bulges outward, shaded from its
   * lit crown to a dark rim, with a highlight on the brow and cheek. Tipped down a little.
   */
  private maskInHood(g: Graphics, fire: Graphics, h: Point, r: number, w: number): void {
    // Owner, 13/11/2026 (later): the mask sits inside the hood, never past its front edge, so the
    // opening is set back from the hood's front (about 0.95 r) and the mask fills it within the lip.
    const oc = { x: h.x + 0.36 * r, y: h.y + 0.14 * r };
    // The opening: outline, the hood's lit lip round it, then the dark recess.
    oval(g, oc, MASK_TILT, 1, r * 0.76 + w * 0.1, r * 0.54 + w * 0.1, this.c(this.P.outline));
    oval(g, oc, MASK_TILT, 1, r * 0.76, r * 0.54, this.c(this.P.armourLit));
    oval(g, { x: oc.x + r * 0.02, y: oc.y + r * 0.02 }, MASK_TILT, 1, r * 0.69, r * 0.48, this.c(0x050407));
    // The mask fills the opening, just inside the lip.
    const mc = { x: oc.x + r * 0.04, y: oc.y + r * 0.04 };
    const mw = r * 0.64;
    const mh = r * 0.45;
    const bone = 0xeeeae1;
    oval(g, mc, MASK_TILT, 1, mw + w * 0.1, mh + w * 0.1, this.c(0x111114));
    // Curved surface: a dark rim, then lighter layers stepping toward the lit upper front.
    oval(g, mc, MASK_TILT, 1, mw, mh, this.c(0x9d978b));
    oval(g, { x: mc.x + r * 0.03, y: mc.y - r * 0.03 }, MASK_TILT, 1, mw * 0.9, mh * 0.88, this.c(0xc9c4b8));
    oval(g, { x: mc.x + r * 0.06, y: mc.y - r * 0.06 }, MASK_TILT, 1, mw * 0.76, mh * 0.74, this.c(bone));
    oval(g, { x: mc.x + r * 0.09, y: mc.y - r * 0.1 }, MASK_TILT, 1, mw * 0.5, mh * 0.45, this.c(0xfbf9f4), 0.85);
    // (The mask's long axis runs down the face: `mw` is its half-height, `mh` its half-width.)
    // The hood's overhang shades the top of the mask: a band across its crown.
    oval(
      g,
      { x: mc.x - mw * MASK_TILT * 0.8, y: mc.y - mw * 0.82 },
      1,
      -MASK_TILT,
      mh * 0.9,
      mw * 0.24,
      this.c(0x050407),
      0.5,
    );
    // Specular highlights: a glint across the brow and a softer one on the cheek, where it curves out.
    oval(g, { x: mc.x + r * 0.1, y: mc.y - r * 0.3 }, 1, -MASK_TILT, r * 0.16, r * 0.05, 0xffffff, 0.85);
    oval(g, { x: mc.x + r * 0.3, y: mc.y + r * 0.22 }, 1, -MASK_TILT, r * 0.08, r * 0.045, 0xffffff, 0.5);
    // Eye opening after the owner's reference (13/11/2026), as a sharp slanted slit (20/11/2026), pointed and dipped low
    // at the inner corner by the nose, so the blank face scowls. A profile shows ONE eye: the far one is not drawn.
    const k0 = 1.15;
    for (const [dx, k, dir] of [[0.12, 1, 1]] as const) {
      const cx = mc.x + dx * r;
      const cy = mc.y - r * 0.08;
      const kk = k * k0;
      // Owner, 20/11/2026: a slim slit.
      const half = r * 0.22 * 0.7 * kk;
      const inner = cx + dir * half;
      const outer = cx - dir * half;
      // Owner, 20/11/2026: the eyes are sharp, narrow slits, rectangular and slanted (a parallelogram with hard
      // corners), the inner end low by the nose so the mask scowls, not rounded almonds.
      const hole = [
        outer,
        cy - r * 0.13 * kk,
        inner + dir * half * 0.12,
        cy - r * 0.01 * kk,
        inner + dir * half * 0.12,
        cy + r * 0.1 * kk,
        outer,
        cy - r * 0.01 * kk,
      ];
      // A shadow round the hole gives the cut depth through the curved shell, then the hollow.
      g.poly(hole.map((v, i) => (i % 2 ? cy + (v - cy) * 1.35 : cx + (v - cx) * 1.15))).fill({
        color: this.c(0x8e897e),
        alpha: 0.6,
      });
      g.poly(hole).fill(this.c(0x050506));
      const glow = this.st.eyeGlow ?? 0;
      if (glow > 0.01) {
        // Death Mark charged (owner, 20/11/2026): the slits burn red.
        g.poly(hole).fill({ color: 0xff1c1c, alpha: Math.min(1, glow) });
        fire.poly(hole.map((v, i) => (i % 2 ? cy + (v - cy) * 2.2 : cx + (v - cx) * 1.7))).fill({
          color: 0xff2a2a,
          alpha: 0.4 * glow,
        });
      }
    }
    g.circle(mc.x + r * 0.3, mc.y + r * 0.16, r * 0.028).fill(0x2a2a30);
    g.circle(mc.x + r * 0.36, mc.y + r * 0.15, r * 0.024).fill(0x2a2a30);
    // The mouth is one flat, straight, horizontal line (owner, 20/11/2026), not a smile.
    g.moveTo(mc.x + r * 0.15, mc.y + r * 0.42)
      .lineTo(mc.x + r * 0.37, mc.y + r * 0.42)
      .stroke({ width: r * 0.05, color: 0x1a1a1e, cap: 'butt' });
  }

  /** A mannequin's head: a smooth egg with a seam round it and a soft highlight. */
  private egg(g: Graphics, s: Skel): void {
    const r = this.st.headRadius;
    const w = this.st.w;
    const h = s.head;
    this.neck(g, s);
    oval(g, h, 0.2, 1, r * 1.12 + w * 0.22, r * 0.92 + w * 0.22, this.c(this.P.outline));
    oval(g, h, 0.2, 1, r * 1.12, r * 0.92, this.c(this.P.skin));
    oval(g, { x: h.x - this.lx * r * 0.3, y: h.y + r * 0.25 }, 0.2, 1, r * 0.9, r * 0.6, this.c(this.P.skinShade), 0.6);
    oval(
      g,
      { x: h.x + this.lx * r * 0.35, y: h.y - r * 0.35 },
      0.2,
      1,
      r * 0.4,
      r * 0.28,
      this.c(this.P.skinLit),
      0.85,
    );
    g.moveTo(h.x - r * 0.75, h.y - r * 0.6)
      .quadraticCurveTo(h.x, h.y - r * 0.1, h.x + r * 0.85, h.y + r * 0.45)
      .stroke({ width: r * 0.05, color: this.c(this.P.skinShade), alpha: 0.9, cap: 'round' });
  }

  /**
   * Vexoris's gas mask (spec B1: "the most recognisable feature"): an olive helmet, a dark rubber face
   * with two round glowing lenses, a round breathing filter on the front with a corrugated tube that runs down
   * to the chest rig, and a strap round the back of the head.
   */
  private gasMask(g: Graphics, fire: Graphics, s: Skel): void {
    const r = this.st.headRadius * 1.1;
    const w = this.st.w;
    const h = s.head;
    const seam = this.P.seam ?? 0x7dff3a;
    this.neck(g, s);
    // The corrugated breathing tube first, so the head sits over its root: from the filter down to the chest.
    const root = { x: h.x + r * 0.92, y: h.y + r * 0.62 };
    const mid = { x: h.x + r * 1.2, y: h.y + r * 1.9 };
    const end = { x: h.x + r * 0.15, y: h.y + r * 2.6 };
    g.moveTo(root.x, root.y)
      .quadraticCurveTo(mid.x, mid.y, end.x, end.y)
      .stroke({ width: w * 0.9, color: this.c(this.P.outline), cap: 'round' });
    g.moveTo(root.x, root.y)
      .quadraticCurveTo(mid.x, mid.y, end.x, end.y)
      .stroke({ width: w * 0.62, color: this.c(this.P.armour), cap: 'round' });
    for (let i = 1; i < 8; i++) {
      const k = i / 8;
      const x = (1 - k) * (1 - k) * root.x + 2 * k * (1 - k) * mid.x + k * k * end.x;
      const y = (1 - k) * (1 - k) * root.y + 2 * k * (1 - k) * mid.y + k * k * end.y;
      g.moveTo(x - w * 0.3, y - w * 0.12)
        .lineTo(x + w * 0.3, y + w * 0.12)
        .stroke({ width: w * 0.1, color: this.c(this.P.armourLit), alpha: 0.9, cap: 'round' });
    }
    // The head: dark rubber, shaded to the back.
    oval(g, h, 1, 0, r * 1.02 + w * 0.2, r * 1.1 + w * 0.2, this.c(this.P.outline));
    oval(g, h, 1, 0, r * 1.02, r * 1.1, this.c(0x1d1f1a));
    oval(g, { x: h.x - this.lx * r * 0.2, y: h.y + r * 0.25 }, 1, 0, r * 0.85, r * 0.7, this.c(0x0f100d), 0.6);
    // The snout: a rounded muzzle at the front.
    oval(g, { x: h.x + r * 0.78, y: h.y + r * 0.42 }, 1, 0, r * 0.52, r * 0.46, this.c(this.P.outline));
    oval(g, { x: h.x + r * 0.78, y: h.y + r * 0.42 }, 1, 0, r * 0.44, r * 0.38, this.c(0x2a2d26));
    oval(g, { x: h.x + r * 0.7, y: h.y + r * 0.3 }, 1, 0, r * 0.2, r * 0.12, this.c(0x5a5f52), 0.8);
    // The filter canister on the muzzle: an olive can with ridges and a green indicator.
    const fc = { x: h.x + r * 1.02, y: h.y + r * 0.52 };
    oval(g, fc, 1, 0, r * 0.32 + w * 0.12, r * 0.34 + w * 0.12, this.c(this.P.outline));
    oval(g, fc, 1, 0, r * 0.32, r * 0.34, this.c(this.P.skin));
    oval(g, { x: fc.x - r * 0.06, y: fc.y - r * 0.08 }, 1, 0, r * 0.18, r * 0.2, this.c(this.P.skinLit), 0.9);
    for (const k of [-0.15, 0.02, 0.19]) {
      g.moveTo(fc.x - r * 0.28, fc.y + r * k)
        .lineTo(fc.x + r * 0.28, fc.y + r * k)
        .stroke({ width: r * 0.045, color: this.c(this.P.skinShade), alpha: 0.9, cap: 'round' });
    }
    // The lens: a profile view shows ONE eye, the one nearer the camera (owner, 20/11/2026: the far eye is gone).
    for (const [dx, k] of [[0.42, 0.36]] as const) {
      const lc = { x: h.x + r * dx, y: h.y - r * 0.12 };
      oval(g, lc, 1, 0, r * k * 0.8 + w * 0.12, r * k + w * 0.12, this.c(this.P.outline));
      oval(g, lc, 1, 0, r * k * 0.8, r * k, this.c(0x3a3d34)); // the rim
      oval(g, lc, 1, 0, r * k * 0.66, r * k * 0.84, this.c(0x0d1a06));
      oval(g, lc, 1, 0, r * k * 0.52, r * k * 0.68, this.c(seam), 0.9);
      oval(g, { x: lc.x - r * k * 0.08, y: lc.y - r * k * 0.2 }, 1, 0, r * k * 0.2, r * k * 0.26, 0xffffff, 0.8);
      fire.circle(lc.x, lc.y, r * k * 1.15).fill({ color: seam, alpha: 0.12 });
    }
    // The helmet: an olive shell over the crown with a rolled brim, riveted.
    const rim = [-1.05, -0.2, 1.0, -0.1];
    const shell: number[] = [];
    for (let i = 0; i <= 14; i++) {
      const th = Math.PI + (i / 14) * Math.PI; // a half circle over the top
      shell.push(h.x + Math.cos(th) * r * 1.12, h.y - r * 0.18 + Math.sin(th) * r * 1.2);
    }
    g.poly(shell).fill(this.c(this.P.outline));
    const inner = shell.map((v, k) =>
      k % 2 === 0 ? h.x + (v - h.x) * 0.94 : h.y - r * 0.18 + (v - (h.y - r * 0.18)) * 0.92,
    );
    g.poly(inner).fill(this.c(this.P.skin));
    oval(g, { x: h.x + this.lx * r * 0.2, y: h.y - r * 0.85 }, 1, 0, r * 0.6, r * 0.24, this.c(this.P.skinLit), 0.85);
    g.moveTo(h.x + r * rim[0]!, h.y + r * rim[1]!)
      .lineTo(h.x + r * 1.16, h.y + r * rim[3]!)
      .stroke({ width: r * 0.14, color: this.c(this.P.armourEdge), cap: 'round' });
    g.moveTo(h.x - r * 1.0, h.y - r * 0.26)
      .lineTo(h.x + r * 1.1, h.y - r * 0.18)
      .stroke({ width: r * 0.06, color: this.c(this.P.rim), alpha: 0.55, cap: 'round' });
    // The strap round the back of the head, with a buckle.
    g.moveTo(h.x - r * 1.0, h.y + r * 0.05)
      .lineTo(h.x - r * 0.1, h.y + r * 0.6)
      .stroke({ width: r * 0.12, color: this.c(this.P.armour), cap: 'round' });
    oval(g, { x: h.x - r * 0.7, y: h.y + r * 0.22 }, 1, 0, r * 0.08, r * 0.1, this.c(this.P.armourLit));
  }

  /** A crest of flame for hair: tongues swept back and up from the crown, streaming with speed. */
  private crest(fire: Graphics, h: Point, r: number): void {
    const t = this.st.t;
    const back = -0.35 - this.st.motion * 0.9;
    for (const L of [
      { n: 6, colour: 0xff3c14, alpha: 0.6, len: 1.9, w: 0.4 },
      { n: 5, colour: 0xff8c1e, alpha: 0.7, len: 1.5, w: 0.36 },
      { n: 4, colour: 0xffd95a, alpha: 0.8, len: 1.05, w: 0.32 },
    ]) {
      for (let i = 0; i < L.n; i++) {
        const k = (i + 0.5) / L.n; // front of the crown to the back
        const bx = h.x + r * (0.55 - k * 1.25);
        const by = h.y - r * (0.75 + 0.15 * Math.sin(k * Math.PI));
        const flick = Math.sin(t * 9 + i * 2.1 + L.len * 3) * 0.5 + Math.sin(t * 15.3 + i * 1.3) * 0.3;
        const tipX = bx + back * r * (0.6 + k) + flick * r * 0.2;
        const tipY = by - r * (L.len * (0.65 + 0.35 * Math.sin(k * Math.PI)) + flick * 0.15);
        const bw = r * L.w;
        fire
          .moveTo(bx - bw, by + r * 0.15)
          .bezierCurveTo(bx - bw * 1.2, by - r * 0.4, tipX - bw * 0.4, tipY + r * 0.5, tipX, tipY)
          .bezierCurveTo(tipX + bw * 0.4, tipY + r * 0.5, bx + bw * 1.2, by - r * 0.4, bx + bw, by + r * 0.15)
          .fill({ color: L.colour, alpha: L.alpha });
      }
    }
    for (let i = 0; i < 5; i++) {
      const k = (t * 0.8 + i / 5) % 1;
      fire
        .circle(
          h.x - r * (0.2 + k * 0.8) + Math.sin(i * 4 + t * 3) * r * 0.4,
          h.y - r * (1.3 + k * 2.4),
          r * 0.08 * (1 - k * 0.6),
        )
        .fill({
          color: 0xffb03c,
          alpha: 1 - k,
        });
    }
  }
}
