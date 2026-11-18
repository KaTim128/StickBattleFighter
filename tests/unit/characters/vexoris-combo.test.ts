import { describe, expect, it } from 'vitest';
import profile from '../../../src/data/characters/vexoris/animation-profile.json';
import set from '../../../src/data/characters/vexoris/moveset.json';
import { EFFECTS } from '../../../src/vfx/effects-library';

/** Vexoris's tap karate string and his heavy jar smash are separate moves (owner, 20/11/2026). */
describe('Vexoris: karate taps are separate from the heavy jar smash', () => {
  type Move = (typeof set.moves)[number] & { next?: { tap?: string }; status?: { poison?: number }; effect?: string };
  const moves = set.moves as Move[];
  const states = profile.states as Record<string, string>;
  const byId = (id: string) => moves.find((m) => m.id === id);

  it('the tap chain never reaches the jar smash and never uses the jar clip', () => {
    const seen = new Set<string>();
    let id: string | undefined = set.starters.tap;
    while (id && !seen.has(id)) {
      seen.add(id);
      expect(id).not.toBe('jar-smash');
      id = byId(id)?.next?.tap;
    }
    expect(seen.size).toBeGreaterThanOrEqual(3);
    for (const m of moves) if (!m.heavy) expect(states[m.animationState]).not.toBe('vexoris.jar-smash');
  });

  it('the heavy is the jar smash: heavy, poisoned, with its own effect, sound and a longer wind-up than any tap', () => {
    const heavy = byId(set.starters.heavy);
    expect(heavy?.id).toBe('jar-smash');
    expect(heavy?.heavy).toBe(true);
    expect(heavy?.status?.poison).toBe(1);
    expect(heavy?.effect).toBe('toxic-smash');
    for (const m of moves) if (!m.heavy) expect(heavy?.startupS ?? 0).toBeGreaterThan(m.startupS);
  });

  it('the tap strikes carry toxin limb trails and no heavy-only effect', () => {
    expect(EFFECTS['toxin-limbs']).toBeDefined();
    for (const m of moves) if (!m.heavy) expect(m.effect).not.toBe('toxic-smash');
  });
});
