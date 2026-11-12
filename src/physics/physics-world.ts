import type * as RapierModule from '@dimforge/rapier2d';

type Rapier = typeof RapierModule;

/**
 * 2D top-down physics (TD-021). The arena is seen from above, so there is no
 * gravity in the plane: fighters move freely up/down/left/right (front/back/
 * left/right) like Creature Clash. Units are metres and seconds.
 * Axes match the screen: +x = right, +y = down (towards the viewer's side).
 */

/**
 * Collision groups (Rapier packs membership << 16 | filter). Two colliders
 * touch only if each one's membership is in the other's filter.
 * Door splinters hit walls and each other but never block fighters.
 */
/**
 * Collision groups. WORLD = walls and doors; FURNITURE = arena props (desks, chairs…), separate so a
 * thrown object can fly OVER low furniture while still hitting walls (Phase 7).
 */
export const GROUP = { WORLD: 0x1, FIGHTER: 0x2, DEBRIS: 0x4, FURNITURE: 0x8 } as const;
const groups = (member: number, filter: number): number => (member << 16) | filter;

let RAPIER: Rapier | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Load Rapier's WASM module once; safe to call repeatedly. The engine is a
 * separate .wasm file fetched on demand (TD-023), so the page can render
 * before physics finishes downloading.
 */
export function initPhysics(): Promise<void> {
  initPromise ??= import('@dimforge/rapier2d').then((module) => {
    RAPIER = module;
  });
  return initPromise;
}

function rapier(): Rapier {
  if (!RAPIER) throw new Error('Physics used before initPhysics() resolved');
  return RAPIER;
}

export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export interface BoxSpec {
  /** Half extents in metres. */
  readonly halfExtents: Vec2;
  readonly position: Vec2;
  /** Turned about its centre (angled walls and doors). */
  readonly angleRad?: number;
}

export interface DynamicBoxSpec extends BoxSpec {
  /** Initial velocity in m/s. */
  readonly velocity?: Vec2;
  /** Ground friction stand-in for top-down sliding (higher = stops sooner). */
  readonly linearDamping?: number;
  readonly angularDamping?: number;
  /** Bounciness against walls, 0..1. */
  readonly restitution?: number;
  /** Sliding friction against walls and other bodies (Rapier default 0.5). */
  readonly friction?: number;
}

/** Thin wrapper around a Rapier 2D world. Owned by the Physics specialist. */
export class PhysicsWorld {
  readonly world: RapierModule.World;

  constructor() {
    this.world = new (rapier().World)({ x: 0, y: 0 });
  }

