import { describe, expect, it } from 'vitest';
import { COYOTE_S, canStartJump, type HopState, isAirborne, stepHop } from '../../../src/physics/movement';

const TUNING = { jumpSpeedMps: 6.5, hopGravityMps2: 20 };
const DT = 1 / 60;

/** Just stepped off a 0.75 m furniture top: the floor under the feet is now 0, the body is still up. */
const steppedOff = (): HopState => ({ heightM: 0.75, verticalSpeedMps: 0 });

describe('coyote time (master plan B11)', () => {
  it('a jump from the ground works as before', () => {
    const up = stepHop({ heightM: 0, verticalSpeedMps: 0 }, true, TUNING, DT);
    expect(up.verticalSpeedMps).toBeGreaterThan(5);
  });

  it('a jump pressed right after stepping off an edge still registers', () => {
    expect(canStartJump(steppedOff())).toBe(true);
    const up = stepHop(steppedOff(), true, TUNING, DT);
    expect(up.verticalSpeedMps).toBeGreaterThan(5);
    expect(up.heightM).toBeGreaterThan(0.75); // rose from where it stood
  });

  it(`it expires: no jump more than ${COYOTE_S} s after leaving the edge`, () => {
    let hop = steppedOff();
    for (let t = 0; t < COYOTE_S + 0.05; t += DT) hop = stepHop(hop, false, TUNING, DT);
    expect(hop.verticalSpeedMps).toBeLessThan(0); // still falling
    expect(canStartJump(hop)).toBe(false);
    const press = stepHop(hop, true, TUNING, DT);
    expect(press.verticalSpeedMps).toBeLessThan(0); // the press did nothing
  });

  it('inside the window it works on any step, then stops', () => {
    let hop = steppedOff();
    let lastOk = -1;
    for (let i = 0; i < 20 && hop.heightM > 0; i++) {
      if (canStartJump(hop)) lastOk = i;
      hop = stepHop(hop, false, TUNING, DT);
    }
    expect((lastOk + 1) * DT).toBeGreaterThanOrEqual(COYOTE_S - 2 * DT);
    expect((lastOk + 1) * DT).toBeLessThanOrEqual(COYOTE_S + 2 * DT);
  });

  it('no double jump: after a jump, pressing again in the air does nothing (even right after the jump)', () => {
    let hop = stepHop({ heightM: 0, verticalSpeedMps: 0 }, true, TUNING, DT);
    for (let i = 0; i < 60 && isAirborne(hop); i++) {
      expect(canStartJump(hop), `step ${i}`).toBe(false);
      const before = hop.verticalSpeedMps;
      hop = stepHop(hop, true, TUNING, DT); // mashing jump all the way up and down
      expect(hop.verticalSpeedMps).toBeLessThanOrEqual(before);
    }
  });

  it('a jump launched off an edge inside the window cannot be followed by another in the air', () => {
    let hop = stepHop(steppedOff(), true, TUNING, DT); // the coyote jump
    for (let i = 0; i < 60 && isAirborne(hop); i++) {
      expect(canStartJump(hop)).toBe(false);
      hop = stepHop(hop, true, TUNING, DT);
    }
  });

  it('no coyote jump while rising from a knock-up or at its apex (only from walking off)', () => {
    let hop: HopState = { heightM: 0.2, verticalSpeedMps: 5 }; // launched upward by something else
    for (let i = 0; i < 60 && isAirborne(hop); i++) {
      expect(canStartJump(hop), `step ${i}`).toBe(false);
      hop = stepHop(hop, true, TUNING, DT);
    }
  });

  it('landing resets everything: the next jump works', () => {
    let hop = stepHop({ heightM: 0, verticalSpeedMps: 0 }, true, TUNING, DT);
    for (let i = 0; i < 120 && (hop.heightM > 0 || hop.verticalSpeedMps > 0); i++)
      hop = stepHop(hop, false, TUNING, DT);
    expect(hop).toEqual({ heightM: 0, verticalSpeedMps: 0 });
    expect(stepHop(hop, true, TUNING, DT).verticalSpeedMps).toBeGreaterThan(5);
  });

  it('walking off a surface onto a lower one keeps its own floor: landing on it ends the window', () => {
    let hop: HopState = { heightM: 0.75, verticalSpeedMps: 0, floorM: 0.4 }; // stepped off, a lower top below
    for (let i = 0; i < 60 && (hop.heightM > 0.4 || hop.verticalSpeedMps !== 0); i++)
      hop = stepHop(hop, false, TUNING, DT);
    expect(hop.heightM).toBeCloseTo(0.4, 6);
    expect(hop.coyoteS).toBeUndefined(); // grounded again
  });
});
