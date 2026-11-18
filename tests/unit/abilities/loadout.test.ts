import { describe, expect, it } from 'vitest';
import { ABILITY_KITS } from '../../../src/abilities/kits';
import { applyLoadout, DEFAULT_LOADOUT, equippedAbilities } from '../../../src/abilities/loadout';
import { ALTERNATE_TACTICS, brainDesignFor } from '../../../src/data/ai/brains';

const AI: Record<string, string> = {
  'inferno-kit': 'inferno-ai',
  'rampage-kit': 'rampage-ai',
  'necro-kit': 'necro-ai',
  'shroud-kit': 'shroud-ai',
};

describe('five abilities, four equipped (master plan B13)', () => {
  for (const [id, kit] of Object.entries(ABILITY_KITS)) {
    it(`${id} has a fifth ability that names the slot it takes`, () => {
      const fifth = kit.a5;
      expect(fifth, 'a fifth ability').toBeDefined();
      expect(['a1', 'a2', 'a3', 'a4']).toContain(fifth!.slot);
      expect(new Set([kit.a1.id, kit.a2.id, kit.a3.id, kit.a4.id, fifth!.id]).size).toBe(5);
    });

    it(`${id}: the standard loadout is the four it always had`, () => {
      expect(applyLoadout(kit)).toBe(kit);
      expect(applyLoadout(kit, DEFAULT_LOADOUT)).toBe(kit);
    });

    it(`${id}: equipping the fifth benches exactly the ability in its slot, nothing else changes`, () => {
      const fifth = kit.a5!;
      const swapped = applyLoadout(kit, { useFifth: true });
      const benched = kit[fifth.slot as 'a1'];
      expect(swapped[fifth.slot as 'a1'].id).toBe(fifth.id);
      expect(swapped.a5?.id).toBe(benched.id);
      for (const s of ['a1', 'a2', 'a3', 'a4'] as const) if (s !== fifth.slot) expect(swapped[s]).toBe(kit[s]);
      expect(swapped.ult).toBe(kit.ult);
      expect(equippedAbilities(swapped).equipped.map((a) => a.slot)).toEqual(['a1', 'a2', 'a3', 'a4']);
      // Swapping back restores the original four.
      expect(applyLoadout(swapped, { useFifth: true }).a5?.id).toBe(fifth.id);
    });

    it(`${id}: the AI has a tactic for the fifth ability`, () => {
      const fifth = kit.a5!;
      expect(ALTERNATE_TACTICS[fifth.id]).toBeDefined();
      const swapped = applyLoadout(kit, { useFifth: true });
      const design = brainDesignFor(AI[id]!, swapped);
      expect(design.tactics[fifth.slot as 'a1']).toBe(ALTERNATE_TACTICS[fifth.id]);
      // With the standard four the original design is untouched.
      expect(brainDesignFor(AI[id]!, kit)).toBe(brainDesignFor(AI[id]!));
    });
  }
});
