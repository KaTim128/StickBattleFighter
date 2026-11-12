import {
  type AbilityDef,
  type AbilityPayload,
  type Burn,
  type MagicLook,
  payloadAt,
  type SummonSpec,
} from './ability-def';

/**
 * Ability deliveries in the arena (REQ-ABL-1): projectiles, dashes with fire
 * trails, telegraphed rings and leaps. The world owns their motion and timing;
 * everything it touches goes through the `AbilityHost` (the scene), so hits use
 * the same combat rules as melee (INV-5) and the world stays testable.
 * Presentation is driven by `AbilityFx` events (VFX and sound hooks) plus the
 * live lists below, which the VFX layer reads every frame.
 */
export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export interface AbilityTarget {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly radiusM: number;
  /** Can be hit (not KO). */
  readonly hittable: boolean;
  /** Side it fights for: abilities never hit the caster's own team (summons, owner 12/11/2026). */
  readonly team?: string;
}

export type FxKind = 'cast' | 'release' | 'impact' | 'telegraph' | 'fizzle';

/** A presentation hook: VFX profile and sound id at a place (REQ-ABL-1, REQ-ANI-4). */
export interface AbilityFx {
  readonly kind: FxKind;
  readonly ability: string;
  readonly vfx: string;
  readonly sfx: string | null;
  readonly x: number;
  readonly y: number;
  readonly radiusM?: number;
  /** The ability's look (Magic Attack VFX Standard), so effects match the element. */
  readonly look?: MagicLook;
}

export interface AbilityHost {
  fighters(): readonly AbilityTarget[];
  /**
   * Apply an ability hit to a fighter. Returns true if it connected (not dodged or ignored).
   * `hitFlash` = the colour the target's body flashes (the ability's look; default the caster's).
   */
  hitFighter(casterId: string, targetId: string, payload: AbilityPayload, dir: Vec2, hitFlash?: number): boolean;
  /**
   * Hit furniture and doors touching a circle. `continuous` = a body brushing
   * past (one blow per prop per moment), otherwise a single impact.
   */
  hitEnvironment(
    casterId: string,
    at: Vec2,
    radiusM: number,
    payload: AbilityPayload,
    dir: Vec2,
    continuous: boolean,
  ): void;
  /** Fraction 0..1 along the segment where a wall, door or furniture blocks it, or null. */
  blocked(from: Vec2, to: Vec2): number | null;
  /** Where a caster stands now. */
  position(casterId: string): Vec2;
  /** Drive a caster's body this step (dash or leap), or release it (null). Height lifts it off the floor. */
  drive(casterId: string, velocity: Vec2 | null, heightM: number): void;
  /** Set fighters standing in a fire trail alight. */
  burnFighter(targetId: string, burn: Burn): void;
  /**
   * Where a caster is steering its beam: a world direction, or null to hold it. `fresh` = the
   * beam has just started (the host can ignore a stale mouse position). Optional.
   */
  steer?(casterId: string, fresh: boolean): Vec2 | null;
  /** Turn a caster to face a direction (it follows its steered beam). Optional. */
  face?(casterId: string, dir: Vec2): void;
  /** Start (or end, null) a timed self-buff on a caster. */
  buff(
    casterId: string,
    buff: { speedFactor: number; damageTakenFactor: number; durationS: number; abilityDamageFactor?: number } | null,
  ): void;
  /** Raise minions for the caster (summons, owner 12/11/2026). Optional (hosts without summons ignore it). */
  summon?(casterId: string, spec: SummonSpec): void;
  /**
   * Move the caster to `to` (Teleport): the host picks the nearest spot a body can stand on and
   * returns it, or null if there is none (the cast fizzles). Optional.
   */
  teleport?(casterId: string, to: Vec2): Vec2 | null;
  /** Keep a fighter helpless for this long (seized by a grab). Optional. */
  hold?(targetId: string, seconds: number): void;
  emit(fx: AbilityFx): void;
}

export interface Projectile {
  readonly casterId: string;
  readonly def: AbilityDef;
  x: number;
  y: number;
  readonly dir: Vec2;
  travelledM: number;
  /** Recent positions for the trail (newest last). */
  readonly trail: Vec2[];
}

