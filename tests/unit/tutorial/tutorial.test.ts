import { describe, expect, it } from 'vitest';
import { stepText, TUTORIAL_STEPS, type TutorialObservation, TutorialRun } from '../../../src/tutorial/tutorial';

const idle: TutorialObservation = { movedM: 0, hits: 0, heavy: false, guarding: false, dodging: false, ability: null };
const frames = (run: TutorialRun, o: Partial<TutorialObservation>, n: number) => {
  for (let i = 0; i < n; i++) run.update({ ...idle, ...o }, 1 / 60);
};
const settle = (run: TutorialRun) => frames(run, {}, 70); // the pause between steps

/** The tutorial (owner, 13/11/2026). */
describe('tutorial', () => {
  it('teaches every combat action in order, each step finishing only when it is really done', () => {
    const run = new TutorialRun();
    expect(run.step?.id).toBe('move');
    frames(run, { movedM: 0.02 }, 100); // 2 m: not yet
    expect(run.stepDone).toBe(false);
    expect(run.progress).toBeGreaterThan(0.5);
    frames(run, { movedM: 0.02 }, 60);
    expect(run.stepDone).toBe(true);
    settle(run);
    expect(run.step?.id).toBe('punch');
    frames(run, { hits: 1 }, 1);
    settle(run);
    expect(run.step?.id).toBe('combo');
    frames(run, { hits: 1 }, 3);
    expect(run.stepDone).toBe(false);
    frames(run, { hits: 1 }, 1);
    settle(run);
    expect(run.step?.id).toBe('heavy');
    frames(run, { hits: 3 }, 5); // punches are not a heavy attack
    expect(run.stepDone).toBe(false);
    frames(run, { heavy: true }, 1);
    settle(run);
    expect(run.step?.id).toBe('block');
    frames(run, { guarding: true }, 70);
    settle(run);
    expect(run.step?.id).toBe('dodge');
    frames(run, { dodging: true }, 1);
    settle(run);
    expect(run.step?.id).toBe('ability');
    frames(run, { ability: 'ultimate' }, 5); // the ultimate does not count as an ability here
    expect(run.stepDone).toBe(false);
    frames(run, { ability: 'basic' }, 1);
    settle(run);
    expect(run.step?.id).toBe('ultimate');
    frames(run, { ability: 'ultimate' }, 1);
    settle(run);
    expect(run.finished).toBe(true);
    expect(run.stepNumber).toBe(TUTORIAL_STEPS.length + 1);
  });

  it('fills in the keys for the player device, and can be skipped', () => {
    const s = TUTORIAL_STEPS.find((t) => t.id === 'heavy')!;
    expect(stepText(s, { heavy: 'K' })).toContain('with K.');
    const run = new TutorialRun();
    run.skip();
    expect(run.finished).toBe(true);
  });
});
