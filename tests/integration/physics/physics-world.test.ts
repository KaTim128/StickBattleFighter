import { beforeAll, describe, expect, it } from 'vitest';
import { initPhysics, PhysicsWorld } from '../../../src/physics/physics-world';
import { ENGINE_CHECK } from '../../../src/rendering/engine-check-scene';

describe('PhysicsWorld (Rapier, TD-005)', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('initialises once even when called repeatedly', async () => {
    await expect(Promise.all([initPhysics(), initPhysics()])).resolves.toBeDefined();
  });

  it('drops the engine-check crate onto the floor where it comes to rest', () => {
    const physics = new PhysicsWorld();
    const { floorHalfSizeM, floorThicknessM, crateHalfSizeM, crateStart } = ENGINE_CHECK;
    physics.addStaticBox({
      halfExtents: { x: floorHalfSizeM, y: floorThicknessM / 2, z: floorHalfSizeM },
      position: { x: 0, y: -floorThicknessM / 2, z: 0 },
    });
    const crate = physics.addDynamicBox({
      halfExtents: { x: crateHalfSizeM, y: crateHalfSizeM, z: crateHalfSizeM },
      position: crateStart,
    });

    physics.step(1 / 60);
    expect(crate.translation().y).toBeLessThan(crateStart.y); // gravity acts

    for (let i = 0; i < 300; i++) physics.step(1 / 60); // 5 simulated seconds
    // Resting on the floor (top at y = 0): centre at half its height, no tunnelling.
    expect(crate.translation().y).toBeCloseTo(crateHalfSizeM, 1);
    expect(Math.abs(crate.linvel().y)).toBeLessThan(0.05);
    physics.dispose();
  });
});
