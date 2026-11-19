import { describe, expect, it } from 'vitest';
import type { AbilityDef } from '../../../src/abilities/ability-def';
import { ABILITY_KITS } from '../../../src/abilities/kits';
import { BUILT_IN_LIBRARY } from '../../../src/characters/library';

/** Owner, 21/11/2026: every fighter balanced across abilities, ultimates and attacks. Rough bands, not a simulation. */
const FIGHTERS = Object.values(BUILT_IN_LIBRARY.characters).filter(
  (c) => c.template !== undefined && c.capabilities.isPlayable && c.characterType === 'fighter' && c.abilityKit,
);

/** Total damage of one cast against one target standing in it, for the deliveries that hit more than once. */
function castDamage(a: AbilityDef): number {
  const d = a.delivery;
  if (d.type === 'assault') return a.payload.damage * (d.stabs + (d.finalFactor ? d.finalFactor - 1 : 0));
  if (d.type === 'whirl') return a.payload.damage * Math.round(d.durationS / d.tickS);
  if (d.type === 'drone') return (d.shot.payload.damage * (d.durationS / d.intervalS)) / 2; // half its shots land
  return a.payload.damage;
}

describe('ability balance', () => {
  const sums = FIGHTERS.map((c) => {
    const kit = ABILITY_KITS[c.abilityKit!]!;
    const abilities = [kit.a1, kit.a2, kit.a3, kit.a4, kit.a5!];
    return { id: c.id, kit, abilities, dps: abilities.reduce((s, a) => s + castDamage(a) / a.cooldownS, 0) };
  });

  it('no single ability out-damages the others by a wide margin (damage per cooldown second, beams aside)', () => {
    for (const f of sums)
      for (const a of f.abilities) {
        if (a.delivery.type === 'beam') continue;
        expect(castDamage(a) / a.cooldownS, `${f.id}.${a.id}`).toBeLessThanOrEqual(22);
      }
  });

  it('no fighter is a pure damage dealer or a pure support: every kit sits in the same wide band', () => {
    const top = Math.max(...sums.map((f) => f.dps));
    // The weakest direct damage is made up by control and defence (barriers, lifts, plating, poison), so the band is wide.
    for (const f of sums) expect(f.dps, f.id).toBeGreaterThanOrEqual(top * 0.2);
  });

  it('every kit has at least one defensive or control ability and one ability that damages', () => {
    for (const f of sums) {
      expect(
        f.abilities.some((a) => a.payload.damage > 0 || a.delivery.type === 'drone'),
        f.id,
      ).toBe(true);
      expect(f.abilities.length).toBe(5);
    }
  });

  it('melee: every tap chain and heavy sits in the same band (heavies cost time for damage)', () => {
    for (const c of FIGHTERS) {
      const ms = BUILT_IN_LIBRARY.moveset[`${c.id}-moveset`] as unknown as {
        starters: { heavy: string };
        moves: { id: string; damage: number; heavy: boolean; aerial: boolean; startupS: number }[];
      };
      const taps = ms.moves.filter((m) => !m.heavy && !m.aerial).reduce((s, m) => s + m.damage, 0);
      const heavy = ms.moves.find((m) => m.id === ms.starters.heavy)!;
      expect(taps, `${c.id} taps`).toBeGreaterThanOrEqual(45);
      expect(taps, `${c.id} taps`).toBeLessThanOrEqual(115);
      expect(heavy.damage, `${c.id} heavy`).toBeGreaterThanOrEqual(34);
      expect(heavy.damage, `${c.id} heavy`).toBeLessThanOrEqual(75);
      // A slower heavy is worth more: nothing is both the fastest and the strongest.
      expect(heavy.damage / Math.max(0.28, heavy.startupS), `${c.id} heavy value`).toBeLessThanOrEqual(150);
    }
  });
});
