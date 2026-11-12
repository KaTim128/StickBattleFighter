import { describe, expect, it } from 'vitest';
import { type AbilityPayload, falloffFactor, payloadAt } from '../../../src/abilities/ability-def';
import { type AbilityHost, AbilityWorld, type Vec2 } from '../../../src/abilities/ability-world';
import { INFERNO_KIT } from '../../../src/data/abilities/inferno';

describe('distance-based damage (owner, 11/11/2026: Fire Beam and Eruption)', () => {
  const falloff = { fullWithinM: 1, minFactor: 0.45 };

  it('is full up close, eases down steadily, and never drops below the floor at the edge', () => {
    expect(falloffFactor(0, falloff, 4)).toBe(1);
    expect(falloffFactor(1, falloff, 4)).toBe(1);
    expect(falloffFactor(2.5, falloff, 4)).toBeCloseTo(0.725, 6); // halfway: halfway down
    expect(falloffFactor(4, falloff, 4)).toBeCloseTo(0.45, 6);
    expect(falloffFactor(9, falloff, 4)).toBeCloseTo(0.45, 6); // clamped past the reach
    let prev = 2;
    for (let d = 0; d <= 4; d += 0.25) {
      const k = falloffFactor(d, falloff, 4);
      expect(k).toBeLessThanOrEqual(prev); // never rises with distance
      prev = k;
    }
    expect(falloffFactor(3, undefined, 4)).toBe(1); // abilities without a falloff are unchanged
  });

  it('scales damage and (less) knockback; point-blank never exceeds the listed damage', () => {
    const p: AbilityPayload = { damage: 300, knockbackMps: 10, heavy: true, strength: 900, falloff };
    expect(payloadAt(p, 0.2, 3.2).damage).toBe(300);
    expect(payloadAt(p, 3.2, 3.2).damage).toBe(135);
    expect(payloadAt(p, 3.2, 3.2).knockbackMps).toBeCloseTo(7.25, 6);
  });

  it("Inferno's numbers: Eruption 300 at the centre to 135 at the edge; Fire Beam about 135 close, 60 far", () => {
    const ult = INFERNO_KIT.ult;
    const beam = INFERNO_KIT.a3;
    expect(ult.delivery.type === 'leap' && ult.delivery.radiusM).toBe(3.2);
    expect(payloadAt(ult.payload, 0.5, 3.2).damage).toBe(300);
    expect(payloadAt(ult.payload, 3.2, 3.2).damage).toBe(135);
    if (beam.delivery.type !== 'beam') throw new Error('Fire Beam is a beam');
    const ticks = Math.floor(beam.delivery.durationS / beam.delivery.tickS) + 1;
    expect(ticks * payloadAt(beam.payload, 1, beam.delivery.rangeM).damage).toBeGreaterThanOrEqual(130);
    expect(ticks * payloadAt(beam.payload, beam.delivery.rangeM, beam.delivery.rangeM).damage).toBeLessThanOrEqual(70);
  });
});

