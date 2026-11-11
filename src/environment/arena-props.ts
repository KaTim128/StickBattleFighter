import type { RigidBody } from '@dimforge/rapier2d';
import type { ArenaLayout } from '../data/arenas/arena-layout';
import { THROWING } from '../data/combat/throwing';
import {
  footprint,
  kindOf,
  MATERIAL_TOUGHNESS,
  type Material,
  type PropKind,
  type PropPlacement,
} from '../data/objects/props';
import type { PhysicsWorld, Vec2 } from '../physics/physics-world';
import { Debris } from './debris';

/**
 * Interactive arena props (owner request, 11/11/2026): when a fighter hits a
 * table, chair or anything else, it moves or breaks depending on its durability.
 *
 *  - Every solid floor prop has a physics body that starts **planted**, so
 *    walking into furniture never shoves it (the layout stays readable and
 *    navigation stays valid). A blow **wakes** it: it slides and spins by its
 *    mass, then settles and is planted again.
 *  - `movable: false` props (cubicle walls, bookshelves) never slide, but can break.
 *  - Each blow deals damage; at 0 durability the prop **breaks** into pieces
 *    coloured by its material. `durability: null` props never break.
 *  - Items on a desk ride along with it, and fall to the floor when it breaks.
 */
export type PropBlow = 'strike' | 'kick' | 'knockback';

export interface PropHit {
  readonly blow: PropBlow;
  /** Durability lost. */
  readonly damage: number;
  /** Impulse source: attack strength, or mass × speed for a knocked body. */
  readonly strength: number;
  /** Direction of the blow (unit vector); ignored when `origin` is set. */
  readonly direction: Vec2;
  /** An area blast: each prop is pushed straight away from this point. */
  readonly origin?: Vec2;
  /** Fire: flammable props catch alight (Inferno, spec §8.3). */
  readonly ignites?: boolean;
}

export interface PropHitResult {
  readonly hit: number;
  readonly broke: number;
}

/** Something happened to a prop this step (for sounds and particles): a hit it survived, or a break. */
export interface PropEvent {
  readonly kind: 'hit' | 'break';
  readonly material: Material;
  readonly x: number;
  readonly y: number;
  /** Height of the prop's middle, metres (items on desks sit higher). */
  readonly z: number;
  readonly dir: Vec2;
  /** Rough size of the prop, metres (bigger props make bigger bursts). */
  readonly sizeM: number;
}

export interface PropState {
  readonly index: number;
  readonly kind: string;
  readonly x: number;
  readonly y: number;
  readonly angle: number;
  readonly hp: number | null;
  readonly broken: boolean;
  readonly awake: boolean;
  readonly burning: boolean;
}

/** Push per unit of blow strength (N·s). A heavy finisher (720) sends a 12 kg chair off at ~3 m/s. */
const IMPULSE_PER_STRENGTH = 0.05;
/** A knocked-back body only damages the same prop again after this long (sliding along it is one blow). */
const REHIT_S = 0.3;
/** Planted again once slower than this for SETTLE_S. */
const SETTLE_SPEED_MPS = 0.06;
const SETTLE_S = 0.3;
/** Materials that catch fire, and how fast a burning prop loses durability. */
const FLAMMABLE: ReadonlySet<Material> = new Set(['wood', 'fabric', 'paper', 'plant']);
const BURN_DPS = 14;

/**
 * How each material breaks up (owner, 11/11/2026: "realistic destruction"):
 * wood into long splinters, metal into a few bent plates, glass into many
 * small shards, plastic into chunks, fabric into foam lumps.
 */
const BREAKUP: Record<
  Material,
  { min: number; max: number; speed: number; shape: 'rect' | 'shard'; size: (w: number, d: number, i: number) => Vec2 }
