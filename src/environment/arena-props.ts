import type { RigidBody } from '@dimforge/rapier2d';
import type { ArenaLayout } from '../data/arenas/arena-layout';
import { footprint, kindOf, type Material, type PropKind, type PropPlacement } from '../data/objects/props';
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
  /** Direction of the blow (unit vector). */
  readonly direction: Vec2;
}

export interface PropHitResult {
  readonly hit: number;
  readonly broke: number;
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
}

/** Push per unit of blow strength (N·s). A heavy finisher (720) sends a 12 kg chair off at ~3 m/s. */
const IMPULSE_PER_STRENGTH = 0.05;
/** A knocked-back body only damages the same prop again after this long (sliding along it is one blow). */
const REHIT_S = 0.3;
/** Planted again once slower than this for SETTLE_S. */
const SETTLE_SPEED_MPS = 0.06;
const SETTLE_S = 0.3;

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
    return !this.broken && this.body !== null && this.looseFall === null && !this.kind.decal;
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
      if (prop.looseFall) {
        const f = prop.looseFall;
        if (f.heightM > 0 || f.vz > 0) {
          f.vz -= 18 * stepS;
          f.heightM = Math.max(0, f.heightM + f.vz * stepS);
        }
      }
      if (prop.body && prop.settle(stepS) && !prop.looseFall) {
        prop.awake = false;
        this.physics.setPropAwake(prop.body, false);
      }
    }
    this.debris.update(stepS);
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
      };
    });
  }

  /** Returns true if this hit broke the prop. */
  private applyHit(prop: ArenaProp, hit: PropHit): boolean {
    prop.markHit(this.timeS);
    if (prop.hp !== null) {
      prop.hp = Math.max(0, prop.hp - hit.damage);
      if (prop.hp === 0) {
        this.shatter(prop, hit);
        return true;
      }
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

  private shatter(prop: ArenaProp, hit: PropHit): void {
    const pose = prop.pose;
    // Where the items on it are now (they ride along with it until it breaks).
    const riders = this.props
      .filter((item) => item.parent === prop && !item.broken)
      .map((item) => ({ item, at: item.pose }));
    prop.broken = true;
    if (prop.body) this.physics.removeBody(prop.body);
    prop.body = null;
    prop.awake = false;

    const { w, d, h } = prop.size;
    const count = Math.max(3, Math.min(8, Math.round(w * d * 6) + 3));
    const power = Math.min(2, 0.6 + hit.strength / 600);
    const colour = MATERIAL_COLOURS[prop.kind.material];
    for (let i = 0; i < count; i++) {
      const f = (i + 0.5) / count - 0.5; // -0.5..0.5 across the prop
      const speed = (2.5 + ((i * 37) % 5) * 0.6) * power;
      const side = f * 3;
      this.debris.add({
        position: { x: pose.x + f * w * 0.8, y: pose.y + ((i % 3) - 1) * d * 0.25 },
        halfExtents: { x: Math.max(0.05, Math.min(0.3, w / 6)) * (1 + (i % 2) * 0.4), y: Math.max(0.04, d / 10) },
        velocity: {
          x: hit.direction.x * speed - hit.direction.y * side,
          y: hit.direction.y * speed + hit.direction.x * side,
        },
        spin: (i % 2 ? 1 : -1) * (5 + i),
        massKg: Math.max(0.2, prop.kind.massKg / count),
        colour,
        heightM: Math.min(1.2, h * (0.4 + (i % 3) * 0.25)),
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
