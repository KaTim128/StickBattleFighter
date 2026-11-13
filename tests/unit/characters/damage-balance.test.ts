import { describe, expect, it } from 'vitest';
import inferno from '../../../src/data/characters/inferno/moveset.json';
import necro from '../../../src/data/characters/necro/moveset.json';
import rampage from '../../../src/data/characters/rampage/moveset.json';
import shroud from '../../../src/data/characters/shroud/moveset.json';

interface Move {
  id: string;
  damage: number;
  next?: Record<string, string>;
}
interface Moveset {
  starters: Record<string, string>;
  moves: Move[];
}

/** Follow the plain tap string from its starter to the move that ends it. */
function tapString(set: Moveset): Move[] {
  const byId = new Map(set.moves.map((m) => [m.id, m]));
  const out: Move[] = [];
  let m = byId.get(set.starters.tap!);
  while (m && out.length < 6) {
    out.push(m);
    m = m.next?.tap ? byId.get(m.next.tap) : undefined;
  }
  return out;
}

/**
 * Owner, 13/11/2026: regular combat is lighter than abilities and lasts longer: the first tap hits
 * are light, only the last blow is moderately strong, and a fighter is never killed by a few hits.
 */
describe('melee damage balance', () => {
  const sets: Record<string, { set: Moveset; maxHp: number }> = {
    inferno: { set: inferno as Moveset, maxHp: 1000 },
    titan: { set: rampage as Moveset, maxHp: 1250 },
    necro: { set: necro as Moveset, maxHp: 1000 },
    shroud: { set: shroud as Moveset, maxHp: 950 },
  };

  for (const [name, { set, maxHp }] of Object.entries(sets)) {
    it(`${name}: light opening hits, a moderate finisher, and no melee blow close to an ability`, () => {
      const string = tapString(set);
      const finisher = string[string.length - 1]!;
      for (const early of string.slice(0, -1)) {
        expect(early.damage).toBeLessThanOrEqual(35);
        expect(finisher.damage).toBeGreaterThan(early.damage * 1.5);
      }
      for (const m of set.moves) expect(m.damage, m.id).toBeLessThanOrEqual(80);
      // A whole tap string takes well under a fifth of a full health bar.
      const total = string.reduce((sum, m) => sum + m.damage, 0);
      expect(total / maxHp).toBeLessThan(0.2);
    });
  }
});
