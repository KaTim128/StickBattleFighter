import { describe, expect, it } from 'vitest';
import { seededRandom } from '../../../src/combat/combatant';
import {
  aiTeam,
  aiWantsTag,
  benchHp,
  draftPool,
  nextStanding,
  TEAM,
  teamHealth,
  wiped,
} from '../../../src/modes/team/team-battle';

const ROSTER = ['inferno', 'rampage', 'necro', 'shroud'];
const m = (hpFrac: number, ko = false) => ({ hpFrac, ko });

/** 3 vs 3 tag team rules (owner, 13/11/2026). */
describe('3 vs 3 tag team', () => {
  it('the pool of five has every fighter and one repeat when there are only four', () => {
    for (let seed = 1; seed < 20; seed++) {
      const pool = draftPool(ROSTER, seededRandom(seed));
      expect(pool).toHaveLength(5);
      for (const f of ROSTER) expect(pool).toContain(f);
      const counts = ROSTER.map((f) => pool.filter((p) => p === f).length);
      expect(Math.max(...counts)).toBe(2);
    }
  });

  it('the AI team has three fighters from the roster', () => {
    const t = aiTeam(ROSTER, seededRandom(5));
    expect(t).toHaveLength(3);
    for (const f of t) expect(ROSTER).toContain(f);
    expect(new Set(t).size).toBe(3); // different fighters while the roster allows
  });

  it('a tag brings in the next standing teammate; knocked-out ones are skipped', () => {
    expect(nextStanding([m(1), m(1), m(1)], 0)).toBe(1);
    expect(nextStanding([m(1), m(0, true), m(0.4)], 0)).toBe(2);
    expect(nextStanding([m(0.2), m(1), m(1)], 2)).toBe(0);
    expect(nextStanding([m(1), m(0, true), m(0, true)], 0)).toBeNull();
  });

  it('resting fighters recover slowly, never past their maximum', () => {
    expect(benchHp(500, 1000, 1)).toBeCloseTo(500 + 1000 * TEAM.benchRegenPerS);
    expect(benchHp(995, 1000, 10)).toBe(1000);
  });

  it('a team is beaten when all three are down; on time, the healthier team wins', () => {
    expect(wiped([m(0, true), m(0, true), m(0, true)])).toBe(true);
    expect(wiped([m(0, true), m(0.1), m(0, true)])).toBe(false);
    expect(teamHealth([m(1), m(0.5), m(0, true)])).toBeCloseTo(0.5);
  });

  it('the AI tags out when hurt, to its freshest teammate', () => {
    expect(aiWantsTag([m(0.2), m(0.7), m(0.9)], 0)).toBe(2);
    expect(aiWantsTag([m(0.5), m(0.9), m(0.9)], 0)).toBeNull(); // not hurt enough
    expect(aiWantsTag([m(0.2), m(0.4), m(0, true)], 0)).toBeNull(); // nobody fresh
  });
});
