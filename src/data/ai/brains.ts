import type { AbilitySlot } from '../../abilities/ability-def';

/**
 * Fighter AI brain designs (owner, 13/11/2026: "every stickman uses a unique AI brain designed
 * specifically around that fighter's personality, abilities, strengths, weaknesses and intended
 * combat style"). One design per fighter, keyed by its AI profile id, read by the shared
 * `FighterBrain`. A new fighter MUST get its own design here, made with its abilities (a test checks
 * every playable fighter has one, and that no two share one).
 */

/** What an ability is for in this fighter's game plan. */
export type TacticRole =
  | 'poke' // chip damage from range
  | 'gapClose' // close the distance
  | 'burst' // big damage up close
  | 'zone' // control space at range
  | 'control' // stun, pull or hold the target
  | 'curse' // weaken the target first
  | 'ambush' // appear behind the target
  | 'escape' // get out of danger
  | 'buff' // power up
  | 'summon'; // bring allies

export interface AbilityTactic {
  readonly role: TacticRole;
  /** Distance band where it is worth using, metres. */
  readonly minM: number;
  readonly maxM: number;
  /** How much it likes this ability (relative). */
  readonly weight: number;
  /** Only (or much more) when these hold. */
  readonly when?: {
    readonly targetHpBelow?: number;
    readonly selfHpBelow?: number;
    readonly targetCursed?: boolean;
    readonly targetHelpless?: boolean;
    readonly targetAttacking?: boolean;
  };
}

export interface BrainDesign {
  /** One line on how it fights (shown to the admin, used in docs). */
  readonly style: string;
  /** Where it likes to stand from its opponent, metres. */
  readonly preferredRangeM: readonly [number, number];
  /** How it moves at its range: straight in, circling, stalking in and out, or kiting away. */
  readonly movement: 'direct' | 'circle' | 'stalk' | 'kite';
  /** 0..1: how much it wants to fight with its fists or weapon when close. */
  readonly meleeBias: number;
  /** 0..1: how often a close blow is its heavy attack. */
  readonly heavyBias: number;
  /** How it defends an incoming attack it sees coming. */
  readonly defence: 'dodge' | 'block' | 'mixed';
  /** Below this share of health it backs off to its far range (0 = never). */
  readonly retreatBelowHp: number;
  /** Hit and run: after landing a burst it backs out for this long, seconds (0 = stays in). */
  readonly hitAndRunS: number;
  readonly tactics: Readonly<Record<AbilitySlot, AbilityTactic>>;
  /** Preferred chains: the second ability straight after the first lands. */
  readonly combos: readonly (readonly [AbilitySlot, AbilitySlot])[];
}

