import { writeFileSync } from 'node:fs';
import { beforeAll, it } from 'vitest';
import { initPhysics } from '../../../src/physics/physics-world';
import { roundRobin, summarise } from './harness';

/** Measurement only: `BALANCE_SEEDS=6 BALANCE_OUT=/path npx vitest run tests/integration/balance/probe.test.ts`. */
const seeds = Number(process.env.BALANCE_SEEDS ?? 0);
beforeAll(async () => {
  await initPhysics();
});
it.skipIf(seeds === 0)(
  'records a fight-length measurement',
  async () => {
    const fights = await roundRobin(seeds);
    const summary = summarise(fights);
    if (process.env.BALANCE_OUT) writeFileSync(process.env.BALANCE_OUT, JSON.stringify({ summary, fights }, null, 1));
    console.log('SUMMARY', JSON.stringify(summary));
  },
  3_000_000,
);
