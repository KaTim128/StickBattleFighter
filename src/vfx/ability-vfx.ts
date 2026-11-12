import { type Container, Graphics } from 'pixi.js';
import type { MagicLook } from '../abilities/ability-def';
import type { AbilityFx, Beam, FireZone, Projectile, Telegraph } from '../abilities/ability-world';
import { ISO_T, iso } from '../rendering/projection';

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
  /** Height the flames start from (a burning object in the air); default the floor. */
  readonly baseM?: number;
  /** How wide the fire is, metres (default 0.35: a burning prop). */
  readonly widthM?: number;
}

/** A blow landing (melee or ability): sparks fly along the blow and a burst ring pops. */
export interface ImpactBurst {
  readonly x: number;
  readonly y: number;
  readonly dir: { readonly x: number; readonly y: number };
  readonly sparks: number;
  readonly speedMps: number;
  readonly colour: number;
  readonly burstM: number;
  /** Fire embers rising from the contact (elemental effects). */
  readonly embers?: number;
  /** Leave a scorch mark on the floor, radius metres. */
  readonly scorchM?: number;
}

/** Points that burn while a fighter attacks (fists and feet), world x, y and height. */
export interface LimbFlames {
  readonly points: readonly { readonly x: number; readonly y: number; readonly z: number }[];
  /** 0..1 how strongly (peaks at the strike). */
  readonly strength: number;
}

/** A KO'd fighter dissolving: dust rises from points along its body (world x, y and height). */
export interface DustSource {
  readonly points: readonly { readonly x: number; readonly y: number; readonly z: number }[];
  readonly colour: number;
  /** Dust colours to pick from (an Effects Profile's disintegration look); default: own colour and ash. */
  readonly colours?: readonly number[];
  /** Use only `colours` (no own colour or pale dust): ash from a body burned away. */
  readonly onlyColours?: boolean;
  /** Fire embers to release too (ember-and-ash disintegration). */
  readonly embers?: number;
  /** Particles to release this frame. */
  readonly count: number;
}

/** The leaping ultimate being aimed: range ring, path and landing zone. */
export interface AimIndicator {
  readonly from: { readonly x: number; readonly y: number };
  readonly to: { readonly x: number; readonly y: number };
  readonly radiusM: number;
  readonly maxRangeM: number;
}

/**
 * A cast being charged (Magic Attack VFX Standard, stage 1-2): the element is drawn in from the
 * air to the hand (`hand`, world x, y and height) and, for `body` charges, gathers around the
 * whole body too; a core swells in the palm as `progress` runs 0..1.
 */
export interface ChargeFx {
  readonly x: number;
  readonly y: number;
  readonly hand: { readonly x: number; readonly y: number; readonly z: number };
  readonly progress: number;
  readonly look: MagicLook;
  readonly body: boolean;
}

/** A fighter under a fury buff: motes and steam rising, a glow on the floor (Rampage Mode). */
export interface AuraFx {
  readonly x: number;
  readonly y: number;
  readonly palette: MagicLook['palette'];
  /** 0..1 (fades out at the end). */
  readonly strength: number;
  /** Only the floor ring: no rising embers or steam. */
  readonly quiet?: boolean;
}

/** A charging body kicking up the ground behind it (Rampage Charge). */
export interface DashTrailFx {
  readonly x: number;
  readonly y: number;
  readonly dirX: number;
  readonly dirY: number;
  readonly look: MagicLook;
}

export interface AbilityVfxInput {
  readonly aim?: AimIndicator | null;
  readonly impacts: readonly ImpactBurst[];
  readonly dust: readonly DustSource[];
  readonly projectiles: readonly Projectile[];
  readonly zones: readonly FireZone[];
  readonly telegraphs: readonly Telegraph[];
  readonly fx: readonly AbilityFx[];
  readonly burning: readonly BurningThing[];
  /** Flames on attacking limbs and auras (Effects Profiles, TD-039). */
  readonly limbFlames?: readonly LimbFlames[];
  /** Casts charging this frame. */
  readonly charges?: readonly ChargeFx[];
  readonly auras?: readonly AuraFx[];
  readonly trails?: readonly DashTrailFx[];
  /** Continuous beams (Fire Beam). */
  readonly beams?: readonly Beam[];
  /** Smoke rising this frame (a burn going out, a body burning away), world points. */
  readonly smoke?: readonly { readonly x: number; readonly y: number; readonly z: number; readonly count: number }[];
}

type ParticleKind = 'ember' | 'spark' | 'dust' | 'gather' | 'smoke';

type Palette = MagicLook['palette'];

interface Particle {
  live: boolean;
  kind: ParticleKind;
  colour: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  ageS: number;
  lifeS: number;
  size: number;
  /** Element colours (embers and gathering motes); default fire. */
  pal: Palette;
}

interface Ring {
  colour: number;
  x: number;
  y: number;
  /** Height above the floor: 0 = a floor ring (shockwave), else a burst ring in the air. */
  z: number;
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

const MAX_PARTICLES = 480;
const CONTACT_FLASH_S = 0.09;
const SCORCH_LIFE_S = 6;
const FIRE: Palette = { deep: 0xd8320c, hot: 0xff6a00, bright: 0xffa53a, core: 0xfff1a8 };
/** A beam pours at chest height. */
const BEAM_HEIGHT_M = 1.05;
const SMOKE = 0x2c2420;

/** Fire spreading across the floor from a big impact (Eruption). */
interface FlameRing {
  x: number;
  y: number;
  r1: number;
  ageS: number;
  lifeS: number;
  pal: Palette;
}
/** A fireball flies at chest height. */
const BOLT_HEIGHT_M = 1.0;

export class AbilityVfx {
  readonly floor = new Graphics();
  readonly air = new Graphics();
  private readonly particles: Particle[] = [];
  private readonly rings: Ring[] = [];
  private readonly scorches: Scorch[] = [];
  private readonly flashes: {
    x: number;
    y: number;
    z: number;
    r: number;
    ageS: number;
    colour: number;
    lifeS: number;
  }[] = [];
  private readonly flameRings: FlameRing[] = [];
  /** Fractional particle counts carried between frames (rate-based emitters). */
  private carry = 0;
  private timeS = 0;
  private seed = 1;