/** A continuous beam pouring from a caster (Fire Beam). Origin and end are refreshed every step. */
export interface Beam {
  readonly casterId: string;
  readonly def: AbilityDef;
  /** Where it points (turns while steered). */
  dir: Vec2;
  ageS: number;
  /** Time since the last damage tick. */
  sinceTickS: number;
  /** Where it starts (in front of the caster's hands) and where it ends (its reach, or a wall). */
  from: Vec2;
  to: Vec2;
  /** Fighters it touched on the last tick (presentation: burning contact points). */
  touching: string[];
  /** It has hit someone already (the first contact plays the impact sound). */
  landed: boolean;
}

export interface FireZone {
  readonly casterId: string;
  readonly x: number;
  readonly y: number;
  readonly radiusM: number;
  readonly lifeS: number;
  ageS: number;
  readonly burn: Burn;
}

export interface Telegraph {
  readonly casterId: string;
  readonly def: AbilityDef;
  x: number;
  y: number;
  readonly radiusM: number;
  readonly durationS: number;
  ageS: number;
  /** Follows the caster (a ring around it) instead of staying put. */
  readonly onCaster: boolean;
  /** A ring placed at a spot (aimed nova): it erupts there when its warning ends. */
  readonly erupts?: boolean;
}

interface DashAction {
  readonly kind: 'dash';
  readonly casterId: string;
  readonly def: AbilityDef;
  readonly dir: Vec2;
  remainingS: number;
  /** Time since the dash started. */
  ageS: number;
  readonly hit: Set<string>;
  sinceTrailM: number;
  lastX: number;
  lastY: number;
}

interface LeapAction {
  readonly kind: 'leap';
  readonly casterId: string;
  readonly def: AbilityDef;
  readonly from: Vec2;
  readonly to: Vec2;
  t: number;
  readonly telegraph: Telegraph;
}

/** A target being dragged to its caster (Grave Chains). */
interface PullAction {
  readonly kind: 'pull';
  readonly casterId: string;
  readonly targetId: string;
  readonly speedMps: number;
  readonly stopM: number;
  ageS: number;
}

/** A seized target hoisted overhead, then slammed down (Grapple Slam). */
interface GrabAction {
  readonly kind: 'grab';
  readonly casterId: string;
  readonly targetId: string;
  readonly def: AbilityDef;
  readonly dir: Vec2;
  ageS: number;
}

type Action = DashAction | LeapAction | PullAction | GrabAction;

/** A pull never lasts longer than this (it gives up if something holds the target back). */
const PULL_MAX_S = 1.2;

const TRAIL_SPACING_M = 0.45;
const TRAIL_POINTS = 8;
/** A projectile flies at chest height: it starts this far in front of the caster. */
const MUZZLE_M = 0.5;
/** A beam pours from just in front of the caster's hands. */
const BEAM_MUZZLE_M = 0.45;

const norm = (v: Vec2): Vec2 => {
  const l = Math.hypot(v.x, v.y);
  return l > 1e-6 ? { x: v.x / l, y: v.y / l } : { x: 1, y: 0 };
};

export class AbilityWorld {
  readonly projectiles: Projectile[] = [];
  readonly beams: Beam[] = [];
  readonly zones: FireZone[] = [];
  readonly telegraphs: Telegraph[] = [];
  private readonly actions: Action[] = [];

  /** Leap height of a caster this step (render lift), or 0. */
  liftOf(casterId: string): number {
    const a = this.actions.find((x) => x.kind === 'leap' && x.casterId === casterId) as LeapAction | undefined;
    if (!a) return 0;
    const d = a.def.delivery;
    if (d.type !== 'leap') return 0;
    const u = Math.min(1, a.t / d.airS);
    return 4 * d.peakM * u * (1 - u);
  }

  /** Is this caster mid-dash or mid-leap (its body is driven by the world)? */
  driving(casterId: string): boolean {
    return this.actions.some((a) => (a.kind === 'dash' || a.kind === 'leap') && a.casterId === casterId);
  }

  /** Who is dragging whom right now (Grave Chains), for the chain drawn between them. */
  forEachPull(visit: (casterId: string, targetId: string) => void): void {
    for (const a of this.actions) if (a.kind === 'pull') visit(a.casterId, a.targetId);
  }