> = {
  wood: {
    min: 5,
    max: 9,
    speed: 1,
    shape: 'rect',
    size: (w, _d, i) => ({ x: Math.min(0.3, 0.12 + w / 8) * (1 + (i % 3) * 0.25), y: 0.035 }),
  },
  metal: {
    min: 3,
    max: 5,
    speed: 0.8,
    shape: 'rect',
    size: (w, d, i) => ({ x: Math.min(0.2, w / 3) * (0.8 + (i % 2) * 0.3), y: Math.min(0.14, d / 3) }),
  },
  glass: {
    min: 8,
    max: 12,
    speed: 1.3,
    shape: 'shard',
    size: (_w, _d, i) => ({ x: 0.04 + (i % 3) * 0.025, y: 0.03 + (i % 2) * 0.02 }),
  },
  plastic: {
    min: 5,
    max: 8,
    speed: 1.1,
    shape: 'rect',
    size: (w, _d, i) => ({ x: Math.min(0.12, 0.05 + w / 10) * (1 + (i % 2) * 0.4), y: 0.05 }),
  },
  ceramic: {
    min: 4,
    max: 6,
    speed: 1.2,
    shape: 'shard',
    size: (_w, _d, i) => ({ x: 0.035 + (i % 2) * 0.015, y: 0.03 }),
  },
  fabric: { min: 4, max: 7, speed: 0.8, shape: 'rect', size: (_w, _d, i) => ({ x: 0.08 + (i % 3) * 0.02, y: 0.06 }) },
  plant: { min: 5, max: 8, speed: 0.9, shape: 'shard', size: (_w, _d, i) => ({ x: 0.06 + (i % 2) * 0.03, y: 0.03 }) },
  paper: { min: 4, max: 7, speed: 0.7, shape: 'rect', size: () => ({ x: 0.07, y: 0.05 }) },
  stone: { min: 4, max: 7, speed: 0.8, shape: 'rect', size: (_w, _d, i) => ({ x: 0.09 + (i % 2) * 0.04, y: 0.07 }) },
};
const BURN_S = 5;

export const MATERIAL_COLOURS: Record<Material, number> = {
  wood: 0x9c7446,
  metal: 0x8b93a1,
  glass: 0xbfe6ff,
  plastic: 0x3a3f4a,
  plant: 0x4f8a3c,
  paper: 0xe8e2d0,
  fabric: 0x4a5a78,
  stone: 0x9aa0a8,
  ceramic: 0xf2f2f2,
};

export class ArenaProp {
  hp: number | null;
  broken = false;
  awake = false;
  /** Fell off its (broken) parent: now a loose piece on the floor. */
  looseFall: { heightM: number; vz: number } | null = null;
  /** Seconds of fire left (flammable props hit by fire). */
  burnS = 0;
  /** Carried overhead (Phase 7): where it is, and who holds it. */
  held: { x: number; y: number; heightM: number } | null = null;
  carrier: number | null = null;
  /** In flight after a throw: who threw it and which fighters it has already hit. */
  flight: { by: number; hit: Set<number> } | null = null;
  /** Currently flying above furniture height (passes over desks and chairs). */
  flyingHigh = false;
  private settleS = 0;
  private lastHitS = -Infinity;

  constructor(
    readonly index: number,
    readonly placement: PropPlacement,
    readonly kind: PropKind,
    /** Physics body for solid floor props and for items that fell loose. */
    public body: RigidBody | null,
    /** The prop this one sits on (desk items), with its offset from it at rest. */
    readonly parent: ArenaProp | null,
    readonly offset: Vec2,
  ) {
    this.hp = kind.durability;
  }

  get size(): { w: number; d: number; h: number } {
    return footprint(this.placement);
  }

  /** Current centre and rotation (riding along with the parent for desk items). */
  get pose(): { x: number; y: number; angle: number } {
    if (this.held) return { x: this.held.x, y: this.held.y, angle: 0 };
    if (this.body) {
      const p = this.body.translation();
      return { x: p.x, y: p.y, angle: this.body.rotation() };
    }
    if (this.parent && !this.parent.broken) {
      const p = this.parent.pose;
      const c = Math.cos(p.angle);
      const s = Math.sin(p.angle);
      return {
        x: p.x + this.offset.x * c - this.offset.y * s,
        y: p.y + this.offset.x * s + this.offset.y * c,
        angle: p.angle,
      };
    }
    return { x: this.placement.x, y: this.placement.y, angle: 0 };
  }

  /** Axis-aligned bounds at the current position (rotation ignored: close enough for hits). */
  get rect(): { x0: number; y0: number; x1: number; y1: number } {
    const { x, y } = this.pose;
    const { w, d } = this.size;
    return { x0: x - w / 2, y0: y - d / 2, x1: x + w / 2, y1: y + d / 2 };
  }

