import { describe, expect, it } from 'vitest';
import { DODGE_BUFFER_S, PlayerIntents } from '../../../src/input/intents';

const STEP = 1 / 60;

describe('dodge input buffer (B16)', () => {
  it('no press, no dodge wanted', () => {
    const i = new PlayerIntents();
    expect(i.bufferedDodge(STEP)).toBe(false);
  });

  it('a press is remembered for the buffer window and then forgotten', () => {
    const i = new PlayerIntents();
    i.pressDodge();
    let steps = 0;
    while (i.bufferedDodge(STEP)) steps++;
    expect(steps * STEP).toBeGreaterThanOrEqual(DODGE_BUFFER_S - STEP);
    expect(steps * STEP).toBeLessThanOrEqual(DODGE_BUFFER_S + STEP);
    expect(i.bufferedDodge(STEP)).toBe(false);
  });

  it('starting the dodge clears the wait, so one press makes one dodge', () => {
    const i = new PlayerIntents();
    i.pressDodge();
    expect(i.bufferedDodge(STEP)).toBe(true);
    i.clearDodgeBuffer();
    expect(i.bufferedDodge(STEP)).toBe(false);
  });

  it('a press swallowed while unable to act (stunned, carrying) is dropped, not saved for later', () => {
    const i = new PlayerIntents();
    i.pressDodge();
    i.consumeDodge();
    expect(i.bufferedDodge(STEP)).toBe(false);
  });
});
