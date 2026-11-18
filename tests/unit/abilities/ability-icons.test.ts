import { describe, expect, it } from 'vitest';
import { ABILITY_KITS } from '../../../src/abilities/kits';
import { ABILITY_ICONS } from '../../../src/interface/ability-icons';

describe('ability pictures (task 51, B13)', () => {
  it('every ability, combo and heavy icon named by a kit has a picture', () => {
    const missing: string[] = [];
    for (const [kitId, kit] of Object.entries(ABILITY_KITS)) {
      const abilities = [kit.a1, kit.a2, kit.a3, kit.a4, kit.a5, kit.ult];
      for (const id of [...abilities.map((a) => a?.icon), kit.comboIcon, kit.heavyIcon])
        if (id && !ABILITY_ICONS[id]) missing.push(`${kitId}:${id}`);
    }
    expect(missing).toEqual([]);
  });
});
