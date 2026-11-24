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
/** The most a fighter is pushed out of a solid in one step (never enough to cross a thin wall). */
const MAX_DEPENETRATE_M = 0.35;
/** Overlap that needs no extra depenetration passes, metres. */
const SETTLED_M = 0.02;
/** Still this deep after the passes: the fighter is wedged and is placed at the nearest spot that fits, metres. */
const WEDGED_M = 0.1;

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
  addPropBody(spec: { position: Vec2; halfExtents: Vec2; massKg: number; angleRad?: number }): RapierModule.RigidBody {
    const RAPIER = rapier();
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed()
        .setTranslation(spec.position.x, spec.position.y)
        .setRotation(spec.angleRad ?? 0)
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

  /**
   * Push a grounded fighter back out of walls and planted furniture it has sunk into (master plan
   * Phase 1 B3: fighters must never stand inside solid objects). The solver is soft: a fast dash or
   * knock, or a heavy fighter shoving another against a wall, can leave a body 0.1-0.3 m deep.
   * Moves it along the contact normal by the overlap (at most `MAX_DEPENETRATE_M` a pass, six passes, so it can
   * never be thrown through a thin wall) and drops the velocity that drives it into the surface.
   * Returns the metres moved. `overFurniture` fighters ignore furniture, as in `setOverFurniture`.
   */
  depenetrate(body: RapierModule.RigidBody, radiusM: number, overFurniture: boolean): number {
    let total = 0;
    // Up to three passes: in a corner two solids push in different directions and one pass can leave
    // part of the overlap (found by the long soak).
    // A squeeze (a fixed prop on one side, several bodies shoving on the other) can leave a few cm after
    // those three: up to three more passes run only while more than SETTLED_M is left, so ordinary
    // fights keep their exact behaviour.
    for (let pass = 0; pass < 6; pass++) {
      const at = body.translation();
      const depth = this.pushOut(at, radiusM, overFurniture);
      if (depth <= 0 || (pass >= 3 && depth <= SETTLED_M)) break;
      const moved = Math.hypot(this.push.x, this.push.y);
      const scale = moved > MAX_DEPENETRATE_M ? MAX_DEPENETRATE_M / moved : 1;
      body.setTranslation({ x: at.x + this.push.x * scale, y: at.y + this.push.y * scale }, true);
      const v = body.linvel();
      const nx = this.push.x / moved;
      const ny = this.push.y / moved;
      const into = v.x * nx + v.y * ny;
      if (into < 0) body.setLinvel({ x: v.x - into * nx, y: v.y - into * ny }, true);
      total += moved * scale;
    }
    // Wedged in a gap narrower than its body (pushes just bounce between the two sides): no push can
    // free it, so set it down at the nearest spot where it fits (found by the long soak).
    const at = body.translation();
    if (this.pushOut(at, radiusM, overFurniture) > WEDGED_M) {
      const spot = this.nearestFitting(at, radiusM, overFurniture);
      if (spot) {
        total += Math.hypot(spot.x - at.x, spot.y - at.y);
        body.setTranslation(spot, true);
        body.setLinvel({ x: 0, y: 0 }, true);
      }
    }
    return total;
  }

  /** The nearest spot within 1.5 m where a circle fits clear of walls and planted furniture, or null. */
  private nearestFitting(at: Vec2, radiusM: number, overFurniture: boolean): Vec2 | null {
    for (let ring = 1; ring <= 6; ring++) {
      const r = ring * 0.25;
      const n = 8 + ring * 4;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2;
        const spot = { x: at.x + Math.cos(a) * r, y: at.y + Math.sin(a) * r };
        if (this.pushOut(spot, radiusM, overFurniture) <= 0) return spot;
      }
    }
    return null;
  }

  /** How deep a circle at `at` sits inside walls and planted furniture, metres (0 = clear). */
  solidOverlapM(at: Vec2, radiusM: number, overFurniture = false): number {
    return this.pushOut(at, radiusM, overFurniture);
  }

  /** Reused by `pushOut` so a step allocates no vector. */
  private readonly push = { x: 0, y: 0 };

  /**
   * Sum, over every fixed solid the circle overlaps, of the shove that would free it (written to
   * `this.push`). Returns the deepest single overlap. Awake furniture is dynamic: the solver moves
   * it, so only fixed solids count here.
   */
  private pushOut(at: Vec2, radiusM: number, overFurniture: boolean): number {
    const RAPIER = rapier();
    let ball = this.depenetrateBalls.get(radiusM);
    if (!ball) {
      ball = new RAPIER.Ball(radiusM);
      this.depenetrateBalls.set(radiusM, ball);
    }
    this.push.x = 0;
    this.push.y = 0;
    let deepest = 0;
    let deepX = 0;
    let deepY = 0;
    this.world.intersectionsWithShape(
      at,
      0,
      ball,
      (collider) => {
        if (!collider.parent()?.isFixed()) return true;
        const contact = collider.contactShape(ball, at, 0, 0);
        if (!contact || contact.distance >= 0) return true;
        const depth = Math.min(-contact.distance, MAX_DEPENETRATE_M);
        this.push.x += contact.normal1.x * depth;
        this.push.y += contact.normal1.y * depth;
        if (depth > deepest) {
          deepest = depth;
          deepX = contact.normal1.x;
          deepY = contact.normal1.y;
        }
        return true;
      },
      undefined,
      groups(0xffff, GROUP.WORLD | (overFurniture ? 0 : GROUP.FURNITURE)),
    );
    // Wedged between two solids closer together than its body: their pushes point opposite ways and
    // cancel, leaving it stuck inside both (found by the long soak). Use the deepest contact alone.
    if (deepest > 0 && Math.hypot(this.push.x, this.push.y) < deepest * 0.5) {
      this.push.x = deepX * deepest;
      this.push.y = deepY * deepest;
    }
    if (Math.hypot(this.push.x, this.push.y) < 1e-4) return 0;
    return deepest;
  }

  private readonly depenetrateBalls = new Map<number, RapierModule.Ball>();

  private frozenBodies: { body: RapierModule.RigidBody; lin: Vec2; ang: number }[] = [];

  /**
   * Time Stop: every moving body except `keep` is made immovable where it stands (it still blocks everything that is not
   * frozen) and its velocity is remembered. Nothing is lost: `thaw` puts every body back exactly as it was.
   */
  freeze(keep: readonly RapierModule.RigidBody[]): void {
    if (this.frozenBodies.length > 0) return;
    const type = rapier().RigidBodyType;
    this.world.forEachRigidBody((b) => {
      if (keep.includes(b) || b.bodyType() !== type.Dynamic) return;
      this.frozenBodies.push({ body: b, lin: { ...b.linvel() }, ang: b.angvel() });
      b.setLinvel({ x: 0, y: 0 }, true);
      b.setAngvel(0, true);
      b.setBodyType(type.Fixed, true);
    });
  }

  /** Time resumes: the frozen bodies move again with the velocity they had. */
  thaw(): void {
    const type = rapier().RigidBodyType;
    for (const f of this.frozenBodies.splice(0, this.frozenBodies.length)) {
      f.body.setBodyType(type.Dynamic, true);
      f.body.setLinvel(f.lin, true);
      f.body.setAngvel(f.ang, true);
    }
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
