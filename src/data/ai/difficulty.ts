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
  /** Saves escapes and finishers for the moment they matter, instead of using them at once. */
  readonly cooldownPlanning: boolean;
  /** Watches the player's habits (rushing in, keeping away) and adjusts its approach. */
  readonly adapts: boolean;
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
    cooldownPlanning: false,
    adapts: false,
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
    cooldownPlanning: false,
    adapts: false,
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
    cooldownPlanning: true,
    adapts: true,
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
    cooldownPlanning: true,
    adapts: true,
  },
};

export const DEFAULT_DIFFICULTY: DifficultyId = 'normal';

export function difficultyFor(id: string | null | undefined): Difficulty {
  return id && id in DIFFICULTIES ? DIFFICULTIES[id as DifficultyId] : DIFFICULTIES[DEFAULT_DIFFICULTY];
}
