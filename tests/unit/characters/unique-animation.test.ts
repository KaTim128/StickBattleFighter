import { describe, expect, it } from 'vitest';
import { BUILT_IN_LIBRARY } from '../../../src/characters/library';
import { resolveCharacter } from '../../../src/characters/resolve';

/**
 * Owner, 21/11/2026: every stickman fighter has a unique idle stance that reflects their weapon and fighting style, and
 * all stickmen are unique in their attacks. So across the playable roster no two fighters share an idle clip or any clip
 * used by one of their attacks.
 */
describe('every playable fighter is unique in stance and attacks', () => {
  const roster = Object.values(BUILT_IN_LIBRARY.characters)
    .filter((c) => c.template !== undefined && c.capabilities.isPlayable && c.characterType === 'fighter')
    .map((c) => {
      const d = resolveCharacter(c.id, BUILT_IN_LIBRARY) as unknown as {
        moves: unknown;
        animation: { clipIds: Record<string, string[]> };
      };
      const moves = (d.moves instanceof Map ? [...d.moves.values()] : Object.values(d.moves as object)) as {
        animationState: string;
      }[];
      const attackStates = [...new Set(moves.map((m) => m.animationState))];
      return {
        id: c.id,
        idle: d.animation.clipIds.Idle?.[0] ?? '',
        attacks: new Map(attackStates.map((st) => [st, d.animation.clipIds[st] ?? []] as const)),
      };
    });

  it('has at least seven playable fighters to compare', () => {
    expect(roster.length).toBeGreaterThanOrEqual(7);
  });

  it('no two fighters share an idle stance', () => {
    const seen = new Map<string, string>();
    for (const f of roster) {
      expect(f.idle, f.id).toMatch(/^proc\.idle\./);
      expect(seen.get(f.idle), `${f.id} and ${seen.get(f.idle)} both idle as ${f.idle}`).toBeUndefined();
      seen.set(f.idle, f.id);
    }
  });

  it('no two fighters share an attack animation, and every attack has its own clip', () => {
    const owner = new Map<string, string>();
    for (const f of roster) {
      for (const [state, ids] of f.attacks) {
        expect(ids.length, `${f.id} ${state}`).toBeGreaterThan(0);
        for (const id of ids) {
          expect(id, `${f.id} ${state} uses a shared clip`).not.toMatch(/^(std|tkd|boxing)\./);
          expect(owner.get(id), `${id} used by ${f.id} and ${owner.get(id)}`).toBeUndefined();
          owner.set(id, f.id);
        }
      }
    }
  });
});
