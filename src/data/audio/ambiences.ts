/**
 * Background ambiences (owner, 12/11/2026: "ensure all background music are ambience, not
 * music"). Each map has a soundscape of natural environmental sound: continuous beds (filtered
 * noise, hums, a crowd's murmur) under random one-off events, all in a reverb sized to the space.
 * Everything is ORIGINAL and synthesised at runtime (src/audio/ambience.ts): no audio files, no
 * notes, melodies, beats or instruments.
 */

export type NoiseColour = 'white' | 'pink' | 'brown';

/** A slow, irregular rise and fall in level (ventilation breathing, a crowd surging). */
export interface Swell {
  /** Seconds between swells, picked at random in this range. */
  readonly everyS: readonly [number, number];
  /** 0..1 how far the level rises at a swell. */
  readonly depth: number;
}

/** Filtered noise: air handling, the roar of a stadium bowl, wind. */
export interface NoiseBed {
  readonly kind: 'noise';
  readonly colour: NoiseColour;
  readonly filter: BiquadFilterType;
  readonly freqHz: number;
  readonly q?: number;
  readonly gain: number;
  readonly swell?: Swell;
}

/** Steady electrical hum (mains and its harmonics, transformer drone). */
export interface HumBed {
  readonly kind: 'hum';
  readonly freqsHz: readonly number[];
  readonly gain: number;
}

export type AmbientBed = NoiseBed | HumBed;

/** One-off sounds (each synthesised in src/audio/ambience.ts). */
export const AMBIENT_EVENTS = [
  // Empty office
  'creak',
  'thump',
  'tick',
  'knock',
  'flicker',
  'vent-click',
] as const;
export type AmbientEventId = (typeof AMBIENT_EVENTS)[number];

export interface AmbientEvent {
  readonly id: AmbientEventId;
  /** Seconds between occurrences, picked at random in this range. */
  readonly everyS: readonly [number, number];
  readonly gain: number;
}

export interface AmbienceDef {
  readonly id: string;
  readonly title: string;
  /** Overall level, 0..1. */
  readonly level: number;
  /** The space: reverb tail length and how much of the sound is reverb. */
  readonly reverb: { readonly seconds: number; readonly wet: number };
  /** Heard through a wall or a tunnel: everything above this is muffled. */
  readonly muffleHz?: number;
  /**
   * Distinct echoes off far walls (a stone arena's slapback), on top of the reverb: delay taps in
   * seconds, how much each repeat feeds the next, darkened above `lowpassHz`, at level `wet`.
   */
  readonly echo?: {
    readonly delaysS: readonly number[];
    readonly feedback: number;
    readonly lowpassHz: number;
    readonly wet: number;
  };
  readonly beds: readonly AmbientBed[];
  readonly events: readonly AmbientEvent[];
}

/**
 * EMPTY OFFICE AFTER HOURS (owner, 12/11/2026): still, spacious, slightly eerie, as if everyone
 * has left. Air conditioning and ventilation breathing slowly, the 50 Hz mains hum of the lights
 * (Malaysian mains), a faint low drone that beats against itself, and now and then the building
 * settling: a creak, a distant thump, an electrical tick, a pipe knock, a fluorescent flicker, a
 * vent clicking. No people, voices, footsteps, typing or music.
 */
const OFFICE_EMPTY: AmbienceDef = {
  id: 'office-empty',
  title: 'Empty office, after hours',
  level: 0.9,
  reverb: { seconds: 2.6, wet: 0.38 },
  beds: [
    {
      kind: 'noise',
      colour: 'brown',
      filter: 'lowpass',
      freqHz: 300,
      gain: 0.3,
      swell: { everyS: [9, 16], depth: 0.3 },
    },
    {
      kind: 'noise',
      colour: 'pink',
      filter: 'bandpass',
      freqHz: 1100,
      q: 0.6,
      gain: 0.07,
      swell: { everyS: [6, 12], depth: 0.35 },
    },
    { kind: 'hum', freqsHz: [50, 100, 150], gain: 0.03 },
    { kind: 'hum', freqsHz: [41, 41.35], gain: 0.045 },
  ],
  events: [
    { id: 'creak', everyS: [9, 22], gain: 0.8 },
    { id: 'thump', everyS: [12, 30], gain: 0.9 },
    { id: 'tick', everyS: [5, 14], gain: 0.25 },
    { id: 'knock', everyS: [18, 40], gain: 0.3 },
    { id: 'flicker', everyS: [20, 45], gain: 0.2 },
    { id: 'vent-click', everyS: [25, 60], gain: 0.25 },
  ],
};

/**
 * THE HOUSE AT NIGHT (Hide and Seek, Phase 2 section J): a dark, heavy, uneasy bed made only of
 * air, a deep beating drone and rare building noises, with a long reverb. Original and synthesised;
 * the supplied candidate file `docs/references/master-plan/darkne-scary-horror-atmosphere-620036.mp3`
 * is NOT used until the owner confirms its licence (AUDIO_ASSET_CATALOG.md).
 */
const HOUSE_NIGHT: AmbienceDef = {
  id: 'house-night',
  title: 'The house at night',
  level: 0.85,
  reverb: { seconds: 3.4, wet: 0.45 },
  beds: [
    {
      kind: 'noise',
      colour: 'brown',
      filter: 'lowpass',
      freqHz: 220,
      gain: 0.34,
      swell: { everyS: [7, 14], depth: 0.4 },
    },
    {
      kind: 'noise',
      colour: 'pink',
      filter: 'bandpass',
      freqHz: 700,
      q: 0.8,
      gain: 0.05,
      swell: { everyS: [5, 11], depth: 0.5 },
    },
    { kind: 'hum', freqsHz: [36, 36.5], gain: 0.07 },
    { kind: 'hum', freqsHz: [54, 55.2], gain: 0.025 },
  ],
  events: [
    { id: 'creak', everyS: [6, 15], gain: 0.9 },
    { id: 'thump', everyS: [10, 24], gain: 0.8 },
    { id: 'knock', everyS: [16, 38], gain: 0.35 },
    { id: 'tick', everyS: [9, 20], gain: 0.2 },
  ],
};

export const AMBIENCES: Readonly<Record<string, AmbienceDef>> = {
  [OFFICE_EMPTY.id]: OFFICE_EMPTY,
  [HOUSE_NIGHT.id]: HOUSE_NIGHT,
};
