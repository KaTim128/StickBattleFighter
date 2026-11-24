/**
 * AI difficulty levels (owner, 13/11/2026; REQ-AI-4): how SMART an AI opponent is. Difficulty
 * changes intelligence only (reactions, mistakes, combos, reading and punishing the player,
 * defending, aiming ahead, saving cooldowns, adapting); never damage, health or attack speed.
 * Every level uses the fighter's whole kit and keeps its personality (its brain design).
 */
export type DifficultyId = 'easy' | 'normal' | 'hard' | 'expert';

export interface Difficulty {
  readonly id: DifficultyId;
  readonly label: string;
  /** Multiplies the pauses between decisions: bigger = a slower, simpler opponent. */
  readonly tempo: number;
  /** Seconds before it reacts to something new (an opening, an incoming attack). */
  readonly reactionS: number;
  /** Chance a decision is sloppy: a pause, the wrong moment, a blow thrown short. */
  readonly mistakeChance: number;
  /** Chance, each second, of hesitating for a moment. */
  readonly hesitatePerS: number;
  /** Longest punch string. */
  readonly maxString: number;
  /** Chance to follow its brain's combo chains (one ability straight into the next). */
  readonly comboSkill: number;
  /** Chance to see and punish an opening (a whiffed attack, a stunned or blinded player). */
  readonly punishSkill: number;
  /** Chance to defend (dodge or block, by personality) against an attack it sees coming. */
  readonly defendSkill: number;
  /** How far ahead of a moving player it aims (0 = where they are, 1 = where they will be). */
  readonly predictLead: number;
  /**
   * The fastest it can swing a beam's aim, radians per second (master plan B4). A player running
   * round it at 3 m turns about 1.7 rad/s: Easy and Normal can be out-circled, Expert barely.
   */
  readonly beamTrackRadPerS: number;
  /**
   * Seconds between fresh readings of where the target is while it aims a beam (master plan B4). Slower
   * than `reactionS` at every level: a beam is never a perfect lock, even on Expert.
   */
  readonly beamReadS: number;
  /** Chance per second, when it sees a chance, that it goes for a piece of furniture to throw (B9). */
  readonly propThrowPerS: number;
  /** Saves escapes and finishers for the moment they matter, instead of using them at once. */
  readonly cooldownPlanning: boolean;
  /** Watches the player's habits (rushing in, keeping away) and adjusts its approach. */
  readonly adapts: boolean;
  /**
   * Hazard sense (0..1): how reliably it steers clear of what the opponent has put down or set going, such as a warning ring,
   * a mine, a fog, a beam or a shot in flight, instead of walking into it because the opponent is there. 0 = it never notices.
   */
  readonly hazardSense: number;
  /** Cast awareness (0..1): how often it reads the opponent's wind-up and gives ground, or interrupts an ultimate under way. */
  readonly castAwareness: number;
  /** The least chance it wants of an ultimate connecting before it fires it (0 = whenever it is ready). */
  readonly ultPatience: number;
  /** It fires its ultimate only at a moment (an opening, a hurt foe, or when it is behind), never just because the foe is there. */
  readonly ultNeedsMoment: boolean;
  /**
   * Movement skill (0..1): sprinting to close or open a gap, how tightly it holds its range, how often it changes strafe
   * direction, and how readily it uses its movement abilities (dashes, teleports) to escape or close in.
   */
  readonly moveSkill: number;
}

export const DIFFICULTIES: Readonly<Record<DifficultyId, Difficulty>> = {
  easy: {
    id: 'easy',
    label: 'Easy',
    tempo: 1.6,
    reactionS: 0.6,
    mistakeChance: 0.3,
    hesitatePerS: 0.3,
    maxString: 2,
    comboSkill: 0.15,
    punishSkill: 0.1,
    defendSkill: 0.05,
    predictLead: 0,
    beamTrackRadPerS: 0.8,
    beamReadS: 0.7,
    propThrowPerS: 0.05,
    cooldownPlanning: false,
    adapts: false,
    hazardSense: 0.0,
    castAwareness: 0.0,
    ultPatience: 0.0,
    ultNeedsMoment: false,
    moveSkill: 0.1,
  },
  normal: {
    id: 'normal',
    label: 'Normal',
    tempo: 1,
    reactionS: 0.35,
    mistakeChance: 0.12,
    hesitatePerS: 0.08,
    maxString: 3,
    comboSkill: 0.4,
    punishSkill: 0.35,
    defendSkill: 0.2,
    predictLead: 0.3,
    beamTrackRadPerS: 1.3,
    beamReadS: 0.45,
    propThrowPerS: 0.25,
    cooldownPlanning: false,
    adapts: false,
    hazardSense: 0.35,
    castAwareness: 0.25,
    ultPatience: 0.3,
    ultNeedsMoment: false,
    moveSkill: 0.4,
  },
  hard: {
    id: 'hard',
    label: 'Hard',
    tempo: 0.8,
    reactionS: 0.2,
    mistakeChance: 0.05,
    hesitatePerS: 0,
    maxString: 4,
    comboSkill: 0.7,
    punishSkill: 0.7,
    defendSkill: 0.45,
    predictLead: 0.7,
    beamTrackRadPerS: 1.9,
    beamReadS: 0.3,
    propThrowPerS: 0.55,
    cooldownPlanning: true,
    adapts: true,
    hazardSense: 0.75,
    castAwareness: 0.6,
    ultPatience: 0.5,
    ultNeedsMoment: true,
    moveSkill: 0.7,
  },
  expert: {
    id: 'expert',
    label: 'Expert',
    tempo: 0.65,
    reactionS: 0.1,
    mistakeChance: 0.01,
    hesitatePerS: 0,
    maxString: 5,
    comboSkill: 0.9,
    punishSkill: 0.95,
    defendSkill: 0.65,
    predictLead: 1,
    beamTrackRadPerS: 2.8,
    beamReadS: 0.2,
    propThrowPerS: 0.95,
    cooldownPlanning: true,
    adapts: true,
    hazardSense: 0.97,
    castAwareness: 0.9,
    ultPatience: 0.7,
    ultNeedsMoment: true,
    moveSkill: 1,
  },
};

export const DEFAULT_DIFFICULTY: DifficultyId = 'normal';

export function difficultyFor(id: string | null | undefined): Difficulty {
  return id && id in DIFFICULTIES ? DIFFICULTIES[id as DifficultyId] : DIFFICULTIES[DEFAULT_DIFFICULTY];
}
