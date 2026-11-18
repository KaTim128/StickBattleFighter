import { writeFileSync } from 'node:fs';
import { beforeAll, it } from 'vitest';
import { ABILITY_KITS } from '../../../src/abilities/kits';
import { equippedIds } from '../../../src/abilities/loadout';
import { loadCharacter } from '../../../src/characters/load';
import { initPhysics } from '../../../src/physics/physics-world';
import { measureFight, ROSTER } from './harness';

/**
 * Measurement only: `ABILITY_PROBE=inferno ABILITY_SEEDS=3 ABILITY_OUT=/path` plays that fighter with each of
 * the five "which ability is benched" loadouts against the other three on standard kits and reports win rates.
 */
const who = process.env.ABILITY_PROBE;
const seeds = Number(process.env.ABILITY_SEEDS ?? 3);
beforeAll(async () => {
  await initPhysics();
});
it.skipIf(!who)(
  'records ability win rates',
  async () => {
    const fighter = who as string;
    const def = loadCharacter(fighter).def;
    const kit = def.abilities!;
    const all = [kit.a1.id, kit.a2.id, kit.a3.id, kit.a4.id, kit.a5!.id];
    const out: Record<string, { wins: number; games: number; meanS: number }> = {};
    for (const benched of all) {
      // Keep the standard order where possible: the fifth takes the benched ability's button.
      const std = equippedIds(kit);
      const arranged = std.map((id) => (id === benched ? (kit.a5!.id as string) : id));
      const loadout = benched === kit.a5!.id ? { equipped: std } : { equipped: arranged };
      let wins = 0;
      let games = 0;
      let total = 0;
      for (const foe of ROSTER) {
        if (foe === fighter) continue;
        for (let s = 1; s <= seeds; s++) {
          const r1 = await measureFight(fighter, foe, s, 'hard', { player: loadout });
          const r2 = await measureFight(foe, fighter, s + 50, 'hard', { opponent: loadout });
          wins += (r1.winner === 'a' ? 1 : 0) + (r2.winner === 'b' ? 1 : 0);
          games += 2;
          total += r1.durationS + r2.durationS;
        }
      }
      out[benched] = { wins, games, meanS: total / games };
    }
    if (process.env.ABILITY_OUT) writeFileSync(process.env.ABILITY_OUT, JSON.stringify(out, null, 1));
  },
  6_000_000,
);
