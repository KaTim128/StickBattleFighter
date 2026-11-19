import { describe, expect, it } from 'vitest';
import { BUILT_IN_LIBRARY } from '../../../src/characters/library';
import { adminCharacters, playableFighters } from '../../../src/characters/roster';

/** Who appears where (owner, master plan 16/11/2026). */
describe('roster', () => {
  it('players see exactly the playable fighters', () => {
    expect(
      playableFighters(BUILT_IN_LIBRARY)
        .map((c) => c.id)
        .sort(),
    ).toEqual(['aerion', 'inferno', 'kenshiro', 'necro', 'psion', 'rampage', 'shroud', 'vexoris']);
  });

  it('the Admin Panel sees every character: the fighters, the skeleton variant and the training dummy', () => {
    const ids = adminCharacters(BUILT_IN_LIBRARY).map((c) => c.id);
    for (const id of [
      'inferno',
      'necro',
      'rampage',
      'shroud',
      'vexoris',
      'aerion',
      'skeleton-warrior',
      'training-dummy',
    ])
      expect(ids).toContain(id);
    expect(ids).not.toContain('base-stickman'); // the shared template is not a fighter
    expect(ids.slice(0, 8).sort()).toEqual([
      'aerion',
      'inferno',
      'kenshiro',
      'necro',
      'psion',
      'rampage',
      'shroud',
      'vexoris',
    ]); // the main roster first
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every character in the library is either playable, an admin entry, or the base template', () => {
    for (const c of Object.values(BUILT_IN_LIBRARY.characters)) {
      const listed = adminCharacters(BUILT_IN_LIBRARY).some((a) => a.id === c.id);
      expect(listed || c.template === undefined, c.id).toBe(true);
    }
  });
});
