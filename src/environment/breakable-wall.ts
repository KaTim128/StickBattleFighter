import type { Collider } from '@dimforge/rapier2d';
import type { WallRect } from '../data/arenas/arena-layout';
import { MATERIAL_TOUGHNESS } from '../data/objects/props';
import type { PhysicsWorld, Vec2 } from '../physics/physics-world';

/**
 * Breakable wall sections (owner, 11/11/2026): "make this wall really durable, but constant punching
 * at one spot (or an ultimate) can break a small hole; it should not break the entire wall, and it
 * takes longer still to make a hole you can walk through."
 *
 * A wall marked with `durability` is a row of short sections, each with its own hit points and
 * collider. Blows chip the section they touch (plaster and stone take 60% of each blow); blasts chip
 * harder but spread their force over the sections in reach. A broken section leaves a hole about
 * half a metre wide, too narrow for a fighter; two neighbouring holes make a gap to walk through.
 * Sections never regrow and the rest of the wall stays standing.
 */
export interface WallSection {
  readonly index: number;
  readonly spec: WallRect;
  readonly maxHp: number;
  hp: number;
  broken: boolean;
  collider: Collider | null;
}

export interface WallHit {
  /** Durability lost before toughness. */
  readonly damage: number;
  /** Explosions crack plaster better than fists (TD-048). */
  readonly blast?: boolean;
  readonly direction: Vec2;
  /**
   * Where the blow lands: only the section nearest this point is chipped, so punching one spot digs
   * one hole (a fist overlaps its neighbours too). Without it every section touched is chipped.
   */
  readonly at?: Vec2;
  /** A fire attack: the section blackens with scorch marks as well as cracking. */
  readonly fire?: boolean;
}

/** Something happened to a section this step (cracks, sounds, rubble). */
export interface WallEvent {
  readonly kind: 'chip' | 'break';
  readonly index: number;
  readonly x: number;
  readonly y: number;
  readonly dir: Vec2;
  /** 0..1 health left after the blow. */
  readonly left: number;
  readonly fire?: boolean;
}

/** Blasts deal this many times their damage to a wall section. */
export const WALL_BLAST_MULTIPLIER = 3;
const WALL_TOUGHNESS = MATERIAL_TOUGHNESS.stone;

export class BreakableWalls {
  readonly sections: WallSection[] = [];
  private readonly pending: WallEvent[] = [];

  constructor(
    walls: readonly WallRect[],
    private readonly physics: PhysicsWorld,
  ) {
    walls.forEach((spec, index) => {
      if (spec.durability === undefined) return;
      this.sections.push({
        index,
        spec,
        maxHp: spec.durability,
        hp: spec.durability,
        broken: false,
        collider: this.addCollider(spec),
      });
    });
  }

  private addCollider(s: WallRect): Collider {
    return this.physics.addStaticBox({
      halfExtents: { x: (s.x1 - s.x0) / 2, y: (s.y1 - s.y0) / 2 },
      position: { x: (s.x0 + s.x1) / 2, y: (s.y0 + s.y1) / 2 },
      angleRad: s.angleRad ?? 0,
    });
  }

  /** Chip every standing section the shape touches. Returns how many were hit and broken. */
  hitWhere(touches: (r: WallRect) => boolean, hit: WallHit): { hit: number; broke: number } {
    let n = 0;
    let broke = 0;
    let targets = this.sections.filter((s) => !s.broken && touches(s.spec));
    if (hit.at && targets.length > 1) {
      const at = hit.at;
      const d = (s: WallSection) => Math.hypot((s.spec.x0 + s.spec.x1) / 2 - at.x, (s.spec.y0 + s.spec.y1) / 2 - at.y);
      targets = [targets.reduce((a, b) => (d(b) < d(a) ? b : a))];
    }
    for (const s of targets) {
      n++;
      const raw = hit.damage * (hit.blast ? WALL_BLAST_MULTIPLIER : 1);
      s.hp = Math.max(0, s.hp - raw * WALL_TOUGHNESS);
      const at = { x: (s.spec.x0 + s.spec.x1) / 2, y: (s.spec.y0 + s.spec.y1) / 2 };
      if (s.hp === 0) {
        s.broken = true;
        if (s.collider) this.physics.removeStatic(s.collider);
        s.collider = null;
        broke++;
        this.pending.push({ kind: 'break', index: s.index, ...at, dir: hit.direction, left: 0, fire: hit.fire });
      } else {
        this.pending.push({
          kind: 'chip',
          index: s.index,
          ...at,
          dir: hit.direction,
          left: s.hp / s.maxHp,
          fire: hit.fire,
        });
      }
    }
    return { hit: n, broke };
  }

  /** Chips and breaks since the last call (sounds, dust, cracks, rubble). */
  drainEvents(): WallEvent[] {
    return this.pending.splice(0, this.pending.length);
  }

  /** For tests and the debug hook: health left per section (0..1), by interior-wall index. */
  get states(): { index: number; left: number; broken: boolean }[] {
    return this.sections.map((s) => ({ index: s.index, left: s.hp / s.maxHp, broken: s.broken }));
  }
}
