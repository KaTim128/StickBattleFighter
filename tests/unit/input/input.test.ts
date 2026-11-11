import { describe, expect, it } from 'vitest';
import { clampToUnit, PlayerIntents } from '../../../src/input/intents';
import { DesktopInput, moveFromActions } from '../../../src/input/keyboard';
import { joystickVector } from '../../../src/input/touch-controls';

describe('PlayerIntents', () => {
  it('combines devices and never exceeds length 1', () => {
    const intents = new PlayerIntents();
    intents.setMove('keyboard', { x: 1, y: 0 });
    intents.setMove('touch', { x: 0, y: 1 });
    expect(Math.hypot(intents.move.x, intents.move.y)).toBeCloseTo(1, 6);
    intents.setMove('keyboard', { x: 0, y: 0 });
    intents.setMove('touch', { x: 0, y: 0 });
    expect(intents.move).toEqual({ x: 0, y: 0 });
  });

  it('remembers a jump press until exactly one step consumes it', () => {
    const intents = new PlayerIntents();
    intents.pressJump();
    expect(intents.consumeJump()).toBe(true);
    expect(intents.consumeJump()).toBe(false);
  });

  it('clampToUnit leaves short vectors alone', () => {
    expect(clampToUnit({ x: 0.3, y: 0.4 })).toEqual({ x: 0.3, y: 0.4 });
    expect(Math.hypot(...Object.values(clampToUnit({ x: 3, y: 4 })))).toBeCloseTo(1, 6);
  });
});

describe('moveFromActions (up/down/left/right, CONTROL_SCHEME §1)', () => {
  it('maps the four movement actions to screen directions', () => {
    expect(moveFromActions(['moveUp'])).toEqual({ x: 0, y: -1 });
    expect(moveFromActions(['moveDown'])).toEqual({ x: 0, y: 1 });
    expect(moveFromActions(['moveLeft'])).toEqual({ x: -1, y: 0 });
    expect(moveFromActions(['moveRight'])).toEqual({ x: 1, y: 0 });
  });

  it('makes diagonals unit length and lets opposite directions cancel', () => {
    const d = moveFromActions(['moveUp', 'moveRight']);
    expect(Math.hypot(d.x, d.y)).toBeCloseTo(1, 6);
    expect(d.x).toBeGreaterThan(0);
    expect(d.y).toBeLessThan(0);
    expect(moveFromActions(['moveLeft', 'moveRight'])).toEqual({ x: 0, y: 0 });
    expect(moveFromActions(['moveUp', 'moveUp'])).toEqual({ x: 0, y: -1 }); // same direction twice
    expect(moveFromActions(['jump', 'sprint'])).toEqual({ x: 0, y: 0 }); // not movement
  });
});

describe('joystickVector', () => {
  it('ignores small wobbles in the dead zone', () => {
    expect(joystickVector(5, 0, 56)).toEqual({ x: 0, y: 0 });
  });

  it('reaches full deflection at the rim and points the right way', () => {
    const v = joystickVector(0, -200, 56);
    expect(v.x).toBeCloseTo(0, 6);
    expect(v.y).toBeCloseTo(-1, 6);
    const half = joystickVector(30, 0, 56);
    expect(half.x).toBeGreaterThan(0.3);
    expect(half.x).toBeLessThan(0.6);
  });
});

describe('melee taps between steps (regression: a slow frame lost the second tap)', () => {
  it('keeps two quick taps and hands them out one per step', () => {
    const intents = new PlayerIntents();
    intents.pressMelee();
    intents.pressMelee();
    expect(intents.consumeMeleeEdges()).toEqual({ pressed: true, released: true });
    expect(intents.consumeMeleeEdges()).toEqual({ pressed: true, released: true });
    expect(intents.consumeMeleeEdges()).toEqual({ pressed: false, released: false });
  });

  it('a held press reports only the press until it is released', () => {
    const intents = new PlayerIntents();
    intents.meleePress();
    expect(intents.consumeMeleeEdges()).toEqual({ pressed: true, released: false });
    expect(intents.meleeHeld).toBe(true);
    intents.meleeRelease();
    expect(intents.consumeMeleeEdges()).toEqual({ pressed: false, released: true });
  });

  it('caps queued mashing at three taps', () => {
    const intents = new PlayerIntents();
    for (let i = 0; i < 10; i++) intents.pressMelee();
    let taps = 0;
    while (intents.consumeMeleeEdges().pressed) taps++;
    expect(taps).toBe(3);
  });
});

describe('ability buttons (Buttons 2–5)', () => {
  it('queues presses so none are lost between steps, at most two', () => {
    const intents = new PlayerIntents();
    intents.pressAbility('a1');
    intents.pressAbility('ult');
    intents.pressAbility('a3');
    expect(intents.consumeAbility()).toBe('a1');
    expect(intents.consumeAbility()).toBe('ult');
    expect(intents.consumeAbility()).toBeNull();
  });

  it('maps Q/E/R/F to the three abilities and the ultimate by default (owner, 11/11/2026)', () => {
    const intents = new PlayerIntents();
    const input = new DesktopInput(intents);
    for (const code of ['KeyQ', 'KeyE', 'KeyR', 'KeyF']) {
      input.down(code);
      input.up(code);
    }
    const got = [intents.consumeAbility(), intents.consumeAbility()];
    expect(got).toEqual(['a1', 'a2']); // at most two wait
    input.down('KeyR');
    input.down('KeyF');
    expect([intents.consumeAbility(), intents.consumeAbility()]).toEqual(['a3', 'ult']);
  });
});
