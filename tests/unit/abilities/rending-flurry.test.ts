import { describe, expect, it } from 'vitest';
import { ABILITY_KITS } from '../../../src/abilities/kits';
import { assaultPose } from '../../../src/animation/ability-poses';
import { hasSound } from '../../../src/audio/sound-board';

const kit = ABILITY_KITS['shroud-kit']!;
const flurry = kit.a4;
const deg = (r: number) => (r * 180) / Math.PI;
const base = {
  lean: 0,
  head: 0,
  armFront: { root: 0, bend: 0 },
  armBack: { root: 0, bend: 0 },
  legFront: { root: 0, bend: 0 },
  legBack: { root: 0, bend: 0 },
  liftM: 0,
} as never;

/** Rending Flurry (owner, 20/11/2026): three red slashes, the last an upward sweep. */
describe('Rending Flurry', () => {
  it('is three real slashes, the last one harder, each with its own sound', () => {
    const d = flurry.delivery;
    expect(d.type).toBe('assault');
    if (d.type !== 'assault') return;
    expect(d.stabs).toBe(3);
    expect(d.finalFactor).toBeGreaterThan(1.3);
    expect(d.stabSfx).toHaveLength(3);
    expect(new Set(d.stabSfx).size).toBe(3);
    for (const id of d.stabSfx ?? []) expect(hasSound(id), id).toBe(true);
    expect(hasSound(flurry.sfx.release)).toBe(true);
    // Fast: a slash every 0.15 s or quicker, all three inside about half a second.
    expect(d.stabIntervalS).toBeLessThanOrEqual(0.16);
    // The total is a little under the old single strike's 118 (three hits land more reliably).
    const total = flurry.payload.damage * (2 + d.finalFactor!);
    expect(total).toBeGreaterThan(95);
    expect(total).toBeLessThan(118);
    expect(flurry.payload.bleed).toBe(true);
  });

  it('draws a red ribbon behind the knife', () => {
    expect(flurry.look?.slash).toBeDefined();
    expect(flurry.look?.slash?.colour).toBeGreaterThan(0xa00000); // red
  });

  it('the last slash sweeps the knife arm from low up past the shoulder; the first two cut across', () => {
    const at = (stab: number, t: number) => assaultPose(base, { phase: 'stab', stab, t }, 'rendingFlurry');
    // Arm angle is degrees from hanging straight down; forward and up is bigger.
    const start3 = deg(at(2, 0).armFront.root);
    const end3 = deg(at(2, 1).armFront.root);
    expect(start3).toBeLessThan(60); // begins low, by the hip
    expect(end3).toBeGreaterThan(150); // ends high, above the shoulder
    for (const stab of [0, 1]) {
      const a = deg(at(stab, 0).armFront.root);
      const b = deg(at(stab, 1).armFront.root);
      expect(Math.abs(b - a), `slash ${stab + 1} sweeps`).toBeGreaterThan(50);
    }
  });

  it('flows: each slash starts near where the one before ended, with no jump between them', () => {
    const at = (stab: number, t: number) => assaultPose(base, { phase: 'stab', stab, t }, 'rendingFlurry');
    for (const stab of [1, 2]) {
      const endPrev = deg(at(stab - 1, 1).armFront.root);
      const startNext = deg(at(stab, 0).armFront.root);
      // Starting where the last one ended, bent part-way to its own wind-up.
      expect(Math.abs(startNext - endPrev)).toBeLessThan(75);
    }
  });

  it('every slash pose changes smoothly through its snap (no frame-to-frame jump)', () => {
    for (let stab = 0; stab < 3; stab++) {
      let prev = deg(assaultPose(base, { phase: 'stab', stab, t: 0 }, 'rendingFlurry').armFront.root);
      for (let i = 1; i <= 30; i++) {
        const cur = deg(assaultPose(base, { phase: 'stab', stab, t: i / 30 }, 'rendingFlurry').armFront.root);
        expect(Math.abs(cur - prev), `slash ${stab + 1} step ${i}`).toBeLessThan(40);
        prev = cur;
      }
    }
  });
});
