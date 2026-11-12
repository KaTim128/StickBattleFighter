import { describe, expect, it } from 'vitest';
import { BUILT_IN_LIBRARY } from '../../../src/characters/library';
import { loadCharacter } from '../../../src/characters/load';
import { fighterRatings, RATING_KEYS, ratingTotal } from '../../../src/characters/ratings';

/** Every playable fighter in the menu. */
const PLAYABLE = Object.values(BUILT_IN_LIBRARY.characters)
  .filter((c) => c.template !== undefined && c.capabilities.isPlayable && c.characterType === 'fighter')
  .map((c) => c.id);

describe('fighter balance (owner, 12/11/2026: no fighter objectively stronger on combined stats)', () => {
  const ratings = PLAYABLE.map((id) => ({ id, r: fighterRatings(loadCharacter(id).def) }));

  it('has at least the three roster fighters, each rated 0–100 on all six stats', () => {
    expect(PLAYABLE).toEqual(expect.arrayContaining(['inferno', 'rampage', 'necro']));
    for (const { r } of ratings)
      for (const k of RATING_KEYS) {
        expect(r[k]).toBeGreaterThanOrEqual(0);
        expect(r[k]).toBeLessThanOrEqual(100);
      }
  });

  it('every fighter spends the same overall stat budget (totals within 3% of each other)', () => {
    const totals = ratings.map(({ r }) => ratingTotal(r));
    const mean = totals.reduce((a, b) => a + b, 0) / totals.length;
    for (const t of totals) expect(Math.abs(t - mean) / mean).toBeLessThan(0.03);
  });

  it('but each spends it differently: every fighter is best at something and weak at something', () => {
    for (const { id, r } of ratings) {
      const others = ratings.filter((o) => o.id !== id);
      const best = RATING_KEYS.some((k) => others.every((o) => r[k] > o.r[k]));
      const worst = RATING_KEYS.some((k) => others.every((o) => r[k] < o.r[k]));
      expect(best, `${id} leads in some stat`).toBe(true);
      expect(worst, `${id} trails in some stat`).toBe(true);
    }
  });

  it('nobody dominates: no fighter is at least as good as another in every stat', () => {
    for (const a of ratings)
      for (const b of ratings) {
        if (a === b) continue;
        expect(
          RATING_KEYS.every((k) => a.r[k] >= b.r[k]),
          `${a.id} dominates ${b.id}`,
        ).toBe(false);
      }
  });
});
