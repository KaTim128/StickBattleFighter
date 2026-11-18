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
 * - Rampage Mode 1.3: 8 s of 40% more defence, cooldowns 25% sooner, 15% faster and a shockwave.
 * - Blue Inferno 1.4: 10 s of +70% damage, cooldowns 30% sooner and 15% faster.
 */
export const ULTIMATE_POWER = {
  huntingFrenzy: 0.9,
  undeadArmy: 1.0,
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
