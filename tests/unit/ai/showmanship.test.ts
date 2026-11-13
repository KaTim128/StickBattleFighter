import { describe, expect, it } from 'vitest';
import { showmanship } from '../../../src/ai/showmanship';
import { DIFFICULTIES } from '../../../src/data/ai/difficulty';

/** Watched AI battles are close and exciting (owner, 13/11/2026). */
describe('showmanship', () => {
  it('both fighters play at least at Hard; Expert stays Expert', () => {
    expect(showmanship(DIFFICULTIES.easy, 1, 1).id).toBe('hard');
    expect(showmanship(DIFFICULTIES.normal, 1, 1).id).toBe('hard');
    expect(showmanship(DIFFICULTIES.expert, 1, 1)).toEqual(DIFFICULTIES.expert);
  });

  it('a level fight and the fighter behind are untouched; the one clearly ahead eases off', () => {
    const level = showmanship(DIFFICULTIES.hard, 0.6, 0.58);
    expect(level).toEqual(DIFFICULTIES.hard);
    expect(showmanship(DIFFICULTIES.hard, 0.3, 0.8)).toEqual(DIFFICULTIES.hard);
    const ahead = showmanship(DIFFICULTIES.hard, 0.9, 0.4);
    expect(ahead.hesitatePerS).toBeGreaterThan(DIFFICULTIES.hard.hesitatePerS);
    expect(ahead.mistakeChance).toBeGreaterThan(DIFFICULTIES.hard.mistakeChance);
    expect(ahead.punishSkill).toBeLessThan(DIFFICULTIES.hard.punishSkill);
    expect(ahead.tempo).toBeGreaterThan(DIFFICULTIES.hard.tempo);
  });

  it('never touches damage, health or speed (only how the AI decides)', () => {
    const ahead = showmanship(DIFFICULTIES.hard, 1, 0) as unknown as Record<string, unknown>;
    for (const k of Object.keys(ahead)) expect(k).not.toMatch(/damage|hp|health|speed|power/i);
  });
});
