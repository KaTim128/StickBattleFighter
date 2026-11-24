import { describe, expect, it } from 'vitest';
import { loadCharacter } from '../../../src/characters/load';
import { Combatant } from '../../../src/combat/combatant';
import { POISON, poisonSpeedFactor, Toxicity } from '../../../src/combat/toxicity';

const run = (t: Toxicity, seconds: number) => {
  const ticks: number[] = [];
  for (let i = 0; i < seconds * 60; i++)
    t.tick(1 / 60, (a) => {
      ticks.push(a);
      return a;
    });
  return ticks;
};
const spec = (n: number) => n * POISON.hpPerSpecHp;

/** Vexoris's poison (master plan B4 and B7; TD-115). */
describe('toxicity', () => {
  it('slows movement by the owner ladder and never beyond 10%', () => {
    const f = (s: number) => poisonSpeedFactor(s);
    expect(f(0)).toBe(1);
    expect(f(1)).toBeCloseTo(0.98);
    expect(f(4)).toBeCloseTo(0.98);
    expect(f(5)).toBeCloseTo(0.96);
    expect(f(15)).toBeCloseTo(0.94);
    expect(f(20)).toBeCloseTo(0.92);
    expect(f(25)).toBeCloseTo(0.9);
    expect(f(500)).toBeCloseTo(0.9);
  });

  it('stacks are capped, and nothing is added by a zero application', () => {
    const t = new Toxicity();
    expect(t.apply(0)).toBe(false);
    t.apply(100);
    expect(t.stacks).toBe(POISON.maxStacks);
  });

  it('deals 1, 2, 3, 4 then 4 every 3 seconds (in spec HP), as one sequence', () => {
    const t = new Toxicity();
    t.apply(1);
    expect(run(t, 3.1 * 5)).toEqual([spec(1), spec(2), spec(3), spec(4), spec(4)]);
  });

  it('reapplying adds stacks but neither restarts the climb nor starts a second timer', () => {
    const t = new Toxicity();
    t.apply(1);
    run(t, 7); // ticks at 3 s and 6 s: 1 then 2
    t.apply(3);
    t.apply(1);
    expect(t.stacks).toBe(5);
    const later = run(t, 6); // the next ticks at 9 s and 12 s: 3 then 4, only two of them
    // Ticks climb 3 then 4 and, with five stacks, each is 16% heavier (VX2: +4% per stack above the first).
    expect(later.map((x) => Math.round(x * 100) / 100)).toEqual([spec(3) * 1.16, spec(4) * 1.16]);
  });

  it('does nothing without stacks, and clearing stops it', () => {
    const t = new Toxicity();
    expect(run(t, 10)).toEqual([]);
    t.apply(2);
    t.clear();
    expect(run(t, 10)).toEqual([]);
    expect(t.speedFactor).toBe(1);
  });
});

describe('poison on a fighter', () => {
  const fresh = () => new Combatant({ ...loadCharacter('shroud').def.stats, maxHp: 1000 });

  it('hurts through the status registry, slows, ends when the fighter is down, and is cleared by a reset', () => {
    const c = fresh();
    c.poison(5);
    expect(c.toxicityStacks).toBe(5);
    expect(c.status.has('toxicity')).toBe(true);
    expect(c.status.speedFactor).toBeCloseTo(0.96);
    let taken = 0;
    for (let i = 0; i < 60 * 3.1; i++) taken += c.update(1 / 60);
    expect(taken).toBeCloseTo(spec(1) * 1.16, 5); // five stacks: +16% (VX2)
    c.reset();
    expect(c.toxicityStacks).toBe(0);
    expect(c.status.speedFactor).toBe(1);
  });

  it('is cleared when the fighter is defeated', () => {
    const c = fresh();
    c.poison(3);
    c.hp = 0.5;
    for (let i = 0; i < 60 * 3.1; i++) c.update(1 / 60);
    expect(c.isKo).toBe(true);
    expect(c.toxicityStacks).toBe(0);
    c.poison(5); // a downed fighter cannot be poisoned
    expect(c.toxicityStacks).toBe(0);
  });
});
