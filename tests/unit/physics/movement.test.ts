import { describe, expect, it } from 'vitest';
import { type HopState, isAirborne, stepHop, stepVelocity } from '../../../src/physics/movement';

const TUNING = { maxSpeedMps: 5, accelMps2: 30, decelMps2: 40 };
const STEP = 1 / 60;

function run(move: { x: number; y: number }, steps: number, start = { x: 0, y: 0 }) {
  let v = start;
  for (let i = 0; i < steps; i++) v = stepVelocity(v, move, TUNING, STEP);
  return v;
}

describe('stepVelocity', () => {
  it('builds up to top speed over maxSpeed / accel seconds, not instantly', () => {
    expect(run({ x: 1, y: 0 }, 1).x).toBeCloseTo(30 * STEP, 6);
    expect(run({ x: 1, y: 0 }, 9).x).toBeLessThan(5);
    expect(run({ x: 1, y: 0 }, 11).x).toBeCloseTo(5, 6); // 5 / 30 ≈ 0.167 s ≈ 10 steps
  });

  it('never moves faster diagonally than straight', () => {
    const d = Math.SQRT1_2;
    const v = run({ x: d, y: d }, 120);
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(5, 6);
  });

  it('stops when the stick is released, using the deceleration rate', () => {
    const v = run({ x: 0, y: 0 }, 6, { x: 5, y: 0 });
    expect(v.x).toBeCloseTo(5 - 40 * 6 * STEP, 6);
    expect(run({ x: 0, y: 0 }, 10, { x: 5, y: 0 })).toEqual({ x: 0, y: 0 });
  });
});

describe('stepHop (jump hop with ground shadow)', () => {
  const HOP = { jumpSpeedMps: 4.2, hopGravityMps2: 22 };

  it('rises, peaks near v²/2g and lands back on the floor', () => {
    let hop: HopState = { heightM: 0, verticalSpeedMps: 0 };
    hop = stepHop(hop, true, HOP, STEP);
    let peak = hop.heightM;
    let steps = 1;
    while (isAirborne(hop) && steps < 600) {
      hop = stepHop(hop, false, HOP, STEP);
      peak = Math.max(peak, hop.heightM);
      steps++;
    }
    expect(peak).toBeCloseTo((4.2 * 4.2) / (2 * 22), 1);
    expect(hop).toEqual({ heightM: 0, verticalSpeedMps: 0 });
    expect(steps * STEP).toBeCloseTo((2 * 4.2) / 22, 1);
  });

  it('cannot jump again in mid-air', () => {
    let hop = stepHop({ heightM: 0, verticalSpeedMps: 0 }, true, HOP, STEP);
    const before = hop.verticalSpeedMps;
    hop = stepHop(hop, true, HOP, STEP);
    expect(hop.verticalSpeedMps).toBeLessThan(before);
  });
});