export const BRAIN_DESIGNS: Readonly<Record<string, BrainDesign>> = {
  // Inferno: fire in every range. Pressures from mid range with fireballs and the beam, dashes in
  // through flame, then fights hand to hand and blows the close fight open with Flame Detonation;
  // the Eruption crashes down on a hurt or helpless opponent.
  'inferno-ai': {
    style: 'Fire at every range: ranged pressure, a dash in, close combat and a point-blank blast.',
    preferredRangeM: [1.2, 4.5],
    movement: 'circle',
    meleeBias: 0.65,
    heavyBias: 0.4,
    defence: 'mixed',
    retreatBelowHp: 0,
    hitAndRunS: 0,
    tactics: {
      a1: { role: 'poke', minM: 2.5, maxM: 10, weight: 1.2 },
      a2: { role: 'gapClose', minM: 3, maxM: 8, weight: 1 },
      a3: { role: 'zone', minM: 2, maxM: 6.5, weight: 0.9 },
      a4: { role: 'burst', minM: 0, maxM: 2.4, weight: 1.1 },
      ult: { role: 'burst', minM: 2, maxM: 9, weight: 1.4, when: { targetHpBelow: 0.65 } },
    },
    combos: [
      ['a2', 'a4'],
      ['a1', 'a2'],
      ['a4', 'ult'],
    ],
  },
  // Titan: an aggressive brute. Walks straight in, blocks rather than dodges, charges anyone who
  // keeps away, smashes, grabs and slams; Rampage Mode early in the fight or when hurt.
  'rampage-ai': {
    style: 'Aggressive brute: straight in, charges at range, heavy blows, grabs and slams, shrugs off hits.',
    preferredRangeM: [0, 1.3],
    movement: 'direct',
    meleeBias: 0.95,
    heavyBias: 0.6,
    defence: 'block',
    retreatBelowHp: 0,
    hitAndRunS: 0,
    tactics: {
      a1: { role: 'burst', minM: 0, maxM: 2.6, weight: 1 },
      a2: { role: 'gapClose', minM: 3, maxM: 9, weight: 1.4 },
      a3: { role: 'burst', minM: 0, maxM: 1.9, weight: 1.3 },
      a4: { role: 'control', minM: 0, maxM: 1.8, weight: 1.6 },
      ult: { role: 'buff', minM: 0, maxM: 6, weight: 1.2, when: { selfHpBelow: 0.8 } },
    },
    combos: [
      ['a2', 'a3'],
      ['a4', 'a1'],
      ['ult', 'a2'],
    ],
  },
  // Necromancer: a ranged curse mage. Keeps his distance, curses first, then drains and erupts on
  // a cursed target; drags runners in with chains only to erupt on them; raises the dead when the
  // fight drags on. Backs away from anyone who rushes him.
  'necro-ai': {
    style: 'Ranged curse mage: keeps away, curses first, drains and erupts on the cursed, raises the dead.',
    preferredRangeM: [4.5, 7.5],
    movement: 'kite',
    meleeBias: 0.15,
    heavyBias: 0.3,
    defence: 'dodge',
    retreatBelowHp: 0.5,
    hitAndRunS: 1.6,
    tactics: {
      a3: { role: 'curse', minM: 2, maxM: 10, weight: 1.6, when: { targetCursed: false } },
      a1: { role: 'poke', minM: 2, maxM: 10, weight: 1.1 },
      a2: { role: 'zone', minM: 1.5, maxM: 9, weight: 1.2, when: { targetCursed: true } },
      a4: { role: 'control', minM: 3, maxM: 10, weight: 0.9 },
      ult: { role: 'summon', minM: 0, maxM: 10, weight: 1, when: { selfHpBelow: 0.9 } },
    },
    combos: [
      ['a3', 'a2'],
      ['a4', 'a2'],
      ['a3', 'a1'],
    ],
  },
  // Shroud: an evasive assassin. Stalks just out of reach, appears behind his prey or lunges
  // through it, rips in with the flurry and slips away before the counter; vanishes when cornered.
  'shroud-ai': {
    style: 'Evasive assassin: stalks out of reach, ambushes from behind, stabs and springs away bleeding his prey.',
    preferredRangeM: [2.5, 4.5],
    movement: 'stalk',
    meleeBias: 0.7,
    heavyBias: 0.35,
    defence: 'dodge',
    retreatBelowHp: 0.35,
    hitAndRunS: 1.4,
    tactics: {
      a3: { role: 'ambush', minM: 2.5, maxM: 9, weight: 1.4 },
      a2: { role: 'gapClose', minM: 2, maxM: 6, weight: 1.1 },
      a4: { role: 'burst', minM: 0, maxM: 1.8, weight: 1.3 },
      a1: { role: 'burst', minM: 0, maxM: 5, weight: 1.2 },
      ult: { role: 'buff', minM: 0, maxM: 5, weight: 1.1 },
    },
    combos: [
      ['a3', 'a4'],
      ['a2', 'a4'],
      ['ult', 'a3'],
    ],
  },
};

/**
 * A plain design for fighters without their own (the base stickman): melee first, abilities in
 * their ranges. Playable fighters are never allowed to fall back to it (tested).
 */
export const GENERIC_DESIGN: BrainDesign = {
  style: 'Generic: closes in and fights, using abilities when they fit.',
  preferredRangeM: [0.8, 1.3],
  movement: 'circle',
  meleeBias: 0.8,
  heavyBias: 0.35,
  defence: 'mixed',
  retreatBelowHp: 0,
  hitAndRunS: 0,
  tactics: {
    a1: { role: 'poke', minM: 0, maxM: 8, weight: 1 },
    a2: { role: 'poke', minM: 0, maxM: 8, weight: 1 },
    a3: { role: 'poke', minM: 0, maxM: 8, weight: 1 },
    a4: { role: 'poke', minM: 0, maxM: 8, weight: 1 },
    ult: { role: 'burst', minM: 0, maxM: 8, weight: 1 },
  },
  combos: [],
};

export function brainDesignFor(aiProfileId: string): BrainDesign {
  return BRAIN_DESIGNS[aiProfileId] ?? GENERIC_DESIGN;
}
