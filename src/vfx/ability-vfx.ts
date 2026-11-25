import { type Container, Graphics } from 'pixi.js';
import type { MagicLook } from '../abilities/ability-def';
import type { AbilityFx, Beam, Cloud, FireZone, Grenade, Projectile, Telegraph } from '../abilities/ability-world';
import type { InkWorld } from '../abilities/ink-world';
import { arcPath } from '../rendering/arc-path';
import { ISO_T, iso } from '../rendering/projection';
import { drawInk } from './ink-vfx';

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
  /** A smashed jar (Vexoris): glass shards, liquid droplets and lingering vapour at the contact. */
  readonly shards?: number;
  readonly splash?: { readonly count: number; readonly colour: number };
  readonly mist?: number;
  /** Shards fly in every direction (a jar landing on the ground) instead of along the blow. */
  readonly all?: boolean;
}

/** Points that burn while a fighter attacks (fists and feet), world x, y and height. */
export interface LimbFlames {
  readonly points: readonly { readonly x: number; readonly y: number; readonly z: number }[];
  /** Particle colours (default fire). */
  readonly palette?: Palette;
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
  /** Death Marks: a red sigil floats over the marked enemy (Shroud). */
  readonly marks?: readonly {
    readonly x: number;
    readonly y: number;
    readonly phase: 'stalk' | 'ready';
    readonly ageS: number;
  }[];
  /** Lingering gas clouds (Vexoris). */
  readonly clouds?: readonly Cloud[];
  /** Lobbed grenades in flight, landed or stuck (Vexoris). */
  readonly grenades?: readonly Grenade[];
  /** Parry stances up (Kenshiro's Perfect Parry): where, and how much of the window is left (1 to 0). */
  readonly parries?: readonly {
    readonly x: number;
    readonly y: number;
    readonly k: number;
    readonly palette: Palette | null;
  }[];
  /** Tornado funnels (Aerion's Tornado Surge): the shot in flight (small) and the one carrying a target up. */
  readonly funnels?: readonly {
    readonly x: number;
    readonly y: number;
    readonly ageS: number;
    readonly size: number;
    readonly palette: Palette | null;
  }[];
  /** Telekinetic barriers up (Psion's Psychic Barrier): where, how much is left (0..1), and seconds since the last hit. */
  readonly barriers?: readonly {
    readonly sonic?: boolean;
    readonly x: number;
    readonly y: number;
    readonly k: number;
    readonly hitS: number;
    readonly palette: Palette | null;
  }[];
  /** Rewind Time replaying backwards: the path he walked and how far (0..1) the rewind has run. */
  readonly rewindTrails?: readonly {
    readonly path: readonly { x: number; y: number }[];
    readonly k: number;
    readonly palette: Palette | null;
  }[];
  /** Where a Rewind Time started, and how far (0..1) the four seconds have run. */
  readonly rewindMarks?: readonly {
    readonly x: number;
    readonly y: number;
    readonly k: number;
    readonly palette: Palette | null;
  }[];
  /** Life being drawn out of a fighter and carried back to its drainer (Necro's Soul Drain): live end points, progress and palette. */
  readonly drains?: readonly {
    readonly from: { readonly x: number; readonly y: number; readonly z: number };
    readonly to: { readonly x: number; readonly y: number; readonly z: number };
    /** Seconds since the drain landed. */
    readonly ageS: number;
    /** How many particles, from how much was drained. */
    readonly count: number;
    readonly palette: Palette;
  }[];
  /** Fighters muted and/or with shattered defence (Reson's Resonance Break): seconds left of each. */
  readonly afflicted?: readonly {
    readonly x: number;
    readonly y: number;
    readonly muteS: number;
    readonly shatterS: number;
    /** Seconds of Age Acceleration left (Chronos). */
    readonly ageS: number;
    /** Held by Time Stop, and how many blows are waiting to land on it. */
    readonly frozen: boolean;
    readonly heldHits: number;
    readonly heightM: number;
  }[];
  /** Temporal afterimages trailing a fast-moving fighter (Chronos): where, facing, age and lifetime. */
  readonly ghosts?: readonly {
    readonly x: number;
    readonly y: number;
    readonly facing: number;
    readonly ageS: number;
    readonly lifeS: number;
  }[];
  /** Echo Strikes waiting to land: where thrown, along which way, and how far (0..1) to landing. */
  readonly echoes?: readonly {
    readonly x: number;
    readonly y: number;
    readonly dirX: number;
    readonly dirY: number;
    readonly k: number;
    readonly palette: Palette | null;
  }[];
  /** Harmless afterimage decoys. */
  readonly decoys?: readonly {
    readonly x: number;
    readonly y: number;
    readonly dirX: number;
    readonly ageS: number;
    readonly lifeS: number;
    readonly palette: Palette | null;
  }[];
  /** Rocket fists out (Geargrind): from where the caster stands, along `dir`, `extentM` out. */
  readonly fists?: readonly {
    readonly x: number;
    readonly y: number;
    readonly dirX: number;
    readonly dirY: number;
    readonly extentM: number;
    readonly palette: Palette | null;
  }[];
  /** Combat drones hovering by their owners, and how much durability they have left (0..1). */
  readonly drones?: readonly {
    readonly x: number;
    readonly y: number;
    readonly ageS: number;
    readonly k: number;
    readonly aimX: number;
    readonly aimY: number;
    readonly palette: Palette | null;
  }[];
  /** Cages round targets Floating Prison has lifted. */
  readonly cages?: readonly {
    readonly x: number;
    readonly y: number;
    readonly ageS: number;
    readonly heightM: number;
    readonly palette: Palette | null;
  }[];
  /** Objects Psion's Toss is raising: where they float, how high, how far through the rise (0..1) and the size of the thing. */
  readonly levitations?: readonly {
    readonly x: number;
    readonly y: number;
    readonly heightM: number;
    readonly k: number;
    readonly radiusM: number;
    readonly palette: Palette;
  }[];
  /** Vibration fields held at a fist (Reson's Vibration Punch): anchored to the fist, aimed along the punch, reaching out as it lands. */
  readonly fields?: readonly {
    readonly fist: { readonly x: number; readonly y: number; readonly z: number };
    readonly dirX: number;
    readonly dirY: number;
    /** How far in front of the fist the field reaches at full extent, metres. */
    readonly lengthM: number;
    readonly widthM: number;
    /** 0..1: how far the field has reached out (0 in the wind-up, 1 as the blow lands). */
    readonly extend: number;
    /** 0..1: how much of the wind-up's gathering has built; and how visible it still is as it fades after the blow. */
    readonly charge: number;
    readonly alpha: number;
    readonly palette: Palette;
  }[];
  /** Spins in progress (Aerion's Wind Blade): the wings sweep round as blades. */
  readonly whirls?: readonly {
    readonly x: number;
    readonly y: number;
    readonly ageS: number;
    readonly durationS: number;
    readonly radiusM: number;
    readonly palette: Palette | null;
  }[];
  readonly telegraphs: readonly Telegraph[];
  /** Glowing crystal patches under a Crystal Slide. */
  readonly slideTrail?: readonly {
    readonly x: number;
    readonly y: number;
    readonly ageS: number;
    readonly lifeS: number;
  }[];
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
  /** Inkmaster's living ink (serpent, dragon, cyclone, the Masterpiece) and where a fighter stands by name. */
  readonly ink?: {
    readonly world: InkWorld;
    readonly at: (id: string | null) => { x: number; y: number; lift?: number; lean?: number; depth?: number } | null;
  };
  /**
   * Spectral chains this frame (Grave Chains, owner 12/11/2026): from the caster's staff to the
   * flying hook, then to the enemy being dragged in. World points at chest height.
   */
  readonly chains?: readonly {
    readonly from: { readonly x: number; readonly y: number };
    readonly to: { readonly x: number; readonly y: number };
    readonly palette: Palette;
  }[];
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
  /** Stain colour (default scorch black). */
  colour?: number;
}

