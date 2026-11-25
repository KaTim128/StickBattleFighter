import type { UltimateCharge } from './ability-def';

/**
 * How hard each ultimate is to charge (master plan Phase 1 B10, owner: "the max out percentage to get
 * the ult depends on how good the ult is: if it is strong or provides a strong advantage then it
 * should take a longer time to charge up"). One table, one rule: an ultimate's meter fills at the base
 * rate divided by its power, so power 1 charges as the baseline and power 1.5 takes 1.5 times as long.
 * Change an ultimate's strength here and its charge follows.
 *
 * Why each rating (judged on what the ultimate does for how long):
 * - Hunting Frenzy 0.9: only 4 s, but the whole arena goes dark for the opponent and he is 17% faster.
 * - Undead Army 1.0: two frail, stun-free skeletons per cast, never more than four.
 * - Plague Bloom 1.2: a huge toxic burst, but its strength is two stacks of poison, and a full second of warning.
 * - Celestial Tempest 1.25: untouchable for 2.4 s, up to thirty blades across the battlefield and a 90 damage dive.
 * - Final Judgement 1.3: untouchable for about 2 s and a 112 damage blow that cannot be dodged once the rush starts.
 * - Mindstorm 1.3: a 2.2 s field of eight flung objects and a 60 damage explosion, but he is rooted and exposed throughout.
 * - The Masterpiece 1.35: 3 s of drawing (exposed), then a 16 s monster of 450 health with four slow, telegraphed attacks that opponents can beat.
 * - Rampage Mode 1.3: 8 s of 40% more defence, cooldowns 25% sooner, 15% faster and a shockwave.
 * - Blue Inferno 1.4: 10 s of +70% damage, cooldowns 30% sooner and 15% faster.
 */
export const ULTIMATE_POWER = {
  huntingFrenzy: 0.9,
  plagueBloom: 1.2,
  undeadArmy: 1.0,
  celestialTempest: 1.25,
  finalJudgement: 1.3,
  mindstorm: 1.3,
  overdrive: 1.2,
  shatterwave: 1.25,
  timeStop: 1.5,
  crystalSovereign: 1.3,
  masterpiece: 1.35,
  rampageMode: 1.3,
  blueFire: 1.4,
} as const;

export type UltimateId = keyof typeof ULTIMATE_POWER;

/** The baseline meter rates (power 1): percent per point of damage dealt and taken, and per second. */
export const BASE_CHARGE = { max: 100, perDamageDealt: 0.25, perDamageTaken: 0.2, perSecond: 1 } as const;

/** The meter for an ultimate: the baseline rates, slower the stronger it is. */
export function chargeFor(id: UltimateId): UltimateCharge {
  const power = ULTIMATE_POWER[id];
  return {
    max: BASE_CHARGE.max,
    perDamageDealt: BASE_CHARGE.perDamageDealt / power,
    perDamageTaken: BASE_CHARGE.perDamageTaken / power,
    perSecond: BASE_CHARGE.perSecond / power,
  };
}
