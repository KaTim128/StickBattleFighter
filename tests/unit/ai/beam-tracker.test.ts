import { describe, expect, it } from 'vitest';
import { angleDelta, BeamTracker } from '../../../src/ai/beam-tracker';
import { DIFFICULTIES, type DifficultyId } from '../../../src/data/ai/difficulty';

const STEP = 1 / 60;
const tune = (id: DifficultyId) => ({
  reactionS: DIFFICULTIES[id].beamReadS,
  trackRadPerS: DIFFICULTIES[id].beamTrackRadPerS,
});

describe('angleDelta', () => {
  it('takes the short way round', () => {
    expect(angleDelta(0, 1)).toBeCloseTo(1, 9);
    expect(angleDelta(3, -3)).toBeCloseTo(2 * Math.PI - 6, 9); // across the -PI/PI seam, a small positive turn
    expect(angleDelta(-3, 3)).toBeCloseTo(6 - 2 * Math.PI, 9);
  });
});

describe('BeamTracker: an AI beam is not a perfect lock (B4)', () => {
  it('does not turn at all until it has started, and holds when the target is unseen', () => {
    const t = new BeamTracker();
    expect(t.step(STEP, 2, tune('normal'))).toBe(0);
    t.start(0.5);
    for (let i = 0; i < 60; i++) t.step(STEP, null, tune('normal'));
    expect(t.angle).toBeCloseTo(0.5, 9);
  });

  it('never swings faster than its tracking rate, even to a target on the far side', () => {
    for (const id of ['easy', 'normal', 'hard', 'expert'] as const) {
      const t = new BeamTracker();
      t.start(0);
      let last = 0;
      let worst = 0;
      for (let i = 0; i < 120; i++) {
        t.step(STEP, Math.PI * 0.9, tune(id));
        worst = Math.max(worst, Math.abs(t.angle - last) / STEP);
        last = t.angle;
      }
      expect(worst, id).toBeLessThanOrEqual(DIFFICULTIES[id].beamTrackRadPerS + 1e-9);
    }
  });

  it('only re-reads the target every reaction time, so a quick sidestep is not followed at once', () => {
    const t = new BeamTracker();
    t.start(0);
    const tuning = { reactionS: 0.35, trackRadPerS: 100 }; // fast turn: only the reading delay matters
    for (let i = 0; i < 10; i++) t.step(STEP, 1, tuning); // 0.17 s: still the old reading
    expect(t.angle).toBe(0);
    for (let i = 0; i < 20; i++) t.step(STEP, 1, tuning); // past 0.35 s
    expect(t.angle).toBeCloseTo(1, 9);
  });

  /**
   * A player circling the AI at 3 m: running at 5 m/s is a bearing change of about 1.7 rad/s, walking
   * about 1.2, strolling 0.5. The beam is 0.6 m wide and the target 0.6 m across, so it hits while the
   * aim is within about 0.2 rad of the true bearing. Returns the share of a 2.4 s beam that connects.
   */
  function hitFraction(id: DifficultyId, omega: number): number {
    const t = new BeamTracker();
    t.start(0);
    let hit = 0;
    const n = Math.round(2.4 / STEP);
    for (let i = 0; i < n; i++) {
      const bearing = omega * (i * STEP);
      t.step(STEP, bearing, tune(id));
      if (Math.abs(angleDelta(t.angle, bearing)) < 0.2) hit++;
    }
    return hit / n;
  }

  it('a player who stands still or only drifts is held by every level', () => {
    for (const id of ['easy', 'normal', 'hard', 'expert'] as const)
      expect(hitFraction(id, 0), id).toBeGreaterThan(0.95);
  });

  it('each level loses a faster mover than the last: strolling, walking, a brisk circle, a full-speed circle', () => {
    expect(hitFraction('easy', 0.5)).toBeLessThan(0.3); // Easy loses a stroll...
    expect(hitFraction('normal', 0.5)).toBeGreaterThan(0.7); // ...Normal does not
    expect(hitFraction('normal', 0.8)).toBeLessThan(0.3); // Normal loses a walk...
    expect(hitFraction('hard', 0.8)).toBeGreaterThan(0.7);
    expect(hitFraction('hard', 1.2)).toBeLessThan(0.3); // Hard loses a brisk circle...
    expect(hitFraction('expert', 1.2)).toBeGreaterThan(0.6);
    expect(hitFraction('expert', 1.7)).toBeLessThan(0.25); // and even Expert loses a full-speed circle
  });

  it('a player who stands still is still burned (the beam is a threat, not a gimmick)', () => {
    const t = new BeamTracker();
    t.start(0.4);
    let hit = 0;
    for (let i = 0; i < 144; i++) {
      t.step(STEP, 0.4, tune('easy'));
      if (Math.abs(angleDelta(t.angle, 0.4)) < 0.1) hit++;
    }
    expect(hit).toBe(144);
  });
});
