import { beforeAll, describe, expect, it } from 'vitest';
import { addEngineCheckColliders } from '../../../src/arenas/engine-check-colliders';
import { ENGINE_CHECK } from '../../../src/data/arenas/engine-check';
import { initPhysics, PhysicsWorld } from '../../../src/physics/physics-world';

const STEP = 1 / 60;

describe('PhysicsWorld (Rapier 2D, top-down, TD-021)', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('initialises once even when called repeatedly', async () => {
    await expect(Promise.all([initPhysics(), initPhysics()])).resolves.toBeDefined();
  });

  it('has no gravity in the top-down plane: a resting box stays put', () => {
    const physics = new PhysicsWorld();
    const box = physics.addDynamicBox({ halfExtents: { x: 0.5, y: 0.5 }, position: { x: 2, y: 2 } });
    for (let i = 0; i < 120; i++) physics.step(STEP);
    expect(box.translation().x).toBeCloseTo(2, 6);
    expect(box.translation().y).toBeCloseTo(2, 6);
    physics.dispose();
  });

  it('slides the engine-check crate, bounces it off walls and brings it to rest inside the arena', () => {
    const physics = new PhysicsWorld();
    const { crate } = addEngineCheckColliders(physics);
    const { arenaWidthM: w, arenaHeightM: h, crateHalfSizeM: c, crateStart } = ENGINE_CHECK;
    // The crate's centre can never get closer to a wall than its half size.
    // Contact solving allows a few centimetres of momentary overlap on impact;
    // tunnelling would put the centre far beyond this.
    const tolerance = 0.05;
    let bounces = 0;
    let prev = crate.linvel();

    for (let i = 0; i < 60 * 12; i++) {
      physics.step(STEP);
      const p = crate.translation();
      expect(p.x).toBeGreaterThanOrEqual(c - tolerance); // never tunnels through a wall
      expect(p.x).toBeLessThanOrEqual(w - c + tolerance);
      expect(p.y).toBeGreaterThanOrEqual(c - tolerance);
      expect(p.y).toBeLessThanOrEqual(h - c + tolerance);
      const v = crate.linvel();
      if (Math.sign(v.x) !== Math.sign(prev.x) && Math.abs(prev.x) > 0.5) bounces++;
      if (Math.sign(v.y) !== Math.sign(prev.y) && Math.abs(prev.y) > 0.5) bounces++;
      prev = v;
    }

    const end = crate.translation();
    expect(bounces).toBeGreaterThanOrEqual(2); // hits both a side wall and a top/bottom wall
    expect(Math.hypot(end.x - crateStart.x, end.y - crateStart.y)).toBeGreaterThan(1);
    expect(Math.hypot(crate.linvel().x, crate.linvel().y)).toBeLessThan(0.05);
    physics.dispose();
  });
});
