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

/**
 * Thousands of people murmuring: many bands of noise across the voice range, each rising and
 * falling at its own chatter rate (no words, no voices you can pick out).
 */
export interface CrowdBed {
  readonly kind: 'crowd';
  readonly bands: number;
  readonly lowHz: number;
  readonly highHz: number;
  readonly gain: number;
  /** How often each band's level changes, per second. */
  readonly chatterHz: readonly [number, number];
  readonly swell?: Swell;
}

export type AmbientBed = NoiseBed | HumBed | CrowdBed;

/** One-off sounds (each synthesised in src/audio/ambience.ts). */
export const AMBIENT_EVENTS = [
  // Empty office
  'creak',
  'thump',
  'tick',
  'knock',
  'flicker',
  'vent-click',
  // Arena crowd
  'cheer',
  'applause',
  'whistle',
  'ooh',
  'roar',
] as const;
export type AmbientEventId = (typeof AMBIENT_EVENTS)[number];

/** Crowd sounds: never in a soundscape meant to be empty of people. */
export const CROWD_EVENTS: readonly AmbientEventId[] = ['cheer', 'applause', 'whistle', 'ooh', 'roar'];

export interface AmbientEvent {
  readonly id: AmbientEventId;
  /** Seconds between occurrences, picked at random in this range. */
  readonly everyS: readonly [number, number];
  readonly gain: number;
}

/** What happens in the fight that the soundscape answers (a crowd reacting). */
export type AmbientCue = 'heavy-hit' | 'ko';

export interface AmbienceDef {
  readonly id: string;
  readonly title: string;
  /** Overall level, 0..1. */
  readonly level: number;
  /** The space: reverb tail length and how much of the sound is reverb. */
  readonly reverb: { readonly seconds: number; readonly wet: number };
  /** Heard through a wall or a tunnel: everything above this is muffled. */
  readonly muffleHz?: number;
  readonly beds: readonly AmbientBed[];
  readonly events: readonly AmbientEvent[];
  /** Events played when something happens in the fight. */
  readonly reactions?: Partial<Record<AmbientCue, AmbientEventId>>;
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
 * COLOSSEUM DURING A LIVE TOURNAMENT (owner, 12/11/2026): tense, intimidating and immersive. A
 * huge bowl of thousands murmuring under a low roar that surges every few seconds, cheers,
 * applause, whistles and "ooh"s from the stands, and now and then the whole crowd erupting, all
 * echoing round the stone. The crowd answers the fight: a big blow draws an "ooh", a KO a roar.
 * The owner's reference track set the shape (a dense, low-heavy, constant tension with regular
 * swells and occasional big surges); none of it is copied, and there is no music in it.
 */
const COLOSSEUM: AmbienceDef = {
  id: 'colosseum',
  title: 'Colosseum, tournament in progress',
  level: 0.85,
  reverb: { seconds: 4.5, wet: 0.5 },
  beds: [
    {
      kind: 'crowd',
      bands: 9,
      lowHz: 220,
      highHz: 2600,
      gain: 1,
      chatterHz: [3, 7],
      swell: { everyS: [4, 7], depth: 0.7 },
    },
    {
      kind: 'noise',
      colour: 'brown',
      filter: 'lowpass',
      freqHz: 240,
      gain: 0.2,
      swell: { everyS: [4, 7], depth: 0.6 },
    },
    {
      kind: 'noise',
      colour: 'pink',
      filter: 'bandpass',
      freqHz: 650,
      q: 0.5,
      gain: 0.08,
      swell: { everyS: [10, 20], depth: 0.4 },
    },
  ],
  events: [
    { id: 'cheer', everyS: [5, 12], gain: 1.4 },
    { id: 'applause', everyS: [8, 18], gain: 1.2 },
    { id: 'whistle', everyS: [6, 16], gain: 0.5 },
    { id: 'ooh', everyS: [10, 22], gain: 1.3 },
    { id: 'roar', everyS: [30, 60], gain: 2.4 },
  ],
  reactions: { 'heavy-hit': 'ooh', ko: 'roar' },
};

/**
 * THE FIGHTERS' TUNNEL (menu): the same tournament heard through stone from under the stands,
 * muffled and distant, waiting to walk out.
 */
const TUNNEL: AmbienceDef = {
  ...COLOSSEUM,
  id: 'tunnel',
  title: "Fighters' tunnel under the Colosseum",
  level: 0.7,
  reverb: { seconds: 3.2, wet: 0.55 },
  muffleHz: 700,
  events: COLOSSEUM.events.filter((e) => e.id !== 'whistle'),
  reactions: undefined,
};

export const MENU_AMBIENCE_ID = 'tunnel';

export const AMBIENCES: Readonly<Record<string, AmbienceDef>> = {
  [OFFICE_EMPTY.id]: OFFICE_EMPTY,
  [COLOSSEUM.id]: COLOSSEUM,
  [TUNNEL.id]: TUNNEL,
};
