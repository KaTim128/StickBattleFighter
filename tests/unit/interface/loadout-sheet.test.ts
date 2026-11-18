import { describe, expect, it } from 'vitest';
import { loadoutAfterSwap, NORMAL_SLOTS } from '../../../src/abilities/loadout';
import { loadCharacter } from '../../../src/characters/load';
import { DEFAULT_BINDINGS } from '../../../src/input/bindings';
import { fighterSheet } from '../../../src/interface/fighter-sheet';

describe('fighter sheet with a loadout (B14)', () => {
  for (const id of ['inferno', 'rampage', 'necro', 'shroud']) {
    const def = loadCharacter(id).def;
    const standard = fighterSheet(def, 'desktop', DEFAULT_BINDINGS);
    const normal = (sheet: typeof standard) => sheet.abilities.filter((a) => /^a\d$/.test(a.slot));

    it(`${id}: four equipped abilities on a1 to a4 plus one alternative, never locked`, () => {
      expect(normal(standard).map((a) => a.slot)).toEqual(['a1', 'a2', 'a3', 'a4']);
      const alt = standard.abilities.filter((a) => a.alternative);
      expect(alt).toHaveLength(1);
      expect(alt[0]!.slot).toBe('alt');
      expect(alt[0]!.stats.length).toBeGreaterThan(0);
      expect(alt[0]!.howTo.length).toBeGreaterThan(0);
    });

    for (const slot of NORMAL_SLOTS)
      it(`${id}: swapping the alternative into ${slot} exchanges it with that ability`, () => {
        const loadout = loadoutAfterSwap(def.abilities!, slot);
        const swapped = fighterSheet(def, 'desktop', DEFAULT_BINDINGS, loadout);
        const at = (sheet: typeof standard) => sheet.abilities.find((a) => a.slot === slot)!;
        const bench = (sheet: typeof standard) => sheet.abilities.find((a) => a.alternative)!;
        expect(at(swapped).name).toBe(bench(standard).name);
        expect(bench(swapped).name).toBe(at(standard).name);
        expect(at(swapped).key).toBe(at(standard).key); // the button keeps its key
      });
  }
});
