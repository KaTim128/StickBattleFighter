/**
 * EFFECTS LIBRARY (TD-039): named visual effects that Effects Profiles
 * reference by id. Effects fire from combat events (impacts, blocks, clash
 * beats, finishers, defeat), never from inside individual animations.
 */
export interface EffectDef {
  /** Spark streaks thrown along the blow. */
  readonly sparks?: { readonly count: number; readonly speedMps: number; readonly colour: number };
  /** Rising fire embers. */
  readonly embers?: number;
  /** A burst ring at the contact point. */
  readonly ring?: { readonly sizeM: number; readonly colour: number };
  /** A floor scorch mark, radius metres. */
  readonly scorchM?: number;
  /** Dust colours for disintegration (the fighter's own colour is added to these). */
  readonly dust?: readonly number[];
  /** Fire particles around the fists and feet while attacking. */
  readonly limbFlames?: boolean;
  /** Embers drifting off the body all the time. */
  /** Dust colours kicked up at each footfall (heavy fighters). */
  readonly stepDust?: readonly number[];
  readonly bodyEmbers?: boolean;
}

export const EFFECTS: Readonly<Record<string, EffectDef>> = {
  'impact-light': { sparks: { count: 9, speedMps: 5, colour: 0xfff4d6 }, ring: { sizeM: 0.35, colour: 0xfff4d6 } },
  'impact-heavy': { sparks: { count: 18, speedMps: 7.5, colour: 0xffe08a }, ring: { sizeM: 0.6, colour: 0xffe08a } },
  'impact-kick': { sparks: { count: 16, speedMps: 7, colour: 0xffe08a }, ring: { sizeM: 0.55, colour: 0xffe08a } },
  'block-guard': { sparks: { count: 6, speedMps: 4, colour: 0x9fd6ff }, ring: { sizeM: 0.3, colour: 0x9fd6ff } },
  'flame-burst-small': {
    sparks: { count: 10, speedMps: 5, colour: 0xffa53a },
    embers: 8,
    ring: { sizeM: 0.4, colour: 0xffa53a },
  },
  'flame-burst-directional': {
    sparks: { count: 18, speedMps: 7.5, colour: 0xff8a2a },
    embers: 16,
    ring: { sizeM: 0.55, colour: 0xffa53a },
  },
  'flame-burst-large': {
    sparks: { count: 28, speedMps: 9, colour: 0xff8a2a },
    embers: 30,
    ring: { sizeM: 0.9, colour: 0xffd23f },
    scorchM: 0.6,
  },
  'ground-fire-explosion': {
    sparks: { count: 32, speedMps: 9, colour: 0xff6a00 },
    embers: 44,
    ring: { sizeM: 1.4, colour: 0xffa53a },
    scorchM: 1.1,
  },
  // A crushing blow: stone-dust shrapnel and a wide, dull shockwave ring (Rampage).
  'impact-crush': { sparks: { count: 26, speedMps: 8, colour: 0xd9c7a6 }, ring: { sizeM: 0.95, colour: 0xeadcc2 } },
  'clash-white': { sparks: { count: 14, speedMps: 6, colour: 0xffffff }, ring: { sizeM: 0.5, colour: 0xffffff } },
  'clash-fire': {
    sparks: { count: 16, speedMps: 6.5, colour: 0xffb060 },
    embers: 10,
    ring: { sizeM: 0.5, colour: 0xffb060 },
  },
  'finisher-white': { sparks: { count: 36, speedMps: 10, colour: 0xffffff }, ring: { sizeM: 1.2, colour: 0xffffff } },
  'finisher-fire': {
    sparks: { count: 40, speedMps: 10, colour: 0xff8a2a },
    embers: 50,
    ring: { sizeM: 1.4, colour: 0xffd23f },
    scorchM: 0.9,
  },
  'dust-grey': { dust: [0xd9d4c7, 0xb8b2a6] },
  'ember-ash': { dust: [0xff7a2e, 0xffb04d, 0x4a4a4a, 0x8a8580], embers: 30 },
  'flame-limbs': { limbFlames: true },
  'fire-aura': { bodyEmbers: true },
  // A heavyweight's footfalls kick up a puff of dust (Rampage).
  'dust-steps': { stepDust: [0xb8aa94, 0x9a8c78, 0xd8ccb8] },
};

export function isEffect(id: string): boolean {
  return id in EFFECTS;
}