  /** How high a grabbed fighter is hoisted this step (render lift), or 0. */
  heldLiftOf(targetId: string): number {
    const a = this.actions.find((x) => x.kind === 'grab' && x.targetId === targetId) as GrabAction | undefined;
    const d = a?.def.delivery;
    if (!a || d?.type !== 'grab') return 0;
    return d.liftM * Math.min(1, a.ageS / d.liftS);
  }

  /**
   * The cast's wind-up ended: start the delivery. `aim` is the soft-locked
   * target point (or a point straight ahead when nothing is in range).
   */
  release(casterId: string, def: AbilityDef, aim: Vec2, host: AbilityHost): void {
    const at = host.position(casterId);
    const dir = norm({ x: aim.x - at.x, y: aim.y - at.y });
    host.emit({
      kind: 'release',
      ability: def.id,
      look: def.look,
      vfx: def.vfx,
      sfx: def.sfx.release,
      x: at.x,
      y: at.y,
    });
    const d = def.delivery;
    switch (d.type) {
      case 'projectile':
        this.projectiles.push({
          casterId,
          def,
          x: at.x + dir.x * MUZZLE_M,
          y: at.y + dir.y * MUZZLE_M,
          dir,
          travelledM: 0,
          trail: [],
        });
        break;
      case 'dash':
        this.actions.push({
          kind: 'dash',
          casterId,
          def,
          dir,
          remainingS: d.distanceM / d.speedMps,
          ageS: 0,
          hit: new Set(),
          sinceTrailM: TRAIL_SPACING_M,
          lastX: at.x,
          lastY: at.y,
        });
        break;
      case 'nova': {
        // Around the caster, or where it aims (within range, short of any wall in the way).
        let spot = at;
        if (d.atTarget) {
          const want = Math.min(def.aimRangeM, Math.hypot(aim.x - at.x, aim.y - at.y));
          const end = { x: at.x + dir.x * want, y: at.y + dir.y * want };
          const block = host.blocked(at, end);
          const reach = block === null ? want : Math.max(0, want * block - 0.3);
          spot = { x: at.x + dir.x * reach, y: at.y + dir.y * reach };
        }
        const t: Telegraph = {
          casterId,
          def,
          x: spot.x,
          y: spot.y,
          radiusM: d.radiusM,
          durationS: d.telegraphS,
          ageS: 0,
          onCaster: !d.atTarget,
          erupts: d.atTarget === true,
        };
        this.telegraphs.push(t);
        host.emit({
          kind: 'telegraph',
          ability: def.id,
          look: def.look,
          vfx: def.vfx,
          sfx: null,
          x: spot.x,
          y: spot.y,
          radiusM: d.radiusM,
        });
        break;
      }
      case 'teleport': {
        // Vanish here, reappear there (within range); the host finds a free spot to stand on.
        const want = Math.min(d.maxRangeM, Math.hypot(aim.x - at.x, aim.y - at.y));
        const to = { x: at.x + dir.x * want, y: at.y + dir.y * want };
        const landed = host.teleport?.(casterId, to) ?? null;
        if (landed)
          host.emit({
            kind: 'impact',
            ability: def.id,
            look: def.look,
            vfx: def.vfx,
            sfx: def.sfx.impact,
            x: landed.x,
            y: landed.y,
            radiusM: 0.9,
          });
        break;
      }
      case 'summon':
        host.summon?.(casterId, d);
        host.emit({
          kind: 'impact',
          ability: def.id,
          look: def.look,
          vfx: def.vfx,
          sfx: def.sfx.impact,
          x: at.x,
          y: at.y,
          radiusM: 1.4,
        });
        break;
      case 'beam': {
        const beam: Beam = {
          casterId,
          def,
          dir,
          ageS: 0,
          sinceTickS: d.tickS, // the first tick lands at once
          from: at,
          to: at,
          touching: [],
          landed: false,
        };
        this.aimBeam(beam, host);
        this.beams.push(beam);
        break;
      }
      case 'strike': {
        // One heavy blow straight ahead: everyone in reach, then whatever furniture or door it meets.
        const reach = { x: at.x + dir.x * d.reachM, y: at.y + dir.y * d.reachM };
        let landed = false;
        for (const f of host.fighters()) {
          if (this.friendly(f, casterId, host) || !f.hittable) continue;
          if (segmentDistance(at, reach, f) > d.radiusM + f.radiusM) continue;
          if (this.hit(host, casterId, f.id, def.payload, dir, def.look?.hitFlash)) {
            landed = true;
            host.emit({
              kind: 'impact',
              ability: def.id,
              look: def.look,
              vfx: def.vfx,
              sfx: def.sfx.impact,
              x: f.x,
              y: f.y,
              radiusM: 0.8,
            });
          }
        }
        host.hitEnvironment(casterId, reach, d.radiusM, def.payload, dir, false);
        if (!landed) {
          host.emit({
            kind: 'impact',
            ability: def.id,
            look: def.look,
            vfx: def.vfx,
            sfx: def.sfx.impact,
            x: reach.x,
            y: reach.y,
            radiusM: 0.8,
          });
        }
        break;
      }
      case 'grab': {
        // Seize the nearest enemy within reach in front; nobody there: a heavy grasp at the air.
        const reach = { x: at.x + dir.x * d.reachM, y: at.y + dir.y * d.reachM };
        let best: AbilityTarget | null = null;
        let bestD = Number.POSITIVE_INFINITY;
        for (const f of host.fighters()) {
          if (this.friendly(f, casterId, host) || !f.hittable) continue;
          if (segmentDistance(at, reach, f) > d.radiusM + f.radiusM) continue;
          const dd = Math.hypot(f.x - at.x, f.y - at.y);
          if (dd < bestD) {
            best = f;
            bestD = dd;
          }
        }
        if (!best) {
          host.emit({
            kind: 'fizzle',
            ability: def.id,
            look: def.look,
            vfx: def.vfx,
            sfx: null,
            x: reach.x,
            y: reach.y,
          });
          break;
        }
        host.hold?.(best.id, d.liftS + 0.5);
        this.actions.push({ kind: 'grab', casterId, targetId: best.id, def, dir, ageS: 0 });
        break;
      }
      case 'buff':
        host.buff(casterId, {
          speedFactor: d.speedFactor,
          damageTakenFactor: d.damageTakenFactor,
          durationS: d.durationS,
          abilityDamageFactor: d.abilityDamageFactor,
        });
        if (d.summon) host.summon?.(casterId, d.summon);
        host.emit({
          kind: 'impact',
          ability: def.id,
          look: def.look,
          vfx: def.vfx,
          sfx: def.sfx.impact,
          x: at.x,
          y: at.y,
          radiusM: 2.2,
        });
        break;
      case 'leap': {
        // Land on the target (within range), short of any wall or furniture in the way.
        const want = Math.min(d.maxRangeM, Math.hypot(aim.x - at.x, aim.y - at.y));
        const end = { x: at.x + dir.x * want, y: at.y + dir.y * want };
        const block = host.blocked(at, end);
        const reach = block === null ? want : Math.max(0, want * block - 0.5);
        const to = { x: at.x + dir.x * reach, y: at.y + dir.y * reach };
        const telegraph: Telegraph = {
          casterId,
          def,
          x: to.x,
          y: to.y,
          radiusM: d.radiusM,
          durationS: d.airS,
          ageS: 0,
          onCaster: false,
        };
        this.telegraphs.push(telegraph);
        host.emit({
          kind: 'telegraph',
          ability: def.id,
          look: def.look,
          vfx: def.vfx,
          sfx: null,
          x: to.x,
          y: to.y,
          radiusM: d.radiusM,
        });
        this.actions.push({ kind: 'leap', casterId, def, from: at, to, t: 0, telegraph });
        break;
      }
    }
  }

