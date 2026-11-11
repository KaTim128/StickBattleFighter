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
