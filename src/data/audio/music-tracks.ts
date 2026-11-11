/**
 * Background music (owner, 11/11/2026: "fighting music in the background; the menu screen has
 * its own music; every map has its own unique fighting music"). Every track is ORIGINAL and
 * synthesised at runtime from these notes (src/audio/music.ts): no audio files.
 *
 * A track is a loop of bars. Each bar has 16 steps (sixteenth notes). Notes are SCALE DEGREES
 * (0 = the root, 7 = the root an octave up in a 7-note scale), so a track can be re-keyed by
 * changing `rootMidi` or `scale` alone.
 */
export interface MusicTrack {
  readonly id: string;
  readonly title: string;
  readonly bpm: number;
  /** MIDI note of the scale root for the bass (lead and pads sit one and two octaves up). */
  readonly rootMidi: number;
  /** Semitones of the scale above the root. */
  readonly scale: readonly number[];
  /** Chord root per bar, as a scale degree; the loop is this many bars long. */
  readonly progression: readonly number[];
  /** Drum patterns over one bar: 'x' hit, 'o' soft hit, '.' rest. */
  readonly kick: string;
  readonly snare: string;
  readonly hat: string;
  /** Bass per step of one bar, as degrees above the bar's chord root; null = rest. */
  readonly bass: readonly (number | null)[];
  readonly bassWave: OscillatorType;
  /** Lead melody across the whole loop (16 steps × bars), absolute degrees; null = rest. */
  readonly lead: readonly (number | null)[] | null;
  readonly leadWave: OscillatorType;
  /** A sustained chord under each bar. */
  readonly pad: boolean;
  /** Arpeggio over the chord: step indices (0..15) that play the next chord tone. */
  readonly arpSteps: readonly number[];
  /** Overall level, 0..1. */
  readonly level: number;
}

const MINOR = [0, 2, 3, 5, 7, 8, 10] as const;
const DORIAN = [0, 2, 3, 5, 7, 9, 10] as const;
const _ = null;

/** Title / menu: slow, wide and moody: a heroic theme waiting to start, no driving drums. */
export const MENU_THEME: MusicTrack = {
  id: 'menu-theme',
  title: 'Before the Bell',
  bpm: 84,
  rootMidi: 38, // D2
  scale: MINOR,
  progression: [0, 5, 3, 4],
  kick: 'x.......x.......',
  snare: '................',
  hat: '....o.......o...',
  bass: [0, _, _, _, _, _, _, _, 0, _, _, _, 4, _, _, _],
  bassWave: 'triangle',
  lead: [
    ...[7, _, _, _, 9, _, 10, _, 9, _, _, _, 7, _, _, _],
    ...[5, _, _, _, 7, _, 8, _, 7, _, _, _, _, _, _, _],
    ...[3, _, _, _, 5, _, 7, _, 8, _, _, _, 7, _, 5, _],
    ...[4, _, _, _, _, _, 6, _, 7, _, _, _, _, _, _, _],
  ],
  leadWave: 'triangle',
  pad: true,
  arpSteps: [0, 2, 4, 6, 8, 10, 12, 14],
  level: 0.8,
};

/** Office: fast and driving, four-on-the-floor with a gritty saw bass and a fiery riff. */
export const OFFICE_FIGHT: MusicTrack = {
  id: 'office-fight',
  title: 'Overtime Brawl',
  bpm: 146,
  rootMidi: 40, // E2
  scale: MINOR,
  progression: [0, 0, 5, 6],
  kick: 'x...x...x...x...',
  snare: '....x.......x..o',
  hat: 'x.x.x.x.x.x.xxx.',
  bass: [0, _, 0, 7, 0, _, 0, 7, 0, _, 0, 7, 3, _, 4, _],
  bassWave: 'sawtooth',
  lead: [
    ...[7, _, 7, 8, 7, _, 5, _, 4, _, 5, _, 7, _, _, _],
    ...[7, _, 7, 8, 10, _, 8, _, 7, _, 5, _, 4, _, _, _],
    ...[5, _, 5, 7, 8, _, 7, _, 5, _, 4, _, 2, _, _, _],
    ...[6, _, 6, 7, 8, _, 9, _, 10, _, 11, _, 12, _, _, _],
  ],
  leadWave: 'square',
  pad: false,
  arpSteps: [],
  level: 0.75,
};

/** Training yard: a heavy, bouncing half-time groove with a plucky lead. */
export const YARD_FIGHT: MusicTrack = {
  id: 'yard-fight',
  title: 'Sparring Grounds',
  bpm: 124,
  rootMidi: 45, // A2
  scale: DORIAN,
  progression: [0, 3, 0, 4],
  kick: 'x.....x...x.....',
  snare: '....x.......x..x',
  hat: '..x...x...x...x.',
  bass: [0, _, _, 0, _, _, 7, _, _, _, 0, _, 3, _, 4, _],
  bassWave: 'square',
  lead: [
    ...[_, _, 7, _, 9, _, 7, _, 5, _, _, _, 4, _, 2, _],
    ...[_, _, 7, _, 10, _, 9, _, 7, _, _, _, 5, _, _, _],
    ...[_, _, 7, _, 9, _, 7, _, 5, _, _, _, 4, _, 2, _],
    ...[_, _, 11, _, 10, _, 9, _, 8, _, _, _, 7, _, _, _],
  ],
  leadWave: 'triangle',
  pad: true,
  arpSteps: [],
  level: 0.75,
};

export const MUSIC_TRACKS: Readonly<Record<string, MusicTrack>> = {
  [MENU_THEME.id]: MENU_THEME,
  [OFFICE_FIGHT.id]: OFFICE_FIGHT,
  [YARD_FIGHT.id]: YARD_FIGHT,
};

/** The menu screen's music (wired when the menu arrives, Phase 11; preview now with `?music=menu-theme`). */
export const MENU_MUSIC_ID = MENU_THEME.id;
