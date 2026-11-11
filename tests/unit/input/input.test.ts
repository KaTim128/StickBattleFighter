import { describe, expect, it } from 'vitest';
import { clampToUnit, PlayerIntents } from '../../../src/input/intents';
import { moveFromKeys } from '../../../src/input/keyboard';
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
