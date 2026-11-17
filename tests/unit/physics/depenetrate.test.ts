import { beforeAll, describe, expect, it } from 'vitest';
import { initPhysics, PhysicsWorld } from '../../../src/physics/physics-world';

const R = 0.32;

/** Rapier builds its query structures on the first step, as it always has in the game before a fighter moves. */
const settle = (w: PhysicsWorld): void => w.step(1 / 60);

describe('depenetrate: fighters never stay inside walls or planted furniture (B3)', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('pushes a fighter sunk into a wall straight back out and drops the velocity into it', () => {
    const w = new PhysicsWorld();
    w.addStaticBox({ position: { x: 3, y: 0 }, halfExtents: { x: 0.2, y: 2 } });
    settle(w);
    const body = w.addCharacterBody({ position: { x: 2.9, y: 0 }, radiusM: R, massKg: 70 }); // 0.42 m deep
    body.setLinvel({ x: 8, y: 1 }, true);
    expect(w.solidOverlapM(body.translation(), R)).toBeGreaterThan(0.2);
    w.depenetrate(body, R, false);
    expect(body.translation().x).toBeLessThan(2.9); // moved back toward the open side
    expect(body.linvel().x).toBeLessThanOrEqual(1e-6); // no more driving into the wall
    expect(body.linvel().y).toBeCloseTo(1, 5); // sliding along it is kept
    for (let i = 0; i < 3; i++) w.depenetrate(body, R, false);
    expect(w.solidOverlapM(body.translation(), R)).toBeLessThan(0.01);
    w.dispose();
  });

  it('frees a fighter whose centre is inside a thin planted desk', () => {
    const w = new PhysicsWorld();
    w.addPropBody({ position: { x: 0, y: 0 }, halfExtents: { x: 0.6, y: 0.3 }, massKg: 30 });
    settle(w);
    const body = w.addCharacterBody({ position: { x: 0.1, y: 0.1 }, radiusM: R, massKg: 70 });
    for (let i = 0; i < 4; i++) w.depenetrate(body, R, false);
    expect(w.solidOverlapM(body.translation(), R)).toBeLessThan(0.01);
    w.dispose();
  });

  it('never moves a body further than the per-step cap, so it cannot be thrown through a thin wall', () => {
    const w = new PhysicsWorld();
    w.addStaticBox({ position: { x: 0, y: 0 }, halfExtents: { x: 0.05, y: 2 } });
    settle(w);
    const body = w.addCharacterBody({ position: { x: 0.02, y: 0 }, radiusM: R, massKg: 70 });
    const moved = w.depenetrate(body, R, false);
    expect(moved).toBeLessThanOrEqual(0.35 + 1e-6);
    w.dispose();
  });

  it('a fighter over furniture ignores it but is still kept out of walls', () => {
    const w = new PhysicsWorld();
    w.addPropBody({ position: { x: 0, y: 0 }, halfExtents: { x: 0.6, y: 0.6 }, massKg: 30 });
    w.addStaticBox({ position: { x: 5, y: 0 }, halfExtents: { x: 0.1, y: 2 } });
    settle(w);
    const over = w.addCharacterBody({ position: { x: 0.1, y: 0 }, radiusM: R, massKg: 70 });
    expect(w.depenetrate(over, R, true)).toBe(0); // standing over the desk: nothing to correct
    const wall = w.addCharacterBody({ position: { x: 4.9, y: 0 }, radiusM: R, massKg: 70 });
    expect(w.depenetrate(wall, R, true)).toBeGreaterThan(0);
    w.dispose();
  });

  it('leaves furniture the solver is moving (awake, dynamic) to the solver', () => {
    const w = new PhysicsWorld();
    const prop = w.addPropBody({ position: { x: 0, y: 0 }, halfExtents: { x: 0.6, y: 0.3 }, massKg: 30 });
    w.setPropAwake(prop, true);
    settle(w);
    const body = w.addCharacterBody({ position: { x: 0.1, y: 0.1 }, radiusM: R, massKg: 70 });
    expect(w.depenetrate(body, R, false)).toBe(0);
    w.dispose();
  });
});