  /** A static, immovable box (walls, furniture). */
  addStaticBox(spec: BoxSpec): RapierModule.Collider {
    const RAPIER = rapier();
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed()
        .setTranslation(spec.position.x, spec.position.y)
        .setRotation(spec.angleRad ?? 0),
    );
    return this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(spec.halfExtents.x, spec.halfExtents.y).setCollisionGroups(
        groups(GROUP.WORLD, 0xffff),
      ),
      body,
    );
  }

  /** Remove a static collider and its body (e.g. a door that has broken). */
  removeStatic(collider: RapierModule.Collider): void {
    const body = collider.parent();
    this.world.removeCollider(collider, true);
    if (body) this.world.removeRigidBody(body);
  }

  /** A small flying piece (door splinter): collides with walls and other debris only. */
  addDebris(spec: {
    position: Vec2;
    halfExtents: Vec2;
    velocity: Vec2;
    spin: number;
    massKg: number;
  }): RapierModule.RigidBody {
    const RAPIER = rapier();
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(spec.position.x, spec.position.y)
        .setLinvel(spec.velocity.x, spec.velocity.y)
        .setAngvel(spec.spin)
        .setLinearDamping(2.2)
        .setAngularDamping(2.5)
        .setCcdEnabled(true),
    );
    const area = spec.halfExtents.x * spec.halfExtents.y * 4;
    this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(spec.halfExtents.x, spec.halfExtents.y)
        .setDensity(spec.massKg / area)
        .setRestitution(0.3)
        .setFriction(0.4)
        .setCollisionGroups(groups(GROUP.DEBRIS, GROUP.WORLD | GROUP.DEBRIS | GROUP.FURNITURE)),
      body,
    );
    return body;
  }

  /** A dynamic box that slides, spins and bounces off walls. */
  addDynamicBox(spec: DynamicBoxSpec): RapierModule.RigidBody {
    const RAPIER = rapier();
    const desc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(spec.position.x, spec.position.y)
      .setLinearDamping(spec.linearDamping ?? 0)
      .setAngularDamping(spec.angularDamping ?? 0)
      // Fast objects must not tunnel through thin walls.
      .setCcdEnabled(true);
    if (spec.velocity) desc.setLinvel(spec.velocity.x, spec.velocity.y);
    const body = this.world.createRigidBody(desc);
    this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(spec.halfExtents.x, spec.halfExtents.y)
        .setRestitution(spec.restitution ?? 0)
        .setFriction(spec.friction ?? 0.5),
      body,
    );
    return body;
  }

  /**
   * An arena prop (desk, chair, cabinet). It starts planted (fixed) so walking
   * into it does not shove it; a blow wakes it with `setPropAwake` so it slides,
   * spins and collides by its mass, and it is planted again once it settles.
   */
  addPropBody(spec: { position: Vec2; halfExtents: Vec2; massKg: number }): RapierModule.RigidBody {
    const RAPIER = rapier();
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed()
        .setTranslation(spec.position.x, spec.position.y)
        .setLinearDamping(4.5) // floor friction stand-in: shoved furniture slides a short way
        .setAngularDamping(5)
        .setCcdEnabled(true),
    );
    const area = spec.halfExtents.x * spec.halfExtents.y * 4;
    this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(spec.halfExtents.x, spec.halfExtents.y)
        .setDensity(spec.massKg / area)
        .setFriction(0.4)
        .setRestitution(0.15)
        .setCollisionGroups(groups(GROUP.FURNITURE, 0xffff)),
      body,
    );
    return body;
  }

  /**
   * A thrown object high in the air passes over furniture (it still hits walls and doors);
   * once it comes down low it collides with furniture again.
   */
  setFlyingHigh(body: RapierModule.RigidBody, high: boolean): void {
    const filter = GROUP.WORLD | GROUP.DEBRIS | (high ? 0 : GROUP.FURNITURE);
    for (let i = 0; i < body.numColliders(); i++) body.collider(i).setCollisionGroups(groups(GROUP.DEBRIS, filter));
  }

  /** Wake a planted prop (it becomes dynamic) or plant it again (fixed). */
  /**
   * A fighter up in the air or standing on furniture (owner, 12/11/2026) no longer bumps into
   * furniture: the scene keeps it out of anything taller than its feet itself.
   */
  setOverFurniture(body: RapierModule.RigidBody, over: boolean): void {
    const filter = GROUP.WORLD | GROUP.FIGHTER | (over ? 0 : GROUP.FURNITURE);
    for (let i = 0; i < body.numColliders(); i++) body.collider(i).setCollisionGroups(groups(GROUP.FIGHTER, filter));
  }

  setPropAwake(body: RapierModule.RigidBody, awake: boolean): void {
    const RAPIER = rapier();
    body.setBodyType(awake ? RAPIER.RigidBodyType.Dynamic : RAPIER.RigidBodyType.Fixed, true);
  }

  /** Remove any body and its colliders (a broken prop, expired debris). */
  removeBody(body: RapierModule.RigidBody): void {
    this.world.removeRigidBody(body);
  }

  /**
   * First wall, door or furniture collider along a segment (fighters and debris
   * are ignored): the fraction 0..1 along it and the body hit, or null if clear.
   */
  castWorldRay(
    from: Vec2,
    to: Vec2,
    /** False: only walls and doors stop it (a throw flies over furniture). */
    furniture = true,
  ): { fraction: number; body: RapierModule.RigidBody | null } | null {
    const RAPIER = rapier();
    const ray = new RAPIER.Ray(from, { x: to.x - from.x, y: to.y - from.y });
    const filter = GROUP.WORLD | (furniture ? GROUP.FURNITURE : 0);
    const hit = this.world.castRay(ray, 1, true, undefined, groups(0xffff, filter));
    if (!hit) return null;
    return { fraction: hit.timeOfImpact, body: hit.collider.parent() };
  }

  /**
   * True if a circle of `radiusM` at `at` overlaps no wall, door or furniture (somewhere a summoned
   * minion can stand, owner 12/11/2026).
   */
  isFree(at: Vec2, radiusM: number): boolean {
    const RAPIER = rapier();
    const hit = this.world.intersectionWithShape(
      at,
      0,
      new RAPIER.Ball(radiusM),
      undefined,
      groups(0xffff, GROUP.WORLD | GROUP.FURNITURE),
    );
    return hit === null || hit === undefined;
  }

  /** Advance the simulation by one fixed step. */
  step(stepS: number): void {
    this.world.timestep = stepS;
    this.world.step();
  }

  /**
   * A fighter body (TD-026): dynamic, rotation-locked circle on the floor,
   * moved by setting its velocity each step so Rapier resolves walls,
   * sliding and (later) knockback and shoves. Frictionless so it glides along walls.
   */
  addCharacterBody(spec: { position: Vec2; radiusM: number; massKg: number }): RapierModule.RigidBody {
    const RAPIER = rapier();
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(spec.position.x, spec.position.y)
        .lockRotations()
        .setCcdEnabled(true),
    );
    const area = Math.PI * spec.radiusM * spec.radiusM;
    this.world.createCollider(
      RAPIER.ColliderDesc.ball(spec.radiusM)
        .setDensity(spec.massKg / area)
        .setFriction(0)
        .setRestitution(0)
        .setCollisionGroups(groups(GROUP.FIGHTER, GROUP.WORLD | GROUP.FIGHTER | GROUP.FURNITURE)),
      body,
    );
    return body;
  }

  /** Number of colliders in the world (debug overlay, leak checks). */
  get colliderCount(): number {
    let n = 0;
    this.world.forEachCollider(() => {
      n++;
    });
    return n;
  }

  /** Collider outlines as line segments [x1, y1, x2, y2, ...] in metres, for the debug overlay. */
  debugLines(): Float32Array {
    return this.world.debugRender().vertices;
  }

  dispose(): void {
    this.world.free();
  }
}