describe('beam delivery', () => {
  /** A caster at the origin aiming +x, a target on the line, and an optional wall at x = wallX. */
  function host(targetX: number, wallX: number | null) {
    const hits: { damage: number }[] = [];
    const h: AbilityHost = {
      fighters: () => [
        { id: 'me', x: 0, y: 0, radiusM: 0.3, hittable: true },
        { id: 'target', x: targetX, y: 0, radiusM: 0.3, hittable: true },
      ],
      hitFighter: (_c, _t, payload) => {
        hits.push({ damage: payload.damage });
        return true;
      },
      hitEnvironment: () => {},
      blocked: (from: Vec2, to: Vec2) =>
        wallX !== null && to.x > wallX && from.x < wallX ? (wallX - from.x) / (to.x - from.x) : null,
      position: () => ({ x: 0, y: 0 }),
      drive: () => {},
      burnFighter: () => {},
      buff: () => {},
      emit: () => {},
    };
    return { h, hits };
  }

  it('ticks for its whole duration, then ends', () => {
    const { h, hits } = host(3, null);
    const w = new AbilityWorld();
    w.release('me', INFERNO_KIT.a3, { x: 5, y: 0 }, h);
    for (let i = 0; i < 120; i++) w.update(1 / 60, h);
    expect(hits.length).toBeGreaterThanOrEqual(9);
    expect(w.beams).toHaveLength(0);
  });

  it('steers (owner, 12/11/2026): turns toward where the caster steers it, no faster than its turn rate, and the caster turns with it', () => {
    const { h } = host(3, null);
    const d = INFERNO_KIT.a3.delivery;
    if (d.type !== 'beam' || !d.turnRadPerS) throw new Error('Fire Beam steers');
    let want: Vec2 | null = { x: 0, y: 1 }; // steer straight "down" (a quarter turn)
    const faced: Vec2[] = [];
    const steering: AbilityHost = { ...h, steer: () => want, face: (_id, dir) => faced.push({ ...dir }) };
    const w = new AbilityWorld();
    w.release('me', INFERNO_KIT.a3, { x: 5, y: 0 }, steering);
    for (let i = 0; i < 6; i++) w.update(1 / 60, steering);
    const turned = Math.atan2(w.beams[0]!.dir.y, w.beams[0]!.dir.x);
    expect(turned).toBeGreaterThan(0); // turning toward the steer
    expect(turned).toBeLessThanOrEqual(d.turnRadPerS * (6 / 60) + 1e-6); // but not snapping
    for (let i = 0; i < 40; i++) w.update(1 / 60, steering);
    expect(w.beams[0]!.dir.y).toBeCloseTo(1, 3); // got there
    expect(w.beams[0]!.to.y).toBeGreaterThan(5); // the beam itself now pours that way
    expect(faced.at(-1)!.y).toBeCloseTo(1, 3); // the caster faces along it
    want = null; // let go: it holds where it is
    w.update(1 / 60, steering);
    expect(w.beams[0]!.dir.y).toBeCloseTo(1, 3);
  });

  it('is stopped by a wall: nobody behind it is hit', () => {
    const { h, hits } = host(4, 2);
    const w = new AbilityWorld();
    w.release('me', INFERNO_KIT.a3, { x: 5, y: 0 }, h);
    w.update(1 / 60, h);
    expect(w.beams[0]!.to.x).toBeCloseTo(2, 6);
    for (let i = 0; i < 120; i++) w.update(1 / 60, h);
    expect(hits).toHaveLength(0);
  });
});

describe('Fire Beam damage build-up (owner, 12/11/2026)', () => {
  it('no build-up before 0.6 s of contact, a clear jump at 0.6 s, growing after, capped', async () => {
    const { beamRampFactor } = await import('../../../src/abilities/ability-def');
    const ramp = { afterS: 0.6, startFactor: 1.4, perS: 0.6, maxFactor: 2 };
    expect(beamRampFactor(ramp, 0)).toBe(1);
    expect(beamRampFactor(ramp, 0.59)).toBe(1);
    expect(beamRampFactor(ramp, 0.6)).toBeCloseTo(1.4);
    expect(beamRampFactor(ramp, 1.1)).toBeGreaterThan(beamRampFactor(ramp, 0.8));
    expect(beamRampFactor(ramp, 9)).toBe(2);
  });

  it('in the beam: later ticks on the same fighter hit harder; breaking contact resets it', () => {
    const w = new AbilityWorld();
    const hits: number[] = [];
    let inBeam = true;
    const h: AbilityHost = {
      fighters: () => [
        { id: 'me', x: 0, y: 0, radiusM: 0.3, hittable: true },
        { id: 'them', x: 3, y: inBeam ? 0 : 3, radiusM: 0.3, hittable: true },
      ],
      hitFighter: (_c, _t, p) => {
        hits.push(p.damage);
        return true;
      },
      hitEnvironment: () => {},
      blocked: () => null,
      position: () => ({ x: 0, y: 0 }),
      drive: () => {},
      burnFighter: () => {},
      buff: () => {},
      emit: () => {},
    };
    w.release('me', INFERNO_KIT.a3, { x: 5, y: 0 }, h);
    for (let i = 0; i < 60; i++) w.update(1 / 60, h); // 1 s of beam
    expect(hits.length).toBeGreaterThan(5);
    expect(hits[hits.length - 1]!).toBeGreaterThan(hits[0]! * 1.3); // built up
    // Out of the beam for a while, then back in: the build-up starts again.
    inBeam = false;
    for (let i = 0; i < 12; i++) w.update(1 / 60, h);
    const before = hits.length;
    inBeam = true;
    for (let i = 0; i < 12; i++) w.update(1 / 60, h);
    expect(hits.length).toBeGreaterThan(before);
    expect(hits[hits.length - 1]!).toBe(hits[0]!);
  });
});
