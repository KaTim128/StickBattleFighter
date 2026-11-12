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
  'distant-cheer',
  'gasp',
  'murmur-rise',
] as const;
export type AmbientEventId = (typeof AMBIENT_EVENTS)[number];

/** Crowd sounds: never in a soundscape meant to be empty of people. */
export const CROWD_EVENTS: readonly AmbientEventId[] = [
  'cheer',
  'applause',
  'whistle',
  'ooh',
  'roar',
  'distant-cheer',
  'gasp',
  'murmur-rise',
];

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
 * COLOSSEUM DURING A LIVE TOURNAMENT (owner, 12/11/2026, second brief: "suspenseful ambience inside a
 * massive Colosseum ... tense, intimidating and immersive", designed from that brief alone and not
 * modelled on any audio the owner supplied earlier).
 * - Bed: thousands of supporters murmuring over a low rumble of the bowl; the murmur rises and falls
 *   slowly and irregularly (no regular surges), which keeps it uneasy.
 * - Events: distant cheering from the far stands, the crowd's murmur building nervously and settling
 *   back (suspense), occasional applause, whistles, sharp excited gasps, nearer cheers, and now and
 *   then the whole bowl erupting.
 * - Space: a long stone reverb plus slapback echoes off the arena walls.
 * The crowd answers the fight: a big blow draws an "ooh", a KO a roar. No music, melody, beats or
 * instruments: all synthesised noise and voices-like swells (src/audio/ambience.ts).
 */
const COLOSSEUM: AmbienceDef = {
  id: 'colosseum',
  title: 'Colosseum, tournament in progress',
  level: 0.85,
  reverb: { seconds: 5.5, wet: 0.55 },
  echo: { delaysS: [0.21, 0.37, 0.58], feedback: 0.32, lowpassHz: 1800, wet: 0.3 },
  beds: [
    {
      kind: 'crowd',
      bands: 12,
      lowHz: 180,
      highHz: 2400,
      gain: 0.9,
      chatterHz: [2, 6],
      swell: { everyS: [9, 20], depth: 0.35 },
    },
    {
      kind: 'noise',
      colour: 'brown',
      filter: 'lowpass',
      freqHz: 200,
      gain: 0.22,
      swell: { everyS: [12, 25], depth: 0.4 },
    },
    {
      kind: 'noise',
      colour: 'pink',
      filter: 'bandpass',
      freqHz: 500,
      q: 0.5,
      gain: 0.06,
      swell: { everyS: [15, 30], depth: 0.3 },
    },
  ],
  events: [
    { id: 'distant-cheer', everyS: [6, 14], gain: 1.1 },
    { id: 'murmur-rise', everyS: [14, 28], gain: 1 },
    { id: 'applause', everyS: [12, 26], gain: 0.9 },
    { id: 'whistle', everyS: [8, 18], gain: 0.45 },
    { id: 'gasp', everyS: [16, 34], gain: 1 },
    { id: 'ooh', everyS: [25, 50], gain: 1 },
    { id: 'cheer', everyS: [18, 35], gain: 1.1 },
    { id: 'roar', everyS: [45, 90], gain: 2 },
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
