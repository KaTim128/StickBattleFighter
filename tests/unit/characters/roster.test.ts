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
    ).toEqual([
      'aerion',
      'bohemeth',
      'chronos',
      'geargrind',
      'gunsmith',
      'inferno',
      'inkmaster',
      'kenshiro',
      'magix',
      'necro',
      'prismor',
      'psion',
      'rampage',
      'reson',
      'shroud',
      'vexoris',
      'voltar',
    ]);
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
      'bohemeth',
      'chronos',
      'geargrind',
      'gunsmith',
      'inferno',
      'inkmaster',
      'kenshiro',
      'magix',
      'necro',
      'prismor',
      'psion',
      'rampage',
      'reson',
      'shroud',
      'vexoris',
      'voltar',
    ])
      expect(ids).toContain(id);
    expect(ids).not.toContain('base-stickman'); // the shared template is not a fighter
    expect(ids.slice(0, 17).sort()).toEqual([
      'aerion',
      'bohemeth',
      'chronos',
      'geargrind',
      'gunsmith',
      'inferno',
      'inkmaster',
      'kenshiro',
      'magix',
      'necro',
      'prismor',
      'psion',
      'rampage',
      'reson',
      'shroud',
      'vexoris',
      'voltar',
    ]); // the main roster first
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('Kamaw is retired: not playable, not in the Admin Panel, but his data is still in the library', () => {
    expect(playableFighters(BUILT_IN_LIBRARY).map((c) => c.id)).not.toContain('sickle-wielder');
    expect(adminCharacters(BUILT_IN_LIBRARY).map((c) => c.id)).not.toContain('sickle-wielder');
    expect(BUILT_IN_LIBRARY.characters['sickle-wielder']).toBeDefined();
  });

  it('every character in the library is either playable, an admin entry, or the base template', () => {
    for (const c of Object.values(BUILT_IN_LIBRARY.characters)) {
      if (c.id === 'sickle-wielder') continue; // retired
      const listed = adminCharacters(BUILT_IN_LIBRARY).some((a) => a.id === c.id);
      expect(listed || c.template === undefined, c.id).toBe(true);
    }
  });
});
