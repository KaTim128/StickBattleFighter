import { describe, expect, it } from 'vitest';
import { loadCharacter } from '../../../src/characters/load';
import { DEFAULT_BINDINGS } from '../../../src/input/bindings';
import { fighterSheet } from '../../../src/interface/fighter-sheet';

describe('fighter sheet with a loadout (B14)', () => {
  for (const id of ['inferno', 'rampage', 'necro', 'shroud']) {
    it(`${id}: five abilities shown, four equipped plus one alternative in the same slot, swapped by the loadout`, () => {
      const def = loadCharacter(id).def;
      const standard = fighterSheet(def, 'desktop', DEFAULT_BINDINGS);
      const swapped = fighterSheet(def, 'desktop', DEFAULT_BINDINGS, { useFifth: true });
      for (const sheet of [standard, swapped]) {
        const normal = sheet.abilities.filter((a) => /^a\d$/.test(a.slot));
        expect(normal).toHaveLength(5);
        expect(normal.filter((a) => a.alternative)).toHaveLength(1);
        const alt = normal.find((a) => a.alternative)!;
        expect(normal.filter((a) => a.slot === alt.slot)).toHaveLength(2); // the alternative shares a slot
        expect(alt.name.length).toBeGreaterThan(0);
        expect(alt.stats.length).toBeGreaterThan(0);
      }
      const slot = standard.abilities.find((a) => a.alternative)!.slot;
      const nameIn = (sheet: typeof standard, alt: boolean) =>
        sheet.abilities.find((a) => a.slot === slot && Boolean(a.alternative) === alt)!.name;
      // Swapping exchanges the equipped one and the alternative.
      expect(nameIn(swapped, false)).toBe(nameIn(standard, true));
      expect(nameIn(swapped, true)).toBe(nameIn(standard, false));
    });
  }
});
