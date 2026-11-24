import { describe, expect, it } from 'vitest';
import { BUILT_IN_LIBRARY } from '../../../src/characters/library';
import { resolveCharacter } from '../../../src/characters/resolve';
import { blowTouches, hitCapsule } from '../../../src/combat/attacks';

/** HD (owner 19/11/2026): every fighter's melee damages only on real physical contact. */
describe('universal contact hits (HD)', () => {
  const ids = ['inferno', 'rampage', 'necro', 'shroud', 'prismor', 'kenshiro'];
  for (const id of ids) {
    it(`${id}: no melee move reaches a body a clear gap beyond its fist`, () => {
      const def = resolveCharacter(id, BUILT_IN_LIBRARY);
      const foot = def.body.footRadiusM;
      for (const a of Object.values(def.moves)) {
        if (a.aerial) continue;
        const cap = hitCapsule({ x: 0, y: 0 }, { x: 1, y: 0 }, a);
        // Touching at the fist tip counts; 0.1 m past what the fist can touch must not.
        const maxTouchX = a.reachM + a.hitRadiusM * 0.5 + foot;
        expect(blowTouches(cap, a, maxTouchX - 0.01, 0, foot), `${id}/${a.id} at the tip`).toBe(true);
        expect(blowTouches(cap, a, maxTouchX + 0.1, 0, foot), `${id}/${a.id} past the tip`).toBe(false);
      }
    });
  }
});

describe('Fire Beam proximity (IF1)', () => {
  it('damage rises steadily as the target gets closer to Inferno', async () => {
    const { INFERNO_KIT } = await import('../../../src/data/abilities/inferno');
    const { payloadAt } = await import('../../../src/abilities/ability-def');
    const p = INFERNO_KIT.a3.payload;
    const at = (d: number) => payloadAt(p, d, 7).damage;
    expect(at(0.5)).toBe(at(1)); // full strength up close
    expect(at(2)).toBeGreaterThan(at(4));
    expect(at(4)).toBeGreaterThan(at(6.5));
    expect(at(6.5) / at(1)).toBeLessThan(0.45);
  });
});
