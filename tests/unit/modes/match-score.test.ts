import { describe, expect, it } from 'vitest';
import { TOURNAMENT_RULES } from '../../../src/data/modes/tournament-rules';
import { decideByScore, type SideRecord } from '../../../src/modes/tournament/match-score';

const side = (o: Partial<SideRecord> = {}): SideRecord => ({
  hpShare: 0.5,
  damageDealt: 100,
  hitsLanded: 10,
  knockdowns: 1,
  firstHitS: 5,
  ...o,
});

describe('match fallback score (T1)', () => {
  it('compares health share, damage, hits, knockdowns then the earlier first hit, in that order', () => {
    expect(decideByScore(side({ hpShare: 0.6 }), side({ damageDealt: 999 }))).toBe('a');
    expect(decideByScore(side(), side({ hpShare: 0.7 }))).toBe('b');
    expect(decideByScore(side({ damageDealt: 90 }), side())).toBe('b');
    expect(decideByScore(side({ hitsLanded: 12 }), side())).toBe('a');
    expect(decideByScore(side(), side({ knockdowns: 2 }))).toBe('b');
    expect(decideByScore(side({ firstHitS: 9 }), side({ firstHitS: 4 }))).toBe('b');
    expect(decideByScore(side({ firstHitS: null }), side({ firstHitS: 40 }))).toBe('b');
  });

  it('is deterministic: the same records always give the same winner, and swapping sides swaps the result', () => {
    const x = side({ hitsLanded: 11 });
    const y = side();
    for (let i = 0; i < 5; i++) expect(decideByScore(x, y)).toBe('a');
    expect(decideByScore(y, x)).toBe('b');
  });

  it('a total tie goes to the fixed first side, not to whoever is the human', () => {
    expect(decideByScore(side(), side())).toBe('a');
  });

  it('overtime follows regulation and ramps damage up', () => {
    expect(TOURNAMENT_RULES.regulationS).toBe(120);
    expect(TOURNAMENT_RULES.overtimeS).toBeGreaterThan(0);
    expect(TOURNAMENT_RULES.overtimeDamageRampPerS).toBeGreaterThan(0);
    expect(TOURNAMENT_RULES.overtimeAiAggression).toBeGreaterThan(0.8);
  });
});
