import { describe, expect, it } from 'vitest';
import { chooseTarget, STICKY_S, type TargetCandidate } from '../../../src/ai/target-choice';

const boss = (distM: number, hpFrac = 1): TargetCandidate => ({ id: 'necro', isSummon: false, distM, hpFrac });
const bones = (id: string, distM: number): TargetCandidate => ({ id, isSummon: true, distM, hpFrac: 1 });
const ctx = { reachM: 1.3, currentId: null, heldS: 0 };

describe('AI target choice against summoners (B10)', () => {
  it('goes for the summoner when there are no minions, and for minions when only they are left', () => {
    expect(chooseTarget([boss(5)], ctx)).toBe('necro');
    expect(chooseTarget([bones('s1', 4), bones('s2', 2)], ctx)).toBe('s2');
    expect(chooseTarget([], ctx)).toBeNull();
  });

  it('hits the summoner when he is within reach, even with minions about', () => {
    expect(chooseTarget([boss(1.2), bones('s1', 2.5), bones('s2', 2.8)], ctx)).toBe('necro');
  });

  it('clears two or more minions on top of it when the summoner is out of reach', () => {
    expect(chooseTarget([boss(7), bones('s1', 2.2), bones('s2', 1.5)], ctx)).toBe('s2'); // the nearest
  });

  it('kills a minion at its throat while the summoner is far off', () => {
    expect(chooseTarget([boss(8), bones('s1', 1.6)], ctx)).toBe('s1');
  });

  it('ignores the minions to finish a nearly beaten summoner who is in range', () => {
    expect(chooseTarget([boss(5, 0.2), bones('s1', 1.5), bones('s2', 1.8)], ctx)).toBe('necro');
  });

  it('is situational: the same fight flips as the distances change', () => {
    const early = [boss(7), bones('s1', 2), bones('s2', 2.4)];
    const closeIn = [boss(1.1), bones('s1', 2), bones('s2', 2.4)];
    expect(chooseTarget(early, ctx)).not.toBe('necro');
    expect(chooseTarget(closeIn, ctx)).toBe('necro');
  });

  it('keeps its choice for a moment instead of flipping every frame, then reconsiders', () => {
    const cands = [boss(1.2), bones('s1', 1.4)];
    expect(chooseTarget(cands, { reachM: 1.3, currentId: 's1', heldS: 0.2 })).toBe('s1'); // sticky
    expect(chooseTarget(cands, { reachM: 1.3, currentId: 's1', heldS: STICKY_S + 0.1 })).toBe('necro');
    expect(chooseTarget([boss(1.2)], { reachM: 1.3, currentId: 's1', heldS: 0.2 })).toBe('necro'); // it died
  });
});
