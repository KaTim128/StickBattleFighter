import { describe, expect, it } from 'vitest';
import { THROWING } from '../../../src/data/combat/throwing';
import { PlayerIntents } from '../../../src/input/intents';
import { INTERACT_KEYS } from '../../../src/input/keyboard';

describe('pick up / throw input (REQ-CTL-13, TD-016)', () => {
  it('G and U are the desktop interact keys', () => {
    expect([...INTERACT_KEYS].sort()).toEqual(['KeyG', 'KeyU']);
  });

  it('press and release are queued in order, one per step, and a held key is reported', () => {
    const i = new PlayerIntents();
    i.interactPress(true);
    expect(i.interactHeld).toBe(true);
    i.interactRelease();
    expect(i.consumeInteract()).toEqual({ down: true, orJump: true });
    expect(i.consumeInteract()).toEqual({ down: false, orJump: false });
    expect(i.consumeInteract()).toBeNull();
  });

  it('repeated presses without a release count once', () => {
    const i = new PlayerIntents();
    i.interactPress();
    i.interactPress();
    expect(i.consumeInteract()?.down).toBe(true);
    expect(i.consumeInteract()).toBeNull();
  });
});

describe('throw tuning (REQ-PHY-10)', () => {
  it('light things fly faster; heavy things hit harder and slow the carrier more', () => {
    expect(THROWING.speedFor(0.3)).toBeGreaterThan(THROWING.speedFor(12));
    expect(THROWING.damageFor(12, 8)).toBeGreaterThan(THROWING.damageFor(0.3, 8));
    expect(THROWING.carrySpeedFactor(12)).toBeLessThan(THROWING.carrySpeedFactor(0.3));
    expect(THROWING.carrySpeedFactor(500)).toBeGreaterThanOrEqual(0.6);
    expect(THROWING.damageFor(500, 13)).toBeLessThanOrEqual(150 * 1.2);
  });
});
