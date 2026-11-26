import { describe, expect, it } from 'vitest';
import type { IdleStyle } from '../../../src/animation/greybox-motion';
import { runPose, walkPose } from '../../../src/animation/greybox-motion';

/**
 * W1 (owner 19/11/2026): natural walking for the newer fighters, with real elbow bends and arms that swing against the legs.
 * The original four (Inferno pyro, Titan heavyweight, Necro mage, Shroud stalker) must not change at all.
 */
const BONES = { spine: 0.5, neck: 0.08, headRadius: 0.145, upperArm: 0.3, foreArm: 0.28, thigh: 0.44, shin: 0.44 };
const deg = (r: number) => Math.abs((r * 180) / Math.PI);

function elbowRange(style: IdleStyle, gait: typeof walkPose) {
  let min = 999;
  let max = 0;
  for (let i = 0; i < 48; i++) {
    const p = gait(i / 48, BONES, style);
    for (const arm of [p.armFront, p.armBack]) {
      const b = deg(arm.bend > Math.PI ? arm.bend - Math.PI * 2 : arm.bend);
      min = Math.min(min, b);
      max = Math.max(max, b);
    }
  }
  return { min, max };
}

describe('natural walks (W1)', () => {
  // Prismor crystal, Chronos temporal, Reson sonic, Geargrind mechanic, Kenshiro samurai, Vexoris karate, Psion psychic, Aerion aerial.
  for (const style of ['crystal', 'temporal', 'sonic', 'mechanic', 'samurai', 'karate', 'psychic', 'aerial'] as const) {
    it(`${style}: the elbows stay bent (25-105 degrees) all through the walk`, () => {
      const { min, max } = elbowRange(style, walkPose);
      expect(min, `${style} min`).toBeGreaterThanOrEqual(25);
      expect(max, `${style} max`).toBeLessThanOrEqual(105);
    });
    it(`${style}: the run keeps real elbow bends too`, () => {
      const { min } = elbowRange(style, runPose);
      expect(min, `${style} run min`).toBeGreaterThanOrEqual(25);
    });
  }

  it('the original four fighters walk and run exactly as before', () => {
    const expected: Record<string, number> = {
      pyro: 118.370287,
      // Owner, 26/11/2026: Titan and Bohemeth walk and run with a subtle knee bend, so this one sum changed (was 209.011198).
      heavyweight: 204.992097,
      mage: 118.370287,
      stalker: -47.595753,
    };
    for (const [style, want] of Object.entries(expected)) {
      let sum = 0;
      for (let i = 0; i < 40; i++) {
        for (const f of [walkPose, runPose]) {
          const p = f(i / 40, BONES, style as IdleStyle);
          for (const l of [p.armFront, p.armBack, p.legFront, p.legBack]) sum += l.root * 1.3 + l.bend * 1.7;
          sum += p.lean * 0.9 + p.head * 0.7;
        }
      }
      expect(sum, style).toBeCloseTo(want, 4);
    }
  });
});