  /** Can be struck: a standing floor prop with a body. */
  get hittable(): boolean {
    if (this.broken || this.kind.decal || this.looseFall !== null || this.held !== null) return false;
    // Floor props with a body, and items still sitting on a standing desk (monitors, keyboards, cups).
    return this.body !== null || (this.parent !== null && !this.parent.broken);
  }

  canTakeHit(nowS: number): boolean {
    return nowS - this.lastHitS >= REHIT_S;
  }

  markHit(nowS: number): void {
    this.lastHitS = nowS;
  }

  /** Track settling; returns true when it should be planted again. */
  settle(stepS: number): boolean {
    if (!this.awake || !this.body) return false;
    const v = this.body.linvel();
    const moving = Math.hypot(v.x, v.y) > SETTLE_SPEED_MPS || Math.abs(this.body.angvel()) > 0.1;
    this.settleS = moving ? 0 : this.settleS + stepS;
    return this.settleS >= SETTLE_S;
  }

  resetSettle(): void {
    this.settleS = 0;
  }
}

export class ArenaProps {
  readonly props: ArenaProp[] = [];
  readonly debris: Debris;
  /** Hits and breaks since the last drain (presentation). */
  private readonly pending: PropEvent[] = [];
  private timeS = 0;

  constructor(
    arena: ArenaLayout,
    private readonly physics: PhysicsWorld,
  ) {
    this.debris = new Debris(physics);
    // Floor props first, so desk items can find the prop they sit on.
    const floor: ArenaProp[] = [];
    arena.props.forEach((p, index) => {
      const kind = kindOf(p.kind);
      if ((p.elevationM ?? 0) > 0 || kind.decal || !kind.solid) return;
      const f = footprint(p);
      const body = physics.addPropBody({
        position: { x: p.x, y: p.y },
        halfExtents: { x: f.w / 2, y: f.d / 2 },
        massKg: kind.massKg,
      });
      floor.push(new ArenaProp(index, p, kind, body, null, { x: 0, y: 0 }));
    });
    this.props.push(...floor);
    arena.props.forEach((p, index) => {
      if ((p.elevationM ?? 0) === 0) return;
      const parent = floor.find((q) => {
        const r = q.rect;
        return p.x >= r.x0 && p.x <= r.x1 && p.y >= r.y0 && p.y <= r.y1;
      });
      const offset = parent ? { x: p.x - parent.placement.x, y: p.y - parent.placement.y } : { x: 0, y: 0 };
      this.props.push(new ArenaProp(index, p, kindOf(p.kind), null, parent ?? null, offset));
    });
  }

  /** A strike's hit area (a capsule, tested by the caller's shape test) against every standing prop. */
  hitWhere(touches: (rect: ArenaProp['rect']) => boolean, hit: PropHit): PropHitResult {
    let n = 0;
    let broke = 0;
    for (const prop of this.props) {
      if (!prop.hittable || !touches(prop.rect)) continue;
      // Strikes land once per attack already; a sliding body touching for several steps is one blow.
      if (hit.blow === 'knockback' && !prop.canTakeHit(this.timeS)) continue;
      n++;
      if (this.applyHit(prop, hit)) broke++;
    }
    return { hit: n, broke };
  }

  update(stepS: number): void {
    this.timeS += stepS;
    for (const prop of this.props) {
      if (prop.burnS > 0 && !prop.broken) {
        prop.burnS = Math.max(0, prop.burnS - stepS);
        if (prop.hp !== null) {
          prop.hp = Math.max(0, prop.hp - BURN_DPS * stepS);
          if (prop.hp === 0) {
            prop.burnS = 0;
            this.shatter(prop, { blow: 'strike', damage: 0, strength: 150, direction: { x: 0, y: 1 } });
          }
        }
      }
      if (prop.looseFall) {
        const f = prop.looseFall;
        const high = f.heightM > THROWING.overFurnitureM;
        if (prop.body && high !== prop.flyingHigh) {
          prop.flyingHigh = high;
          this.physics.setFlyingHigh(prop.body, high);
        }
        if (f.heightM > 0 || f.vz > 0) {
          f.vz -= 18 * stepS;
          f.heightM = Math.max(0, f.heightM + f.vz * stepS);
          if (f.heightM === 0 && f.vz < 0) this.land(prop, -f.vz);
        }
        // A thrown object stops being dangerous once it has slowed down on the floor.
        if (f.heightM === 0 && prop.flight && prop.body) {
          const v = prop.body.linvel();
          if (Math.hypot(v.x, v.y) < THROWING.hitMinSpeedMps) prop.flight = null;
        }
        // Thrown or dropped furniture becomes furniture again once it has come to rest.
        if (f.heightM === 0 && !prop.flight && prop.kind.solid && prop.body && !prop.broken) {
          const v = prop.body.linvel();
          if (Math.hypot(v.x, v.y) < 0.15) this.replant(prop);
        }
      }
      if (prop.body && prop.settle(stepS) && !prop.looseFall) {
        prop.awake = false;
        this.physics.setPropAwake(prop.body, false);
      }
    }
    this.debris.update(stepS);
  }

