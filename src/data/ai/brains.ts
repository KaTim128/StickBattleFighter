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
    /** Only while the target carries fewer than this many toxicity stacks (Vexoris does not pile on a poisoned foe). */
    readonly toxicityBelow?: number;
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
      // Blue Inferno (TD-080) is a buff: used once a fight is on, close enough to fight, not at the start.
      ult: { role: 'buff', minM: 0, maxM: 9, weight: 1.3, when: { selfHpBelow: 0.9 } },
    },
    combos: [
      ['a2', 'a4'],
      ['a1', 'a2'],
      ['ult', 'a4'],
    ],
  },
  // Vexoris: a poison specialist. Keeps mid range, builds toxicity with sprays and jars, sets traps in his way, steps
  // out through smoke when pressed and finishes the karate string with its poison splash. The tactics only spend an
  // ability on a target that can still use the stack (see `toxicityAbove`).
  'vexoris-ai': {
    style: 'Poison specialist: builds toxicity at mid range, area denial, karate string up close, smoke to reposition.',
    preferredRangeM: [1.8, 4],
    movement: 'circle',
    meleeBias: 0.75,
    heavyBias: 0.2,
    defence: 'dodge',
    retreatBelowHp: 0.3,
    hitAndRunS: 0.8,
    tactics: {
      a1: { role: 'poke', minM: 0, maxM: 3, weight: 1.2, when: { toxicityBelow: 20 } },
      a2: { role: 'zone', minM: 3, maxM: 9, weight: 1.2, when: { toxicityBelow: 20 } },
      a3: { role: 'zone', minM: 2.5, maxM: 6, weight: 1, when: { toxicityBelow: 15 } },
      a4: { role: 'gapClose', minM: 0, maxM: 4, weight: 0.9 },
      ult: { role: 'burst', minM: 0, maxM: 4.5, weight: 1.3, when: { toxicityBelow: 12 } },
    },
    combos: [
      ['a1', 'a4'],
      ['a2', 'a3'],
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

/**
 * How the AI uses the fifth abilities (master plan B13) when one is equipped in place of the usual
 * ability in its slot, keyed by ability id. Anything not listed keeps its slot's tactic.
 */
export const ALTERNATE_TACTICS: Readonly<Record<string, AbilityTactic>> = {
  // Eruption: a leap onto a hurt or helpless target at mid range.
  eruption: { role: 'burst', minM: 1.5, maxM: 6, weight: 1, when: { targetHpBelow: 0.7 } },
  // Bastion Anchor: brace when hurt and someone is on top of him.
  bastionAnchor: { role: 'buff', minM: 0, maxM: 2.4, weight: 1.2, when: { selfHpBelow: 0.7 } },
  // Soul Tether: reel in and drain a target that is too close or runs.
  soulTether: { role: 'control', minM: 2, maxM: 9, weight: 1.1 },
  // Grenade: lob it at a target in mid range; the blast is wide, so it needs no precision.
  grenade: { role: 'burst', minM: 3, maxM: 7.5, weight: 1.2 },
  // Death Mark: mark the prey from a distance and creep in; the AI holds its attacks until the stalk is charged.
  deathMark: { role: 'buff', minM: 3.5, maxM: 12, weight: 1.1 },
};

const designCache = new Map<string, BrainDesign>();

/**
 * The brain design for a fighter. With a kit, the tactics follow the abilities equipped in the
 * fight: a fifth ability brings its own tactic, and an ability moved to another button keeps the
 * tactic of the slot it started in (`homeSlot`). Results are cached per combination.
 */
export function brainDesignFor(
  aiProfileId: string,
  equipped?: Readonly<Record<AbilitySlot, { readonly id: string; readonly homeSlot?: AbilitySlot }>> | null,
): BrainDesign {
  const base = BRAIN_DESIGNS[aiProfileId] ?? GENERIC_DESIGN;
  if (!equipped) return base;
  const slots = Object.keys(base.tactics) as AbilitySlot[];
  const tacticFor = (slot: AbilitySlot): AbilityTactic => {
    const a = equipped[slot];
    return ALTERNATE_TACTICS[a.id] ?? base.tactics[a.homeSlot ?? slot];
  };
  const changed = slots.filter((slot) => tacticFor(slot) !== base.tactics[slot]);
  if (changed.length === 0) return base;
  const key = `${aiProfileId}:${changed.map((slot) => `${slot}=${equipped[slot].id}`).join(',')}`;
  let design = designCache.get(key);
  if (!design) {
    const tactics = { ...base.tactics };
    for (const slot of changed) tactics[slot] = tacticFor(slot);
    design = { ...base, tactics };
    designCache.set(key, design);
  }
  return design;
}
