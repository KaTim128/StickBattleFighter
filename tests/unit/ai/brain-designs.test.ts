import { describe, expect, it } from 'vitest';
import { ABILITY_SLOTS } from '../../../src/abilities/ability-def';
import { BUILT_IN_LIBRARY } from '../../../src/characters/library';
import { BRAIN_DESIGNS } from '../../../src/data/ai/brains';
import { DIFFICULTIES } from '../../../src/data/ai/difficulty';

/** Owner, 13/11/2026: every stickman has its own AI brain, designed with its kit. */
describe('AI brain designs', () => {
  const playable = Object.values(BUILT_IN_LIBRARY.characters).filter(
    (c) => c.capabilities.isPlayable && c.characterType === 'fighter' && c.abilityKit,
  );

  it('every playable fighter has its own AI profile and its own brain design (no sharing)', () => {
    const profiles = playable.map((c) => c.profiles.ai);
    expect(new Set(profiles).size).toBe(profiles.length);
    for (const c of playable) expect(BRAIN_DESIGNS[c.profiles.ai], c.id).toBeDefined();
  });

  it('every design has a tactic for every ability slot', () => {
    for (const c of playable) {
      const d = BRAIN_DESIGNS[c.profiles.ai]!;
      for (const slot of ABILITY_SLOTS) expect(d.tactics[slot], `${c.id} ${slot}`).toBeDefined();
    }
  });

  it('difficulty raises intelligence only, step by step (no damage or health knobs)', () => {
    const order = [DIFFICULTIES.easy, DIFFICULTIES.normal, DIFFICULTIES.hard, DIFFICULTIES.expert];
    for (let i = 1; i < order.length; i++) {
      const [a, b] = [order[i - 1]!, order[i]!];
      expect(b.reactionS).toBeLessThan(a.reactionS);
      expect(b.mistakeChance).toBeLessThan(a.mistakeChance);
      expect(b.comboSkill).toBeGreaterThan(a.comboSkill);
      expect(b.punishSkill).toBeGreaterThan(a.punishSkill);
      expect(b.defendSkill).toBeGreaterThan(a.defendSkill);
    }
    for (const d of order) for (const k of Object.keys(d)) expect(k).not.toMatch(/damage|health|hp|attackSpeed/i);
  });
});
