import { describe, expect, it } from 'vitest';
import type { AbilityDef } from '../../../src/abilities/ability-def';
import { ABILITY_KITS } from '../../../src/abilities/kits';
import inferno from '../../../src/data/characters/inferno/moveset.json';
import necro from '../../../src/data/characters/necro/moveset.json';
import rampage from '../../../src/data/characters/rampage/moveset.json';
import shroud from '../../../src/data/characters/shroud/moveset.json';

/**
 * Damage relationships (master plan Phase 1 B3, TD-075). The rules, in the owner's words:
 * a heavy beats a single light hit; a full light combo's last hit is slightly above a heavy;
 * abilities are weighed against their cooldown and range.
 */

interface Move {
  id: string;
  damage: number;
  next?: Record<string, string>;
}
interface Moveset {
  starters: Record<string, string>;
  moves: Move[];
}

const FIGHTERS = [
  { name: 'inferno', moves: inferno as Moveset, kit: 'inferno-kit' },
  { name: 'titan', moves: rampage as Moveset, kit: 'rampage-kit' },
  { name: 'necro', moves: necro as Moveset, kit: 'necro-kit' },
  { name: 'shroud', moves: shroud as Moveset, kit: 'shroud-kit' },
];

function lightString(set: Moveset): Move[] {
  const byId = new Map(set.moves.map((m) => [m.id, m]));
  const out: Move[] = [];
  let m = byId.get(set.starters.tap!);
  while (m && out.length < 8) {
    out.push(m);
    m = m.next?.tap ? byId.get(m.next.tap) : undefined;
  }
  return out;
}

/** Everything one cast can deal to a single target: every stab, every beam tick. */
function castDamage(a: AbilityDef): number {
  const d = a.delivery as unknown as Record<string, number | string>;
  const hits =
    d.type === 'beam'
      ? Math.floor((d.durationS as number) / (d.tickS as number))
      : typeof d.stabs === 'number'
        ? d.stabs
        : 1;
  return (a.payload.damage ?? 0) * hits;
}

/** Ranged poke (projectile or beam) against everything that has to get close. */
const isRanged = (a: AbilityDef): boolean => a.delivery.type === 'projectile' || a.delivery.type === 'beam';
/** Damage per second of cooldown allowed: ranged abilities are weighed lower than close ones. */
const BUDGET_PER_S = { ranged: 24, close: 32 } as const;

describe('melee relationships (B3)', () => {
  for (const f of FIGHTERS) {
    it(`${f.name}: a heavy beats any single light hit; the combo's last hit is slightly above the heavy`, () => {
      const string = lightString(f.moves);
      const heavy = f.moves.moves.find((m) => m.id === f.moves.starters.heavy)!;
      const lights = string.slice(0, -1);
      const finisher = string[string.length - 1]!;
      for (const l of lights) expect(heavy.damage, `${heavy.id} vs ${l.id}`).toBeGreaterThan(l.damage);
      expect(finisher.damage).toBeGreaterThan(heavy.damage);
      expect(finisher.damage).toBeLessThanOrEqual(heavy.damage * 1.25);
    });
  }
});

describe('ability weighting against cooldown and range (B3)', () => {
  for (const f of FIGHTERS) {
    const kit = ABILITY_KITS[f.kit]!;
    const damaging = (['a1', 'a2', 'a3', 'a4'] as const).map((s) => kit[s]).filter((a) => castDamage(a) > 0);

    it(`${f.name}: a damaging ability is worth more than a heavy unless it controls the enemy instead`, () => {
      const heavy = f.moves.moves.find((m) => m.id === f.moves.starters.heavy)!;
      for (const a of damaging) {
        const controls = Boolean(a.payload.pull || a.payload.decay);
        if (!controls) expect(castDamage(a), a.name).toBeGreaterThan(heavy.damage);
      }
    });

    it(`${f.name}: damage per second of cooldown stays inside the range and close budgets`, () => {
      for (const a of damaging) {
        const perS = castDamage(a) / a.cooldownS;
        const budget = isRanged(a) ? BUDGET_PER_S.ranged : BUDGET_PER_S.close;
        expect(perS, `${a.name}: ${perS.toFixed(1)} per second of cooldown`).toBeLessThanOrEqual(budget);
      }
    });
  }
});
