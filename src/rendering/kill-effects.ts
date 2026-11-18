import { Graphics } from 'pixi.js';

/**
 * Blood for the execution (Hide and Seek, owner 19/11/2026): droplets thrown at each blow that fall and leave
 * spots on the floor, and a dark pool that spreads under the body at the last. Drawn in world metres on the floor
 * container, so it follows the camera and the floor it happens on. Deterministic (seeded), capped, and it only draws.
 */
interface Drop {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  ageS: number;
  lifeS: number;
}

interface Spot {
  x: number;
  y: number;
  r: number;
}

const GRAVITY = 9;
const MAX_DROPS = 140;
const MAX_SPOTS = 160;

export class KillEffects {
  readonly drops = new Graphics();
  readonly pool = new Graphics();
  private live: Drop[] = [];
  private spots: Spot[] = [];
  private poolAt: { x: number; y: number } | null = null;
  private poolS = 0;
  private seed = 7;

  private rand(): number {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }

  /** A spray of droplets from a point (screen metres), harder for a bigger `power`. */
  burst(x: number, y: number, power: number): void {
    const n = Math.round(14 * power);
    for (let i = 0; i < n && this.live.length < MAX_DROPS; i++) {
      const a = this.rand() * Math.PI * 2;
      const speed = (1.2 + this.rand() * 3.2) * (0.7 + power * 0.4);
      this.live.push({
        x,
        y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed * 0.6 - 1.6 * power,
        r: 0.025 + this.rand() * 0.04 * power,
        ageS: 0,
        lifeS: 0.45 + this.rand() * 0.5,
      });
    }
  }

  /** The pool starts to spread under a body at this floor point (screen metres). */
  startPool(x: number, y: number): void {
    this.poolAt = { x, y };
    this.poolS = 0;
  }

  update(dtS: number): void {
    for (const d of this.live) {
      d.ageS += dtS;
      d.vy += GRAVITY * dtS;
      d.x += d.vx * dtS;
      d.y += d.vy * dtS;
    }
    for (let i = this.live.length - 1; i >= 0; i--) {
      const d = this.live[i]!;
      if (d.ageS < d.lifeS) continue;
      if (this.spots.length < MAX_SPOTS) this.spots.push({ x: d.x, y: d.y, r: d.r * 1.4 });
      this.live.splice(i, 1);
    }
    if (this.poolAt) this.poolS += dtS;
    this.draw();
  }

  private draw(): void {
    const g = this.drops;
    g.clear();
    for (const s of this.spots) g.ellipse(s.x, s.y, s.r * 1.6, s.r * 0.8).fill({ color: 0x5a0a0a, alpha: 0.7 });
    for (const d of this.live) g.circle(d.x, d.y, d.r).fill({ color: 0xa01414, alpha: 0.95 });
    const p = this.pool;
    p.clear();
    if (this.poolAt) {
      const k = 1 - Math.exp(-this.poolS * 0.9);
      p.ellipse(this.poolAt.x, this.poolAt.y, 0.15 + 0.75 * k, 0.07 + 0.38 * k).fill({ color: 0x3a0606, alpha: 0.85 });
      p.ellipse(this.poolAt.x - 0.05, this.poolAt.y, 0.1 + 0.5 * k, 0.05 + 0.25 * k).fill({
        color: 0x5c0a0a,
        alpha: 0.6,
      });
    }
  }

  clear(): void {
    this.live = [];
    this.spots = [];
    this.poolAt = null;
    this.poolS = 0;
    this.drops.clear();
    this.pool.clear();
  }
}