const MAX_PARTICLES = 480;
const CONTACT_FLASH_S = 0.09;
const SCORCH_LIFE_S = 6;
const FIRE: Palette = { deep: 0xd8320c, hot: 0xff6a00, bright: 0xffa53a, core: 0xfff1a8 };
/** Curse of Decay flaking away (dry rot green). */
const DECAY_FLAKES: Palette = { deep: 0x1c2410, hot: 0x5d8a1e, bright: 0xa8d84c, core: 0xd8eaa0 };
/** A beam pours at chest height. */
const BEAM_HEIGHT_M = 1.05;
/** Where a scream leaves the head: the mouth, about this high (metres) and a little ahead of the body. */
const MOUTH_HEIGHT_M = 1.58;
const MOUTH_AHEAD_M = 0;
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
/** Prismor's crystal eruptions by effect id: how many spikes, how tall (metres), and whether they stand in a ring round the edge. */
const CRYSTAL_ERUPTIONS: Readonly<Record<string, { count: number; h: number; ring?: boolean }>> = {
  'crystal-groundstrike': { count: 9, h: 1.45 },
  'crystal-thorns': { count: 8, h: 0.6 },
  'prison-lock': { count: 8, h: 0.7, ring: true },
};
/** Grave Chains run at the staff's height. */
const CHAIN_HEIGHT_M = 1.05;

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
    // The coils of the Ink Serpent round a fighter are drawn among the fighters themselves, so some pass behind and some in front.
    actors.addChild(this.inkBack, this.inkFront);
  }

  /** The serpent's coils behind and in front of the fighter it holds (in the fighters' depth sort). */
  private readonly inkBack = new Graphics();
  private readonly inkFront = new Graphics();

  update(dtS: number, input: AbilityVfxInput): void {
    this.timeS += dtS;
    this.inkBack.clear();
    this.inkFront.clear();
    for (const fx of input.fx) this.onFx(fx);
    for (const hit of input.impacts) this.burst(hit);
    for (const d of input.dust) this.dustFrom(d);
    for (const lf of input.limbFlames ?? []) {
      for (const p of lf.points) {
        const n = this.rand() < 0.5 + lf.strength * 0.5 ? 1 + Math.round(lf.strength * 2) : 0;
        this.emitAt(p.x, p.y, p.z, n, 0.4, 0.22 + lf.strength * 0.15, 0.06 + lf.strength * 0.04, lf.palette);
      }
    }
    for (const p of input.projectiles) {
      const look = p.def.look;
      if (look?.flight) this.flightTrail(p, look, dtS);
      else this.emitAt(p.x, p.y, BOLT_HEIGHT_M, 2, 0.6, 0.3, 0.09);
    }
    for (const cy of input.funnels ?? []) {
      const n = this.count(30 * cy.size * dtS);
      for (let i = 0; i < n; i++) {
        const ang = this.rand() * Math.PI * 2;
        const r = 0.5 * cy.size;
        this.emitAt(
          cy.x + Math.cos(ang) * r,
          cy.y + Math.sin(ang) * r,
          this.rand() * 2.2 * cy.size,
          1,
          0.8,
          0.5,
          0.07,
          cy.palette ?? undefined,
        );
      }
    }
    for (const w of input.whirls ?? []) {
      const n = this.count(60 * dtS);
      for (let i = 0; i < n; i++) {
        const ang = this.rand() * Math.PI * 2;
        const r = w.radiusM * (0.5 + 0.5 * this.rand());
        this.emitAt(
          w.x + Math.cos(ang) * r,
          w.y + Math.sin(ang) * r,
          0.5 + this.rand() * 1.0,
          1,
          0.4,
          0.35,
          0.06,
          w.palette ?? undefined,
        );
      }
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
    for (const b of input.beams ?? []) if (b.def.look?.beamStyle !== 'scream') this.beamParticles(b, dtS);
    for (const c of input.clouds ?? []) this.cloudPuffs(c, dtS);
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
  private readonly spikes: {
    x: number;
    y: number;
    h: number;
    lean: number;
    hand: boolean;
    ageS: number;
    /** A crystal spike (Prismor): faceted purple and blue, wider, rising faster and fading by shattering. */
    crystal?: boolean;
  }[] = [];

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
    if (fx.kind === 'impact' && CRYSTAL_ERUPTIONS[fx.vfx]) {
      // Prismor's eruptions (Groundstrike zones, Slide thorns, a bursting guard, a Prison closing): crystal spikes jump out of the floor.
      const e = CRYSTAL_ERUPTIONS[fx.vfx]!;
      for (let i = 0; i < e.count; i++) {
        const a = this.rand() * Math.PI * 2;
        const d = e.ring ? r * (0.75 + this.rand() * 0.25) : Math.sqrt(this.rand()) * r * 0.9;
        this.spikes.push({
          x: fx.x + Math.cos(a) * d,
          y: fx.y + Math.sin(a) * d,
          h: e.h * (0.55 + this.rand() * 0.6),
          lean: (this.rand() - 0.5) * 0.5 + (e.ring ? Math.cos(a) * 0.4 : 0),
          hand: false,
          crystal: true,
          ageS: -this.rand() * 0.1,
        });
      }
      if (this.spikes.length > 90) this.spikes.splice(0, this.spikes.length - 90);
    }
    if (fx.kind === 'release' && fx.vfx === 'judgement-cut' && fx.look) {
      // One of Final Judgement's unseen cuts: a hard white flash and a spray of sparks across the target.
      this.flashes.push({ x: fx.x, y: fx.y, z: 1.1, r: 0.55, ageS: 0, colour: 0xffffff, lifeS: 0.07 });
      this.emitAt(fx.x, fx.y, 1.1, 10, 7, 0.22, 0.05, fx.look.palette);
      return;
    }
    if (fx.kind === 'impact' && fx.stab && fx.look) this.bloodSpray(fx, fx.look.palette);
    if (fx.kind === 'impact' && fx.look?.impact) {
      this.magicImpact(fx, fx.look);
      return;
    }
    if (fx.kind === 'release' && fx.look?.charge) {
      // The charge lets go: a quick puff of the element where the hand was.
      this.emitAt(fx.x, fx.y, 1.0, 10, 1.8, 0.3, 0.1, fx.look.palette);
      return;
    }
    if (fx.vfx === 'decay-fade') {
      // Curse of Decay ends (owner, 12/11/2026): the rot dries and flakes away up the body.
      for (let i = 0; i < 3; i++) this.emitAt(fx.x, fx.y, 0.3 + i * 0.5, 8, 1.1, 0.6, 0.1, DECAY_FLAKES);
      return;
    }
    if (fx.kind === 'release' && fx.vfx?.endsWith('-whiff') && fx.look) {
      // A knife stab that met nothing: a thin dark swish where the blade went, no blood.
      this.emitAt(fx.x, fx.y, 1.0, 4, 0.8, 0.18, 0.06, fx.look.palette);
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

  /** Gas rolling off a cloud: soft puffs across its disc that drift up and fade, thicker while it is fresh. */
  private cloudPuffs(c: Cloud, dtS: number): void {
    const pal = c.def.look?.palette ?? FIRE;
    if (c.mine) return; // a mine lying dormant gives off nothing
    const fresh = 1 - c.ageS / c.lifeS;
    const fog = c.fog !== undefined;
    const n = this.count((fog ? 5 + c.radiusM * 5 : 10 + c.radiusM * 8) * (0.4 + 0.6 * fresh) * dtS);
    for (let i = 0; i < n; i++) {
      const p = this.free();
      if (!p) break;
      const ang = this.rand() * Math.PI * 2;
      const rad = Math.sqrt(this.rand()) * c.radiusM;
      Object.assign(p, {
        live: true,
        kind: 'smoke',
        colour: this.rand() < 0.5 ? pal.hot : pal.bright,
        x: c.x + Math.cos(ang) * rad,
        y: c.y + Math.sin(ang) * rad,
        z: 0.05 + this.rand() * (fog ? 1.4 : 0.25),
        vx: (this.rand() - 0.5) * (fog ? 0.7 : 0.4),
        vy: (this.rand() - 0.5) * (fog ? 0.7 : 0.4),
        vz: 0.25 + this.rand() * 0.4,
        ageS: 0,
        lifeS: (fog ? 1.6 : 0.9) + this.rand() * 0.8,
        size: fog ? 0.45 + this.rand() * 0.4 : 0.16 + this.rand() * 0.14,
        pal,
      });
    }
  }

  /**
   * A jar smashed on someone (Vexoris's heavy): pale glass shards flung out, green liquid droplets splashed wide, a
   * stain on the floor, and a lingering poison mist that rolls up and hangs about the strike point.
   */
  private jarSmash(hit: ImpactBurst): void {
    const base = Math.atan2(hit.dir.y, hit.dir.x);
    for (let n = 0; n < (hit.shards ?? 0); n++) {
      const p = this.free();
      if (!p) break;
      const a = hit.all ? this.rand() * Math.PI * 2 : base + (this.rand() - 0.5) * 2.6;
      const sp = 2.5 + this.rand() * 4.5;
      Object.assign(p, {
        live: true,
        kind: 'spark',
        colour: this.rand() < 0.5 ? 0xe6fbea : 0xb8e8c8,
        x: hit.x,
        y: hit.y,
        z: 0.9 + this.rand() * 0.5,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        vz: 1 + this.rand() * 3,
        ageS: 0,
        lifeS: 0.5 + this.rand() * 0.5,
        size: 0.05 + this.rand() * 0.05,
      });
    }
    for (let n = 0; n < (hit.splash?.count ?? 0); n++) {
      const p = this.free();
      if (!p) break;
      const a = this.rand() * Math.PI * 2;
      const sp = 1.2 + this.rand() * 3.2;
      Object.assign(p, {
        live: true,
        kind: 'spark',
        colour: hit.splash!.colour,
        x: hit.x,
        y: hit.y,
        z: 0.8 + this.rand() * 0.6,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        vz: 0.5 + this.rand() * 2.5,
        ageS: 0,
        lifeS: 0.4 + this.rand() * 0.5,
        size: 0.06 + this.rand() * 0.06,
      });
    }
    if (hit.splash) {
      this.scorches.push({ x: hit.x, y: hit.y, r: 0.55, ageS: 0, colour: hit.splash.colour });
      if (this.scorches.length > 12) this.scorches.shift();
    }
    for (let n = 0; n < (hit.mist ?? 0); n++) {
      const p = this.free();
      if (!p) break;
      const a = this.rand() * Math.PI * 2;
      const r = this.rand() * 0.5;
      Object.assign(p, {
        live: true,
        kind: 'smoke',
        colour: this.rand() < 0.5 ? 0x4fd81c : 0x8bd44a,
        x: hit.x + Math.cos(a) * r,
        y: hit.y + Math.sin(a) * r,
        z: 0.4 + this.rand() * 0.8,
        vx: (this.rand() - 0.5) * 0.5,
        vy: (this.rand() - 0.5) * 0.5,
        vz: 0.15 + this.rand() * 0.35,
        ageS: 0,
        lifeS: 1.4 + this.rand() * 1.2,
        size: 0.18 + this.rand() * 0.16,
        pal: { deep: 0x153a08, hot: 0x3fae14, bright: 0x7dff3a, core: 0xe8ffc8 },
      });
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
    this.jarSmash(hit);
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
    if (im.shards || im.splash || im.mist)
      this.jarSmash({
        x: fx.x,
        y: fx.y,
        dir: { x: 1, y: 0 },
        sparks: 0,
        speedMps: 0,
        colour: pal.bright,
        burstM: 0,
        all: true,
        ...(im.shards ? { shards: im.shards } : {}),
        ...(im.splash ? { splash: im.splash } : {}),
        ...(im.mist ? { mist: im.mist } : {}),
      });
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
    for (let n = 1; n < (im.rings ?? 1); n++)
      this.rings.push({
        colour: n % 2 === 0 ? pal.core : pal.bright,
        x: fx.x,
        y: fx.y,
        z: 0,
        r0: im.ringM * 0.25,
        r1: im.ringM * (1 - 0.1 * n),
        ageS: -0.1 * n,
        lifeS: 0.5,
      });
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

  /**
   * A knife going in (owner, 13/11/2026: visible blood on every stab): a fan of blood drops thrown
   * out the far side along the stab, falling and spattering. Each stab of a combo sprays at its own
   * angle so the three read as separate wounds.
   */
  private bloodSpray(fx: AbilityFx, pal: Palette): void {
    const dir = Math.atan2(fx.dirY ?? 0, fx.dirX ?? 1);
    const skew = [0, 0.45, -0.45][((fx.stab ?? 1) - 1) % 3]!;
    for (let n = 0; n < 16; n++) {
      const p = this.free();
      if (!p) return;
      const a = dir + skew + (this.rand() - 0.5) * 0.9;
      const sp = 2.5 + this.rand() * 4.5;
      Object.assign(p, {
        live: true,
        kind: 'spark',
        colour: this.rand() < 0.6 ? pal.hot : pal.deep,
        x: fx.x,
        y: fx.y,
        z: 1.0 + this.rand() * 0.3,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        vz: 0.5 + this.rand() * 2.5,
        ageS: 0,
        lifeS: 0.3 + this.rand() * 0.35,
        size: 0.05 + this.rand() * 0.05,
        pal,
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
      f.circle(s.x, s.y, s.r).fill({ color: s.colour ?? 0x15100c, alpha: s.colour === undefined ? a : a * 1.3 });
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
      f.circle(s.x, s.y, 0.22).fill({ color: s.crystal ? 0x1b1450 : 0x1a0d26, alpha: 0.45 * Math.min(1, rise + 0.3) });
      const base = P(s.x, s.y, 0);
      const h = s.h * rise;
      if (h < 0.02) continue;
      if (s.crystal) {
        // A faceted crystal spike: a dark edge, a purple body, a lit facet and a pale glint, wide at the root and sharp at the tip.
        const w = 0.07 + 0.05 * s.h;
        const tip = { x: base.x + s.lean * h, y: base.y - h };
        const mid = { x: base.x + s.lean * h * 0.45, y: base.y - h * 0.5 };
        g.poly([
          base.x - w * 1.15,
          base.y,
          mid.x - w * 1.1,
          mid.y,
          tip.x,
          tip.y,
          mid.x + w * 0.9,
          mid.y,
          base.x + w * 1.15,
          base.y,
        ]).fill(0x1b1450);
        g.poly([
          base.x - w,
          base.y,
          mid.x - w * 0.9,
          mid.y,
          tip.x,
          tip.y + 0.02,
          mid.x + w * 0.7,
          mid.y,
          base.x + w,
          base.y,
        ]).fill({ color: 0x6f64ff, alpha: 0.95 });
        g.poly([base.x - w, base.y, mid.x - w * 0.9, mid.y, tip.x, tip.y + 0.02, mid.x, mid.y + 0.02]).fill({
          color: 0xe9e2ff,
          alpha: 0.4,
        });
        g.moveTo(base.x, base.y)
          .lineTo(tip.x, tip.y + 0.03)
          .stroke({ width: 0.012, color: 0xe9e2ff, alpha: 0.7 });
        g.circle(tip.x, tip.y, 0.1).fill({ color: 0x4aa8ff, alpha: 0.25 * rise });
        continue;
      }
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

    // Crystal Slide: a glowing trail of crystal lying under the path, fading from the oldest end.
    for (const m of input.slideTrail ?? []) {
      const life = 1 - m.ageS / m.lifeS;
      const pulse = 0.8 + 0.2 * Math.sin(t * 9 + m.x * 3);
      f.circle(m.x, m.y, 0.42).fill({ color: 0x4aa8ff, alpha: 0.2 * life * pulse });
      f.circle(m.x, m.y, 0.22).fill({ color: 0xe9e2ff, alpha: 0.28 * life });
      const q = P(m.x, m.y, 0.02);
      g.poly([q.x - 0.09, q.y, q.x, q.y - 0.2 * life, q.x + 0.09, q.y]).fill({ color: 0x7b6cff, alpha: 0.85 * life });
    }

    // Telegraphs (REQ-ABL-6): a clear ring where it will land, filling as the moment approaches.
    for (const tg of input.telegraphs) {
      const k = Math.min(1, tg.ageS / tg.durationS);
      const pulse = 0.75 + 0.25 * Math.sin(t * 22);
      // The ring takes its element's colour for wind dives; everything else keeps the warning orange.
      const tp = tg.def.look?.airBody === 'wind' || tg.def.look?.telegraph ? tg.def.look.palette : FIRE;
      if (tg.def.look?.telegraph === 'crystal') {
        // Prismor's ground warning: a pale crystal ring on the floor, shard marks growing from the middle as the moment nears.
        f.circle(tg.x, tg.y, tg.radiusM).fill({ color: tp.deep, alpha: 0.18 + 0.12 * k });
        f.circle(tg.x, tg.y, tg.radiusM * k).fill({ color: tp.hot, alpha: 0.2 });
        f.circle(tg.x, tg.y, tg.radiusM).stroke({ width: 0.07, color: tp.bright, alpha: pulse });
        for (let i = 0; i < 9; i++) {
          const a0 = (i / 9) * Math.PI * 2 + 0.4;
          const r0 = tg.radiusM * (0.25 + 0.6 * ((i * 0.37) % 1));
          const len = 0.18 + 0.4 * k * (0.5 + ((i * 0.53) % 1));
          const x0 = tg.x + Math.cos(a0) * r0;
          const y0 = tg.y + Math.sin(a0) * r0;
          f.poly([x0 - 0.05, y0, x0, y0 - len * ISO_T * 2, x0 + 0.05, y0]).fill({
            color: tp.core,
            alpha: 0.35 + 0.5 * k,
          });
        }
        continue;
      }
      if (tg.def.look?.telegraph === 'compress') {
        // Mind Crush: the ring closes in on the target, brightening as it squeezes.
        const r = tg.radiusM * (1 - 0.8 * k);
        f.circle(tg.x, tg.y, tg.radiusM).stroke({ width: 0.03, color: tp.hot, alpha: 0.3 });
        f.circle(tg.x, tg.y, r).fill({ color: tp.deep, alpha: 0.12 + 0.2 * k });
        f.circle(tg.x, tg.y, r).stroke({ width: 0.07 + 0.05 * k, color: tp.bright, alpha: pulse });
        for (let i = 0; i < 6; i++) {
          const a0 = t * 2 + (i * Math.PI) / 3;
          f.moveTo(tg.x + Math.cos(a0) * r * 1.1, tg.y + Math.sin(a0) * r * 1.1)
            .lineTo(tg.x + Math.cos(a0) * r * 0.7, tg.y + Math.sin(a0) * r * 0.7)
            .stroke({ width: 0.04, color: tp.core, alpha: 0.7 });
        }
        continue;
      }
      if (tg.def.look?.telegraph === 'rings') {
        // Reson: the limit ring, and sound rings drawn in toward him again and again as the charge builds.
        f.circle(tg.x, tg.y, tg.radiusM).stroke({ width: 0.04, color: tp.hot, alpha: 0.35 + 0.3 * k });
        for (let i = 0; i < 3; i++) {
          const ph = (t * (1.2 + k * 2) + i / 3) % 1;
          f.circle(tg.x, tg.y, tg.radiusM * (1 - ph)).stroke({
            width: 0.05,
            color: tp.bright,
            alpha: (0.25 + 0.5 * k) * (1 - ph * 0.5),
          });
        }
        f.circle(tg.x, tg.y, tg.radiusM * 0.12 * (1 + k)).fill({ color: tp.core, alpha: 0.5 + 0.4 * k });
        continue;
      }
      f.circle(tg.x, tg.y, tg.radiusM).fill({ color: tp.deep, alpha: 0.14 });
      f.circle(tg.x, tg.y, tg.radiusM * k).fill({ color: tp.hot, alpha: 0.22 });
      f.circle(tg.x, tg.y, tg.radiusM).stroke({ width: 0.07, color: tp.bright, alpha: pulse });
      if (tg.def.look?.telegraph === 'debris') {
        // Mindstorm: objects drift up out of the floor and orbit inside the ring before they are flung.
        for (let i = 0; i < 14; i++) {
          const ang = t * (0.8 + (i % 3) * 0.2) + i * 1.7;
          const rad = tg.radiusM * (0.35 + 0.55 * ((i * 0.37) % 1));
          const rise = Math.min(1, k * 1.6) * (0.6 + 1.6 * ((i * 0.53) % 1));
          const c = iso(tg.x + Math.cos(ang) * rad, tg.y + Math.sin(ang) * rad, rise);
          const sz = 0.1 + 0.07 * ((i * 0.29) % 1);
          const sp = t * 3 + i;
          const pts = [-1, -1, 1, -1, 1, 1, -1, 1].map((v, n) =>
            n % 2 === 0 ? c.x + (v * Math.cos(sp) - (n % 2 === 0 ? -1 : 1) * 0) * sz : c.y + v * sz * ISO_T * 1.6,
          );
          g.poly(pts).fill({ color: i % 2 === 0 ? tp.deep : 0x3a3548, alpha: 0.95 });
          g.poly(pts).stroke({ width: 0.012, color: tp.bright, alpha: 0.9 });
        }
      }
    }

    // Death Mark (owner, 20/11/2026): a red sigil, a ringed eye with a blade through it, turning slowly over the
    // marked enemy's head while Shroud stalks, and a hard flickering pulse once the mark is charged.
    for (const m of input.marks ?? []) {
      const ready = m.phase === 'ready';
      const pulse = ready ? 0.65 + 0.35 * Math.sin(t * 16) : 0.8 + 0.15 * Math.sin(t * 4);
      const appear = Math.min(1, m.ageS / 0.25);
      const c = P(m.x, m.y, 2.35 + 0.06 * Math.sin(t * 3));
      const r = 0.3 * appear * (ready ? 1.12 : 1);
      const spin = t * (ready ? 2.2 : 0.7);
      g.circle(c.x, c.y, r * 1.35).fill({ color: 0xa30d16, alpha: 0.18 * pulse });
      g.circle(c.x, c.y, r).stroke({ width: 0.035, color: 0xe5242e, alpha: pulse });
      g.circle(c.x, c.y, r * 0.62).stroke({ width: 0.022, color: 0xff9a9a, alpha: 0.8 * pulse });
      for (let i = 0; i < 3; i++) {
        const a = spin + (i * Math.PI * 2) / 3;
        g.moveTo(c.x + Math.cos(a) * r * 1.15, c.y + Math.sin(a) * r * 1.15)
          .lineTo(c.x - Math.cos(a) * r * 1.15, c.y - Math.sin(a) * r * 1.15)
          .stroke({ width: 0.03, color: 0xe5242e, alpha: pulse, cap: 'round' });
      }
      g.circle(c.x, c.y, r * 0.18).fill({ color: 0xff3a3a, alpha: pulse });
      f.circle(m.x, m.y, 0.55 * appear).stroke({ width: 0.05, color: 0xe5242e, alpha: 0.55 * pulse });
    }

    // Toxic clouds: a pool of green on the floor that thins as it fades, and a ring while a trap is arming.
    for (const c of input.clouds ?? []) {
      const pal = c.def.look?.palette ?? FIRE;
      if (c.mine) {
        this.landmine(f, g, c, t);
        continue;
      }
      const life = Math.min(1, (1 - c.ageS / c.lifeS) * 3);
      if (c.fog) {
        // A thick bank of poison fog: a wide green pool with a drifting, pulsing edge.
        const rise = Math.min(1, c.ageS / 0.8);
        const rad = c.radiusM * rise;
        if (c.def.look?.field === 'clock') {
          // Temporal Collapse / End of Time: a pale pool with a clock face turning slowly in it, ticks round the rim and two hands.
          f.circle(c.x, c.y, rad).fill({ color: pal.deep, alpha: 0.22 * life });
          f.circle(c.x, c.y, rad).stroke({ width: 0.06, color: pal.bright, alpha: 0.7 * life });
          f.circle(c.x, c.y, rad * 0.86).stroke({ width: 0.03, color: pal.hot, alpha: 0.5 * life });
          for (let i = 0; i < 12; i++) {
            const a0 = (i * Math.PI) / 6;
            f.moveTo(c.x + Math.cos(a0) * rad * 0.9, c.y + Math.sin(a0) * rad * 0.9)
              .lineTo(
                c.x + Math.cos(a0) * rad * (i % 3 === 0 ? 0.74 : 0.82),
                c.y + Math.sin(a0) * rad * (i % 3 === 0 ? 0.74 : 0.82),
              )
              .stroke({ width: i % 3 === 0 ? 0.06 : 0.035, color: pal.core, alpha: 0.8 * life });
          }
          const ha = t * 0.5;
          f.moveTo(c.x, c.y)
            .lineTo(c.x + Math.cos(ha) * rad * 0.7, c.y + Math.sin(ha) * rad * 0.7)
            .stroke({ width: 0.06, color: pal.bright, alpha: 0.8 * life, cap: 'round' });
          f.moveTo(c.x, c.y)
            .lineTo(c.x + Math.cos(ha * 12) * rad * 0.5, c.y + Math.sin(ha * 12) * rad * 0.5)
            .stroke({ width: 0.04, color: pal.core, alpha: 0.7 * life, cap: 'round' });
          continue;
        }
        f.circle(c.x, c.y, rad).fill({ color: pal.deep, alpha: 0.4 * life });
        f.circle(c.x, c.y, rad * 0.8).fill({ color: pal.hot, alpha: 0.3 * life });
        f.circle(c.x, c.y, rad * 0.5).fill({ color: pal.bright, alpha: 0.16 * life });
        f.circle(c.x, c.y, rad * (0.97 + 0.03 * Math.sin(t * 2.2))).stroke({
          width: 0.12,
          color: pal.bright,
          alpha: 0.4 * life,
        });
        continue;
      }
      const swell = Math.min(1, c.ageS / 0.35);
      f.circle(c.x, c.y, c.radiusM * swell).fill({ color: pal.deep, alpha: 0.3 * life });
      f.circle(c.x, c.y, c.radiusM * 0.7 * swell).fill({ color: pal.hot, alpha: 0.22 * life });
      if (c.ageS < c.armS) f.circle(c.x, c.y, c.radiusM).stroke({ width: 0.06, color: pal.bright, alpha: 0.6 });
    }

    // Telekinetic Toss: a purple psychic glow on the floor beneath the object as it rises, with rings pulsing out and motes lifting off it.
    for (const lv of input.levitations ?? []) {
      const pal = lv.palette;
      const pulse = 0.6 + 0.4 * Math.sin(t * 14);
      const r = lv.radiusM * (1.1 + 0.5 * lv.k);
      f.circle(lv.x, lv.y, r * 1.5).fill({ color: pal.deep, alpha: 0.22 + 0.15 * lv.k });
      f.circle(lv.x, lv.y, r).fill({ color: pal.hot, alpha: 0.3 * pulse + 0.1 });
      f.circle(lv.x, lv.y, r * 0.55).fill({ color: pal.bright, alpha: 0.35 + 0.2 * pulse });
      for (let i = 0; i < 2; i++) {
        const ph = (t * 1.6 + i * 0.5) % 1;
        f.circle(lv.x, lv.y, r * (0.5 + ph)).stroke({ width: 0.04, color: pal.core, alpha: 0.7 * (1 - ph) });
      }
      for (let i = 0; i < 6; i++) {
        const ang = i * 1.05 + t * 1.3;
        const rise = ((t * 0.9 + i / 6) % 1) * (lv.heightM + 0.4);
        const q = P(lv.x + Math.cos(ang) * r * 0.8, lv.y + Math.sin(ang) * r * 0.8, rise);
        g.circle(q.x, q.y, 0.04).fill({ color: pal.core, alpha: 0.75 * (1 - rise / (lv.heightM + 0.5)) });
      }
    }

    // Soul Drain: small particles of life are pulled out of the victim and curve back to the drainer, one after another, each
    // arriving with a faint red pulse where it is taken in.
    for (const dr of input.drains ?? []) {
      const pal = dr.palette;
      for (let i = 0; i < dr.count; i++) {
        const u = (dr.ageS - i * 0.045) / 0.75;
        if (u <= 0 || u >= 1) continue;
        const e = u * u * (3 - 2 * u);
        // A quadratic curve rising and bowing aside, each particle on its own arc; it quickens toward the drainer.
        const side = (((i * 0.618) % 1) - 0.5) * 1.4;
        const mx = (dr.from.x + dr.to.x) / 2;
        const my = (dr.from.y + dr.to.y) / 2;
        const dx = dr.to.x - dr.from.x;
        const dy = dr.to.y - dr.from.y;
        const len = Math.hypot(dx, dy) || 1;
        const cx = mx - (dy / len) * side;
        const cy = my + (dx / len) * side;
        const cz = Math.max(dr.from.z, dr.to.z) + 0.5 + ((i * 0.37) % 1) * 0.5;
        const bez = (a: number, b: number, c: number): number =>
          (1 - e) * (1 - e) * a + 2 * (1 - e) * e * b + e * e * c;
        const q = P(bez(dr.from.x, cx, dr.to.x), bez(dr.from.y, cy, dr.to.y), bez(dr.from.z, cz, dr.to.z));
        const sz = 0.065 * (1 - 0.4 * e);
        g.circle(q.x, q.y, sz * 2.6).fill({ color: pal.core, alpha: 0.22 * (1 - e * 0.5) });
        g.circle(q.x, q.y, sz).fill({ color: pal.bright, alpha: 0.9 });
        g.circle(q.x, q.y, sz * 0.5).fill({ color: pal.core, alpha: 0.95 });
        // A short fading tail behind it.
        const e2 = Math.max(0, e - 0.035);
        const t0 = P(
          bez2(dr.from.x, cx, dr.to.x, e2),
          bez2(dr.from.y, cy, dr.to.y, e2),
          bez2(dr.from.z, cz, dr.to.z, e2),
        );
        g.moveTo(t0.x, t0.y)
          .lineTo(q.x, q.y)
          .stroke({ width: sz * 1.3, color: pal.bright, alpha: 0.4, cap: 'round' });
        if (u > 0.9) {
          const p2 = P(dr.to.x, dr.to.y, dr.to.z);
          const k = (u - 0.9) / 0.1;
          g.circle(p2.x, p2.y, 0.12 + 0.18 * k).fill({ color: pal.core, alpha: 0.28 * (1 - k) });
        }
      }
    }

    // Vibration Punch: rippling air held at the fist. Waves of distortion roll away from the knuckles through a cone that widens with
    // distance, with a quivering shimmer around the fist itself; it only ever exists as part of the arm's own movement.
    for (const fd of input.fields ?? []) {
      const pal = fd.palette;
      const len = Math.max(0.05, fd.lengthM * fd.extend);
      const px = -fd.dirY;
      const py = fd.dirX;
      const at = (d: number, s: number, lift = 0): { x: number; y: number } =>
        P(
          fd.fist.x + fd.dirX * d + px * s * (fd.widthM * (0.25 + 0.75 * Math.min(1, d / Math.max(0.3, fd.lengthM)))),
          fd.fist.y + fd.dirY * d + py * s * (fd.widthM * (0.25 + 0.75 * Math.min(1, d / Math.max(0.3, fd.lengthM)))),
          fd.fist.z + lift,
        );
      if (fd.extend > 0.02) {
        // The body of the field: a faint, shimmering cone from the knuckles to the far edge.
        const cone = [at(0, -1), at(len, -1), at(len, 1), at(0, 1)];
        g.poly(cone.flatMap((q) => [q.x, q.y])).fill({ color: pal.hot, alpha: 0.2 * fd.alpha });
        g.poly(cone.flatMap((q) => [q.x, q.y])).stroke({ width: 0.035, color: pal.bright, alpha: 0.55 * fd.alpha });
        // Wave fronts rolling outward, each a wobbling arc; a pale echo is drawn a hair off it, like air bending light.
        const fronts = 6;
        for (let i = 0; i < fronts; i++) {
          const ph = (t * 3.2 + i / fronts) % 1;
          const d = len * ph;
          const a = fd.alpha * (1 - ph) * (0.35 + 0.65 * fd.extend);
          const pts: { x: number; y: number }[] = [];
          const echo: { x: number; y: number }[] = [];
          for (let k = 0; k <= 10; k++) {
            const s = -1 + (k / 10) * 2;
            const wob = Math.sin(t * 38 + k * 1.7 + i * 2.1) * 0.035;
            pts.push(at(d, s, wob));
            echo.push(at(d + 0.05, s, -wob * 0.8));
          }
          g.poly(pts.flatMap((q) => [q.x, q.y])).stroke({
            width: 0.085,
            color: pal.bright,
            alpha: Math.min(1, a * 1.3),
          });
          g.poly(echo.flatMap((q) => [q.x, q.y])).stroke({ width: 0.04, color: pal.core, alpha: Math.min(1, a) });
        }
        // Sound lines streaming along the punch.
        for (let i = 0; i < 4; i++) {
          const s = -0.7 + i * 0.47;
          const a0 = at(len * 0.1, s);
          const a1 = at(len * (0.55 + 0.4 * ((t * 2 + i * 0.31) % 1)), s, Math.sin(t * 45 + i) * 0.03);
          g.moveTo(a0.x, a0.y)
            .lineTo(a1.x, a1.y)
            .stroke({ width: 0.02, color: pal.core, alpha: 0.35 * fd.alpha, cap: 'round' });
        }
      }
      // The fist itself: a shaking halo of tight rings (stronger the longer the wind-up has built), and a bright core.
      const c = P(fd.fist.x, fd.fist.y, fd.fist.z);
      const quiver = Math.sin(t * 60) * 0.012 * (0.4 + fd.charge);
      for (let i = 0; i < 3; i++) {
        const ph = (t * 5 + i / 3) % 1;
        const r = (0.1 + 0.2 * fd.charge + 0.16 * ph) * (1 + 0.5 * fd.extend);
        g.ellipse(c.x + quiver, c.y, r, r * 0.95).stroke({
          width: 0.03,
          color: pal.bright,
          alpha: (1 - ph) * 0.8 * fd.alpha,
        });
      }
      g.circle(c.x - quiver, c.y, 0.05 + 0.07 * fd.charge).fill({
        color: pal.core,
        alpha: (0.45 + 0.4 * fd.charge) * fd.alpha,
      });
    }

    // Perfect Parry: a thin ring round him that closes as the window runs out, with a bright flash of crossed steel.
    for (const pr of input.parries ?? []) {
      const pal = pr.palette ?? FIRE;
      const pulse = 0.6 + 0.4 * Math.sin(t * 24);
      f.circle(pr.x, pr.y, 0.5 + 0.5 * pr.k).stroke({ width: 0.04, color: pal.bright, alpha: 0.7 * pulse });
      f.circle(pr.x, pr.y, 0.3 + 0.2 * pr.k).fill({ color: pal.hot, alpha: 0.12 });
      const c = iso(pr.x, pr.y, 1.0);
      for (const sgn of [-1, 1]) {
        g.moveTo(c.x - 0.28, c.y - 0.28 * sgn)
          .lineTo(c.x + 0.28, c.y + 0.28 * sgn)
          .stroke({ width: 0.03, color: pal.core, alpha: 0.55 * pulse, cap: 'round' });
      }
    }

    // Psychic Barrier: a translucent dome of faint hexagonal facets that flares and ripples where it was struck.
    for (const bar of input.barriers ?? []) {
      const pal = bar.palette ?? FIRE;
      const flare = Math.max(0, 1 - bar.hitS / 0.35);
      const c = iso(bar.x, bar.y, 1.0);
      const rx = 0.95;
      if (bar.sonic) {
        // Resonance Barrier: concentric sound rings that ripple outward, and distort where it was struck.
        g.ellipse(c.x, c.y, rx, rx * 1.05).fill({ color: pal.deep, alpha: 0.1 + 0.1 * bar.k });
        for (let i = 0; i < 3; i++) {
          const ph = (t * 0.9 + i / 3) % 1;
          const r = rx * (0.45 + 0.6 * ph);
          g.ellipse(c.x, c.y, r, r * 1.05).stroke({
            width: 0.03,
            color: pal.bright,
            alpha: (1 - ph) * (0.4 + 0.4 * bar.k),
          });
        }
        g.ellipse(c.x, c.y, rx, rx * 1.05).stroke({
          width: 0.04 + 0.05 * flare,
          color: pal.bright,
          alpha: 0.5 + 0.4 * flare,
        });
        if (flare > 0)
          for (let i = 0; i < 2; i++)
            g.ellipse(
              c.x,
              c.y,
              rx * (1 + 0.12 * (1 - flare) * (i + 1)),
              rx * 1.05 * (1 + 0.1 * (1 - flare) * (i + 1)),
            ).stroke({ width: 0.04, color: pal.core, alpha: 0.6 * flare });
        continue;
      }
      g.ellipse(c.x, c.y, rx, rx * 1.05).fill({ color: pal.deep, alpha: 0.12 + 0.12 * bar.k });
      g.ellipse(c.x, c.y, rx, rx * 1.05).stroke({
        width: 0.03 + 0.03 * flare,
        color: pal.bright,
        alpha: 0.35 + 0.5 * flare,
      });
      for (let i = 0; i < 6; i++) {
        const a0 = t * 0.6 + (i * Math.PI) / 3;
        const px = c.x + Math.cos(a0) * rx * 0.62;
        const py = c.y + Math.sin(a0) * rx * 0.62 * 1.05;
        const hex = Array.from({ length: 6 }, (_, n) => [
          px + Math.cos((n * Math.PI) / 3) * 0.2,
          py + Math.sin((n * Math.PI) / 3) * 0.2,
        ]).flat();
        g.poly(hex).stroke({ width: 0.012, color: pal.core, alpha: 0.18 + 0.4 * flare });
      }
      if (flare > 0)
        g.ellipse(c.x, c.y, rx * (1.02 + 0.1 * (1 - flare)), rx * 1.07).stroke({
          width: 0.05,
          color: pal.core,
          alpha: 0.6 * flare,
        });
    }

    // Resonance Break: a muted fighter has a crossed-out speaker over its head, one whose defence is shattered a cracked ring at its feet.
    for (const af of input.afflicted ?? []) {
      if (af.muteS > 0) {
        const fade = Math.min(1, af.muteS / 0.4);
        const c = P(af.x, af.y, af.heightM + 0.3);
        const pulse = 0.8 + 0.2 * Math.sin(t * 8);
        g.circle(c.x, c.y, 0.2 * pulse).fill({ color: 0x0a1418, alpha: 0.7 * fade });
        g.poly([
          c.x - 0.1,
          c.y - 0.04,
          c.x - 0.04,
          c.y - 0.04,
          c.x + 0.04,
          c.y - 0.1,
          c.x + 0.04,
          c.y + 0.1,
          c.x - 0.04,
          c.y + 0.04,
          c.x - 0.1,
          c.y + 0.04,
        ]).fill({ color: 0xeafcff, alpha: fade });
        g.moveTo(c.x - 0.17, c.y + 0.15)
          .lineTo(c.x + 0.17, c.y - 0.15)
          .stroke({ width: 0.04, color: 0xff5a5a, alpha: fade, cap: 'round' });
      }
      if (af.shatterS > 0) {
        const fade = Math.min(1, af.shatterS / 0.5);
        for (let i = 0; i < 6; i++) {
          const a0 = (i * Math.PI) / 3 + 0.2;
          arcPath(f, af.x, af.y, 0.62, a0, a0 + 0.62).stroke({
            width: 0.05,
            color: 0x7ae8ff,
            alpha: 0.85 * fade,
            cap: 'round',
          });
          f.moveTo(af.x + Math.cos(a0 + 0.31) * 0.62, af.y + Math.sin(a0 + 0.31) * 0.62)
            .lineTo(af.x + Math.cos(a0 + 0.31) * 0.85, af.y + Math.sin(a0 + 0.31) * 0.85)
            .stroke({ width: 0.03, color: 0xeafcff, alpha: 0.7 * fade });
        }
      }
    }
    // Chronos's time: afterimages, waiting echoes and decoys, all as cyan silhouettes with clock marks.
    const silhouette = (x: number, y: number, facing: number, alpha: number, colour: number, glow: number): void => {
      const head = iso(x, y, 1.62);
      const chest = iso(x, y, 1.25);
      const hip = iso(x, y, 0.85);
      const foot = iso(x, y, 0);
      g.circle(head.x, head.y, 0.13).fill({ color: colour, alpha });
      g.moveTo(chest.x, chest.y).lineTo(hip.x, hip.y).stroke({ width: 0.12, color: colour, alpha, cap: 'round' });
      g.moveTo(hip.x, hip.y)
        .lineTo(foot.x + 0.14 * facing, foot.y)
        .stroke({ width: 0.09, color: colour, alpha, cap: 'round' });
      g.moveTo(hip.x, hip.y)
        .lineTo(foot.x - 0.16 * facing, foot.y)
        .stroke({ width: 0.09, color: colour, alpha, cap: 'round' });
      g.moveTo(chest.x, chest.y)
        .lineTo(chest.x + 0.34 * facing, chest.y + 0.1)
        .stroke({ width: 0.08, color: colour, alpha, cap: 'round' });
      f.circle(x, y, 0.4).fill({ color: glow, alpha: alpha * 0.25 });
    };
    for (const gh of input.ghosts ?? []) {
      const k = 1 - gh.ageS / gh.lifeS;
      silhouette(gh.x, gh.y, gh.facing, 0.42 * k, 0x7ae8ff, 0x19c4e0);
    }
    for (const dc of input.decoys ?? []) {
      const pal = dc.palette ?? FIRE;
      const fade = Math.min(1, (dc.lifeS - dc.ageS) / 0.5);
      silhouette(dc.x, dc.y, dc.dirX >= 0 ? 1 : -1, (0.4 + 0.1 * Math.sin(t * 14)) * fade, pal.bright, pal.hot);
      // Now and then it repeats the last blow, a pale arc and no more.
      const beat = dc.ageS % 0.9;
      if (beat > 0.45 && beat < 0.6) {
        const c0 = iso(dc.x + dc.dirX * 0.8, dc.y, 1.2);
        arcPath(g, c0.x, c0.y, 0.6, -1.0, 1.0).stroke({
          width: 0.05,
          color: pal.core,
          alpha: 0.5 * fade,
          cap: 'round',
        });
      }
    }
    for (const e of input.echoes ?? []) {
      const pal = e.palette ?? FIRE;
      silhouette(e.x, e.y, e.dirX >= 0 ? 1 : -1, 0.2 + 0.3 * e.k, pal.bright, pal.hot);
      // A clock ring closing as the echo comes due, its hand sweeping round.
      const r = 0.7 * (1.2 - 0.4 * e.k);
      f.circle(e.x, e.y, r).stroke({ width: 0.04, color: pal.bright, alpha: 0.35 + 0.5 * e.k });
      f.moveTo(e.x, e.y)
        .lineTo(
          e.x + Math.cos(e.k * Math.PI * 2 - Math.PI / 2) * r,
          e.y + Math.sin(e.k * Math.PI * 2 - Math.PI / 2) * r,
        )
        .stroke({ width: 0.05, color: pal.core, alpha: 0.9, cap: 'round' });
    }

    // Chronos: an aging target is wrapped in falling sand; a target held by Time Stop wears a gold clock ring, with one gold tick
    // above its head for every blow waiting to land.
    for (const af of input.afflicted ?? []) {
      if (af.ageS > 0) {
        const fade = Math.min(1, af.ageS / 0.8);
        for (let i = 0; i < 6; i++) {
          const ph = (t * 0.9 + i / 6) % 1;
          const c = P(af.x + Math.sin(i * 2.1) * 0.35, af.y + Math.cos(i * 1.7) * 0.2, af.heightM * (1 - ph));
          g.circle(c.x, c.y, 0.03).fill({ color: 0xffd36a, alpha: 0.85 * fade * (1 - ph * 0.4) });
        }
        f.circle(af.x, af.y, 0.55).stroke({ width: 0.04, color: 0xffd36a, alpha: 0.5 * fade });
        const h0 = P(af.x, af.y, af.heightM + 0.2);
        g.poly([
          h0.x - 0.07,
          h0.y - 0.1,
          h0.x + 0.07,
          h0.y - 0.1,
          h0.x,
          h0.y,
          h0.x + 0.07,
          h0.y + 0.1,
          h0.x - 0.07,
          h0.y + 0.1,
          h0.x,
          h0.y,
        ]).fill({ color: 0xffd36a, alpha: 0.8 * fade });
      }
      if (af.frozen) {
        const pulse = 0.6 + 0.2 * Math.sin(t * 3);
        f.circle(af.x, af.y, 0.7).stroke({ width: 0.05, color: 0xffd36a, alpha: pulse });
        f.circle(af.x, af.y, 0.7).fill({ color: 0x2f7bff, alpha: 0.12 });
        for (let i = 0; i < 12; i++) {
          const a0 = (i * Math.PI) / 6;
          f.moveTo(af.x + Math.cos(a0) * 0.62, af.y + Math.sin(a0) * 0.62)
            .lineTo(af.x + Math.cos(a0) * 0.7, af.y + Math.sin(a0) * 0.7)
            .stroke({ width: 0.03, color: 0xfff4cf, alpha: 0.9 });
        }
        for (let i = 0; i < Math.min(12, af.heldHits); i++) {
          const c = P(af.x + (i - Math.min(12, af.heldHits) / 2) * 0.09, af.y, af.heightM + 0.35);
          g.circle(c.x, c.y, 0.035).fill({ color: 0xffd36a, alpha: 0.95 });
        }
      }
    }
    // Rewind Time: while it runs, a pulsing home mark where he started; when it fires, ghosts of him run back along the path he walked.
    for (const m of input.rewindMarks ?? []) {
      const pal = m.palette ?? FIRE;
      const pulse = 0.5 + 0.5 * Math.sin(t * 6);
      f.circle(m.x, m.y, 0.5).stroke({ width: 0.04, color: pal.bright, alpha: 0.5 + 0.3 * pulse });
      f.circle(m.x, m.y, 0.5 * (1 - m.k)).fill({ color: pal.hot, alpha: 0.2 });
      const a0 = -Math.PI / 2 + m.k * Math.PI * 2;
      f.moveTo(m.x, m.y)
        .lineTo(m.x + Math.cos(a0) * 0.5, m.y + Math.sin(a0) * 0.5)
        .stroke({ width: 0.05, color: pal.core, alpha: 0.9, cap: 'round' });
    }
    for (const rt of input.rewindTrails ?? []) {
      const pal = rt.palette ?? FIRE;
      const n = rt.path.length;
      const reached = 1 - rt.k;
      for (let i = 0; i < n; i++) {
        // The path replays from its end back to its start: points near the head of the rewind are brightest.
        const u = i / Math.max(1, n - 1);
        if (u < reached - 0.0001) continue;
        const near = Math.max(0, 1 - Math.abs(u - reached) * 4);
        const p = rt.path[i]!;
        silhouette(p.x, p.y, 1, 0.1 + 0.32 * near, pal.bright, pal.hot);
        f.circle(p.x, p.y, 0.12 + 0.2 * near).stroke({ width: 0.03, color: pal.core, alpha: 0.5 * near });
      }
    }
    // Rocket Fist: the arm extends from the shoulder as a segmented steel cable with a spiked-knuckle fist and a rocket flame behind it.
    for (const fs of input.fists ?? []) {
      const pal = fs.palette ?? FIRE;
      const a = iso(fs.x, fs.y, 1.15);
      const b = iso(fs.x + fs.dirX * fs.extentM, fs.y + fs.dirY * fs.extentM, 1.15);
      g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 0.12, color: 0x14161a, cap: 'round' });
      g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 0.075, color: 0x6d7684, cap: 'round' });
      const segs = Math.max(1, Math.floor(fs.extentM / 0.35));
      for (let i = 1; i <= segs; i++) {
        const k = i / (segs + 0.5);
        g.circle(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k, 0.06).fill(0x2a2e35);
      }
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      const tail = { x: b.x - Math.cos(ang) * 0.22, y: b.y - Math.sin(ang) * 0.22 };
      f.poly([
        tail.x,
        tail.y,
        tail.x - Math.cos(ang) * (0.35 + 0.1 * Math.sin(t * 40)),
        tail.y - Math.sin(ang) * 0.35,
        tail.x + 0.02,
        tail.y + 0.06,
      ]).fill({ color: pal.hot, alpha: 0.8 });
      f.circle(b.x, b.y, 0.26).fill({ color: pal.bright, alpha: 0.35 });
      g.circle(b.x, b.y, 0.17).fill(0x2a2e35);
      g.circle(b.x, b.y, 0.13).fill(0x6d7684);
      g.circle(b.x + Math.cos(ang) * 0.1, b.y + Math.sin(ang) * 0.1, 0.05).fill(pal.hot);
    }

    // Combat drone: a small hovering disc with a turning rotor, a red-orange eye that tracks its target, and a thin
    // cracking-up look as its durability falls.
    for (const dr of input.drones ?? []) {
      const pal = dr.palette ?? FIRE;
      const shadow = iso(dr.x, dr.y, 0);
      g.ellipse(shadow.x, shadow.y, 0.22, 0.09).fill({ color: 0x000000, alpha: 0.25 });
      const c = iso(dr.x, dr.y, 1.45);
      f.circle(c.x, c.y, 0.3).fill({ color: pal.hot, alpha: 0.14 });
      g.ellipse(c.x, c.y, 0.2, 0.15).fill(0x14161a);
      g.ellipse(c.x, c.y, 0.17, 0.12).fill(dr.k > 0.35 ? 0x4b525e : 0x6b4a3a);
      g.rect(c.x - 0.1, c.y - 0.15, 0.2, 0.05).fill(0x2a2e35);
      const spin = t * 30;
      for (const sgn of [-1, 1])
        g.moveTo(c.x - 0.3 * Math.cos(spin) * sgn, c.y - 0.2)
          .lineTo(c.x + 0.3 * Math.cos(spin) * sgn, c.y - 0.2)
          .stroke({ width: 0.03, color: 0xaab2bf, alpha: 0.55 });
      g.circle(c.x + dr.aimX * 0.08, c.y + dr.aimY * 0.05, 0.045).fill(pal.hot);
      f.circle(c.x + dr.aimX * 0.08, c.y + dr.aimY * 0.05, 0.1).fill({ color: pal.bright, alpha: 0.45 });
      if (dr.k < 0.5)
        f.circle(c.x - 0.1, c.y - 0.05, 0.05 + 0.04 * Math.sin(t * 20)).fill({ color: 0xffb455, alpha: 0.6 });
    }

    // Floating Prison: a cage of turning rings round the lifted target.
    for (const cg of input.cages ?? []) {
      const pal = cg.palette ?? FIRE;
      const grow = Math.min(1, cg.ageS / 0.25);
      for (let i = 0; i < 3; i++) {
        const c = iso(cg.x, cg.y, cg.heightM + 0.35 + i * 0.45);
        const r = (0.6 - Math.abs(i - 1) * 0.12) * grow;
        const turn = t * (2 + i) * (i % 2 === 0 ? 1 : -1);
        g.ellipse(c.x, c.y, r, r * ISO_T).stroke({ width: 0.04, color: pal.bright, alpha: 0.7 });
        for (let n = 0; n < 4; n++) {
          const a0 = turn + (n * Math.PI) / 2;
          g.circle(c.x + Math.cos(a0) * r, c.y + Math.sin(a0) * r * ISO_T, 0.04).fill({ color: pal.core, alpha: 0.95 });
        }
      }
      const base = iso(cg.x, cg.y, cg.heightM);
      g.moveTo(base.x, base.y)
        .lineTo(base.x, base.y - 1.3 * grow)
        .stroke({ width: 0.02, color: pal.hot, alpha: 0.4 });
    }

    // Tornado Surge: a funnel of stacked, turning rings widening upward, with streaks flung off it.
    for (const cy of input.funnels ?? []) {
      const pal = cy.palette ?? FIRE;
      const grow = Math.min(1, cy.ageS / 0.25) * cy.size;
      const levels = 9;
      for (let i = 0; i < levels; i++) {
        const k = i / (levels - 1);
        const h = 0.1 + k * 2.3 * grow;
        const r = (0.18 + 0.62 * k) * grow;
        const c = iso(cy.x, cy.y, h);
        const turn = t * (9 - k * 3) + i * 0.8;
        g.ellipse(c.x, c.y, r, r * ISO_T).stroke({ width: 0.03, color: pal.bright, alpha: 0.35 + 0.3 * (1 - k) });
        for (const off of [0, 2.1, 4.2]) {
          const a0 = turn + off;
          const x0 = c.x + Math.cos(a0) * r;
          const y0 = c.y + Math.sin(a0) * r * ISO_T;
          const x1 = c.x + Math.cos(a0 + 0.7) * r;
          const y1 = c.y + Math.sin(a0 + 0.7) * r * ISO_T;
          g.moveTo(x0, y0).lineTo(x1, y1).stroke({ width: 0.06, color: pal.core, alpha: 0.8, cap: 'round' });
        }
      }
      f.circle(cy.x, cy.y, 0.7 * grow).fill({ color: pal.hot, alpha: 0.18 });
    }

    // Wind Blade: two wing-blades sweep round him on the spot, each a fan of long feathers with a pale trailing arc.
    for (const w of input.whirls ?? []) {
      const pal = w.palette ?? FIRE;
      const spin = w.ageS * Math.PI * 2 * 3.2;
      const fade = Math.min(1, w.ageS / 0.12) * Math.min(1, (w.durationS - w.ageS) / 0.15 + 0.2);
      const rad = w.radiusM * 0.95;
      const mid = iso(w.x, w.y, 1.05);
      g.ellipse(mid.x, mid.y, rad, rad * ISO_T).stroke({ width: 0.04, color: pal.bright, alpha: 0.3 * fade });
      for (const base of [0, Math.PI]) {
        // The trailing arc behind each blade.
        for (let k = 0; k < 7; k++) {
          const a0 = spin + base - k * 0.16;
          const a1 = spin + base - (k + 1) * 0.16;
          g.moveTo(mid.x + Math.cos(a0) * rad, mid.y + Math.sin(a0) * rad * ISO_T)
            .lineTo(mid.x + Math.cos(a1) * rad, mid.y + Math.sin(a1) * rad * ISO_T)
            .stroke({ width: 0.2 * (1 - k / 7), color: pal.hot, alpha: 0.35 * (1 - k / 7) * fade, cap: 'round' });
        }
        // The wing itself: feathers fanning from the shoulder out to the rim.
        for (let k = 0; k < 6; k++) {
          const a = spin + base - k * 0.07;
          const reach = rad * (1 - 0.1 * k);
          const tipX = mid.x + Math.cos(a) * reach;
          const tipY = mid.y + Math.sin(a) * reach * ISO_T;
          const sx = mid.x + Math.cos(a) * 0.35;
          const sy = mid.y + Math.sin(a) * 0.35 * ISO_T;
          const nx = -Math.sin(a) * 0.1;
          const ny = Math.cos(a) * 0.1 * ISO_T;
          const pts = [
            sx + nx,
            sy + ny,
            (sx + tipX) / 2 + nx * 1.6,
            (sy + tipY) / 2 + ny * 1.6,
            tipX,
            tipY,
            (sx + tipX) / 2 - nx,
            (sy + tipY) / 2 - ny,
            sx - nx,
            sy - ny,
          ];
          g.poly(pts).fill({ color: k % 2 === 0 ? 0xf2f8ff : 0xcfe3f6, alpha: 0.95 * fade });
          g.poly(pts).stroke({ width: 0.014, color: 0x2f4157, alpha: 0.8 * fade });
        }
      }
    }

    if (input.ink) drawInk(f, g, P, input.ink.world, t, input.ink.at, { back: this.inkBack, front: this.inkFront });

    // Grenades: a shadow on the floor, then the olive body tumbling through its arc (or sitting, or stuck to someone),
    // with a light that blinks faster as the fuse runs down.
    for (const gr of input.grenades ?? []) this.grenade(f, g, gr, t);

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
      if (b.def.look?.beamStyle === 'scream') {
        // A scream: rings of sound pouring out of his mouth, each wider and fainter than the last as it travels, with a shimmering
        // cone on the floor showing what the sound reaches.
        const amount = Math.min(1, b.ageS / 0.1, (d.durationS - b.ageS) / 0.25);
        const dx = b.to.x - b.from.x;
        const dy = b.to.y - b.from.y;
        const len = Math.hypot(dx, dy) || 1;
        const ang = Math.atan2(dy, dx);
        const half = Math.atan2(d.widthM / 2, len);
        f.poly([
          b.from.x,
          b.from.y,
          b.to.x + Math.cos(ang - Math.PI / 2) * d.widthM * 0.5,
          b.to.y + Math.sin(ang - Math.PI / 2) * d.widthM * 0.5,
          b.to.x + Math.cos(ang + Math.PI / 2) * d.widthM * 0.5,
          b.to.y + Math.sin(ang + Math.PI / 2) * d.widthM * 0.5,
        ]).fill({ color: pal.deep, alpha: 0.16 * amount });
        // Twenty rings in flight at once, each drawn as a doubled, wobbling arc that jitters sideways as it travels, so the sound
        // reads as a violent shake rather than a calm ripple. Every arc starts with its own moveTo: an arc continues the last path
        // point otherwise, which drew a stray line across the screen.
        const RINGS = 20;
        for (let i = 0; i < RINGS; i++) {
          const ph = (t * 2.6 + i / RINGS) % 1;
          const r = MOUTH_AHEAD_M + ph * (len - MOUTH_AHEAD_M);
          const spread = half * (0.3 + 1.1 * ph) + 0.1;
          const shake = Math.sin(t * 58 + i * 2.3) * 0.07 * (0.4 + ph);
          const rr = r + shake;
          const wid = 0.13 * (1 - ph * 0.45);
          const col = i % 2 === 0 ? pal.bright : pal.core;
          const alpha = (1 - ph * 0.75) * amount;
          for (const [k, w, a] of [
            [1, wid * 0.7, alpha * 0.3],
            [1.16, wid * 0.4, alpha * 0.18],
          ] as const) {
            const a0 = ang - spread + Math.sin(t * 41 + i) * 0.05;
            const a1 = ang + spread + Math.sin(t * 37 + i * 1.7) * 0.05;
            f.moveTo(b.from.x + Math.cos(a0) * rr * k, b.from.y + Math.sin(a0) * rr * k);
            arcPath(f, b.from.x, b.from.y, rr * k, a0, a1).stroke({ width: w, color: col, alpha: a, cap: 'round' });
          }
          const c = P(b.from.x + Math.cos(ang) * rr, b.from.y + Math.sin(ang) * rr, MOUTH_HEIGHT_M);
          const sa = Math.atan2(dy * ISO_T, dx);
          const gr = 0.1 + 0.8 * ph;
          g.moveTo(c.x + Math.cos(sa - 1.1) * gr, c.y + Math.sin(sa - 1.1) * gr);
          arcPath(g, c.x, c.y, gr, sa - 1.1, sa + 1.1).stroke({
            width: 0.09 * (1 - ph * 0.5),
            color: pal.core,
            alpha: (1 - ph) * 0.95 * amount,
            cap: 'round',
          });
        }
        // The burst at the mouth where the sound leaves, pulsing with the shake.
        const mouth = P(
          b.from.x + Math.cos(ang) * MOUTH_AHEAD_M,
          b.from.y + Math.sin(ang) * MOUTH_AHEAD_M,
          MOUTH_HEIGHT_M,
        );
        const pulse = 1 + 0.25 * Math.sin(t * 52);
        g.circle(mouth.x, mouth.y, 0.2 * pulse).fill({ color: pal.hot, alpha: 0.35 * amount });
        g.circle(mouth.x, mouth.y, 0.1 * pulse).fill({ color: pal.core, alpha: 0.8 * amount });
        continue;
      }
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

    // Spectral chains: a line of interlocking links, alternately face-on and edge-on, glowing
    // violet with a pale core, swaying a little; a hook at the far end.
    for (const ch of input.chains ?? []) {
      const a0 = P(ch.from.x, ch.from.y, CHAIN_HEIGHT_M);
      const a1 = P(ch.to.x, ch.to.y, CHAIN_HEIGHT_M);
      const len = Math.hypot(a1.x - a0.x, a1.y - a0.y);
      if (len < 0.05) continue;
      const ux = (a1.x - a0.x) / len;
      const uy = (a1.y - a0.y) / len;
      g.moveTo(a0.x, a0.y).lineTo(a1.x, a1.y).stroke({ width: 0.16, color: ch.palette.hot, alpha: 0.25, cap: 'round' });
      const links = Math.max(2, Math.floor(len / 0.17));
      for (let i = 0; i < links; i++) {
        const u = (i + 0.5) / links;
        const sway = Math.sin(u * Math.PI) * Math.sin(t * 9 + u * 6) * 0.04;
        const cx = a0.x + (a1.x - a0.x) * u - uy * sway;
        const cy = a0.y + (a1.y - a0.y) * u + ux * sway;
        const face = i % 2 === 0;
        const hw = 0.1;
        const hh = face ? 0.055 : 0.018;
        // An oval link along the chain: outline in the deep shade, a bright body.
        const pts: number[] = [];
        for (let k = 0; k < 10; k++) {
          const a = (k / 10) * Math.PI * 2;
          const lx = Math.cos(a) * hw;
          const ly = Math.sin(a) * hh;
          pts.push(cx + ux * lx - uy * ly, cy + uy * lx + ux * ly);
        }
        g.poly(pts).stroke({ width: 0.04, color: ch.palette.deep, alpha: 0.9 });
        g.poly(pts).stroke({ width: 0.022, color: face ? ch.palette.bright : ch.palette.core, alpha: 0.95 });
      }
      g.circle(a1.x, a1.y, 0.09).fill({ color: ch.palette.bright, alpha: 0.5 });
      g.moveTo(a1.x - uy * 0.08, a1.y + ux * 0.08)
        .lineTo(a1.x + ux * 0.1, a1.y + uy * 0.1)
        .lineTo(a1.x + uy * 0.08, a1.y - ux * 0.08)
        .stroke({ width: 0.035, color: ch.palette.core, alpha: 1, cap: 'round', join: 'round' });
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

  /**
   * A landmine on the floor (Chemical Trap): a flat olive disc with a dark rim, a raised pressure plate, three trigger
   * prongs and a blinking light (red while arming, a steady green pulse once live). The trigger ring is faint on the
   * floor so everyone, friend or foe, can see exactly where it will go off.
   */
  private landmine(f: Graphics, g: Graphics, c: Cloud, t: number): void {
    const m = c.mine;
    if (!m) return;
    const live = m.dormantS >= c.armS;
    const pal = c.def.look?.palette ?? FIRE;
    const drop = Math.min(1, m.dormantS / 0.25);
    f.circle(c.x, c.y, 0.36).fill({ color: 0x000000, alpha: 0.3 * drop });
    if (m.magnet) {
      // A magnetic mine: a steel disc with an orange horseshoe magnet and field rings drawing inward while it is armed.
      f.circle(c.x, c.y, 0.32).fill(0x3a3f48);
      f.circle(c.x, c.y, 0.32).stroke({ width: 0.04, color: 0x0d0f12, alpha: 1 });
      arcPath(f, c.x, c.y, 0.18, Math.PI * 0.15, Math.PI * 0.85).stroke({ width: 0.07, color: pal.hot, alpha: 1 });
      arcPath(f, c.x, c.y, 0.18, Math.PI * 1.15, Math.PI * 1.85).stroke({ width: 0.07, color: 0xc9ced8, alpha: 1 });
      if (live)
        for (let i = 0; i < 3; i++) {
          const k = 1 - ((t * 0.7 + i / 3) % 1);
          f.circle(c.x, c.y, 0.4 + (m.magnet.radiusM - 0.4) * k).stroke({
            width: 0.02,
            color: pal.bright,
            alpha: 0.32 * (1 - k),
          });
        }
      const topM = iso(c.x, c.y, 0.08);
      const blinkM = live ? 0.55 + 0.45 * Math.sin(t * 5) : Math.sin(t * 14) > 0 ? 1 : 0.15;
      g.circle(topM.x, topM.y - 0.03, 0.07).fill({ color: live ? pal.bright : 0xff4a3a, alpha: blinkM });
      return;
    }
    f.circle(c.x, c.y, 0.32).fill(0x2f3822);
    f.circle(c.x, c.y, 0.32).stroke({ width: 0.04, color: 0x10160b, alpha: 1 });
    f.circle(c.x, c.y, 0.2).fill(0x56633a);
    f.circle(c.x, c.y, 0.2).stroke({ width: 0.025, color: 0x1c240f, alpha: 1 });
    // Hazard ticks around the rim.
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      f.moveTo(c.x + Math.cos(a) * 0.24, c.y + Math.sin(a) * 0.24)
        .lineTo(c.x + Math.cos(a) * 0.3, c.y + Math.sin(a) * 0.3)
        .stroke({ width: 0.03, color: i % 2 === 0 ? 0xd8c63a : 0x10160b, alpha: 1 });
    }
    if (live) f.circle(c.x, c.y, m.triggerRadiusM).stroke({ width: 0.025, color: pal.bright, alpha: 0.28 });
    // The raised plate and prongs stand a little above the floor; the light blinks on top.
    const top = iso(c.x, c.y, 0.07);
    g.ellipse(top.x, top.y, 0.15, 0.15 * ISO_T + 0.02).fill({ color: 0x6f7f4a, alpha: 1 });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.5;
      const q = iso(c.x + Math.cos(a) * 0.13, c.y + Math.sin(a) * 0.13, 0.1);
      g.circle(q.x, q.y, 0.025).fill(0xc9d1b0);
    }
    const blink = live ? 0.55 + 0.45 * Math.sin(t * 5) : Math.sin(t * 14) > 0 ? 1 : 0.15;
    const light = live ? pal.bright : 0xff4a3a;
    g.circle(top.x, top.y - 0.03, 0.075).fill({ color: light, alpha: 0.28 * blink });
    g.circle(top.x, top.y - 0.03, 0.04).fill({ color: light, alpha: blink });
  }

  /** A grenade: shadow, body (tumbling in flight), pin ring and a fuse light that blinks faster as it runs down. */
  private grenade(f: Graphics, g: Graphics, gr: Grenade, t: number): void {
    const d = gr.def.delivery;
    if (d.type !== 'grenade') return;
    const r = 0.13;
    const lift = Math.max(0, gr.z);
    f.ellipse(gr.x, gr.y, r * (1.3 - Math.min(0.5, lift * 0.2)), r * 0.9).fill({ color: 0x000000, alpha: 0.28 });
    const c = iso(gr.x, gr.y, lift + r);
    const spin = gr.state === 'flying' ? t * 16 : 0;
    const rot = (x: number, y: number) => ({
      x: c.x + x * Math.cos(spin) - y * Math.sin(spin),
      y: c.y + x * Math.sin(spin) + y * Math.cos(spin),
    });
    const body = [rot(-r, -r * 0.8), rot(r, -r * 0.8), rot(r * 1.05, r * 0.9), rot(-r * 1.05, r * 0.9)].flatMap((q) => [
      q.x,
      q.y,
    ]);
    g.circle(c.x, c.y, r * 1.1).fill({ color: 0x4a5a30, alpha: 1 });
    g.poly(body).fill({ color: 0x4a5a30, alpha: 1 });
    g.circle(c.x, c.y, r * 1.1).stroke({ width: 0.02, color: 0x10160b, alpha: 1 });
    const cap = [
      rot(-r * 0.45, -r * 1.35),
      rot(r * 0.45, -r * 1.35),
      rot(r * 0.45, -r * 0.8),
      rot(-r * 0.45, -r * 0.8),
    ].flatMap((q) => [q.x, q.y]);
    g.poly(cap).fill(0x6d6f7a);
    if (gr.state === 'flying') return;
    const total = gr.state === 'stuck' ? d.stickFuseS : d.fuseS;
    const hurry = 1 - Math.max(0, gr.fuseLeftS) / total;
    const blink = Math.sin(t * (14 + hurry * 40)) > 0 ? 1 : 0.25;
    g.circle(c.x, c.y - r * 0.2, r * 0.9).fill({ color: 0xff4a2a, alpha: 0.3 * blink });
    g.circle(c.x, c.y - r * 0.2, r * 0.4).fill({ color: 0xff7a4a, alpha: blink });
    if (gr.state === 'stuck')
      g.circle(c.x, c.y, r * (1.6 + hurry)).stroke({ width: 0.02, color: 0xff4a2a, alpha: 0.6 * blink });
  }

  /** A thrown poison jar: a glass jar with glowing liquid and a metal lid, tumbling end over end, glowing green. */
  private flyingJar(g: Graphics, c: { x: number; y: number }, p: Projectile, pal: Palette, t: number): void {
    const spin = t * 14 + p.x * 3 + p.y * 2;
    const r = 0.17;
    const rot = (x: number, y: number) => ({
      x: c.x + x * Math.cos(spin) - y * Math.sin(spin),
      y: c.y + x * Math.sin(spin) + y * Math.cos(spin),
    });
    g.circle(c.x, c.y, r * 3.2).fill({ color: pal.bright, alpha: 0.18 });
    g.circle(c.x, c.y, r * 2.1).fill({ color: pal.hot, alpha: 0.25 });
    const body = [rot(-r, -r * 0.95), rot(r, -r * 0.95), rot(r, r * 0.95), rot(-r, r * 0.95)].flatMap((q) => [
      q.x,
      q.y,
    ]);
    g.poly(body).fill(0x14210c);
    const liquid = [
      rot(-r * 0.8, -r * 0.55),
      rot(r * 0.8, -r * 0.55),
      rot(r * 0.8, r * 0.8),
      rot(-r * 0.8, r * 0.8),
    ].flatMap((q) => [q.x, q.y]);
    g.poly(liquid).fill({ color: 0x5fe02a, alpha: 0.95 });
    const glint = [
      rot(-r * 0.55, -r * 0.4),
      rot(-r * 0.15, -r * 0.4),
      rot(-r * 0.15, r * 0.5),
      rot(-r * 0.55, r * 0.5),
    ].flatMap((q) => [q.x, q.y]);
    g.poly(glint).fill({ color: 0xc8ffa0, alpha: 0.8 });
    const lid = [
      rot(-r * 0.7, -r * 1.45),
      rot(r * 0.7, -r * 1.45),
      rot(r * 0.7, -r * 0.95),
      rot(-r * 0.7, -r * 0.95),
    ].flatMap((q) => [q.x, q.y]);
    g.poly(lid).fill(0x4b4d57);
    // A fading smear along the throw.
    p.trail.forEach((q, i) => {
      const k = (i + 1) / (p.trail.length + 1);
      const d = iso(q.x, q.y, BOLT_HEIGHT_M);
      g.circle(d.x, d.y, r * 0.8 * k).fill({ color: pal.hot, alpha: 0.3 * k });
    });
  }

  /** A magic projectile in flight: a shadow, a tapering tail of flame streaming behind, and the core. */
  private magicProjectile(f: Graphics, g: Graphics, p: Projectile, look: MagicLook, t: number): void {
    const P = iso;
    const pal = look.palette;
    const radius = p.def.delivery.type === 'projectile' ? p.def.delivery.radiusM : 0.3;
    f.circle(p.x, p.y, radius * 0.9).fill({ color: 0x000000, alpha: 0.25 });
    const c = P(p.x, p.y, BOLT_HEIGHT_M);
    if (look.flight?.jar) {
      this.flyingJar(g, c, p, pal, t);
      return;
    }
    // A tornado shot is drawn as its funnel (see `funnels`), not as a bolt.
    if (look.flight?.tornado) return;
    if (look.flight?.shard) {
      // A crystal shard: a long sharp diamond pointing the way it flies, a pale core streak, a glinting trail behind it.
      const ang = Math.atan2(p.dir.y * ISO_T, p.dir.x);
      const L = 0.36;
      const W = 0.09;
      const spin = 0.85 + 0.15 * Math.sin(t * 30 + p.x * 7);
      const ux = Math.cos(ang);
      const uy = Math.sin(ang);
      p.trail.forEach((q, i) => {
        const k = (i + 1) / (p.trail.length + 1);
        const tc = P(q.x, q.y, BOLT_HEIGHT_M);
        g.circle(tc.x, tc.y, 0.05 * k).fill({ color: pal.bright, alpha: 0.5 * k });
      });
      g.poly([
        c.x - ux * L * 0.5,
        c.y - uy * L * 0.5,
        c.x - uy * W * spin,
        c.y + ux * W * spin,
        c.x + ux * L,
        c.y + uy * L,
        c.x + uy * W * spin,
        c.y - ux * W * spin,
      ]).fill({ color: pal.hot, alpha: 0.95 });
      g.poly([
        c.x - ux * L * 0.4,
        c.y - uy * L * 0.4,
        c.x - uy * W * 0.5,
        c.y + ux * W * 0.5,
        c.x + ux * L * 0.9,
        c.y + uy * L * 0.9,
      ]).fill({ color: pal.core, alpha: 0.9 });
      g.circle(c.x + ux * L, c.y + uy * L, 0.06).fill({ color: pal.bright, alpha: 0.5 });
      return;
    }
    if (look.flight?.wave) {
      // A sonic boom: three nested crescents of sound opening toward where it is going, with a bright leading edge.
      const ang = Math.atan2(p.dir.y * ISO_T, p.dir.x);
      if (look.flight.crescent) {
        // Chrono Slash: one wide, thin crescent of time cutting across the way it travels, gold on its edge and blue behind it,
        // with a second fainter one trailing and a bright point at each tip.
        for (let i = 0; i < 2; i++) {
          const back = 0.25 + i * 0.5;
          const cx = c.x - Math.cos(ang) * back;
          const cy = c.y - Math.sin(ang) * back * ISO_T;
          const r = 1.0 - i * 0.1;
          arcPath(g, cx, cy, r, ang - 1.2, ang + 1.2).stroke({
            width: 0.14 - i * 0.05,
            color: pal.hot,
            alpha: 0.6 - i * 0.25,
            cap: 'round',
          });
          arcPath(g, cx, cy, r, ang - 1.2, ang + 1.2).stroke({
            width: 0.06 - i * 0.02,
            color: i === 0 ? pal.bright : pal.core,
            alpha: 0.95 - i * 0.3,
            cap: 'round',
          });
        }
        for (const sgn of [-1, 1])
          g.circle(
            c.x - Math.cos(ang) * 0.25 + Math.cos(ang + sgn * 1.2) * 1.0,
            c.y - Math.sin(ang) * 0.25 * ISO_T + Math.sin(ang + sgn * 1.2) * 1.0,
            0.07,
          ).fill({ color: pal.core, alpha: 0.95 });
        return;
      }
      if (look.flight.screech) {
        // A screech: five thin, tight rings packed close and shivering, a piercing needle at the front.
        for (let i = 0; i < 5; i++) {
          const cx = c.x - Math.cos(ang) * i * 0.16;
          const cy = c.y - Math.sin(ang) * i * 0.16 * ISO_T;
          arcPath(g, cx, cy, 0.28 + i * 0.06 + 0.03 * Math.sin(t * 50 + i), ang - 0.8, ang + 0.8).stroke({
            width: 0.035,
            color: i === 0 ? pal.core : pal.bright,
            alpha: 0.95 - i * 0.15,
            cap: 'round',
          });
        }
        g.moveTo(c.x - Math.cos(ang) * 0.3, c.y - Math.sin(ang) * 0.3 * ISO_T)
          .lineTo(c.x + Math.cos(ang) * 0.35, c.y + Math.sin(ang) * 0.35 * ISO_T)
          .stroke({ width: 0.05, color: pal.core, alpha: 1, cap: 'round' });
        return;
      }
      for (let i = 0; i < 3; i++) {
        const back = i * 0.32;
        const w = (0.55 + i * 0.22) * (1 + 0.06 * Math.sin(t * 26 + i));
        const cx = c.x - Math.cos(ang) * back;
        const cy = c.y - Math.sin(ang) * back * ISO_T;
        arcPath(g, cx, cy, w, ang - 1.0, ang + 1.0).stroke({
          width: 0.09 - i * 0.02,
          color: i === 0 ? pal.core : pal.bright,
          alpha: 0.95 - i * 0.25,
          cap: 'round',
        });
      }
      g.circle(c.x, c.y, 0.16).fill({ color: pal.core, alpha: 0.9 });
      return;
    }
    if (look.flight?.debris) {
      // A flung object: a dark chunk with a violet edge, tumbling.
      const sp = t * 12 + p.x * 3;
      const sz = 0.17;
      const pts = [-1, -1, 1, -1, 1, 1, -1, 1].map((v, n) =>
        n % 2 === 0 ? c.x + v * sz * Math.cos(sp) : c.y + v * sz * 0.8,
      );
      g.circle(c.x, c.y, sz * 2.2).fill({ color: pal.hot, alpha: 0.18 });
      g.poly(pts).fill(0x2c2838);
      g.poly(pts).stroke({ width: 0.02, color: pal.bright, alpha: 0.9 });
      return;
    }
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

/** A point on the quadratic curve a -> b -> c at progress `e` (one axis). */
function bez2(a: number, b: number, c: number, e: number): number {
  return (1 - e) * (1 - e) * a + 2 * (1 - e) * e * b + e * e * c;
}
