import { type Container, Graphics } from 'pixi.js';
import type { AbilityFx, FireZone, Projectile, Telegraph } from '../abilities/ability-world';

/**
 * Fire effects for abilities (GREYBOX vector VFX, PRS targets in spec §11.2):
 * fireballs with trails, burning floor patches, telegraph rings that fill up
 * before they land (REQ-ABL-6), impact bursts with shockwave rings and embers,
 * scorch marks, and flames on anything burning. Two Graphics layers are
 * redrawn each frame: one on the floor (under fighters and props) and one in
 * the air (over them). Particles are pooled: no per-frame allocation.
 */
export interface BurningThing {
  readonly x: number;
  readonly y: number;
  /** Height of the flames' top above the floor, metres. */
  readonly heightM: number;
}

export interface AbilityVfxInput {
  readonly projectiles: readonly Projectile[];
  readonly zones: readonly FireZone[];
  readonly telegraphs: readonly Telegraph[];
  readonly fx: readonly AbilityFx[];
  readonly burning: readonly BurningThing[];
}

interface Particle {
  live: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  ageS: number;
  lifeS: number;
  size: number;
}

interface Ring {
  x: number;
  y: number;
  r0: number;
  r1: number;
  ageS: number;
  lifeS: number;
}

interface Scorch {
  x: number;
  y: number;
  r: number;
  ageS: number;
}

const MAX_PARTICLES = 320;
const SCORCH_LIFE_S = 6;
const FIRE = { deep: 0xd8320c, hot: 0xff6a00, bright: 0xffa53a, core: 0xfff1a8 } as const;
/** A fireball flies at chest height. */
const BOLT_HEIGHT_M = 1.0;

export class AbilityVfx {
  readonly floor = new Graphics();
  readonly air = new Graphics();
  private readonly particles: Particle[] = [];
  private readonly rings: Ring[] = [];
  private readonly scorches: Scorch[] = [];
  private timeS = 0;
  private seed = 1;

