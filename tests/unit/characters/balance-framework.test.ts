import { describe, expect, it } from 'vitest';
import type { AbilityDef } from '../../../src/abilities/ability-def';
import { ABILITY_KITS } from '../../../src/abilities/kits';
import { BUILT_IN_LIBRARY } from '../../../src/characters/library';
import { loadCharacter } from '../../../src/characters/load';

/** BALANCE_FRAMEWORK.md rules 3 and 4: control budget and survivability. */
const FIGHTERS = Object.values(BUILT_IN_LIBRARY.characters).filter(
  (c) => c.template !== undefined && c.capabilities.isPlayable && c.characterType === 'fighter' && c.abilityKit,
);

/** Seconds of enemy control one cast can deliver (a slow counts half, a wobble half). */
function controlSeconds(a: AbilityDef): number {
  const p = a.payload;
  const d = a.delivery;
  let s = (p.stunS ?? 0) + (p.blindS ?? 0) + (p.mute?.durationS ?? 0);
  s += (p.slow?.durationS ?? 0) * 0.5 + (p.disrupt?.durationS ?? 0) * 0.5;
  if (d.type === 'legTrap') s += d.holdS;
  if (d.type === 'lift') s += d.liftS;
  if (d.type === 'grab') s += d.liftS;
  return s;
}

describe('balance framework (BALANCE_FRAMEWORK.md)', () => {
  const rows = FIGHTERS.map((c) => {
    const kit = ABILITY_KITS[c.abilityKit!]!;
    const abilities = [kit.a1, kit.a2, kit.a3, kit.a4, kit.a5!];
    const control = abilities.reduce((s, a) => s + controlSeconds(a) / a.cooldownS, 0);
    const def = loadCharacter(c.id).def;
    return { id: c.id, control, ehp: def.stats.maxHp * def.stats.defence };
  });

  it('control: no kit can keep an opponent controlled for more than 1.0 control seconds per cooldown second (summed over its abilities, so overlaps count twice)', () => {
    for (const r of rows) expect(r.control, `${r.id} control ${r.control.toFixed(2)}`).toBeLessThanOrEqual(1);
  });

  it('survivability: effective health (max HP times defence) is within 35 % of the roster mean (tanks and glass cannons are allowed, not extremes)', () => {
    const mean = rows.reduce((s, r) => s + r.ehp, 0) / rows.length;
    for (const r of rows)
      expect(
        Math.abs(r.ehp - mean) / mean,
        `${r.id} ehp ${r.ehp.toFixed(0)} vs ${mean.toFixed(0)}`,
      ).toBeLessThanOrEqual(0.35);
  });
});