  // ---------------- Pickup, carry and throw (Phase 7, REQ-PHY-8..10) ----------------

  /**
   * The throwable object nearest a fighter's feet within reach, in front of them (not behind),
   * or null. Standing furniture, items on desks and loose items lying on the floor all count.
   */
  pickupCandidate(
    x: number,
    y: number,
    aim: { readonly x: number; readonly y: number },
    reachM: number,
    behindM: number,
  ): ArenaProp | null {
    let best: ArenaProp | null = null;
    let bestD = Number.POSITIVE_INFINITY;
    for (const prop of this.props) {
      if (!prop.kind.throwable || prop.broken || prop.held || prop.flight || prop.kind.decal) continue;
      const loose = prop.looseFall;
      if (loose && (loose.heightM > 0 || (prop.body && Math.hypot(prop.body.linvel().x, prop.body.linvel().y) > 0.5)))
        continue;
      const r = prop.rect;
      const dx = Math.max(r.x0 - x, 0, x - r.x1);
      const dy = Math.max(r.y0 - y, 0, y - r.y1);
      const d = Math.hypot(dx, dy);
      const cx = (r.x0 + r.x1) / 2;
      const cy = (r.y0 + r.y1) / 2;
      if (d > reachM || (cx - x) * aim.x + (cy - y) * aim.y < -behindM) continue;
      if (d < bestD) {
        best = prop;
        bestD = d;
      }
    }
    return best;
  }

  /** Lift it overhead: it stops being furniture (no collider) until thrown or put down. */
  pickUp(prop: ArenaProp, carrier: number, at: { x: number; y: number; heightM: number }): void {
    if (prop.body) this.physics.removeBody(prop.body);
    prop.body = null;
    prop.awake = false;
    prop.looseFall = null;
    prop.burnS = 0;
    prop.carrier = carrier;
    prop.held = { ...at };
  }

  /** Follow the carrier. */
  carry(prop: ArenaProp, at: { x: number; y: number; heightM: number }): void {
    if (prop.held) Object.assign(prop.held, at);
  }

  /**
   * Let go of it: thrown (a flight that can hit fighters) or put down (`velocity` near zero).
   * It flies as a physical body that bounces off walls and furniture, under a height arc.
   */
  release(prop: ArenaProp, velocity: Vec2, heightM: number, upMps: number, thrown: boolean): void {
    const from = prop.held;
    if (!from) return;
    const { w, d } = prop.size;
    prop.held = null;
    prop.body = this.physics.addDebris({
      position: { x: from.x, y: from.y },
      halfExtents: { x: Math.max(0.05, w / 2), y: Math.max(0.05, d / 2) },
      velocity,
      spin: thrown ? (prop.index % 2 ? 1 : -1) * 7 : 0,
      massKg: Math.max(0.1, prop.kind.massKg),
    });
    // Thrown things travel far: less floor drag while airborne (restored once it lands).
    if (thrown) prop.body.setLinearDamping(0.15);
    prop.looseFall = { heightM, vz: upMps };
    prop.flyingHigh = false; // set on the next update from the height
    prop.flight = thrown && prop.carrier !== null ? { by: prop.carrier, hit: new Set() } : null;
    prop.carrier = null;
  }

  /** Objects flying low and fast enough to hurt (the scene tests them against fighters). */
  get flying(): ArenaProp[] {
    return this.props.filter((p) => p.flight !== null && p.body !== null && !p.broken);
  }

