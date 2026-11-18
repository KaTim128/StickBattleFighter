import { describe, expect, it } from 'vitest';
import { ABILITY_KITS } from '../../../src/abilities/kits';
import { BASE_CHARGE, chargeFor, ULTIMATE_POWER, type UltimateId } from '../../../src/abilities/ultimate-charge';

/** Seconds to fill an empty meter while dealing 20 and taking 10 damage a second (a typical fight). */
function secondsToFill(id: UltimateId): number {
  const c = chargeFor(id);
  return c.max / (20 * c.perDamageDealt + 10 * c.perDamageTaken + c.perSecond);
}

describe('ultimate charge scales with strength (master plan B10)', () => {
  it('power 1 is the baseline; a stronger ultimate charges proportionally slower', () => {
    expect(chargeFor('undeadArmy')).toEqual(BASE_CHARGE);
    for (const id of Object.keys(ULTIMATE_POWER) as UltimateId[]) {
      const c = chargeFor(id);
      expect(secondsToFill(id) / secondsToFill('undeadArmy')).toBeCloseTo(ULTIMATE_POWER[id], 6);
      expect(c.perSecond).toBeCloseTo(BASE_CHARGE.perSecond / ULTIMATE_POWER[id], 9);
    }
  });

  it('the stronger the ultimate, the longer it takes: Frenzy < Army < Rampage Mode < Blue Inferno', () => {
    const t = (id: UltimateId) => secondsToFill(id);
    expect(t('huntingFrenzy')).toBeLessThan(t('undeadArmy'));
    expect(t('undeadArmy')).toBeLessThan(t('rampageMode'));
    expect(t('rampageMode')).toBeLessThan(t('blueFire'));
  });

  it("every fighter's kit takes its meter from the table (no hand-tuned rates)", () => {
    const byKit: Record<string, UltimateId> = {
      'inferno-kit': 'blueFire',
      'rampage-kit': 'rampageMode',
      'necro-kit': 'undeadArmy',
      'shroud-kit': 'huntingFrenzy',
    };
    for (const [kit, id] of Object.entries(byKit)) {
      const k = ABILITY_KITS[kit]!;
      expect(k.ult.id, kit).toBe(id);
      expect(k.charge, kit).toEqual(chargeFor(id));
    }
  });
});
