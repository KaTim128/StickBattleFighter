import { describe, expect, it } from 'vitest';
import { heartRateHz, spatialise } from '../../../src/audio/hide-seek-audio';
import { HOUSE_PLAN } from '../../../src/data/arenas/house';
import { HouseWorld } from '../../../src/modes/hide-seek/world';

describe('positional horror sound (Hide and Seek, section J)', () => {
  const world = new HouseWorld(HOUSE_PLAN);
  const me = { floor: 0 as const, x: 19, y: 16 };

  it('gets quieter with distance and louder with loudness', () => {
    const at = (x: number, loudness: number) => spatialise(world, me, { floor: 0, x, y: 16, loudness }).gain;
    expect(at(20, 0.9)).toBeGreaterThan(at(24, 0.9));
    expect(at(22, 0.9)).toBeGreaterThan(at(22, 0.3));
  });

  it('pans toward the side it comes from on the screen', () => {
    const right = spatialise(world, me, { floor: 0, x: 23, y: 12, loudness: 0.9 });
    const left = spatialise(world, me, { floor: 0, x: 15.5, y: 20, loudness: 0.9 });
    expect(right.pan).toBeGreaterThan(0.2);
    expect(left.pan).toBeLessThan(-0.2);
  });

  it('is muffled through walls, and across floors it is faint but not silent when loud', () => {
    const open = spatialise(world, me, { floor: 0, x: 22.8, y: 19.5, loudness: 0.9 });
    const behindWall = spatialise(world, me, { floor: 0, x: 18.9, y: 12, loudness: 0.9 });
    expect(behindWall.muffle).toBeGreaterThan(open.muffle);
    const above = spatialise(world, me, { floor: 1, x: 19, y: 12.5, loudness: 0.9 });
    expect(above.gain).toBeGreaterThan(0);
    expect(above.gain).toBeLessThan(open.gain);
  });

  it('a crouching step is nearly inaudible while a run is heard across the room', () => {
    const crouch = spatialise(world, me, { floor: 0, x: 22, y: 16.2, loudness: 0.12 });
    const run = spatialise(world, me, { floor: 0, x: 22, y: 16.2, loudness: 0.9 });
    expect(crouch.gain).toBe(0);
    expect(run.gain).toBeGreaterThan(0.2);
  });

  it('the heartbeat is silent when calm and quickens with tension', () => {
    expect(heartRateHz(0)).toBe(0);
    expect(heartRateHz(0.5)).toBeGreaterThan(0.9);
    expect(heartRateHz(1)).toBeGreaterThan(heartRateHz(0.5));
  });
});
