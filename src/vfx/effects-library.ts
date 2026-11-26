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
  /** The colours of the limb particles (default fire); Vexoris's fists and feet trail toxic green. */
  readonly limbPalette?: {
    readonly deep: number;
    readonly hot: number;
    readonly bright: number;
    readonly core: number;
  };
  /** Glass shards thrown off the contact (a smashed jar). */
  readonly shards?: number;
  /** Liquid droplets splashed from the contact, in this colour. */
  readonly splash?: { readonly count: number; readonly colour: number };
  /** Lingering vapour left around the contact point: puff count. */
  readonly mist?: number;
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
  // Vexoris (TD-114): toxic green. A small, sharp burst for karate strikes; the jar smash adds glass, a liquid splash, a
  // ring on the floor and a lingering poison mist.
  'toxin-limbs': {
    limbFlames: true,
    limbPalette: { deep: 0x153a08, hot: 0x3fae14, bright: 0x7dff3a, core: 0xe8ffc8 },
  },
  'toxic-hit': { sparks: { count: 11, speedMps: 5.5, colour: 0x7dff3a }, ring: { sizeM: 0.4, colour: 0x7dff3a } },
  'toxic-smash': {
    sparks: { count: 14, speedMps: 7, colour: 0xc8ffa0 },
    ring: { sizeM: 0.95, colour: 0x7dff3a },
    shards: 16,
    splash: { count: 22, colour: 0x5fe02a },
    mist: 12,
  },
  // Aerion's wind: pale blue streaks on the limbs, a quick gust ring on every blow, a wide shockwave on the wing smash.
  'wind-limbs': {
    limbFlames: true,
    limbPalette: { deep: 0x4a6f9a, hot: 0x8fc4f4, bright: 0xd4eeff, core: 0xffffff },
  },
  'wind-hit': { sparks: { count: 10, speedMps: 6, colour: 0xd4eeff }, ring: { sizeM: 0.45, colour: 0xd4eeff } },
  'wind-launch': { sparks: { count: 16, speedMps: 8, colour: 0xffffff }, ring: { sizeM: 0.8, colour: 0xbfe2ff } },
  'wind-smash': {
    sparks: { count: 22, speedMps: 8, colour: 0xe8f6ff },
    ring: { sizeM: 1.9, colour: 0xbfe2ff },
    mist: 8,
  },
  // Kenshiro's steel: a clean white flash and a few bright sparks on every cut, a crimson ring on the heavy.
  'sword-hit': { sparks: { count: 14, speedMps: 7, colour: 0xffe9e9 }, ring: { sizeM: 0.4, colour: 0xff6a72 } },
  'sword-heavy': { sparks: { count: 24, speedMps: 9, colour: 0xffffff }, ring: { sizeM: 1, colour: 0xff4a55 } },
  // Psion's psychic force: violet motes on the hands, a soft ring on every touch, a wide shockwave on the force wave.
  'psi-limbs': {
    limbFlames: true,
    limbPalette: { deep: 0x2a1650, hot: 0x8a4fe0, bright: 0xc7a1ff, core: 0xf4eaff },
  },
  'psi-hit': { sparks: { count: 10, speedMps: 5, colour: 0xc7a1ff }, ring: { sizeM: 0.5, colour: 0x8a4fe0 } },
  'psi-blast': {
    sparks: { count: 20, speedMps: 8, colour: 0xf4eaff },
    ring: { sizeM: 1.1, colour: 0xc7a1ff },
    mist: 6,
  },
  'psi-wave': { sparks: { count: 24, speedMps: 8, colour: 0xe8d8ff }, ring: { sizeM: 2.2, colour: 0xc7a1ff }, mist: 8 },
  // Geargrind's machinery: orange sparks off the knuckles, a clanging ring, a heavy slam on the hydraulic smash.
  'gear-limbs': {
    limbFlames: true,
    limbPalette: { deep: 0x3a3f48, hot: 0xff7a1a, bright: 0xffb455, core: 0xfff1d6 },
  },
  'gear-hit': { sparks: { count: 12, speedMps: 6, colour: 0xffb455 }, ring: { sizeM: 0.45, colour: 0xff7a1a } },
  'gear-slam': {
    sparks: { count: 26, speedMps: 9, colour: 0xffd9a0 },
    ring: { sizeM: 1.6, colour: 0xff7a1a },
    dust: [0x8a8f98, 0x55595f],
  },
  // Reson's sound: cyan rings that ring out from every touch, a wide shockwave on the gauntlet blast.
  'sonic-limbs': {
    limbFlames: true,
    limbPalette: { deep: 0x0a3a4a, hot: 0x19c4e0, bright: 0x7ae8ff, core: 0xeafcff },
  },
  'sonic-hit': { sparks: { count: 8, speedMps: 5, colour: 0x7ae8ff }, ring: { sizeM: 0.7, colour: 0x19c4e0 } },
  'sonic-wave': {
    sparks: { count: 18, speedMps: 8, colour: 0xeafcff },
    ring: { sizeM: 2.0, colour: 0x7ae8ff },
    mist: 4,
  },
  // Voltar's lightning: cyan and white with a yellow fork; a sharp flash on every touch and a wide arc on the surge.
  'volt-limbs': {
    limbFlames: true,
    limbPalette: { deep: 0x0b2f4a, hot: 0x19c4e0, bright: 0x8ff8ff, core: 0xfffbd0 },
  },
  'volt-hit': { sparks: { count: 12, speedMps: 8, colour: 0xfffbd0 }, ring: { sizeM: 0.6, colour: 0x2ee6ff } },
  'volt-wave': {
    sparks: { count: 26, speedMps: 11, colour: 0xffffff },
    ring: { sizeM: 2.1, colour: 0x7ef6ff },
    mist: 3,
  },
  'volt-aura': { bodyEmbers: true },
  // Chronos's time: pale cyan with a bronze glint; delayed rings echo every touch.
  'time-limbs': {
    limbFlames: true,
    limbPalette: { deep: 0x0a3340, hot: 0x19b8d6, bright: 0x8defff, core: 0xf0fdff },
  },
  'time-hit': { sparks: { count: 8, speedMps: 4, colour: 0x8defff }, ring: { sizeM: 0.6, colour: 0xb98a4a } },
  'time-wave': {
    sparks: { count: 18, speedMps: 7, colour: 0xf0fdff },
    ring: { sizeM: 1.9, colour: 0x8defff },
    mist: 4,
  },
  // Prismor's crystal: purple and blue glints, a bright ring on every touch, a heavy burst on the crush.
  'crystal-limbs': {
    limbFlames: true,
    limbPalette: { deep: 0x1b1450, hot: 0x7b5cff, bright: 0x4aa8ff, core: 0xe9e2ff },
  },
  'crystal-hit': { sparks: { count: 10, speedMps: 5, colour: 0x9f8cff }, ring: { sizeM: 0.55, colour: 0x4aa8ff } },
  'crystal-wave': {
    sparks: { count: 22, speedMps: 8, colour: 0xe9e2ff },
    ring: { sizeM: 1.8, colour: 0x7b5cff },
    dust: [0x7b5cff, 0x4aa8ff],
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