  /** The caster was interrupted or KO'd: stop its dash, leap or beam and any ring still warming up. */
  cancel(casterId: string, host: AbilityHost): void {
    for (let i = this.beams.length - 1; i >= 0; i--) if (this.beams[i]!.casterId === casterId) this.beams.splice(i, 1);
    for (let i = this.actions.length - 1; i >= 0; i--) {
      if (this.actions[i]!.casterId !== casterId) continue;
      this.actions.splice(i, 1);
      host.drive(casterId, null, 0);
    }
    for (let i = this.telegraphs.length - 1; i >= 0; i--) {
      const t = this.telegraphs[i]!;
      if (t.casterId !== casterId) continue;
      this.telegraphs.splice(i, 1);
      host.emit({ kind: 'fizzle', ability: t.def.id, look: t.def.look, vfx: t.def.vfx, sfx: null, x: t.x, y: t.y });
    }
  }

  update(dtS: number, host: AbilityHost): void {
    this.updateProjectiles(dtS, host);
    this.updateBeams(dtS, host);
    this.updateActions(dtS, host);
    this.updateTelegraphs(dtS, host);
    this.updateZones(dtS, host);
  }

  private updateProjectiles(dtS: number, host: AbilityHost): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i]!;
      const d = p.def.delivery;
      if (d.type !== 'projectile') continue;
      const step = d.speedMps * dtS;
      const from = { x: p.x, y: p.y };
      const to = { x: p.x + p.dir.x * step, y: p.y + p.dir.y * step };

      // Fighters first: anyone (except the caster) the shot passes through this step.
      let done = false;
      for (const f of host.fighters()) {
        if (this.friendly(f, p.casterId, host) || !f.hittable) continue;
        if (segmentDistance(from, to, f) > d.radiusM + f.radiusM) continue;
        if (!this.hit(host, p.casterId, f.id, p.def.payload, p.dir, p.def.look?.hitFlash)) continue; // dodged: flies on
        this.impact(p, f, host);
        done = true;
        break;
      }
      if (!done) {
        const block = host.blocked(from, to);
        if (block !== null) {
          const at = { x: from.x + (to.x - from.x) * block, y: from.y + (to.y - from.y) * block };
          host.hitEnvironment(p.casterId, at, d.radiusM + 0.15, p.def.payload, p.dir, false);
          this.impact(p, at, host);
          done = true;
        }
      }
      if (done) {
        this.projectiles.splice(i, 1);
        continue;
      }
      p.trail.push(from);
      if (p.trail.length > TRAIL_POINTS) p.trail.shift();
      p.x = to.x;
      p.y = to.y;
      p.travelledM += step;
      if (p.travelledM >= d.maxRangeM) {
        this.projectiles.splice(i, 1);
        host.emit({ kind: 'fizzle', ability: p.def.id, look: p.def.look, vfx: p.def.vfx, sfx: null, x: p.x, y: p.y });
      }
    }
  }

  private impact(p: Projectile, at: Vec2, host: AbilityHost): void {
    host.emit({
      kind: 'impact',
      ability: p.def.id,
      look: p.def.look,
      vfx: p.def.vfx,
      sfx: p.def.sfx.impact,
      x: at.x,
      y: at.y,
      radiusM: 0.6,
    });
  }

  /** The beam starts at the caster's hands and runs to its reach, or to the first wall, door or furniture. */
  private aimBeam(b: Beam, host: AbilityHost): void {
    const d = b.def.delivery;
    if (d.type !== 'beam') return;
    const at = host.position(b.casterId);
    const from = { x: at.x + b.dir.x * BEAM_MUZZLE_M, y: at.y + b.dir.y * BEAM_MUZZLE_M };
    const far = { x: from.x + b.dir.x * d.rangeM, y: from.y + b.dir.y * d.rangeM };
    const block = host.blocked(from, far);
    const reach = d.rangeM * (block ?? 1);
    b.from = from;
    b.to = { x: from.x + b.dir.x * reach, y: from.y + b.dir.y * reach };
  }

  /** Turn a beam toward where its caster steers it, no faster than its turn rate; the caster turns with it. */
  private steerBeam(b: Beam, turnRadPerS: number, dtS: number, host: AbilityHost): void {
    const want = host.steer?.(b.casterId, b.ageS <= dtS);
    if (want && Math.hypot(want.x, want.y) > 1e-6) {
      const now = Math.atan2(b.dir.y, b.dir.x);
      let delta = Math.atan2(want.y, want.x) - now;
      delta = Math.atan2(Math.sin(delta), Math.cos(delta)); // shortest way round
      const step = Math.max(-turnRadPerS * dtS, Math.min(turnRadPerS * dtS, delta));
      b.dir = { x: Math.cos(now + step), y: Math.sin(now + step) };
    }
    host.face?.(b.casterId, b.dir);
  }

  private updateBeams(dtS: number, host: AbilityHost): void {
    for (let i = this.beams.length - 1; i >= 0; i--) {
      const b = this.beams[i]!;
      const d = b.def.delivery;
      if (d.type !== 'beam') continue;
      b.ageS += dtS;
      if (b.ageS >= d.durationS) {
        this.beams.splice(i, 1);
        host.emit({
          kind: 'fizzle',
          ability: b.def.id,
          look: b.def.look,
          vfx: b.def.vfx,
          sfx: null,
          x: b.to.x,
          y: b.to.y,
        });
        continue;
      }
      if (d.turnRadPerS) this.steerBeam(b, d.turnRadPerS, dtS, host);
      this.aimBeam(b, host);
      b.sinceTickS += dtS;
      if (b.sinceTickS < d.tickS) continue;
      b.sinceTickS -= d.tickS;
      // A tick: everyone in the beam is hit, harder the closer they stand (distance falloff).
      const caster = host.position(b.casterId);
      b.touching = [];
      for (const f of host.fighters()) {
        if (this.friendly(f, b.casterId, host) || !f.hittable) continue;
        if (segmentDistance(b.from, b.to, f) > d.widthM / 2 + f.radiusM) continue;
        const dist = Math.hypot(f.x - caster.x, f.y - caster.y);
        if (
          !this.hit(
            host,
            b.casterId,
            f.id,
            payloadAt(b.def.payload, dist, d.rangeM + BEAM_MUZZLE_M),
            b.dir,
            b.def.look?.hitFlash,
          )
        )
          continue;
        b.touching.push(f.id);
        host.emit({
          kind: 'impact',
          ability: b.def.id,
          look: b.def.look,
          vfx: b.def.vfx,
          sfx: b.landed ? null : b.def.sfx.impact,
          x: f.x,
          y: f.y,
          radiusM: 0.35,
        });
        b.landed = true;
      }
      // The end of the beam scorches whatever stopped it (sets furniture alight, chips doors and walls).
      host.hitEnvironment(b.casterId, b.to, 0.3, b.def.payload, b.dir, true);
    }
  }

  /** The caster itself, or a fighter on its team (its summons, its summoner): never hit. */
  private friendly(f: AbilityTarget, casterId: string, host: AbilityHost): boolean {
    if (f.id === casterId) return true;
    if (f.team === undefined) return false;
    return host.fighters().find((o) => o.id === casterId)?.team === f.team;
  }

  /** Hit a fighter; a pulling payload then drags it to the caster (Grave Chains). */
  private hit(
    host: AbilityHost,
    casterId: string,
    targetId: string,
    payload: AbilityPayload,
    dir: Vec2,
    hitFlash?: number,
  ): boolean {
    const landed = host.hitFighter(casterId, targetId, payload, dir, hitFlash);
    if (landed && payload.pull) {
      for (let i = this.actions.length - 1; i >= 0; i--) {
        const a = this.actions[i]!;
        if ((a.kind === 'pull' || a.kind === 'grab') && a.targetId === targetId) this.actions.splice(i, 1);
      }
      this.actions.push({
        kind: 'pull',
        casterId,
        targetId,
        speedMps: payload.pull.speedMps,
        stopM: payload.pull.stopM,
        ageS: 0,
      });
    }
    return landed;
  }

  private updateActions(dtS: number, host: AbilityHost): void {
    for (let i = this.actions.length - 1; i >= 0; i--) {
      const a = this.actions[i]!;
      const finished =
        a.kind === 'dash'
          ? this.stepDash(a, dtS, host)
          : a.kind === 'leap'
            ? this.stepLeap(a, dtS, host)
            : a.kind === 'pull'
              ? this.stepPull(a, dtS, host)
              : this.stepGrab(a, dtS, host);
      if (finished) {
        // The action may have been removed meanwhile (a new pull on the same target).
        const at = this.actions.indexOf(a);
        if (at >= 0) this.actions.splice(at, 1);
        host.drive(a.kind === 'pull' || a.kind === 'grab' ? a.targetId : a.casterId, null, 0);
      }
    }
  }

  /** Drag the target toward the caster until it is `stopM` away, stuck, or out of time. */
  private stepPull(a: PullAction, dtS: number, host: AbilityHost): boolean {
    a.ageS += dtS;
    const target = host.fighters().find((f) => f.id === a.targetId);
    if (!target || !target.hittable || a.ageS > PULL_MAX_S) return true;
    const c = host.position(a.casterId);
    const dx = c.x - target.x;
    const dy = c.y - target.y;
    const d = Math.hypot(dx, dy);
    const gap = d - a.stopM - target.radiusM;
    if (gap <= 0.05) return true;
    const speed = Math.min(a.speedMps, gap / dtS);
    host.drive(a.targetId, { x: (dx / d) * speed, y: (dy / d) * speed }, 0);
    return false;
  }

  /** Hoist the seized target overhead in front of the caster, then slam it down. */
  private stepGrab(a: GrabAction, dtS: number, host: AbilityHost): boolean {
    const d = a.def.delivery;
    if (d.type !== 'grab') return true;
    a.ageS += dtS;
    const target = host.fighters().find((f) => f.id === a.targetId);
    const caster = host.fighters().find((f) => f.id === a.casterId);
    if (!target || !caster || !caster.hittable) return true; // the grabber fell: the target drops
    // Keep the target held just in front of the caster, rising overhead.
    const hold = {
      x: caster.x + a.dir.x * (caster.radiusM + target.radiusM),
      y: caster.y + a.dir.y * (caster.radiusM + target.radiusM),
    };
    const lift = d.liftM * Math.min(1, a.ageS / d.liftS);
    host.drive(
      a.targetId,
      { x: (hold.x - target.x) / Math.max(dtS, 1e-3), y: (hold.y - target.y) / Math.max(dtS, 1e-3) },
      lift,
    );
    if (a.ageS < d.liftS) return false;
    // The slam: down in front, with the full payload and a dust blast.
    host.drive(a.targetId, null, 0);
    const land = {
      x: caster.x + a.dir.x * (caster.radiusM + target.radiusM + 0.2),
      y: caster.y + a.dir.y * (caster.radiusM + target.radiusM + 0.2),
    };
    host.hitFighter(a.casterId, a.targetId, a.def.payload, a.dir, a.def.look?.hitFlash);
    host.hitEnvironment(a.casterId, land, d.slamRadiusM, a.def.payload, { x: 0, y: 0 }, false);
    host.emit({
      kind: 'impact',
      ability: a.def.id,
      look: a.def.look,
      vfx: a.def.vfx,
      sfx: a.def.sfx.impact,
      x: land.x,
      y: land.y,
      radiusM: d.slamRadiusM,
    });
    return true;
  }

  private stepDash(a: DashAction, dtS: number, host: AbilityHost): boolean {
    const d = a.def.delivery;
    if (d.type !== 'dash') return true;
    const at = host.position(a.casterId);
    const movedM = Math.hypot(at.x - a.lastX, at.y - a.lastY);
    a.ageS += dtS;
    // Fire trail behind, laid by distance actually travelled (a wall stops the dash; the trail stops too).
    a.sinceTrailM += movedM;
    a.lastX = at.x;
    a.lastY = at.y;
    if (d.trail && a.sinceTrailM >= TRAIL_SPACING_M) {
      a.sinceTrailM = 0;
      this.zones.push({
        casterId: a.casterId,
        x: at.x,
        y: at.y,
        radiusM: d.trail.radiusM,
        lifeS: d.trail.lifeS,
        ageS: 0,
        burn: d.trail.burn,
      });
    }
    for (const f of host.fighters()) {
      if (this.friendly(f, a.casterId, host) || !f.hittable || a.hit.has(f.id)) continue;
      if (Math.hypot(f.x - at.x, f.y - at.y) > d.hitRadiusM + f.radiusM) continue;
      a.hit.add(f.id);
      if (this.hit(host, a.casterId, f.id, a.def.payload, a.dir, a.def.look?.hitFlash)) {
        host.emit({
          kind: 'impact',
          ability: a.def.id,
          look: a.def.look,
          vfx: a.def.vfx,
          sfx: a.def.sfx.impact,
          x: f.x,
          y: f.y,
          radiusM: d.collision?.radiusM ?? 0.7,
        });
        if (d.collision) return true; // a body charge stops dead in the target
      }
    }
    // Slammed into something solid (barely moved last step although driven at full speed).
    if (d.collision && a.ageS > 0.1 && movedM < d.speedMps * dtS * 0.3) {
      const front = { x: at.x + a.dir.x * 0.6, y: at.y + a.dir.y * 0.6 };
      host.hitEnvironment(a.casterId, front, d.hitRadiusM, a.def.payload, a.dir, false);
      host.emit({
        kind: 'impact',
        ability: a.def.id,
        look: a.def.look,
        vfx: a.def.vfx,
        sfx: a.def.sfx.impact,
        x: front.x,
        y: front.y,
        radiusM: d.collision.radiusM,
      });
      return true;
    }
    host.hitEnvironment(
      a.casterId,
      { x: at.x + a.dir.x * 0.4, y: at.y + a.dir.y * 0.4 },
      d.hitRadiusM,
      a.def.payload,
      a.dir,
      true,
    );
    a.remainingS -= dtS;
    if (a.remainingS <= 0) return true;
    host.drive(a.casterId, { x: a.dir.x * d.speedMps, y: a.dir.y * d.speedMps }, 0);
    return false;
  }

  private stepLeap(a: LeapAction, dtS: number, host: AbilityHost): boolean {
    const d = a.def.delivery;
    if (d.type !== 'leap') return true;
    a.t += dtS;
    if (a.t >= d.airS) {
      // Slam down where the caster actually is (the telegraph showed the planned spot).
      const at = host.position(a.casterId);
      this.blast(a.casterId, a.def, at, d.radiusM, host);
      const ti = this.telegraphs.indexOf(a.telegraph);
      if (ti >= 0) this.telegraphs.splice(ti, 1);
      return true;
    }
    const v = { x: (a.to.x - a.from.x) / d.airS, y: (a.to.y - a.from.y) / d.airS };
    host.drive(a.casterId, v, this.liftOf(a.casterId));
    return false;
  }

  private updateTelegraphs(dtS: number, host: AbilityHost): void {
    for (let i = this.telegraphs.length - 1; i >= 0; i--) {
      const t = this.telegraphs[i]!;
      t.ageS += dtS;
      if (t.onCaster) {
        const at = host.position(t.casterId);
        t.x = at.x;
        t.y = at.y;
      }
      // Leap telegraphs are resolved by the leap itself; rings erupt when their warning ends.
      if ((!t.onCaster && !t.erupts) || t.ageS < t.durationS) continue;
      this.telegraphs.splice(i, 1);
      this.blast(t.casterId, t.def, t, t.radiusM, host);
    }
  }

  /** An area impact: every fighter inside (except the caster) and every prop and door touching it. */
  private blast(casterId: string, def: AbilityDef, at: Vec2, radiusM: number, host: AbilityHost): void {
    for (const f of host.fighters()) {
      if (this.friendly(f, casterId, host) || !f.hittable) continue;
      const dist = Math.hypot(f.x - at.x, f.y - at.y);
      if (dist > radiusM + f.radiusM) continue;
      // Closer to the centre of the blast hits harder (distance falloff, owner 11/11/2026).
      const payload = payloadAt(def.payload, dist, radiusM + f.radiusM);
      this.hit(host, casterId, f.id, payload, norm({ x: f.x - at.x, y: f.y - at.y }), def.look?.hitFlash);
    }
    host.hitEnvironment(casterId, at, radiusM, def.payload, { x: 0, y: 0 }, false);
    host.emit({
      kind: 'impact',
      ability: def.id,
      look: def.look,
      vfx: def.vfx,
      sfx: def.sfx.impact,
      x: at.x,
      y: at.y,
      radiusM,
    });
  }

  private updateZones(dtS: number, host: AbilityHost): void {
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i]!;
      z.ageS += dtS;
      if (z.ageS >= z.lifeS) {
        this.zones.splice(i, 1);
        continue;
      }
      for (const f of host.fighters()) {
        if (this.friendly(f, z.casterId, host) || !f.hittable) continue;
        if (Math.hypot(f.x - z.x, f.y - z.y) <= z.radiusM + f.radiusM) host.burnFighter(f.id, z.burn);
      }
    }
  }
}

/** Distance from a point to a segment. */
function segmentDistance(a: Vec2, b: Vec2, p: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
}
