import { describe, expect, it } from 'vitest';
import { type FrameScheduler, GameLoop } from '../../../src/core/game-loop';

/** Manually driven scheduler: each tick() delivers one display frame. */
function manualScheduler() {
  let pending: ((t: number) => void) | null = null;
  let nextHandle = 1;
  const scheduler: FrameScheduler = {
    request(cb) {
      pending = cb;
      return nextHandle++;
    },
    cancel() {
      pending = null;
    },
  };
  return {
    scheduler,
    tick(timeMs: number) {
      const cb = pending;
      pending = null;
      cb?.(timeMs);
    },
  };
}

describe('GameLoop', () => {
  it('runs fixed updates then one render per frame, and stops cleanly', () => {
    const { scheduler, tick } = manualScheduler();
    const log: string[] = [];
    const loop = new GameLoop(
      { update: () => log.push('u'), render: () => log.push('r') },
      { stepS: 0.01, maxStepsPerFrame: 10 },
      scheduler,
    );
    loop.start();
    tick(0); // first frame: no elapsed time yet
    tick(30); // 30 ms -> 3 steps
    expect(log.join('')).toBe('r' + 'uuur');
    loop.stop();
    expect(loop.running).toBe(false);
    tick(60);
    expect(log.join('')).toBe('ruuur');
  });

  it('time scale slows the simulation (slow motion) and 0 freezes it while still rendering', () => {
    const { scheduler, tick } = manualScheduler();
    let updates = 0;
    let renders = 0;
    const loop = new GameLoop(
      { update: () => updates++, render: () => renders++ },
      { stepS: 0.01, maxStepsPerFrame: 10 },
      scheduler,
    );
    loop.start();
    tick(0);
    loop.timeScale = 0.5;
    tick(40); // 40 ms at half speed -> 2 steps
    expect(updates).toBe(2);
    loop.timeScale = 0;
    tick(80);
    tick(120);
    expect(updates).toBe(2); // frozen
    expect(renders).toBe(4); // still drawing
  });
});