  /**
   * A thrown object struck a fighter: it takes damage (it may break) and bounces back off them.
   * Returns true if it broke.
   */
  thrownHit(prop: ArenaProp, fighterId: number, damage: number, dir: Vec2): boolean {
    prop.flight?.hit.add(fighterId);
    const broke = this.applyHit(prop, { blow: 'knockback', damage, strength: 0, direction: dir });
    const body = prop.body;
    if (!broke && body) {
      const v = body.linvel();
      body.setLinvel({ x: -v.x * 0.25, y: -v.y * 0.25 }, true);
    }
    return broke;
  }

  /** Hits and breaks since the last call (sounds, sparks, dust). */
  drainEvents(): PropEvent[] {
    return this.pending.splice(0, this.pending.length);
  }

  get states(): PropState[] {
    return this.props.map((p) => {
      const pose = p.pose;
      return {
        index: p.index,
        kind: p.placement.kind,
        x: pose.x,
        y: pose.y,
        angle: pose.angle,
        hp: p.hp,
        broken: p.broken,
        awake: p.awake,
        burning: p.burnS > 0,
      };
    });
  }

  /** It hit the floor: fragile things shatter if it came down hard; anything thrown stops flying. */
  private land(prop: ArenaProp, fallMps: number): void {
    const body = prop.body;
    const v = body ? body.linvel() : { x: 0, y: 0 };
    const along = Math.hypot(v.x, v.y);
    const speed = along + fallMps * 0.5;
    if (body) body.setLinearDamping(2.2); // floor friction again (it can still skid into someone)
    if (!prop.flight) return;
    const dir = along > 0.01 ? { x: v.x / along, y: v.y / along } : { x: 0, y: 1 };
    const fragile = prop.kind.material === 'glass' || prop.kind.material === 'ceramic';
    if (fragile && speed > THROWING.fragileBreakMps) {
      this.applyHit(prop, { blow: 'knockback', damage: prop.hp ?? 0, strength: 0, direction: dir });
      return;
    }
    this.pending.push({
      kind: 'hit',
      material: prop.kind.material,
      x: prop.pose.x,
      y: prop.pose.y,
      z: 0,
      dir,
      sizeM: Math.max(prop.size.w, prop.size.d, prop.size.h),
    });
  }

  /** Back to a planted piece of furniture where it came to rest. */
  private replant(prop: ArenaProp): void {
    const at = prop.pose;
    if (prop.body) this.physics.removeBody(prop.body);
    const { w, d } = prop.size;
    prop.body = this.physics.addPropBody({
      position: { x: at.x, y: at.y },
      halfExtents: { x: w / 2, y: d / 2 },
      massKg: prop.kind.massKg,
    });
    prop.looseFall = null;
    prop.awake = false;
  }

  /** Returns true if this hit broke the prop. */
  private applyHit(prop: ArenaProp, propHit: PropHit): boolean {
    prop.markHit(this.timeS);
    let hit = propHit;
    if (hit.origin) {
      const { x, y } = prop.pose;
      const dx = x - hit.origin.x;
      const dy = y - hit.origin.y;
      const len = Math.hypot(dx, dy) || 1;
      hit = { ...hit, direction: { x: dx / len, y: dy / len } };
    }
    if (hit.ignites && FLAMMABLE.has(prop.kind.material)) prop.burnS = BURN_S;
    const evAt = () => {
      const p = prop.pose;
      return { x: p.x, y: p.y, z: (prop.placement.elevationM ?? 0) + prop.size.h / 2 };
    };
    if (prop.hp !== null) {
      prop.hp = Math.max(0, prop.hp - hit.damage * MATERIAL_TOUGHNESS[prop.kind.material]);
      if (prop.hp === 0) {
        this.pending.push({
          kind: 'break',
          material: prop.kind.material,
          ...evAt(),
          dir: hit.direction,
          sizeM: Math.max(prop.size.w, prop.size.d, prop.size.h),
        });
        this.shatter(prop, hit);
        return true;
      }
    }
    if (hit.blow !== 'knockback' || prop.canTakeHit(this.timeS)) {
      this.pending.push({
        kind: 'hit',
        material: prop.kind.material,
        ...evAt(),
        dir: hit.direction,
        sizeM: Math.max(prop.size.w, prop.size.d, prop.size.h),
      });
    }
    // An item on a desk that survives the blow is knocked off it.
    if (!prop.body && prop.parent && prop.kind.movable) {
      this.knockOff(prop, hit);
      return false;
    }
    const body = prop.body;
    if (!body || !prop.kind.movable) return false;
    if (!prop.awake) {
      prop.awake = true;
      this.physics.setPropAwake(body, true);
    }
    prop.resetSettle();
    const j = hit.strength * IMPULSE_PER_STRENGTH;
    body.applyImpulse({ x: hit.direction.x * j, y: hit.direction.y * j }, true);
    // A little spin, off-centre like a real shove; alternating sides keeps it deterministic.
    const spin = (prop.index % 2 ? 1 : -1) * j * 0.12 * Math.max(prop.size.w, prop.size.d);
    body.applyTorqueImpulse(spin, true);
    return false;
  }

