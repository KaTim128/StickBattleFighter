import { beforeAll, describe, expect, it } from 'vitest';
import { initPhysics } from '../../../src/physics/physics-world';
import { roundRobin, summarise } from './harness';

/**
 * Master plan B17: fights must stay measurably longer than the recorded baseline. The baseline is
 * the version before Phase 1 Batch B (96 Hard AI fights: 48 per run, seeds 1 to 4, every pairing both
 * sides): median 34.9 s, mean 37.2 s, all ended in a knockout. The check uses a smaller sample
 * (four seeds, 48 fights), so its floors (15% and 10% over the baseline) sit well under the measured result (about 30%) and it also guards
 * against a fighter dominating or collapsing; the full measurement is `probe.test.ts`.
 */
const BASELINE_MEDIAN_S = 34.9;
const BASELINE_MEAN_S = 37.2;

describe('fight length (B17)', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('watched Hard AI fights last at least 15% longer than the baseline, and no fighter dominates', async () => {
    // Four seeds (48 fights), not two: any rule change reshuffles which 24 fights are drawn, and the median of 24 swings
    // by about 5 s on its own; the 48-fight sample is stable and holds the same floors (20/11/2026).
    const summary = summarise(await roundRobin(4));
    expect(summary.medianS).toBeGreaterThan(BASELINE_MEDIAN_S * 1.15);
    expect(summary.meanS).toBeGreaterThan(BASELINE_MEAN_S * 1.1);
    for (const [fighter, share] of Object.entries(summary.winShare)) {
      expect(share, `${fighter} wins ${Math.round(share * 100)}%`).toBeLessThan(0.8);
      expect(share, `${fighter} wins ${Math.round(share * 100)}%`).toBeGreaterThan(0.15);
    }
  }, 900_000);
});
