import type { BuffEffect } from '../abilities/ability-def';
import type { StatusEffects } from '../combat/status-effects';
import type { FighterDef } from '../data/fighters/fighter-def';
import { SPRINT } from '../physics/movement';

/**
 * The one stat pipeline (master plan Phase 1 B1-B2, TD-074). A fighter's number is built in layers,
 * always in this order, and every system reads it from here instead of multiplying by hand:
 *
 *   1. base       the character data (`def.stats`, `def.movement`; already includes the data multipliers)
 *   2. ability    the running buff, if any (Hunting Frenzy, Rampage Mode)
 *   3. status     the status-effect registry (Curse of Decay, bleeding, any slow)
 *   4. situation  sprinting
 *
 * With no buff and no status the functions return the base value, which is what the select screen
 * and the ratings show. The functions take plain parameters and allocate nothing, so the simulation
 * step can call them every frame.
 */

type Buff = Partial<Pick<BuffEffect, 'speedFactor' | 'attackSpeedFactor' | 'meleeDamageFactor' | 'damageTakenFactor'>>;
type Status = Pick<StatusEffects, 'speedFactor' | 'attackFactor' | 'defenceFactor' | 'damageTakenFactor'>;

/** Top speed, metres per second. */
export function finalMaxSpeedMps(
  def: FighterDef,
  sprinting: boolean,
  buff?: Buff | null,
  status?: Status | null,
): number {
  return (
    def.movement.maxSpeedMps *
    (sprinting ? SPRINT.speedFactor : 1) *
    (buff?.speedFactor ?? 1) *
    (status?.speedFactor ?? 1)
  );
}

/** How much faster strikes play (1 = normal). */
export function finalAttackSpeed(buff?: Buff | null): number {
  return buff?.attackSpeedFactor ?? 1;
}

/** Power behind every hit this fighter lands: its base power weakened by Curse of Decay. */
export function finalPower(def: FighterDef, status?: Status | null): number {
  return def.stats.power * (status?.attackFactor ?? 1);
}

/** Extra multiplier on knife and fist damage while a buff lasts. */
export function finalMeleeDamageFactor(buff?: Buff | null): number {
  return buff?.meleeDamageFactor ?? 1;
}

/** The defence a hit is divided by. */
export function finalDefence(def: FighterDef, status?: Status | null): number {
  return def.stats.defence * (status?.defenceFactor ?? 1);
}

/** Multiplier on all damage taken: durability buffs times any vulnerability such as bleeding. */
export function finalDamageTakenFactor(buff?: Buff | null, status?: Status | null): number {
  return (buff?.damageTakenFactor ?? 1) * (status?.damageTakenFactor ?? 1);
}

/** Everything at once, for screens and tests (allocates: not for the simulation step). */
export function finalStatsSnapshot(def: FighterDef, buff?: Buff | null, status?: Status | null) {
  return {
    maxSpeedMps: finalMaxSpeedMps(def, false, buff, status),
    sprintSpeedMps: finalMaxSpeedMps(def, true, buff, status),
    attackSpeed: finalAttackSpeed(buff),
    power: finalPower(def, status),
    meleeDamageFactor: finalMeleeDamageFactor(buff),
    defence: finalDefence(def, status),
    damageTakenFactor: finalDamageTakenFactor(buff, status),
  };
}
