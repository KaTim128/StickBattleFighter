import { DEFENCE, dodgeCooldownFor } from '../combat/combatant';
import type { FighterDef } from '../data/fighters/fighter-def';

/**
 * Fighter ratings (owner, 12/11/2026: "view each fighter's HP, Speed, Power, Stamina, Defence and
 * Avoidance"; "no fighter should be objectively stronger than another when considering their
 * combined stats"). Each rating turns a fighter's real numbers into 0–100 on a fixed scale, so the
 * menu can show them and the balance test can compare them:
 * - HP: maximum health.
 * - Speed: top running speed.
 * - Power: outgoing damage (power × the punch and kick multipliers).
 * - Stamina: pool × regeneration (how many abilities and dodges it can afford).
 * - Defence: damage taken (defence), plus a little for shrugging off knockback.
 * - Avoidance: how often it can dodge (lighter fighters dodge again sooner) and its hit-stun
 *   resistance.
 * Balance rule (checked by tests): every playable fighter's six ratings add up to the same total,
 * within a small tolerance; each fighter spends that budget differently.
 */
export interface FighterRatings {
  readonly hp: number;
  readonly speed: number;
  readonly power: number;
  readonly stamina: number;
  readonly defence: number;
  readonly avoidance: number;
}

export const RATING_KEYS = ['hp', 'speed', 'power', 'stamina', 'defence', 'avoidance'] as const;
export const RATING_LABELS: Readonly<Record<(typeof RATING_KEYS)[number], string>> = {
  hp: 'HP',
  speed: 'Speed',
  power: 'Power',
  stamina: 'Stamina',
  defence: 'Defence',
  avoidance: 'Avoidance',
};

/** Linear 0..100 between `lo` and `hi`, clamped. */
const scale = (v: number, lo: number, hi: number): number => Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100));

export function fighterRatings(def: FighterDef): FighterRatings {
  const s = def.stats;
  const m = def.multipliers;
  const dodgeCycleS = DEFENCE.dodgeDurationS + dodgeCooldownFor(s.massKg ?? 70);
  return {
    hp: scale(s.maxHp, 700, 1500),
    speed: scale(def.movement.maxSpeedMps, 3.5, 5.7),
    power: scale(s.power * ((m.punchDamage + m.kickDamage) / 2), 0.7, 1.5),
    stamina: scale((s.maxStamina / 100) * (s.staminaRegenPerS / 30), 0.6, 1.4),
    defence: scale(s.defence * (1 + s.knockbackResistance * 0.3), 0.7, 1.5),
    avoidance: scale(1 / dodgeCycleS + (s.hitStunResistance ?? 0) * 0.5, 0.6, 2.2),
  };
}

/** The six ratings added up: the fighter's overall stat budget (equal for every fighter). */
export function ratingTotal(r: FighterRatings): number {
  return RATING_KEYS.reduce((a, k) => a + r[k], 0);
}
