import type { AbilityDef, AbilityPayload, Burn } from './ability-def';

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
}

export interface AbilityHost {
  fighters(): readonly AbilityTarget[];
  /** Apply an ability hit to a fighter. Returns true if it connected (not dodged or ignored). */
  hitFighter(casterId: string, targetId: string, payload: AbilityPayload, dir: Vec2): boolean;
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
}

interface DashAction {
  readonly kind: 'dash';
  readonly casterId: string;
  readonly def: AbilityDef;
  readonly dir: Vec2;
  remainingS: number;
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

type Action = DashAction | LeapAction;

const TRAIL_SPACING_M = 0.45;
const TRAIL_POINTS = 8;
/** A projectile flies at chest height: it starts this far in front of the caster. */
const MUZZLE_M = 0.5;

const norm = (v: Vec2): Vec2 => {
  const l = Math.hypot(v.x, v.y);
  return l > 1e-6 ? { x: v.x / l, y: v.y / l } : { x: 1, y: 0 };
};

export class AbilityWorld {
  readonly projectiles: Projectile[] = [];
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
    return this.actions.some((a) => a.casterId === casterId);
  }

  /**
   * The cast's wind-up ended: start the delivery. `aim` is the soft-locked
   * target point (or a point straight ahead when nothing is in range).
   */
  release(casterId: string, def: AbilityDef, aim: Vec2, host: AbilityHost): void {
    const at = host.position(casterId);
    const dir = norm({ x: aim.x - at.x, y: aim.y - at.y });
    host.emit({ kind: 'release', ability: def.id, vfx: def.vfx, sfx: def.sfx.release, x: at.x, y: at.y });
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
          hit: new Set(),
          sinceTrailM: TRAIL_SPACING_M,
          lastX: at.x,
          lastY: at.y,
        });
        break;
      case 'nova': {
        const t: Telegraph = {
          casterId,
          def,
          x: at.x,
          y: at.y,
          radiusM: d.radiusM,
          durationS: d.telegraphS,
          ageS: 0,
          onCaster: true,
        };
        this.telegraphs.push(t);
        host.emit({
          kind: 'telegraph',
          ability: def.id,
          vfx: def.vfx,
          sfx: null,
          x: at.x,
          y: at.y,
          radiusM: d.radiusM,
        });
        break;
      }
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

  /** The caster was interrupted or KO'd: stop its dash or leap and any ring still warming up. */
  cancel(casterId: string, host: AbilityHost): void {
    for (let i = this.actions.length - 1; i >= 0; i--) {
      if (this.actions[i]!.casterId !== casterId) continue;
      this.actions.splice(i, 1);
      host.drive(casterId, null, 0);
    }
    for (let i = this.telegraphs.length - 1; i >= 0; i--) {
      const t = this.telegraphs[i]!;
      if (t.casterId !== casterId) continue;
      this.telegraphs.splice(i, 1);
      host.emit({ kind: 'fizzle', ability: t.def.id, vfx: t.def.vfx, sfx: null, x: t.x, y: t.y });
    }
  }

  update(dtS: number, host: AbilityHost): void {
    this.updateProjectiles(dtS, host);
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
        if (f.id === p.casterId || !f.hittable) continue;
        if (segmentDistance(from, to, f) > d.radiusM + f.radiusM) continue;
        if (!host.hitFighter(p.casterId, f.id, p.def.payload, p.dir)) continue; // dodged: flies on
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
        host.emit({ kind: 'fizzle', ability: p.def.id, vfx: p.def.vfx, sfx: null, x: p.x, y: p.y });
      }
    }
  }

  private impact(p: Projectile, at: Vec2, host: AbilityHost): void {
    host.emit({
      kind: 'impact',
      ability: p.def.id,
      vfx: p.def.vfx,
      sfx: p.def.sfx.impact,
      x: at.x,
      y: at.y,
      radiusM: 0.6,
    });
  }

  private updateActions(dtS: number, host: AbilityHost): void {
    for (let i = this.actions.length - 1; i >= 0; i--) {
      const a = this.actions[i]!;
      const finished = a.kind === 'dash' ? this.stepDash(a, dtS, host) : this.stepLeap(a, dtS, host);
      if (finished) {
        this.actions.splice(i, 1);
        host.drive(a.casterId, null, 0);
      }
    }
  }

  private stepDash(a: DashAction, dtS: number, host: AbilityHost): boolean {
    const d = a.def.delivery;
    if (d.type !== 'dash') return true;
    const at = host.position(a.casterId);
    // Fire trail behind, laid by distance actually travelled (a wall stops the dash; the trail stops too).
    a.sinceTrailM += Math.hypot(at.x - a.lastX, at.y - a.lastY);
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
      if (f.id === a.casterId || !f.hittable || a.hit.has(f.id)) continue;
      if (Math.hypot(f.x - at.x, f.y - at.y) > d.hitRadiusM + f.radiusM) continue;
      a.hit.add(f.id);
      if (host.hitFighter(a.casterId, f.id, a.def.payload, a.dir)) {
        host.emit({
          kind: 'impact',
          ability: a.def.id,
          vfx: a.def.vfx,
          sfx: a.def.sfx.impact,
          x: f.x,
          y: f.y,
          radiusM: 0.7,
        });
      }
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
      if (!t.onCaster || t.ageS < t.durationS) continue;
      this.telegraphs.splice(i, 1);
      this.blast(t.casterId, t.def, t, t.radiusM, host);
    }
  }

  /** An area impact: every fighter inside (except the caster) and every prop and door touching it. */
  private blast(casterId: string, def: AbilityDef, at: Vec2, radiusM: number, host: AbilityHost): void {
    for (const f of host.fighters()) {
      if (f.id === casterId || !f.hittable) continue;
      const dist = Math.hypot(f.x - at.x, f.y - at.y);
      if (dist > radiusM + f.radiusM) continue;
      host.hitFighter(casterId, f.id, def.payload, norm({ x: f.x - at.x, y: f.y - at.y }));
    }
    host.hitEnvironment(casterId, at, radiusM, def.payload, { x: 0, y: 0 }, false);
    host.emit({ kind: 'impact', ability: def.id, vfx: def.vfx, sfx: def.sfx.impact, x: at.x, y: at.y, radiusM });
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
        if (f.id === z.casterId || !f.hittable) continue;
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
