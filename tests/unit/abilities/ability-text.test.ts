import { describe, expect, it } from 'vitest';
import { ABILITY_KITS } from '../../../src/abilities/kits';

/**
 * Owner, 21/11/2026: an alternative (fifth) ability's description never says it is an alternative to another ability,
 * or what it replaces or takes the place of. The details screen already tags it, and the description describes only
 * what the ability does.
 */
describe('ability descriptions never mention being an alternative', () => {
  const BANNED = /alternative|in place of|instead of|replaces|replacement|takes the .* slot|swap/i;
  for (const [id, kit] of Object.entries(ABILITY_KITS)) {
    for (const def of [kit.a1, kit.a2, kit.a3, kit.a4, kit.a5, kit.ult]) {
      if (!def) continue;
      it(`${id}: ${def.name}`, () => {
        expect(def.description).not.toMatch(BANNED);
      });
    }
  }
});