  /** A desk item that survived a blow flies off the desk and falls to the floor. */
  private knockOff(item: ArenaProp, hit: PropHit): void {
    const at = item.pose;
    const iw = item.size;
    const speed = Math.min(6, (hit.strength * IMPULSE_PER_STRENGTH) / Math.max(0.3, item.kind.massKg));
    item.body = this.physics.addDebris({
      position: { x: at.x, y: at.y },
      halfExtents: { x: Math.max(0.04, iw.w / 2), y: Math.max(0.04, iw.d / 2) },
      velocity: { x: hit.direction.x * speed, y: hit.direction.y * speed + 0.2 },
      spin: (item.index % 2 ? 1 : -1) * 6,
      massKg: Math.max(0.1, item.kind.massKg),
    });
    item.looseFall = { heightM: item.placement.elevationM ?? 0, vz: 1.6 };
  }

  private shatter(prop: ArenaProp, hit: PropHit): void {
    const pose = prop.pose;
    const lift = prop.placement.elevationM ?? 0;
    // Where the items on it are now (they ride along with it until it breaks).
    const riders = this.props
      .filter((item) => item.parent === prop && !item.broken && item.looseFall === null && !item.held && !item.body)
      .map((item) => ({ item, at: item.pose }));
    prop.broken = true;
    if (prop.body) this.physics.removeBody(prop.body);
    prop.body = null;
    prop.awake = false;

    const { w, d, h } = prop.size;
    const look = BREAKUP[prop.kind.material];
    const count = Math.max(look.min, Math.min(look.max, Math.round(w * d * 6) + look.min));
    const power = Math.min(2, 0.6 + hit.strength / 600);
    const colour = MATERIAL_COLOURS[prop.kind.material];
    for (let i = 0; i < count; i++) {
      const f = (i + 0.5) / count - 0.5; // -0.5..0.5 across the prop
      const speed = (2.5 + ((i * 37) % 5) * 0.6) * power * look.speed;
      const side = f * 3;
      const size = look.size(w, d, i);
      this.debris.add({
        position: { x: pose.x + f * w * 0.8, y: pose.y + ((i % 3) - 1) * d * 0.25 },
        halfExtents: size,
        shape: look.shape,
        velocity: {
          x: hit.direction.x * speed - hit.direction.y * side,
          y: hit.direction.y * speed + hit.direction.x * side,
        },
        spin: (i % 2 ? 1 : -1) * (5 + i),
        massKg: Math.max(0.2, prop.kind.massKg / count),
        colour,
        heightM: lift + Math.min(1.2, h * (0.4 + (i % 3) * 0.25)),
        verticalSpeedMps: 1.2 + (i % 4) * 0.5,
      });
    }

    // Whatever was on it drops to the floor and scatters a little.
    for (const { item, at } of riders) {
      const iw = item.size;
      item.body = this.physics.addDebris({
        position: { x: at.x, y: at.y },
        halfExtents: { x: Math.max(0.04, iw.w / 2), y: Math.max(0.04, iw.d / 2) },
        velocity: { x: hit.direction.x * 1.5 + ((item.index % 3) - 1) * 0.6, y: hit.direction.y * 1.5 + 0.3 },
        spin: (item.index % 2 ? 1 : -1) * 4,
        massKg: Math.max(0.1, item.kind.massKg),
      });
      item.looseFall = { heightM: item.placement.elevationM ?? 0, vz: 1.2 };
    }
  }
}
