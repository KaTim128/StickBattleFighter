import type { RigidBody } from '@dimforge/rapier2d';
import type { PhysicsWorld, Vec2 } from '../physics/physics-world';

/**
 * Flying pieces from anything that breaks (door splinters, smashed furniture,
 * items knocked off a desk). Their floor-plane motion is physics (they collide
 * with walls and each other, never with fighters); their height above the floor
 * is a simple hop under gravity. Counts are capped (REQ-PHY-7): the oldest
 * pieces are cleared first.
 */
export interface DebrisPiece {
  readonly id: number;
  readonly body: RigidBody;
  readonly halfW: number;
  readonly halfH: number;
  /** Display colour (from the material). */
  readonly colour: number;
  heightM: number;
  verticalSpeedMps: number;
  removed: boolean;
}

export interface DebrisSpec {
  position: Vec2;
  halfExtents: Vec2;
  velocity: Vec2;
  spin: number;
  massKg: number;
  colour: number;
  heightM: number;
  verticalSpeedMps: number;
}

const GRAVITY_MPS2 = 18;
export const MAX_DEBRIS = 90;

export class Debris {
  private readonly live: DebrisPiece[] = [];
  private nextId = 0;

  constructor(private readonly physics: PhysicsWorld) {}

  add(spec: DebrisSpec): DebrisPiece {
    if (this.live.length >= MAX_DEBRIS) this.clearOldest();
    const piece: DebrisPiece = {
      id: this.nextId++,
      body: this.physics.addDebris(spec),
      halfW: spec.halfExtents.x,
      halfH: spec.halfExtents.y,
      colour: spec.colour,
      heightM: spec.heightM,
      verticalSpeedMps: spec.verticalSpeedMps,
      removed: false,
    };
    this.live.push(piece);
    return piece;
  }

  /** Pieces still in the world (views read this every frame). */
  get pieces(): readonly DebrisPiece[] {
    return this.live;
  }

  update(stepS: number): void {
    for (const p of this.live) {
      if (p.heightM <= 0 && p.verticalSpeedMps <= 0) continue;
      p.verticalSpeedMps -= GRAVITY_MPS2 * stepS;
      p.heightM = Math.max(0, p.heightM + p.verticalSpeedMps * stepS);
      if (p.heightM === 0) p.verticalSpeedMps = 0;
    }
  }

  private clearOldest(): void {
    const oldest = this.live.shift();
    if (!oldest) return;
    oldest.removed = true;
    this.physics.removeBody(oldest.body);
  }
}
