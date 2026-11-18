import { describe, expect, it } from 'vitest';
import { clockText, KILL_ANIMATION_S, PREP_S, Round, SURVIVE_S } from '../../../src/modes/hide-seek/rules';

const STEP = 1 / 60;
const run = (r: Round, seconds: number) => {
  for (let i = 0; i < Math.round(seconds / STEP); i++) r.update(STEP);
};

describe('round rules (section H)', () => {
  it('prepares for exactly 20 seconds, and the hunt does not begin a moment sooner', () => {
    const r = new Round();
    expect(r.prepLeftS).toBe(PREP_S);
    expect(r.hunting).toBe(false);
    run(r, 19.9);
    expect(r.phase).toBe('prep');
    expect(r.hunting).toBe(false);
    expect(r.prepLeftS).toBeGreaterThan(0);
    run(r, 0.1);
    expect(r.phase).toBe('hunt');
    expect(r.hunting).toBe(true);
    expect(r.takeEvents()).toEqual(['hunt']);
  });

  it('the player cannot be caught during preparation', () => {
    const r = new Round();
    expect(r.catchPlayer()).toBe(false);
    expect(r.phase).toBe('prep');
  });

  it('surviving two minutes of hunting is a victory', () => {
    const r = new Round();
    run(r, PREP_S);
    run(r, SURVIVE_S - 1);
    expect(r.phase).toBe('hunt');
    expect(r.survivalLeftS).toBeGreaterThan(0);
    run(r, 1);
    expect(r.phase).toBe('victory');
    expect(r.over).toBe(true);
    expect(r.catchPlayer()).toBe(false); // too late: no kill after a win
    expect(r.killsStarted).toBe(0);
  });

  /** Owner, 20/11/2026: every round is exactly two minutes of hunting, whatever the frame rate. */
  it.each([
    ['60 steps a second', 1 / 60],
    ['30 steps a second', 1 / 30],
    ['an uneven 17 ms step', 0.017],
    ['a slow 100 ms step', 0.1],
  ])('the hunt lasts exactly 120 seconds at %s: no win a step early, a win at the step that reaches it', (_n, dt) => {
    const r = new Round();
    let t = 0;
    while (r.phase === 'prep') r.update(dt);
    expect(r.survivalLeftS).toBeCloseTo(SURVIVE_S, 9);
    expect(SURVIVE_S).toBe(120);
    while (r.phase === 'hunt') {
      const before = r.survivedS;
      r.update(dt);
      t += dt;
      if (r.phase === 'hunt') expect(before + dt).toBeLessThan(SURVIVE_S + 1e-6);
    }
    expect(r.phase).toBe('victory');
    // The step that ended it is the first to reach 120 s, and it ends within one step of 120 s.
    expect(t).toBeGreaterThanOrEqual(SURVIVE_S - 1e-6);
    expect(t).toBeLessThan(SURVIVE_S + dt + 1e-6);
    expect(r.survivalLeftS).toBe(0);
    expect(r.survivedS).toBe(SURVIVE_S);
  });

  it('a restart gives a fresh 120 second hunt', () => {
    const r = new Round();
    run(r, PREP_S + 100);
    r.reset();
    expect(r.phase).toBe('prep');
    expect(r.survivalLeftS).toBe(SURVIVE_S);
    run(r, PREP_S);
    expect(r.survivalLeftS).toBeCloseTo(SURVIVE_S, 6);
  });

  it('being caught starts the killing animation exactly once, then Game Over', () => {
    const r = new Round();
    run(r, PREP_S + 30);
    expect(r.catchPlayer()).toBe(true);
    expect(r.catchPlayer()).toBe(false);
    expect(r.catchPlayer()).toBe(false);
    expect(r.killsStarted).toBe(1);
    expect(r.phase).toBe('killing');
    run(r, KILL_ANIMATION_S / 2);
    expect(r.phase).toBe('killing');
    expect(r.killProgress).toBeGreaterThan(0.4);
    run(r, KILL_ANIMATION_S);
    expect(r.phase).toBe('gameover');
    expect(r.catchPlayer()).toBe(false);
    expect(r.killsStarted).toBe(1);
    // The survival clock stopped when the player was caught.
    const left = r.survivalLeftS;
    run(r, 10);
    expect(r.survivalLeftS).toBe(left);
  });

  it('restart resets the countdown, the clock and the kill state', () => {
    const r = new Round();
    run(r, PREP_S + 10);
    r.catchPlayer();
    run(r, KILL_ANIMATION_S + 1);
    r.reset();
    expect(r.phase).toBe('prep');
    expect(r.prepLeftS).toBe(PREP_S);
    expect(r.survivalLeftS).toBe(SURVIVE_S);
    expect(r.killsStarted).toBe(0);
    expect(r.takeEvents()).toEqual([]);
    run(r, PREP_S);
    expect(r.catchPlayer()).toBe(true); // a fresh round can end the same way again
  });

  it('formats the clock as M:SS, rounding up', () => {
    expect(clockText(120)).toBe('2:00');
    expect(clockText(119.2)).toBe('2:00');
    expect(clockText(59.9)).toBe('1:00');
    expect(clockText(20)).toBe('0:20');
    expect(clockText(0.4)).toBe('0:01');
    expect(clockText(0)).toBe('0:00');
  });
});