  constructor() {
    this.floor.label = 'vfx-floor';
    this.air.label = 'vfx-air';
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({ live: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, ageS: 0, lifeS: 1, size: 0.1 });
    }
  }

  /** Put the floor layer under the arena's y-sorted actors and the air layer above them. */
  attach(world: Container, actors: Container): void {
    world.addChildAt(this.floor, world.getChildIndex(actors));
    world.addChildAt(this.air, world.getChildIndex(actors) + 1);
  }

  update(dtS: number, input: AbilityVfxInput): void {
    this.timeS += dtS;
    for (const fx of input.fx) this.onFx(fx);
    for (const p of input.projectiles) this.emitAt(p.x, p.y, BOLT_HEIGHT_M, 2, 0.6, 0.3, 0.09);
    for (const z of input.zones) if (this.rand() < 0.35) this.emitAt(z.x, z.y, 0.1, 1, 0.5, 0.25, 0.08);
    for (const b of input.burning)
      if (this.rand() < 0.5) this.emitAt(b.x, b.y, b.heightM * this.rand(), 1, 0.4, 0.25, 0.08);
    this.stepParticles(dtS);
    this.draw(input, dtS);
  }

  destroy(): void {
    this.floor.destroy();
    this.air.destroy();
  }

  private onFx(fx: AbilityFx): void {
    const r = fx.radiusM ?? 0.5;
    switch (fx.kind) {
      case 'release':
        this.emitAt(fx.x, fx.y, 1.0, 8, 1.5, 0.35, 0.1);
        break;
      case 'impact': {
        // Bigger blasts: more embers, a shockwave ring and a scorch mark.
        const big = r >= 1.5;
        this.emitAt(
          fx.x,
          fx.y,
          big ? 0.3 : BOLT_HEIGHT_M,
          big ? 60 : 16,
          big ? 5 : 2.5,
          big ? 0.7 : 0.45,
          big ? 0.16 : 0.11,
        );
        this.rings.push({
          x: fx.x,
          y: fx.y,
          r0: r * 0.2,
          r1: r * (big ? 1.15 : 1.6),
          ageS: 0,
          lifeS: big ? 0.45 : 0.25,
        });
        if (big) {
          this.rings.push({ x: fx.x, y: fx.y, r0: r * 0.5, r1: r * 1.5, ageS: -0.08, lifeS: 0.55 });
          this.scorches.push({ x: fx.x, y: fx.y, r: r * 0.8, ageS: 0 });
          if (this.scorches.length > 12) this.scorches.shift();
        }
        break;
      }
      case 'fizzle':
        this.emitAt(fx.x, fx.y, 0.8, 6, 0.8, 0.3, 0.07);
        break;
      default:
        break;
    }
  }

  /** Spawn embers that rise, spread and fade. */
  private emitAt(x: number, y: number, z: number, count: number, spread: number, lifeS: number, size: number): void {
    for (let n = 0; n < count; n++) {
      const p = this.particles.find((q) => !q.live);
      if (!p) return;
      const a = this.rand() * Math.PI * 2;
      const s = spread * (0.3 + this.rand() * 0.7);
      Object.assign(p, {
        live: true,
        x,
        y,
        z,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s * 0.6,
        vz: 1 + this.rand() * 2.5,
        ageS: 0,
        lifeS: lifeS * (0.6 + this.rand() * 0.8),
        size: size * (0.6 + this.rand() * 0.8),
      });
    }
  }

  private stepParticles(dtS: number): void {
    for (const p of this.particles) {
      if (!p.live) continue;
      p.ageS += dtS;
      if (p.ageS >= p.lifeS) {
        p.live = false;
        continue;
      }
      p.x += p.vx * dtS;
      p.y += p.vy * dtS;
      p.z = Math.max(0, p.z + p.vz * dtS);
      p.vx *= 0.92;
      p.vy *= 0.92;
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i]!;
      r.ageS += dtS;
      if (r.ageS >= r.lifeS) this.rings.splice(i, 1);
    }
    for (let i = this.scorches.length - 1; i >= 0; i--) {
      const s = this.scorches[i]!;
      s.ageS += dtS;
      if (s.ageS >= SCORCH_LIFE_S) this.scorches.splice(i, 1);
    }
  }

  private draw(input: AbilityVfxInput, _dtS: number): void {
    const f = this.floor.clear();
    const g = this.air.clear();
    const t = this.timeS;

    for (const s of this.scorches) {
      const a = 0.45 * (1 - s.ageS / SCORCH_LIFE_S);
      f.ellipse(s.x, s.y, s.r, s.r * 0.6).fill({ color: 0x15100c, alpha: a });
    }

    // Telegraphs (REQ-ABL-6): a clear ring where it will land, filling as the moment approaches.
    for (const tg of input.telegraphs) {
      const k = Math.min(1, tg.ageS / tg.durationS);
      const pulse = 0.75 + 0.25 * Math.sin(t * 22);
      f.ellipse(tg.x, tg.y, tg.radiusM, tg.radiusM * 0.6).fill({ color: FIRE.deep, alpha: 0.14 });
      f.ellipse(tg.x, tg.y, tg.radiusM * k, tg.radiusM * 0.6 * k).fill({ color: FIRE.hot, alpha: 0.22 });
      f.ellipse(tg.x, tg.y, tg.radiusM, tg.radiusM * 0.6).stroke({ width: 0.07, color: FIRE.bright, alpha: pulse });
    }

    // Burning floor patches (Flame Dash trail).
    for (const z of input.zones) {
      const life = 1 - z.ageS / z.lifeS;
      const flick = 0.85 + 0.15 * Math.sin(t * 30 + z.x * 7);
      f.ellipse(z.x, z.y, z.radiusM, z.radiusM * 0.55).fill({ color: FIRE.deep, alpha: 0.35 * life });
      f.ellipse(z.x, z.y, z.radiusM * 0.6 * flick, z.radiusM * 0.33 * flick).fill({
        color: FIRE.hot,
        alpha: 0.5 * life,
      });
      this.flame(g, z.x, z.y, z.radiusM * 0.9 * life * flick, 0.5 * life + 0.15, t + z.y);
    }

    for (const r of this.rings) {
      if (r.ageS < 0) continue;
      const k = r.ageS / r.lifeS;
      const rad = r.r0 + (r.r1 - r.r0) * (1 - (1 - k) * (1 - k));
      f.ellipse(r.x, r.y, rad, rad * 0.6).stroke({ width: 0.12 * (1 - k) + 0.02, color: FIRE.bright, alpha: 1 - k });
    }

    // Fireballs: glow, body, white-hot core and a fading trail; a shadow on the floor.
    for (const p of input.projectiles) {
      const radius = p.def.delivery.type === 'projectile' ? p.def.delivery.radiusM : 0.3;
      f.ellipse(p.x, p.y, radius, radius * 0.45).fill({ color: 0x000000, alpha: 0.25 });
      p.trail.forEach((q, i) => {
        const k = (i + 1) / (p.trail.length + 1);
        g.circle(q.x, q.y - BOLT_HEIGHT_M, radius * 0.8 * k).fill({ color: FIRE.hot, alpha: 0.35 * k });
      });
      const y = p.y - BOLT_HEIGHT_M;
      const wob = 1 + 0.08 * Math.sin(t * 40);
      g.circle(p.x, y, radius * 1.7 * wob).fill({ color: FIRE.hot, alpha: 0.22 });
      g.circle(p.x, y, radius * wob).fill({ color: FIRE.bright, alpha: 0.95 });
      g.circle(p.x, y, radius * 0.5).fill({ color: FIRE.core, alpha: 1 });
    }

    // Flames on burning fighters and furniture.
    for (const b of input.burning) this.flame(g, b.x, b.y, 0.35, b.heightM, t + b.x * 3);

    for (const p of this.particles) {
      if (!p.live) continue;
      const k = p.ageS / p.lifeS;
      const color = k < 0.3 ? FIRE.core : k < 0.6 ? FIRE.bright : FIRE.hot;
      g.circle(p.x, p.y - p.z, p.size * (1 - k * 0.6)).fill({ color, alpha: 1 - k });
    }
  }

  /** Three flickering flame tongues standing on (x, y), up to `heightM` tall. */
  private flame(g: Graphics, x: number, y: number, width: number, heightM: number, phase: number): void {
    for (let i = 0; i < 3; i++) {
      const off = (i - 1) * width * 0.45;
      const h = heightM * (0.6 + 0.4 * Math.abs(Math.sin(phase * 9 + i * 2.1)));
      const w = width * 0.32;
      const top = y - h;
      g.moveTo(x + off - w, y)
        .quadraticCurveTo(x + off - w * 0.6, y - h * 0.5, x + off + Math.sin(phase * 13 + i) * w * 0.4, top)
        .quadraticCurveTo(x + off + w * 0.6, y - h * 0.5, x + off + w, y)
        .closePath()
        .fill({ color: i === 1 ? FIRE.bright : FIRE.hot, alpha: 0.85 });
    }
  }

  private rand(): number {
    // Small LCG: visuals only (gameplay randomness is seeded separately).
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }
}
