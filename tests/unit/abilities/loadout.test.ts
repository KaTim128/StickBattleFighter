import { describe, expect, it } from 'vitest';
import { ABILITY_KITS } from '../../../src/abilities/kits';
import {
  applyLoadout,
  DEFAULT_LOADOUT,
  equippedIds,
  loadoutAfterSwap,
  NORMAL_SLOTS,
  validLoadout,
} from '../../../src/abilities/loadout';
import { ALTERNATE_TACTICS, BRAIN_DESIGNS, brainDesignFor } from '../../../src/data/ai/brains';

const AI: Record<string, string> = {
  'inferno-kit': 'inferno-ai',
  'rampage-kit': 'rampage-ai',
  'necro-kit': 'necro-ai',
  'shroud-kit': 'shroud-ai',
  'vexoris-kit': 'vexoris-ai',
  'aerion-kit': 'aerion-ai',
  'kenshiro-kit': 'kenshiro-ai',
  'psion-kit': 'psion-ai',
  'prismor-kit': 'prismor-ai',
  'reson-kit': 'reson-ai',
  'chronos-kit': 'chronos-ai',
  'geargrind-kit': 'geargrind-ai',
  'inkmaster-kit': 'inkmaster-ai',
  'magix-kit': 'magix-ai',
};

describe('five abilities, four equipped, any one on the bench (master plan B13, B14)', () => {
  for (const [id, kit] of Object.entries(ABILITY_KITS)) {
    const fifth = kit.a5;
    if (!fifth) continue;

    it(`${id}: the standard loadout is the four it always had`, () => {
      expect(applyLoadout(kit)).toBe(kit);
      expect(applyLoadout(kit, DEFAULT_LOADOUT)).toBe(kit);
      expect(new Set([kit.a1.id, kit.a2.id, kit.a3.id, kit.a4.id, fifth.id]).size).toBe(5);
    });

    for (const slot of NORMAL_SLOTS) {
      it(`${id}: the alternative can replace ${slot}, and that ability goes to the bench`, () => {
        const swapped = applyLoadout(kit, loadoutAfterSwap(kit, slot));
        const was = kit[slot];
        expect(swapped[slot].id).toBe(fifth.id);
        expect(swapped[slot].slot).toBe(slot); // it answers to the button it sits on
        expect(swapped.a5?.id).toBe(was.id);
        for (const other of NORMAL_SLOTS) if (other !== slot) expect(swapped[other]).toBe(kit[other]);
        expect(swapped.ult).toBe(kit.ult);
        expect(new Set([...equippedIds(swapped), swapped.a5?.id]).size).toBe(5);
        // Swapping the same slot back restores the standard four.
        const back = applyLoadout(swapped, loadoutAfterSwap(swapped, slot));
        expect(equippedIds(back)).toEqual(equippedIds(kit));
      });
    }

    it(`${id}: abilities can be chained from one swap to the next, ending with any one on the bench`, () => {
      let now = kit;
      for (const slot of ['a1', 'a3', 'a2'] as const) now = applyLoadout(now, loadoutAfterSwap(now, slot));
      expect(equippedIds(now)).toHaveLength(4);
      expect(new Set([...equippedIds(now), now.a5?.id]).size).toBe(5);
      for (const slot of NORMAL_SLOTS) expect(now[slot].slot).toBe(slot);
    });

    it(`${id}: unusable saved loadouts leave the standard four`, () => {
      const bad = [
        { equipped: ['x', 'y', 'z', 'w'] },
        { equipped: [kit.a1.id, kit.a1.id, kit.a2.id, kit.a3.id] },
        { equipped: [kit.a1.id, kit.a2.id] },
      ];
      for (const l of bad) {
        expect(validLoadout(kit, l)).toBe(false);
        expect(applyLoadout(kit, l)).toBe(kit);
      }
    });

    it(`${id}: the AI has a tactic for the fifth ability and moved abilities keep their own`, () => {
      expect(ALTERNATE_TACTICS[fifth.id]).toBeDefined();
      const aiId = AI[id] as string;
      const base = BRAIN_DESIGNS[aiId]!;
      expect(brainDesignFor(aiId, kit)).toBe(brainDesignFor(aiId));
      for (const slot of NORMAL_SLOTS) {
        const swapped = applyLoadout(kit, loadoutAfterSwap(kit, slot));
        expect(brainDesignFor(aiId, swapped).tactics[slot]).toBe(ALTERNATE_TACTICS[fifth.id]);
      }
      // Standard four on shuffled buttons: each ability still uses its own slot's tactic.
      const shuffled = {
        ...kit,
        a1: { ...kit.a2, slot: 'a1' as const, homeSlot: 'a2' as const },
        a2: { ...kit.a1, slot: 'a2' as const, homeSlot: 'a1' as const },
      };
      const design = brainDesignFor(aiId, shuffled);
      expect(design.tactics.a1).toBe(base.tactics.a2);
      expect(design.tactics.a2).toBe(base.tactics.a1);
    });
  }
});
