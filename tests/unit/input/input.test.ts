import { describe, expect, it } from 'vitest';
import { clampToUnit, PlayerIntents } from '../../../src/input/intents';
import { ABILITY_KEYS, moveFromKeys } from '../../../src/input/keyboard';
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

describe('moveFromKeys (front/back/left/right, CONTROL_SCHEME §1)', () => {
  it('maps WASD and arrows to screen directions', () => {
    expect(moveFromKeys(new Set(['KeyW']))).toEqual({ x: 0, y: -1 });
    expect(moveFromKeys(new Set(['ArrowDown']))).toEqual({ x: 0, y: 1 });
    expect(moveFromKeys(new Set(['KeyA']))).toEqual({ x: -1, y: 0 });
    expect(moveFromKeys(new Set(['ArrowRight']))).toEqual({ x: 1, y: 0 });
  });

  it('makes diagonals unit length and lets opposite keys cancel', () => {
    const d = moveFromKeys(new Set(['KeyW', 'KeyD']));
    expect(Math.hypot(d.x, d.y)).toBeCloseTo(1, 6);
    expect(d.x).toBeGreaterThan(0);
    expect(d.y).toBeLessThan(0);
    expect(moveFromKeys(new Set(['KeyA', 'KeyD']))).toEqual({ x: 0, y: 0 });
    expect(moveFromKeys(new Set(['KeyW', 'ArrowUp']))).toEqual({ x: 0, y: -1 }); // same direction twice
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

  it('maps Q/E/R/F and K/L/O/I to the four slots; I is the ultimate (owner, CONTROL_SCHEME §4)', () => {
    expect([ABILITY_KEYS.KeyQ, ABILITY_KEYS.KeyE, ABILITY_KEYS.KeyR, ABILITY_KEYS.KeyF]).toEqual([
      'a1',
      'a2',
      'a3',
      'ult',
    ]);
    expect([ABILITY_KEYS.KeyK, ABILITY_KEYS.KeyL, ABILITY_KEYS.KeyO, ABILITY_KEYS.KeyI]).toEqual([
      'a1',
      'a2',
      'a3',
      'ult',
    ]);
  });
});