  constructor() {
    this.floor.label = 'vfx-floor';
    this.air.label = 'vfx-air';
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({
        live: false,
        kind: 'ember',
        colour: 0,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        ageS: 0,
        lifeS: 1,
        size: 0.1,
        pal: FIRE,
      });
    }
  }

  /**
   * The floor layer goes into the arena's floor (drawn in world metres through the floor
   * projection); the air layer sits above the y-sorted actors (drawn at projected points, TD-045).
   */
  attach(floor: Container, world: Container, actors: Container): void {
    floor.addChild(this.floor);
    world.addChildAt(this.air, world.getChildIndex(actors) + 1);
  }

  update(dtS: number, input: AbilityVfxInput): void {
    this.timeS += dtS;
    for (const fx of input.fx) this.onFx(fx);
    for (const hit of input.impacts) this.burst(hit);
    for (const d of input.dust) this.dustFrom(d);
    for (const lf of input.limbFlames ?? []) {
      for (const p of lf.points) {
        const n = this.rand() < 0.5 + lf.strength * 0.5 ? 1 + Math.round(lf.strength * 2) : 0;
        this.emitAt(p.x, p.y, p.z, n, 0.4, 0.22 + lf.strength * 0.15, 0.06 + lf.strength * 0.04);
      }
    }
    for (const p of input.projectiles) {
      const look = p.def.look;
      if (look?.flight) this.flightTrail(p, look, dtS);
      else this.emitAt(p.x, p.y, BOLT_HEIGHT_M, 2, 0.6, 0.3, 0.09);
    }
    for (const c of input.charges ?? []) this.chargeParticles(c, dtS);
    for (const a of input.auras ?? []) {
      if (a.quiet) continue; // only the floor ring (drawn below)
      const n = this.count(30 * a.strength * dtS);
      for (let i = 0; i < n; i++) {
        const ang = this.rand() * Math.PI * 2;
        this.emitAt(
          a.x + Math.cos(ang) * 0.3,
          a.y + Math.sin(ang) * 0.2,
          0.3 + this.rand() * 1.4,
          1,
          0.3,
          0.6,
          0.08,
          a.palette,
        );
      }
      // Steam off the shoulders.
      if (this.rand() < 4 * a.strength * dtS) {
        const p = this.free();
        if (p) {
          Object.assign(p, {
            live: true,
            kind: 'smoke',
            colour: 0xe8e0d8,
            x: a.x + (this.rand() - 0.5) * 0.3,
            y: a.y,
            z: 1.45,
            vx: (this.rand() - 0.5) * 0.3,
            vy: (this.rand() - 0.5) * 0.2,
            vz: 0.8 + this.rand() * 0.5,
            ageS: 0,
            lifeS: 0.8,
            size: 0.09,
            pal: a.palette,
          });
        }
      }
    }
    for (const tr of input.trails ?? []) {
      const pal = tr.look.palette;
      const n = this.count((tr.look.flight?.trailPerS ?? 60) * dtS);
      for (let i = 0; i < n; i++) {
        const p = this.free();
        if (!p) break;
        Object.assign(p, {
          live: true,
          kind: this.rand() < 0.5 ? 'smoke' : 'ember',
          colour: pal.bright,
          x: tr.x - tr.dirX * 0.3 + (this.rand() - 0.5) * 0.4,
          y: tr.y - tr.dirY * 0.3 + (this.rand() - 0.5) * 0.4,
          z: 0.05 + this.rand() * 0.3,
          vx: -tr.dirX * (1 + this.rand() * 2) + (this.rand() - 0.5),
          vy: -tr.dirY * (1 + this.rand() * 2) + (this.rand() - 0.5),
          vz: 0.4 + this.rand(),
          ageS: 0,
          lifeS: 0.5 + this.rand() * 0.4,
          size: 0.1 + this.rand() * 0.1,
          pal,
        });
      }
    }
    for (const s of input.smoke ?? []) {
      for (let n = 0; n < s.count; n++) {
        const p = this.free();
        if (!p) break;
        Object.assign(p, {
          live: true,
          kind: 'smoke',
          colour: SMOKE,
          x: s.x + (this.rand() - 0.5) * 0.25,
          y: s.y + (this.rand() - 0.5) * 0.15,
          z: s.z,
          vx: 0.2 + this.rand() * 0.3,
          vy: (this.rand() - 0.5) * 0.2,
          vz: 0.5 + this.rand() * 0.6,
          ageS: 0,
          lifeS: 0.9 + this.rand() * 0.7,
          size: 0.07 + this.rand() * 0.07,
          pal: FIRE,
        });
      }
    }
    for (const b of input.beams ?? []) this.beamParticles(b, dtS);
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

  /**
   * Bone spikes and skeletal hands bursting from the ground (Death Eruption, owner 12/11/2026):
   * each shoots up fast, holds for a moment, then sinks back into a dark stain.
   */
  private readonly spikes: { x: number; y: number; h: number; lean: number; hand: boolean; ageS: number }[] = [];

  private onFx(fx: AbilityFx): void {
    const r = fx.radiusM ?? 0.5;
    if (fx.kind === 'impact' && fx.vfx === 'death-eruption') {
      for (let i = 0; i < 11; i++) {
        const a = this.rand() * Math.PI * 2;
        const d = Math.sqrt(this.rand()) * r * 0.9;
        this.spikes.push({
          x: fx.x + Math.cos(a) * d,
          y: fx.y + Math.sin(a) * d,
          h: 0.45 + this.rand() * 0.55,
          lean: (this.rand() - 0.5) * 0.5,
          hand: i % 4 === 0,
          ageS: -this.rand() * 0.08,
        });
      }
      if (this.spikes.length > 60) this.spikes.splice(0, this.spikes.length - 60);
    }
    if (fx.kind === 'impact' && fx.look?.impact) {
      this.magicImpact(fx, fx.look);
      return;
    }
    if (fx.kind === 'release' && fx.look?.charge) {
      // The charge lets go: a quick puff of the element where the hand was.
      this.emitAt(fx.x, fx.y, 1.0, 10, 1.8, 0.3, 0.1, fx.look.palette);
      return;
    }
    if (fx.kind === 'release' && fx.vfx === 'teleport' && fx.look) {
      // Teleport out (owner, 12/11/2026): the body breaks into violet smoke that collapses inward,
      // and a dark ring snaps shut on the floor where he stood.
      for (let i = 0; i < 3; i++) this.emitAt(fx.x, fx.y, 0.4 + i * 0.5, 9, 1.2, 0.45, 0.12, fx.look.palette);
      this.rings.push({
        colour: fx.look.palette.bright,
        x: fx.x,
        y: fx.y,
        z: 0,
        r0: 0.9,
        r1: 0.1,
        ageS: 0,
        lifeS: 0.35,
      });
      return;
    }
    switch (fx.kind) {
      case 'release':
        // A small puff where the hand was, in the ability's own colours (never fire for others).
        this.emitAt(fx.x, fx.y, 1.0, 8, 1.5, 0.35, 0.1, fx.look?.palette);
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
          colour: FIRE.bright,
          x: fx.x,
          y: fx.y,
          z: 0,
          r0: r * 0.2,
          r1: r * (big ? 1.15 : 1.6),
          ageS: 0,
          lifeS: big ? 0.45 : 0.25,
        });
        if (big) {
          this.rings.push({
            colour: FIRE.bright,
            x: fx.x,
            y: fx.y,
            z: 0,
            r0: r * 0.5,
            r1: r * 1.5,
            ageS: -0.08,
            lifeS: 0.55,
          });
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

  /** Sparks thrown along the blow (a cone around its direction) and a quick burst ring at chest height. */
  private burst(hit: ImpactBurst): void {
    const base = Math.atan2(hit.dir.y, hit.dir.x);
    for (let n = 0; n < hit.sparks; n++) {
      const p = this.free();
      if (!p) break;
      const a = base + (this.rand() - 0.5) * 1.3;
      const sp = hit.speedMps * (0.45 + this.rand() * 0.55);
      Object.assign(p, {
        live: true,
        kind: 'spark',
        colour: hit.colour,
        x: hit.x,
        y: hit.y,
        z: 0.9 + this.rand() * 0.5,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        vz: (this.rand() - 0.3) * 3,
        ageS: 0,
        lifeS: 0.14 + this.rand() * 0.18,
        size: 0.045 + this.rand() * 0.04,
      });
    }
    this.rings.push({
      colour: hit.colour,
      x: hit.x,
      y: hit.y,
      z: 1.1,
      r0: hit.burstM * 0.2,
      r1: hit.burstM,
      ageS: 0,
      lifeS: 0.16,
    });
    if (hit.embers) this.emitAt(hit.x, hit.y, 1.0, hit.embers, 3, 0.5, 0.11);
    if (hit.scorchM) {
      this.scorches.push({ x: hit.x, y: hit.y, r: hit.scorchM, ageS: 0 });
      if (this.scorches.length > 12) this.scorches.shift();
    }
    // A bright contact flash at the point of impact (a few frames).
    this.flashes.push({
      x: hit.x,
      y: hit.y,
      z: 1.1,
      r: hit.burstM * 0.75,
      ageS: 0,
      colour: hit.colour,
      lifeS: CONTACT_FLASH_S,
    });
  }

  /**
   * Impact (Magic Attack VFX Standard, stage 4): a bright flash first, then an explosive burst of
   * sparks and element motes spraying outward in every direction, a burst ring, a scorch mark and
   * smoke. Big blasts (ring 2 m or more) also send a ring of fire spreading across the floor and
   * a second shockwave.
   */
  private magicImpact(fx: AbilityFx, look: MagicLook): void {
    const im = look.impact!;
    const pal = look.palette;
    const big = im.ringM >= 2;
    const z = big ? 0.4 : BOLT_HEIGHT_M;
    this.flashes.push({ x: fx.x, y: fx.y, z, r: im.flashM, ageS: 0, colour: pal.core, lifeS: big ? 0.16 : 0.12 });
    for (let n = 0; n < im.sparks; n++) {
      const p = this.free();
      if (!p) break;
      const a = this.rand() * Math.PI * 2;
      const sp = (big ? 9 : 6) * (0.4 + this.rand() * 0.6);
      Object.assign(p, {
        live: true,
        kind: 'spark',
        colour: this.rand() < 0.5 ? pal.core : pal.bright,
        x: fx.x,
        y: fx.y,
        z: z + this.rand() * 0.3,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        vz: 1 + this.rand() * 4,
        ageS: 0,
        lifeS: 0.25 + this.rand() * 0.3,
        size: 0.04 + this.rand() * 0.04,
        pal,
      });
    }
    this.emitAt(fx.x, fx.y, z, im.motes, big ? 5 : 3, big ? 0.8 : 0.5, big ? 0.17 : 0.12, pal);
    this.rings.push({
      colour: pal.bright,
      x: fx.x,
      y: fx.y,
      z: big ? 0 : 1.05,
      r0: im.ringM * 0.15,
      r1: im.ringM,
      ageS: 0,
      lifeS: big ? 0.45 : 0.22,
    });
    if (big) {
      this.rings.push({
        colour: pal.core,
        x: fx.x,
        y: fx.y,
        z: 0,
        r0: im.ringM * 0.4,
        r1: im.ringM * 1.25,
        ageS: -0.07,
        lifeS: 0.55,
      });
      if (im.groundFire !== false) this.flameRings.push({ x: fx.x, y: fx.y, r1: im.ringM, ageS: 0, lifeS: 0.9, pal });
    }
    if (im.scorchM) {
      this.scorches.push({ x: fx.x, y: fx.y, r: im.scorchM, ageS: 0 });
      if (this.scorches.length > 12) this.scorches.shift();
    }
    for (let n = 0; n < (im.smoke ?? 0); n++) {
      const p = this.free();
      if (!p) break;
      const a = this.rand() * Math.PI * 2;
      const sp = (big ? 1.6 : 0.6) * this.rand();
      Object.assign(p, {
        live: true,
        kind: 'smoke',
        colour: im.smokeColour ?? SMOKE,
        x: fx.x + Math.cos(a) * 0.2,
        y: fx.y + Math.sin(a) * 0.2,
        z: z * 0.6,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        vz: 0.5 + this.rand() * 0.8,
        ageS: -0.08 - this.rand() * 0.12, // smoke follows the flash, it does not come before it
        lifeS: 1 + this.rand() * 0.8,
        size: (big ? 0.28 : 0.16) * (0.7 + this.rand() * 0.6),
        pal,
      });
    }
  }

  /** In flight (stage 3): a stream of element motes and sparks pouring off the back of the core. */
  private flightTrail(p: Projectile, look: MagicLook, dtS: number): void {
    const fl = look.flight!;
    const pal = look.palette;
    const n = this.count(fl.trailPerS * dtS);
    for (let i = 0; i < n; i++) {
      const q = this.free();
      if (!q) break;
      const back = 1.5 + this.rand() * 2;
      Object.assign(q, {
        live: true,
        kind: 'ember',
        colour: 0,
        x: p.x - p.dir.x * this.rand() * 0.25,
        y: p.y - p.dir.y * this.rand() * 0.25,
        z: BOLT_HEIGHT_M + (this.rand() - 0.5) * 0.25,
        vx: -p.dir.x * back + (this.rand() - 0.5) * 1.2,
        vy: -p.dir.y * back + (this.rand() - 0.5) * 1.2,
        vz: 0.3 + this.rand() * 1.2,
        ageS: 0,
        lifeS: 0.2 + this.rand() * 0.25,
        size: 0.06 + this.rand() * 0.07,
        pal,
      });
    }
    const sparks = this.count(fl.sparksPerS * dtS);
    for (let i = 0; i < sparks; i++) {
      const q = this.free();
      if (!q) break;
      const a = Math.atan2(-p.dir.y, -p.dir.x) + (this.rand() - 0.5) * 1.4;
      const sp = 2 + this.rand() * 3;
      Object.assign(q, {
        live: true,
        kind: 'spark',
        colour: pal.core,
        x: p.x,
        y: p.y,
        z: BOLT_HEIGHT_M,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        vz: (this.rand() - 0.2) * 2,
        ageS: 0,
        lifeS: 0.15 + this.rand() * 0.15,
        size: 0.03 + this.rand() * 0.02,
        pal,
      });
    }
  }

  /** Charging (stages 1-2): motes drawn in from the air to the hand, and around the body for body charges. */
  private chargeParticles(c: ChargeFx, dtS: number): void {
    const ch = c.look.charge!;
    const pal = c.look.palette;
    const n = this.count(ch.motesPerS * dtS * (0.5 + c.progress));
    for (let i = 0; i < n; i++) {
      const q = this.free();
      if (!q) break;
      // Half the motes gather on the hand; body charges send the rest to points along the body.
      const toBody = c.body && this.rand() < 0.5;
      const tx = toBody ? c.x : c.hand.x;
      const ty = toBody ? c.y : c.hand.y;
      const tz = toBody ? 0.2 + this.rand() * 1.4 : c.hand.z;
      const a = this.rand() * Math.PI * 2;
      const rr = ch.gatherRadiusM * (0.6 + this.rand() * 0.4);
      const sz = (this.rand() - 0.3) * rr * 0.8;
      const life = 0.3 + this.rand() * 0.2;
      const sx = tx + Math.cos(a) * rr;
      const sy = ty + Math.sin(a) * rr;
      const s0 = Math.max(0.05, tz + sz);
      Object.assign(q, {
        live: true,
        kind: 'gather',
        colour: 0,
        x: sx,
        y: sy,
        z: s0,
        vx: (tx - sx) / life,
        vy: (ty - sy) / life,
        vz: (tz - s0) / life,
        ageS: 0,
        lifeS: life,
        size: 0.05 + this.rand() * 0.05,
        pal,
      });
    }
  }

  /** A beam (stage 3 for beams): fire flowing along it, sparks spitting from the end. */
  private beamParticles(b: Beam, dtS: number): void {
    const pal = b.def.look?.palette ?? FIRE;
    const len = Math.hypot(b.to.x - b.from.x, b.to.y - b.from.y);
    const rate = b.def.look?.flight?.trailPerS ?? 120;
    const n = this.count(rate * dtS);
    for (let i = 0; i < n; i++) {
      const q = this.free();
      if (!q) break;
      const u = this.rand();
      const sp = 6 + this.rand() * 5;
      Object.assign(q, {
        live: true,
        kind: 'ember',
        colour: 0,
        x: b.from.x + (b.to.x - b.from.x) * u + (this.rand() - 0.5) * 0.2,
        y: b.from.y + (b.to.y - b.from.y) * u + (this.rand() - 0.5) * 0.2,
        z: BEAM_HEIGHT_M + (this.rand() - 0.5) * 0.25,
        vx: b.dir.x * sp,
        vy: b.dir.y * sp,
        vz: 0.4 + this.rand(),
        ageS: 0,
        lifeS: Math.min(0.3, (len * (1 - u)) / sp + 0.05),
        size: 0.06 + this.rand() * 0.07,
        pal,
      });
    }
    const sparks = this.count((b.def.look?.flight?.sparksPerS ?? 40) * dtS);
    for (let i = 0; i < sparks; i++) {
      const q = this.free();
      if (!q) break;
      const a = Math.atan2(b.dir.y, b.dir.x) + Math.PI + (this.rand() - 0.5) * 2.4;
      const sp = 2 + this.rand() * 4;
      Object.assign(q, {
        live: true,
        kind: 'spark',
        colour: pal.core,
        x: b.to.x,
        y: b.to.y,
        z: BEAM_HEIGHT_M,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        vz: 1 + this.rand() * 3,
        ageS: 0,
        lifeS: 0.18 + this.rand() * 0.2,
        size: 0.03 + this.rand() * 0.03,
        pal,
      });
    }
  }

  /** How many particles a rate gives this frame, carrying the fraction to the next frame. */
  private count(expected: number): number {
    this.carry += expected;
    const n = Math.floor(this.carry);
    this.carry -= n;
    return n;
  }

  /** Dust motes leave the body and drift up and away on a light breeze, fading as they go. */
  private dustFrom(d: DustSource): void {
    if (d.embers && d.points.length > 0) {
      for (let e = 0; e < d.embers; e++) {
        const at = d.points[Math.floor(this.rand() * d.points.length)]!;
        this.emitAt(at.x, at.y, at.z, 1, 0.6, 0.6, 0.06);
      }
    }
    for (let n = 0; n < d.count && d.points.length > 0; n++) {
      const p = this.free();
      if (!p) break;
      const at = d.points[Math.floor(this.rand() * d.points.length)]!;
      Object.assign(p, {
        live: true,
        kind: 'dust',
        colour:
          d.colours && d.colours.length > 0 && (d.onlyColours || this.rand() < 0.6)
            ? d.colours[Math.floor(this.rand() * d.colours.length)]!
            : this.rand() < 0.65
              ? d.colour
              : 0xd9d4c7,
        x: at.x + (this.rand() - 0.5) * 0.12,
        y: at.y + (this.rand() - 0.5) * 0.08,
        z: at.z,
        vx: 0.25 + this.rand() * 0.6,
        vy: (this.rand() - 0.5) * 0.25,
        vz: 0.3 + this.rand() * 0.9,
        ageS: 0,
        lifeS: 0.9 + this.rand() * 0.8,
        size: 0.03 + this.rand() * 0.045,
      });
    }
  }

  private free(): Particle | undefined {
    return this.particles.find((q) => !q.live);
  }

  /** Spawn embers that rise, spread and fade. */
  private emitAt(
    x: number,
    y: number,
    z: number,
    count: number,
    spread: number,
    lifeS: number,
    size: number,
    pal: Palette = FIRE,
  ): void {
    for (let n = 0; n < count; n++) {
      const p = this.particles.find((q) => !q.live);
      if (!p) return;
      const a = this.rand() * Math.PI * 2;
      const s = spread * (0.3 + this.rand() * 0.7);
      Object.assign(p, {
        live: true,
        kind: 'ember',
        colour: 0,
        x,
        y,
        z,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        vz: 1 + this.rand() * 2.5,
        ageS: 0,
        lifeS: lifeS * (0.6 + this.rand() * 0.8),
        size: size * (0.6 + this.rand() * 0.8),
        pal,
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
      if (p.ageS < 0) continue; // delayed (smoke after a flash)
      if (p.kind === 'gather') {
        // Straight in to the hand, speeding up as it arrives.
        p.x += p.vx * dtS;
        p.y += p.vy * dtS;
        p.z += p.vz * dtS;
        continue;
      }
      if (p.kind === 'smoke') {
        p.x += p.vx * dtS;
        p.y += p.vy * dtS;
        p.z += p.vz * dtS;
        p.vx *= 0.94;
        p.vy *= 0.94;
        continue;
      }
      p.x += p.vx * dtS;
      p.y += p.vy * dtS;
      p.z = Math.max(0, p.z + p.vz * dtS);
      if (p.kind === 'spark') {
        p.vz -= 9 * dtS; // sparks arc down
        p.vx *= 0.88;
        p.vy *= 0.88;
      } else if (p.kind === 'dust') {
        p.vx *= 0.99;
        p.vy *= 0.99;
      } else {
        p.vx *= 0.92;
        p.vy *= 0.92;
      }
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i]!;
      r.ageS += dtS;
      if (r.ageS >= r.lifeS) this.rings.splice(i, 1);
    }
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const fl = this.flashes[i]!;
      fl.ageS += dtS;
      if (fl.ageS >= fl.lifeS) this.flashes.splice(i, 1);
    }
    for (let i = this.flameRings.length - 1; i >= 0; i--) {
      const fr = this.flameRings[i]!;
      fr.ageS += dtS;
      if (fr.ageS >= fr.lifeS) this.flameRings.splice(i, 1);
    }
    for (let i = this.scorches.length - 1; i >= 0; i--) {
      const s = this.scorches[i]!;
      s.ageS += dtS;
      if (s.ageS >= SCORCH_LIFE_S) this.scorches.splice(i, 1);
    }
  }

  private draw(input: AbilityVfxInput, dtS: number): void {
    // `f` draws flat on the floor in world metres (the floor layer projects it);
    // `g` draws in the air at projected points (P), heights straight up the screen.
    const f = this.floor.clear();
    const g = this.air.clear();
    const t = this.timeS;
    const P = iso;

    for (const s of this.scorches) {
      const a = 0.32 * (1 - s.ageS / SCORCH_LIFE_S);
      f.circle(s.x, s.y, s.r).fill({ color: 0x15100c, alpha: a });
    }

    // Death Eruption: spikes and hands up out of a violet-black stain, then back down.
    for (let i = this.spikes.length - 1; i >= 0; i--) {
      const s = this.spikes[i]!;
      s.ageS += dtS;
      if (s.ageS > 1.1) {
        this.spikes.splice(i, 1);
        continue;
      }
      if (s.ageS < 0) continue;
      const rise = s.ageS < 0.12 ? s.ageS / 0.12 : s.ageS < 0.6 ? 1 : 1 - (s.ageS - 0.6) / 0.5;
      f.circle(s.x, s.y, 0.22).fill({ color: 0x1a0d26, alpha: 0.45 * Math.min(1, rise + 0.3) });
      const base = P(s.x, s.y, 0);
      const h = s.h * rise;
      if (h < 0.02) continue;
      if (!s.hand) {
        const tip = { x: base.x + s.lean * h, y: base.y - h };
        g.poly([base.x - 0.06, base.y, tip.x, tip.y, base.x + 0.06, base.y]).fill(0x2a241c);
        g.poly([base.x - 0.04, base.y, tip.x, tip.y + 0.02, base.x + 0.035, base.y]).fill(0xe6dfcf);
      } else {
        // A skeletal hand clawing up: a forearm bone and three curled fingers.
        const wrist = { x: base.x + s.lean * h * 0.6, y: base.y - h * 0.8 };
        g.moveTo(base.x, base.y).lineTo(wrist.x, wrist.y).stroke({ width: 0.05, color: 0xe6dfcf, cap: 'round' });
        for (const k of [-1, 0, 1]) {
          g.moveTo(wrist.x, wrist.y)
            .lineTo(wrist.x + k * 0.07, wrist.y - 0.12)
            .lineTo(wrist.x + k * 0.1 + 0.03, wrist.y - 0.18)
            .stroke({ width: 0.025, color: 0xe6dfcf, cap: 'round', join: 'round' });
        }
      }
    }

    // Ultimate aiming: the maximum-range ring, a dotted arc to the spot and the landing zone.
    if (input.aim) {
      const a = input.aim;
      const pulse = 0.6 + 0.4 * Math.sin(t * 9);
      if (a.maxRangeM > 0)
        f.circle(a.from.x, a.from.y, a.maxRangeM).stroke({ width: 0.05, color: 0xffd23f, alpha: 0.35 });
      const n = 12;
      for (let i = 1; i < n; i++) {
        const k = i / n;
        const q = P(
          a.from.x + (a.to.x - a.from.x) * k,
          a.from.y + (a.to.y - a.from.y) * k,
          Math.sin(Math.PI * k) * 1.4,
        );
        g.circle(q.x, q.y, 0.06).fill({ color: FIRE.bright, alpha: 0.85 });
      }
      f.circle(a.to.x, a.to.y, a.radiusM).fill({ color: FIRE.hot, alpha: 0.15 + 0.1 * pulse });
      f.circle(a.to.x, a.to.y, a.radiusM).stroke({ width: 0.08, color: 0xffd23f, alpha: 0.9 });
      f.circle(a.to.x, a.to.y, 0.35).fill({ color: 0xffffff, alpha: 0.7 * pulse });
    }

    // Telegraphs (REQ-ABL-6): a clear ring where it will land, filling as the moment approaches.
    for (const tg of input.telegraphs) {
      const k = Math.min(1, tg.ageS / tg.durationS);
      const pulse = 0.75 + 0.25 * Math.sin(t * 22);
      f.circle(tg.x, tg.y, tg.radiusM).fill({ color: FIRE.deep, alpha: 0.14 });
      f.circle(tg.x, tg.y, tg.radiusM * k).fill({ color: FIRE.hot, alpha: 0.22 });
      f.circle(tg.x, tg.y, tg.radiusM).stroke({ width: 0.07, color: FIRE.bright, alpha: pulse });
    }

    // Burning floor patches (Flame Dash trail).
    for (const z of input.zones) {
      const life = 1 - z.ageS / z.lifeS;
      const flick = 0.85 + 0.15 * Math.sin(t * 30 + z.x * 7);
      f.circle(z.x, z.y, z.radiusM).fill({ color: FIRE.deep, alpha: 0.35 * life });
      f.circle(z.x, z.y, z.radiusM * 0.6 * flick).fill({ color: FIRE.hot, alpha: 0.5 * life });
      const base = P(z.x, z.y);
      this.flame(g, base.x, base.y, z.radiusM * 0.9 * life * flick, 0.5 * life + 0.15, t + z.y);
    }

    for (const r of this.rings) {
      if (r.ageS < 0) continue;
      const k = r.ageS / r.lifeS;
      const rad = r.r0 + (r.r1 - r.r0) * (1 - (1 - k) * (1 - k));
      const stroke = { width: 0.12 * (1 - k) + 0.02, color: r.colour, alpha: 1 - k };
      if (r.z <= 0) f.circle(r.x, r.y, rad).stroke(stroke);
      else {
        const c = P(r.x, r.y, r.z);
        g.ellipse(c.x, c.y, rad, rad * ISO_T).stroke(stroke);
      }
    }

    // Fire spreading over the floor from a big landing: a ring of flame tongues racing outward.
    for (const fr of this.flameRings) {
      const k = fr.ageS / fr.lifeS;
      const rad = fr.r1 * (1 - (1 - k) * (1 - k));
      const fade = 1 - k;
      f.circle(fr.x, fr.y, rad).fill({ color: fr.pal.deep, alpha: 0.18 * fade });
      const n = 18;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + k;
        const c = P(fr.x + Math.cos(a) * rad, fr.y + Math.sin(a) * rad);
        this.flame(
          g,
          c.x,
          c.y,
          0.32 * fade + 0.08,
          (0.9 * fade + 0.15) * (0.7 + 0.3 * Math.sin(t * 20 + i)),
          t + i,
          fr.pal,
        );
      }
    }

    // Fury auras: a pulsing glow on the floor under the fighter.
    for (const a of input.auras ?? []) {
      const pulse = 0.8 + 0.2 * Math.sin(t * 9);
      f.circle(a.x, a.y, 0.75 * pulse).fill({ color: a.palette.hot, alpha: 0.22 * a.strength });
      f.circle(a.x, a.y, 0.95).stroke({ width: 0.05, color: a.palette.bright, alpha: 0.45 * a.strength * pulse });
    }

    // Charging casts: a core swelling in the palm, heat shimmer, and a glow on the floor for body charges.
    for (const c of input.charges ?? []) {
      const ch = c.look.charge!;
      const pal = c.look.palette;
      const k = c.progress * c.progress * (3 - 2 * c.progress);
      if (c.body) {
        const pulse = 0.85 + 0.15 * Math.sin(t * 18);
        f.circle(c.x, c.y, 0.5 + 0.6 * k).fill({ color: pal.deep, alpha: 0.18 * k * pulse });
        f.circle(c.x, c.y, (0.5 + 0.6 * k) * 0.6).fill({ color: pal.hot, alpha: 0.22 * k * pulse });
        const base = P(c.x, c.y);
        this.flame(g, base.x, base.y, 0.55 * k + 0.1, 0.6 + 1.1 * k, t * 1.3 + c.x, pal);
      }
      if (ch.coreMaxM > 0) {
        const r = ch.coreMaxM * (0.25 + 0.75 * k) * (1 + 0.07 * Math.sin(t * 37));
        const h = P(c.hand.x, c.hand.y, c.hand.z);
        this.core(g, h.x, h.y, r, pal, t, c.look.flight?.shimmer ?? false);
      }
    }

    // Beams: a thick layered stream (glow, hot body, bright flow, white-hot core) with flowing
    // flame edges and heat shimmer above it; it fades in on release and out at the end.
    for (const b of input.beams ?? []) {
      const d = b.def.delivery;
      if (d.type !== 'beam') continue;
      const pal = b.def.look?.palette ?? FIRE;
      const amount = Math.min(1, b.ageS / 0.08, (d.durationS - b.ageS) / 0.15);
      const a0 = P(b.from.x, b.from.y, BEAM_HEIGHT_M);
      const a1 = P(b.to.x, b.to.y, BEAM_HEIGHT_M);
      const w = d.widthM * amount;
      f.moveTo(b.from.x, b.from.y)
        .lineTo(b.to.x, b.to.y)
        .stroke({ width: w * 1.6, color: pal.deep, alpha: 0.25 * amount, cap: 'round' });
      for (const [colour, k, alpha] of [
        [pal.deep, 1.5, 0.3],
        [pal.hot, 1.0, 0.75],
        [pal.bright, 0.62, 0.9],
        [pal.core, 0.28, 1],
      ] as const) {
        g.moveTo(a0.x, a0.y)
          .lineTo(a1.x, a1.y)
          .stroke({ width: w * k, color: colour, alpha: alpha * amount, cap: 'round' });
      }
      // Flowing flame edges: sinuous strands rolling along the beam.
      const len = Math.hypot(a1.x - a0.x, a1.y - a0.y) || 1;
      const nx = -(a1.y - a0.y) / len;
      const ny = (a1.x - a0.x) / len;
      for (let strand = 0; strand < 3; strand++) {
        const side = strand === 1 ? 0 : strand === 0 ? 1 : -1;
        const steps = 14;
        g.moveTo(a0.x, a0.y);
        for (let i = 1; i <= steps; i++) {
          const u = i / steps;
          const wave = Math.sin(u * 14 - t * 30 + strand * 2.1) * w * 0.32 + side * w * 0.38;
          g.lineTo(a0.x + (a1.x - a0.x) * u + nx * wave, a0.y + (a1.y - a0.y) * u + ny * wave);
        }
        g.stroke({ width: w * 0.16, color: strand === 1 ? pal.core : pal.bright, alpha: 0.7 * amount, cap: 'round' });
      }
      // Heat shimmer: faint wavering lines above the beam.
      for (let i = 0; i < 2; i++) {
        g.moveTo(a0.x, a0.y - w * (0.9 + i * 0.35));
        for (let j = 1; j <= 10; j++) {
          const u = j / 10;
          g.lineTo(
            a0.x + (a1.x - a0.x) * u,
            a0.y + (a1.y - a0.y) * u - w * (0.9 + i * 0.35) + Math.sin(u * 20 + t * 12 + i) * w * 0.12,
          );
        }
        g.stroke({ width: 0.025, color: 0xffffff, alpha: 0.18 * amount });
      }
      // The hands' end and the far end burn brightest.
      this.core(g, a0.x, a0.y, w * 0.55, pal, t, false);
      g.circle(a1.x, a1.y, w * (0.8 + 0.15 * Math.sin(t * 40))).fill({ color: pal.bright, alpha: 0.7 * amount });
      g.circle(a1.x, a1.y, w * 0.4).fill({ color: pal.core, alpha: amount });
    }

    // Fireballs: glow, body, white-hot core and a fading trail; a shadow on the floor.
    for (const p of input.projectiles) {
      const look = p.def.look;
      if (look?.flight) {
        this.magicProjectile(f, g, p, look, t);
        continue;
      }
      const radius = p.def.delivery.type === 'projectile' ? p.def.delivery.radiusM : 0.3;
      f.circle(p.x, p.y, radius * 0.8).fill({ color: 0x000000, alpha: 0.25 });
      p.trail.forEach((q, i) => {
        const k = (i + 1) / (p.trail.length + 1);
        const c = P(q.x, q.y, BOLT_HEIGHT_M);
        g.circle(c.x, c.y, radius * 0.8 * k).fill({ color: FIRE.hot, alpha: 0.35 * k });
      });
      const c = P(p.x, p.y, BOLT_HEIGHT_M);
      const wob = 1 + 0.08 * Math.sin(t * 40);
      g.circle(c.x, c.y, radius * 1.7 * wob).fill({ color: FIRE.hot, alpha: 0.22 });
      g.circle(c.x, c.y, radius * wob).fill({ color: FIRE.bright, alpha: 0.95 });
      g.circle(c.x, c.y, radius * 0.5).fill({ color: FIRE.core, alpha: 1 });
    }

    // Contact flashes: a white-hot star that shrinks away in a few frames.
    for (const fl of this.flashes) {
      const k = fl.ageS / fl.lifeS;
      const r = fl.r * (1 - k * 0.5);
      const c = P(fl.x, fl.y, fl.z);
      g.circle(c.x, c.y, r).fill({ color: fl.colour, alpha: 0.55 * (1 - k) });
      g.circle(c.x, c.y, r * 0.5).fill({ color: 0xffffff, alpha: 0.95 * (1 - k) });
      g.moveTo(c.x - r * 1.6, c.y)
        .lineTo(c.x + r * 1.6, c.y)
        .stroke({ width: 0.04, color: 0xffffff, alpha: 1 - k });
      g.moveTo(c.x, c.y - r * 1.2)
        .lineTo(c.x, c.y + r * 1.2)
        .stroke({ width: 0.035, color: 0xffffff, alpha: 1 - k });
    }

    // Flames on burning fighters and furniture.
    for (const b of input.burning) {
      const z0 = b.baseM ?? 0;
      const base = P(b.x, b.y, z0);
      this.flame(g, base.x, base.y, b.widthM ?? 0.35, b.heightM - z0, t + b.x * 3);
    }

    for (const p of this.particles) {
      if (!p.live) continue;
      const k = p.ageS / p.lifeS;
      const c = P(p.x, p.y, p.z);
      if (p.kind === 'spark') {
        // A short bright streak along its motion.
        const e = P(p.x - p.vx * 0.045, p.y - p.vy * 0.045, p.z - p.vz * 0.045);
        g.moveTo(c.x, c.y)
          .lineTo(e.x, e.y)
          .stroke({ width: p.size, color: p.colour, alpha: 1 - k * 0.7, cap: 'round' });
      } else if (p.kind === 'dust') {
        g.circle(c.x, c.y, p.size * (1 - k * 0.5)).fill({ color: p.colour, alpha: 0.85 * (1 - k) });
      } else if (p.kind === 'smoke') {
        if (p.ageS < 0) continue;
        // Thin, soft smoke that swells a little and fades.
        g.circle(c.x, c.y, p.size * (0.8 + k * 1.1)).fill({
          color: p.colour,
          alpha: 0.18 * (1 - k) * Math.min(1, k * 6),
        });
      } else if (p.kind === 'gather') {
        // Brightening as it nears the hand: a small hot spark with a soft glow.
        const r = p.size * (0.45 + k * 0.45);
        g.circle(c.x, c.y, r * 2).fill({ color: p.pal.hot, alpha: 0.18 * (0.4 + k) });
        g.circle(c.x, c.y, r).fill({ color: k < 0.5 ? p.pal.bright : p.pal.core, alpha: 0.5 + 0.5 * k });
      } else {
        // An ember (owner: "look more like fire"): a small spark with a soft glow, cooling from
        // yellow-white through orange to deep red as it rises and dies.
        const r = p.size * 0.6 * (1 - k * 0.55);
        const color = k < 0.15 ? p.pal.core : k < 0.45 ? p.pal.bright : k < 0.75 ? p.pal.hot : p.pal.deep;
        g.circle(c.x, c.y, r * 2.2).fill({ color: p.pal.hot, alpha: 0.16 * (1 - k) });
        g.circle(c.x, c.y, r).fill({ color, alpha: 1 - k * 0.8 });
      }
    }
  }

  /**
   * A white-hot core of the element (Magic Attack VFX Standard, stage 2): a wide soft glow,
   * layered body, white centre, small flickering tongues and, if `shimmer`, wavering heat rings.
   */
  private core(g: Graphics, x: number, y: number, r: number, pal: Palette, t: number, shimmer: boolean): void {
    g.circle(x, y, r * 2.6).fill({ color: pal.deep, alpha: 0.18 });
    g.circle(x, y, r * 1.7).fill({ color: pal.hot, alpha: 0.45 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + t * 4;
      const len = r * (0.9 + 0.5 * Math.abs(Math.sin(t * 17 + i * 1.7)));
      g.moveTo(x + Math.cos(a + 0.35) * r * 0.8, y + Math.sin(a + 0.35) * r * 0.8)
        .quadraticCurveTo(
          x + Math.cos(a) * (r + len),
          y + Math.sin(a) * (r + len) - len * 0.4,
          x + Math.cos(a - 0.35) * r * 0.8,
          y + Math.sin(a - 0.35) * r * 0.8,
        )
        .fill({ color: pal.bright, alpha: 0.8 });
    }
    g.circle(x, y, r).fill({ color: pal.bright, alpha: 0.95 });
    g.circle(x, y, r * 0.58).fill({ color: pal.core, alpha: 1 });
    g.circle(x - r * 0.15, y - r * 0.15, r * 0.25).fill({ color: 0xffffff, alpha: 0.95 });
    if (shimmer) {
      for (let i = 0; i < 2; i++) {
        const rr = r * (2 + i * 0.7 + 0.2 * Math.sin(t * 9 + i));
        g.ellipse(x, y, rr, rr * (0.85 + 0.1 * Math.sin(t * 13 + i))).stroke({
          width: 0.02,
          color: 0xffffff,
          alpha: 0.16,
        });
      }
    }
  }

  /** A magic projectile in flight: a shadow, a tapering tail of flame streaming behind, and the core. */
  private magicProjectile(f: Graphics, g: Graphics, p: Projectile, look: MagicLook, t: number): void {
    const P = iso;
    const pal = look.palette;
    const radius = p.def.delivery.type === 'projectile' ? p.def.delivery.radiusM : 0.3;
    f.circle(p.x, p.y, radius * 0.9).fill({ color: 0x000000, alpha: 0.25 });
    const c = P(p.x, p.y, BOLT_HEIGHT_M);
    const tail = P(p.x - p.dir.x * 1.3, p.y - p.dir.y * 1.3, BOLT_HEIGHT_M + 0.1);
    const len = Math.hypot(tail.x - c.x, tail.y - c.y) || 1;
    const nx = -(tail.y - c.y) / len;
    const ny = (tail.x - c.x) / len;
    for (const [colour, k, alpha] of [
      [pal.deep, 1.5, 0.5],
      [pal.hot, 1.15, 0.75],
      [pal.bright, 0.7, 0.9],
    ] as const) {
      const w = radius * k;
      const wob = Math.sin(t * 30 + k * 4) * w * 0.25;
      g.moveTo(c.x + nx * w, c.y + ny * w)
        .quadraticCurveTo(
          (c.x + tail.x) / 2 + nx * (w * 0.6 + wob),
          (c.y + tail.y) / 2 + ny * (w * 0.6 + wob),
          tail.x + nx * wob,
          tail.y + ny * wob,
        )
        .quadraticCurveTo(
          (c.x + tail.x) / 2 - nx * (w * 0.6 - wob),
          (c.y + tail.y) / 2 - ny * (w * 0.6 - wob),
          c.x - nx * w,
          c.y - ny * w,
        )
        .closePath()
        .fill({ color: colour, alpha });
    }
    this.core(g, c.x, c.y, radius * (1.05 + 0.08 * Math.sin(t * 40)), pal, t, look.flight?.shimmer ?? false);
  }

  /**
   * Three flickering flame tongues standing on (x, y), up to `heightM` tall (owner, 11/11/2026:
   * "look more like fire"): each a teardrop with a rounded base, sides that bulge and curl, and a
   * tip that sways, built from four layers (deep red, orange, amber, a yellow-white heart), with a
   * soft glow at the base.
   */
  private flame(
    g: Graphics,
    x: number,
    y: number,
    width: number,
    heightM: number,
    phase: number,
    pal: Palette = FIRE,
  ): void {
    if (heightM <= 0.01 || width <= 0.005) return;
    g.ellipse(x, y - heightM * 0.15, width * 0.9, width * 0.45).fill({ color: pal.hot, alpha: 0.18 });
    const layers = [
      { colour: pal.deep, k: 1, h: 1, alpha: 0.6 },
      { colour: pal.hot, k: 0.78, h: 0.86, alpha: 0.75 },
      { colour: pal.bright, k: 0.55, h: 0.66, alpha: 0.85 },
      { colour: pal.core, k: 0.3, h: 0.42, alpha: 0.9 },
    ];
    for (let i = 0; i < 3; i++) {
      const off = (i - 1) * width * 0.42;
      const tall = heightM * (i === 1 ? 1 : 0.72) * (0.75 + 0.25 * Math.abs(Math.sin(phase * 9 + i * 2.1)));
      const sway = Math.sin(phase * 7 + i * 1.7) * width * 0.35;
      for (const L of layers) {
        const w = width * 0.36 * L.k;
        const h = tall * L.h;
        const bx = x + off;
        const tipX = bx + sway * (0.6 + L.h * 0.4);
        const tipY = y - h;
        const curl = Math.sin(phase * 11 + i) * w * 0.4;
        g.moveTo(bx - w, y)
          .bezierCurveTo(bx - w * 1.35, y - h * 0.32, bx - w * 0.35 + curl, y - h * 0.62, tipX, tipY)
          .bezierCurveTo(bx + w * 0.4 + curl, y - h * 0.58, bx + w * 1.35, y - h * 0.3, bx + w, y)
          .quadraticCurveTo(bx, y + w * 0.55, bx - w, y)
          .closePath()
          .fill({ color: L.colour, alpha: L.alpha });
      }
    }
  }

  private rand(): number {
    // Small LCG: visuals only (gameplay randomness is seeded separately).
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }
}
