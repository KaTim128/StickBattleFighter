import { describe, expect, it } from 'vitest';
import { ABILITY_KITS } from '../../../src/abilities/kits';
import { BUILT_IN_LIBRARY } from '../../../src/characters/library';
import { resolveCharacter } from '../../../src/characters/resolve';

/**
 * Owner, 21/11/2026: all attacks are unique and never copied. Across the playable roster no two fighters share a move (its
 * id or its name), an ability (its id, name, icon, effect or sounds), or an attack animation (see unique-animation.test).
 * A passive is optional: some fighters have none.
 */
describe('every attack of every playable fighter is its own', () => {
  const roster = Object.values(BUILT_IN_LIBRARY.characters)
    .filter((c) => c.template !== undefined && c.capabilities.isPlayable && c.characterType === 'fighter')
    .map((c) => {
      const d = resolveCharacter(c.id, BUILT_IN_LIBRARY) as unknown as { moves: unknown };
      const moves = (d.moves instanceof Map ? [...d.moves.values()] : Object.values(d.moves as object)) as {
        id: string;
        displayName?: string;
      }[];
      return { id: c.id, kit: c.abilityKit ? ABILITY_KITS[c.abilityKit] : undefined, moves };
    });

  /**
   * Names the owner has explicitly asked two fighters to share (the latest instruction wins): Bohemeth's ability is called plain
   * "Ground Smash" like Titan's (owner, 26/11/2026). Ids, icons, effects, sounds and animations stay unique.
   */
  const OWNER_SHARED_NAMES: ReadonlySet<string> = new Set(['Ground Smash']);

  const noDuplicates = (what: string, pairs: { owner: string; value: string | undefined }[]) => {
    const seen = new Map<string, string>();
    for (const { owner, value } of pairs) {
      if (!value) continue;
      if (what === 'ability name' && OWNER_SHARED_NAMES.has(value)) continue;
      const first = seen.get(value);
      // A fighter may reuse its own id or effect for its own variants; only another fighter's is a copy.
      expect(first === undefined || first === owner, `${what} "${value}" is used by both ${owner} and ${first}`).toBe(
        true,
      );
      seen.set(value, owner);
    }
  };

  it('no two fighters share a move id or a move name', () => {
    noDuplicates(
      'move id',
      roster.flatMap((f) => f.moves.map((m) => ({ owner: f.id, value: m.id }))),
    );
    noDuplicates(
      'move name',
      roster.flatMap((f) => f.moves.map((m) => ({ owner: f.id, value: m.displayName }))),
    );
  });

  it('no two fighters share an ability id, name, icon, effect or sound', () => {
    const abilities = roster.flatMap((f) =>
      f.kit
        ? [f.kit.a1, f.kit.a2, f.kit.a3, f.kit.a4, f.kit.a5, f.kit.ult].flatMap((a) => (a ? [{ owner: f.id, a }] : []))
        : [],
    );
    expect(abilities.length).toBeGreaterThanOrEqual(30);
    noDuplicates(
      'ability id',
      abilities.map((x) => ({ owner: x.owner, value: x.a.id })),
    );
    noDuplicates(
      'ability name',
      abilities.map((x) => ({ owner: x.owner, value: x.a.name })),
    );
    noDuplicates(
      'ability icon',
      abilities.map((x) => ({ owner: x.owner, value: x.a.icon })),
    );
    noDuplicates(
      'ability effect',
      abilities.map((x) => ({ owner: x.owner, value: x.a.vfx })),
    );
    noDuplicates(
      'ability release sound',
      abilities.map((x) => ({ owner: x.owner, value: x.a.sfx.release })),
    );
  });

  it('passives are optional: some fighters have none, and every one that exists is distinct', () => {
    const passives = roster.map((f) => f.kit?.passive);
    expect(passives.some((p) => p === undefined)).toBe(true);
    expect(passives.some((p) => p !== undefined)).toBe(true);
    noDuplicates(
      'passive name',
      roster.map((f) => ({ owner: f.id, value: f.kit?.passive?.name })),
    );
  });
});
