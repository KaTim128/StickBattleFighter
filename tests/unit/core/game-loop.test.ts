import { describe, expect, it } from 'vitest';
import { GameLoop, type FrameScheduler } from '../../../src/core/game-loop';

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
});
