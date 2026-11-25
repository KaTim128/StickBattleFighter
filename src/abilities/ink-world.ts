import type {
  AbilityDef,
  BullDelivery,
  MasterpieceDelivery,
  SerpentDelivery,
  SummonSpec,
  VortexDelivery,
} from './ability-def';
import type { AbilityHost, AbilityTarget } from './ability-world';

type Vec2 = { x: number; y: number };

/**
 * Inkmaster's living ink (new fighter): the serpent, the bull, the cyclone and the Masterpiece ritual. They are
 * simulated here and drawn from this state by the VFX layer, so they behave identically against human and AI fighters.
 * Every hit goes through `AbilityHost.hitFighter` (the shared combat engine); nothing here damages anyone directly.
 */

/** The serpent's body is this many metres long, drawn along its recent path. */
export const SERPENT_LENGTH_M = 3.4;
/** The bull never comes closer than this to the edge of the map, metres. */
export const BULL_MARGIN_M = 1.0;
/** After its horns land the bull holds as a bursting splash of ink this long. */
export const BULL_BURST_S = 0.55;
/** How long the ink trail behind the bull is, metres. */
export const BULL_TRAIL_M = 5;
/** A bitten target's wrap and a missed bite both leave the serpent this long before it may bite again. */
const BITE_PAUSE_S = 0.7;
/** The serpent fades out over this long once it has finished. */
export const INK_FADE_S = 0.6;
/** The vortex fades after its collapse over this long. */
export const COLLAPSE_S = 0.7;

export interface Serpent {
  readonly casterId: string;
  readonly def: AbilityDef;
  readonly spec: SerpentDelivery;
  x: number;
  y: number;
  heading: number;
  ageS: number;
  /** Drawn stroke by stroke ('form'), hunting, wrapped round its prey, or dissolving. */
  phase: 'form' | 'hunt' | 'wrap' | 'fade';
  phaseS: number;
  targetId: string | null;
  biteReadyS: number;
  /** Where it was drawn (the brush point), and its recent path, newest first. */
  readonly home: Vec2;
  readonly trail: Vec2[];
}

export interface Bull {
  readonly casterId: string;
  readonly def: AbilityDef;
  readonly spec: BullDelivery;
  x: number;
  y: number;
  heading: number;
  /** Metres per second along its heading (it builds up to a full charge and bleeds off again when it misses). */
  speed: number;
  /** -1..1: how hard it is turning right now (the body leans into the corner). */
  lean: number;
  /** How far its legs have cycled (grows with the ground it covers, so the gallop matches its speed). */
  gait: number;
  ageS: number;
  /** Rises from a burst of ink, paws the ground and snorts, charges, rams (a hit) or slows (a miss), then scatters into ink. */
  phase: 'form' | 'paw' | 'charge' | 'ram' | 'slow' | 'fade';
  phaseS: number;
  targetId: string | null;
  /** Fighters it has already swept past (a dodged charge does not hit the same one twice). */
  readonly passed: Set<string>;
  /** Where the horns landed, or null. */
  burstAt: Vec2 | null;
  /** Where it rose from. */
  readonly home: Vec2;
  /** Where its body has been, newest first: dust and ink follow this path behind it. */
  readonly trail: Vec2[];
}

export interface Vortex {
  readonly casterId: string;
  readonly def: AbilityDef;
  readonly spec: VortexDelivery;
  x: number;
  y: number;
  ageS: number;
  sinceTickS: number;
  collapsed: boolean;
  /** Seconds since the collapse (0 before). */
  collapseS: number;
}

/** A stick figure being brushed onto the floor (Ink Clone): quick strokes, then the clone rises from its pool. */
export interface DrawnFigure {
  readonly casterId: string;
  readonly def: AbilityDef;
  readonly spec: SummonSpec;
  x: number;
  y: number;
  ageS: number;
}

/** A brush slash cutting through the air in front of Inkmaster (Ink Slash): drawn for a moment, then gone. */
export interface InkSlash {
  readonly x: number;
  readonly y: number;
  readonly dirX: number;
  readonly dirY: number;
  readonly reachM: number;
  ageS: number;
}

export interface Masterpiece {
  readonly casterId: string;
  readonly def: AbilityDef;
  readonly drawS: number;
  readonly summon: MasterpieceDelivery['summon'];
  /** Where the scroll hangs, in front of the caster. */
  x: number;
  y: number;
  ageS: number;
  /** The monster has torn out: the scroll tears and fades for this long. */
  awakenS: number;
  /** Where the artist stands (an ink stream runs from his brush to the scroll). */
  cx: number;
  cy: number;
}

const norm = (v: Vec2): Vec2 => {
  const l = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / l, y: v.y / l };
};

/** Shortest signed angle from `a` to `b`. */
const angleDiff = (a: number, b: number): number => {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
};

export class InkWorld {
  readonly serpents: Serpent[] = [];
  readonly bulls: Bull[] = [];
  readonly vortices: Vortex[] = [];
  readonly masterpieces: Masterpiece[] = [];
  readonly figures: DrawnFigure[] = [];
  readonly slashes: InkSlash[] = [];
  /** A wrapped target cannot be wrapped again until this world time. */
  private readonly wrapImmuneUntilS = new Map<string, number>();
  private nowS = 0;

  constructor(
    private readonly nearestEnemy: (
      casterId: string,
      at: Vec2,
      rangeM: number,
      host: AbilityHost,
    ) => AbilityTarget | null,
    private readonly friendly: (f: AbilityTarget, casterId: string, host: AbilityHost) => boolean,
  ) {}

  /** Does `casterId` have anything of this ability still running (its cooldown waits for it)? */
  runningIds(casterId: string): string[] {
    const ids: string[] = [];
    for (const v of this.vortices) if (v.casterId === casterId) ids.push(v.def.id);
    for (const m of this.masterpieces) if (m.casterId === casterId) ids.push(m.def.id);
    return ids;
  }

  /** Start one of the ink deliveries; false if `def` is not one. */
  release(casterId: string, def: AbilityDef, aim: Vec2, host: AbilityHost): boolean {
    const d = def.delivery;
    const at = host.position(casterId);
    const dir = norm({ x: aim.x - at.x, y: aim.y - at.y });
    switch (d.type) {
      case 'serpent': {
        const home = { x: at.x + dir.x * 1.1, y: at.y + dir.y * 1.1 };
        this.serpents.push({
          casterId,
          def,
          spec: d,
          x: home.x,
          y: home.y,
          heading: Math.atan2(dir.y, dir.x),
          ageS: 0,
          phase: 'form',
          phaseS: 0,
          targetId: null,
          biteReadyS: 0,
          home,
          trail: [{ ...home }],
        });
        return true;
      }
      case 'bull': {
        // One bull per caster: a new drawing replaces the old one.
        for (let i = this.bulls.length - 1; i >= 0; i--)
          if (this.bulls[i]!.casterId === casterId) this.bulls.splice(i, 1);
        const want = d.spawnM;
        const block = host.blocked(at, { x: at.x + dir.x * want, y: at.y + dir.y * want });
        const reach = block === null ? want : Math.max(1, want * block - 0.6);
        const home = { x: at.x + dir.x * reach, y: at.y + dir.y * reach };
        const foe = this.nearestEnemy(casterId, home, 30, host);
        this.bulls.push({
          casterId,
          def,
          spec: d,
          x: home.x,
          y: home.y,
          heading: foe ? Math.atan2(foe.y - home.y, foe.x - home.x) : Math.atan2(dir.y, dir.x),
          speed: 0,
          lean: 0,
          gait: 0,
          ageS: 0,
          phase: 'form',
          phaseS: 0,
          targetId: foe?.id ?? null,
          passed: new Set(),
          burstAt: null,
          home,
          trail: [{ ...home }],
        });
        return true;
      }
      case 'vortex': {
        const want = Math.min(d.placeM, Math.hypot(aim.x - at.x, aim.y - at.y));
        const end = { x: at.x + dir.x * want, y: at.y + dir.y * want };
        const block = host.blocked(at, end);
        const reach = block === null ? want : Math.max(0, want * block - 0.5);
        this.vortices.push({
          casterId,
          def,
          spec: d,
          x: at.x + dir.x * reach,
          y: at.y + dir.y * reach,
          ageS: 0,
          sinceTickS: 0,
          collapsed: false,
          collapseS: 0,
        });
        return true;
      }
      case 'summon': {
        // Ink Clone: a stick figure is drawn on the floor first, then the clone rises where it was drawn.
        this.figures.push({ casterId, def, spec: d, x: at.x + dir.x * 1.9, y: at.y + dir.y * 1.9, ageS: 0 });
        return true;
      }
      case 'masterpiece': {
        this.masterpieces.push({
          casterId,
          def,
          drawS: d.drawS,
          summon: d.summon,
          x: at.x + dir.x * 2.1,
          y: at.y + dir.y * 2.1,
          ageS: 0,
          awakenS: 0,
          cx: at.x,
          cy: at.y,
        });
        return true;
      }
      default:
        return false;
    }
  }

  /** Everything of this caster ends (it fell, or the battle reset). */
  /** A brush slash for the ink look (the hit itself is the ability's strike): shown briefly in front of the caster. */
  slash(at: Vec2, dir: Vec2, reachM: number): void {
    this.slashes.push({ x: at.x, y: at.y, dirX: dir.x, dirY: dir.y, reachM, ageS: 0 });
  }

  clearOf(casterId: string): void {
    for (const list of [this.serpents, this.bulls, this.vortices, this.masterpieces, this.figures] as {
      casterId: string;
    }[][])
      for (let i = list.length - 1; i >= 0; i--) if (list[i]!.casterId === casterId) list.splice(i, 1);
  }

  clear(): void {
    this.serpents.length = 0;
    this.bulls.length = 0;
    this.vortices.length = 0;
    this.masterpieces.length = 0;
    this.figures.length = 0;
    this.slashes.length = 0;
    this.wrapImmuneUntilS.clear();
  }

  /** Is the caster still standing? Everything it drew ends the moment it falls. */
  private casterStanding(casterId: string, host: AbilityHost): boolean {
    return host.fighters().some((f) => f.id === casterId && f.hittable);
  }

  update(dtS: number, host: AbilityHost): void {
    this.nowS += dtS;
    this.updateSerpents(dtS, host);
    this.updateBulls(dtS, host);
    this.updateVortices(dtS, host);
    this.updateMasterpieces(dtS, host);
    this.updateFigures(dtS, host);
    for (let i = this.slashes.length - 1; i >= 0; i--) {
      this.slashes[i]!.ageS += dtS;
      if (this.slashes[i]!.ageS > 0.4) this.slashes.splice(i, 1);
    }
  }

  private updateSerpents(dtS: number, host: AbilityHost): void {
    for (let i = this.serpents.length - 1; i >= 0; i--) {
      const s = this.serpents[i]!;
      s.ageS += dtS;
      s.phaseS += dtS;
      s.biteReadyS = Math.max(0, s.biteReadyS - dtS);
      if (!this.casterStanding(s.casterId, host) && s.phase !== 'fade') this.fade(s, host);
      if (s.phase === 'form') {
        if (s.phaseS >= s.spec.formS) {
          s.phase = 'hunt';
          s.phaseS = 0;
          const t = this.nearestEnemy(s.casterId, s, 16, host);
          s.targetId = t?.id ?? null;
          host.emit({
            kind: 'impact',
            ability: s.def.id,
            look: s.def.look,
            vfx: 'ink-serpent-live',
            sfx: s.def.sfx.release,
            x: s.x,
            y: s.y,
            radiusM: 1,
          });
        }
      } else if (s.phase === 'hunt') {
        this.huntStep(s, dtS, host);
      } else if (s.phase === 'wrap') {
        const t = host.fighters().find((f) => f.id === s.targetId);
        if (t) {
          // It coils round its prey for the whole hold, then lets go.
          s.x = t.x;
          s.y = t.y;
        }
        // It holds for exactly `restrainS` (the binding runs on its own clock to the same length), then unwinds and bursts into ink.
        if (s.phaseS >= s.spec.restrainS || !t?.hittable) this.fade(s, host);
      } else if (s.phaseS >= INK_FADE_S) {
        this.serpents.splice(i, 1);
      }
    }
  }

  /** The serpent lets go (its time is up, the prey fell, or its caster did) and dissolves; the binding always ends with it. */
  private fade(s: Serpent, host?: AbilityHost): void {
    if (s.phase === 'wrap' && host) {
      const t = host.fighters().find((f) => f.id === s.targetId);
      host.bind?.(s.targetId ?? '', 0);
      if (t)
        host.emit({
          kind: 'impact',
          ability: s.def.id,
          look: s.def.look,
          vfx: 'ink-splash',
          sfx: 'ink-pool',
          x: t.x,
          y: t.y,
          radiusM: 1.1,
        });
    }
    s.phase = 'fade';
    s.phaseS = 0;
  }

  private huntStep(s: Serpent, dtS: number, host: AbilityHost): void {
    const spec = s.spec;
    let target = host.fighters().find((f) => f.id === s.targetId && f.hittable);
    if (!target) {
      const t = this.nearestEnemy(s.casterId, s, 16, host);
      s.targetId = t?.id ?? null;
      target = t ?? undefined;
    }
    if (!target || s.ageS > spec.lifeS) {
      this.fade(s, host);
      return;
    }
    // It turns toward the target no faster than its turn rate, so a sidestep or a dodge throws it off.
    const want = Math.atan2(target.y - s.y, target.x - s.x);
    const turn = Math.max(-spec.turnRadPerS * dtS, Math.min(spec.turnRadPerS * dtS, angleDiff(s.heading, want)));
    s.heading += turn;
    const step = spec.speedMps * dtS;
    const from = { x: s.x, y: s.y };
    const to = { x: s.x + Math.cos(s.heading) * step, y: s.y + Math.sin(s.heading) * step };
    if (host.blocked(from, to) !== null) {
      this.fade(s, host); // it splashes against a wall or furniture
      host.emit({
        kind: 'impact',
        ability: s.def.id,
        look: s.def.look,
        vfx: 'ink-splash',
        sfx: null,
        x: s.x,
        y: s.y,
        radiusM: 0.8,
      });
      return;
    }
    s.x = to.x;
    s.y = to.y;
    s.trail.unshift({ x: s.x, y: s.y });
    // The body keeps only its own length of path.
    let len = 0;
    for (let k = 1; k < s.trail.length; k++) {
      len += Math.hypot(s.trail[k]!.x - s.trail[k - 1]!.x, s.trail[k]!.y - s.trail[k - 1]!.y);
      if (len > SERPENT_LENGTH_M) {
        s.trail.length = k + 1;
        break;
      }
    }
    if (s.biteReadyS > 0) return;
    for (const f of host.fighters()) {
      if (!f.hittable || this.friendly(f, s.casterId, host)) continue;
      if (Math.hypot(f.x - s.x, f.y - s.y) > spec.radiusM + f.radiusM) continue;
      const dir = norm({ x: f.x - from.x, y: f.y - from.y });
      const landed = host.hitFighter(s.casterId, f.id, s.def.payload, dir, s.def.look?.hitFlash);
      s.biteReadyS = BITE_PAUSE_S;
      if (!landed) continue; // a dodged bite: it carries on hunting
      host.emit({
        kind: 'impact',
        ability: s.def.id,
        look: s.def.look,
        vfx: s.def.vfx,
        sfx: s.def.sfx.impact,
        x: f.x,
        y: f.y,
        radiusM: 1,
      });
      // Wrapped: held by the legs for a short time, then released; never twice in a row.
      if ((this.wrapImmuneUntilS.get(f.id) ?? 0) <= this.nowS) {
        this.wrapImmuneUntilS.set(f.id, this.nowS + spec.restrainS + spec.immuneS);
        host.bind?.(f.id, spec.restrainS);
        s.targetId = f.id;
        s.phase = 'wrap';
        s.phaseS = 0;
      } else this.fade(s, host);
      return;
    }
  }

  private updateBulls(dtS: number, host: AbilityHost): void {
    for (let i = this.bulls.length - 1; i >= 0; i--) {
      const b = this.bulls[i]!;
      const spec = b.spec;
      b.ageS += dtS;
      b.phaseS += dtS;
      if (b.phase === 'fade') {
        if (b.phaseS >= INK_FADE_S) this.bulls.splice(i, 1);
        continue;
      }
      if (!this.casterStanding(b.casterId, host) || b.ageS > spec.durationS) {
        this.bullFade(b, host);
        continue;
      }
      // It tracks the same opponent for the whole charge (and picks the nearest again if that one is gone).
      let target = host.fighters().find((f) => f.id === b.targetId && f.hittable) as AbilityTarget | undefined;
      if (!target) {
        target = this.nearestEnemy(b.casterId, b, 30, host) ?? undefined;
        b.targetId = target?.id ?? null;
      }
      if (b.phase === 'form') {
        if (b.phaseS >= spec.formS) {
          b.phase = 'paw';
          b.phaseS = 0;
          host.emit({
            kind: 'impact',
            ability: b.def.id,
            look: b.def.look,
            vfx: 'ink-bull-rise',
            sfx: b.def.sfx.release,
            x: b.x,
            y: b.y,
            radiusM: 1.6,
          });
        }
      } else if (b.phase === 'paw') {
        // Head down, one hoof scraping the ground; it squares up to the opponent while it gets ready.
        if (target) b.heading += clampTurn(angleDiff(b.heading, Math.atan2(target.y - b.y, target.x - b.x)), 3 * dtS);
        if (b.phaseS >= spec.pawS) {
          b.phase = 'charge';
          b.phaseS = 0;
          host.emit({
            kind: 'impact',
            ability: b.def.id,
            look: b.def.look,
            vfx: 'ink-bull-start',
            sfx: 'bull-charge',
            x: b.x,
            y: b.y,
            radiusM: 1.4,
            dirX: Math.cos(b.heading),
            dirY: Math.sin(b.heading),
          });
        }
      } else if (b.phase === 'charge') {
        this.chargeStep(b, target ?? null, dtS, host);
      } else if (b.phase === 'slow') {
        b.speed = Math.max(0, b.speed - (spec.speedMps / spec.slowS) * dtS);
        b.lean *= 0.9;
        this.bullMove(b, dtS, host);
        if (b.phaseS >= spec.slowS) this.bullFade(b, host);
      } else if (b.phase === 'ram') {
        b.speed = 0;
        b.lean = 0;
        if (b.phaseS >= BULL_BURST_S) {
          b.phase = 'fade';
          b.phaseS = 0;
        }
      }
    }
  }

  /** It scatters into ink where it stands (a miss that has run its course, a wall, or its caster going down). */
  private bullFade(b: Bull, host: AbilityHost): void {
    b.phase = 'fade';
    b.phaseS = 0;
    host.emit({
      kind: 'impact',
      ability: b.def.id,
      look: b.def.look,
      vfx: 'ink-splash',
      sfx: 'ink-splash',
      x: b.x,
      y: b.y,
      radiusM: 1.2,
    });
  }

  /**
   * The charge: it builds up speed, then curves toward its opponent no faster than its turn rate (less when it is going flat out, and not
   * at all once it has committed inside `commitM`), so a sidestep at the right moment or a dodge throws it off. The horns land on the
   * first opponent it reaches; a dodged pass is not a hit, and it carries on, then slows and scatters.
   */
  private chargeStep(b: Bull, target: AbilityTarget | null, dtS: number, host: AbilityHost): void {
    const spec = b.spec;
    b.speed = Math.min(spec.speedMps, b.speed + spec.accelMps2 * dtS);
    let turned = 0;
    if (target) {
      const dist = Math.hypot(target.x - b.x, target.y - b.y);
      const ahead = Math.cos(angleDiff(b.heading, Math.atan2(target.y - b.y, target.x - b.x))) > 0.2;
      // Inside the commit distance, or once it has gone past, it holds its line: it cannot turn on a sixpence.
      if (dist > spec.commitM && ahead) {
        const rate = spec.turnRadPerS * (1.15 - 0.5 * (b.speed / spec.speedMps));
        turned = clampTurn(angleDiff(b.heading, Math.atan2(target.y - b.y, target.x - b.x)), rate * dtS);
        b.heading += turned;
      }
      // Once it has run past its opponent it loses interest, slows and scatters.
      if (!ahead && dist > 1.8 && b.phaseS > 0.5) {
        b.phase = 'slow';
        b.phaseS = 0;
        return;
      }
    }
    // The body leans into the corner in proportion to how hard it is turning.
    const maxTurn = spec.turnRadPerS * 0.65 * dtS || 1;
    b.lean += (Math.max(-1, Math.min(1, turned / maxTurn)) - b.lean) * Math.min(1, dtS * 8);
    if (!this.bullMove(b, dtS, host)) return;
    for (const f of host.fighters()) {
      if (!f.hittable || this.friendly(f, b.casterId, host) || b.passed.has(f.id)) continue;
      if (Math.hypot(f.x - b.x, f.y - b.y) > spec.radiusM + f.radiusM) continue;
      const dir = { x: Math.cos(b.heading), y: Math.sin(b.heading) };
      const landed = host.hitFighter(b.casterId, f.id, b.def.payload, dir, b.def.look?.hitFlash);
      if (!landed) {
        b.passed.add(f.id); // dodged (or guarded): it thunders past
        continue;
      }
      b.burstAt = { x: f.x, y: f.y };
      b.phase = 'ram';
      b.phaseS = 0;
      host.emit({
        kind: 'impact',
        ability: b.def.id,
        look: b.def.look,
        vfx: b.def.vfx,
        sfx: b.def.sfx.impact,
        x: f.x,
        y: f.y,
        radiusM: 2,
        dirX: dir.x,
        dirY: dir.y,
      });
      return;
    }
    if (b.phaseS >= spec.chargeS) {
      b.phase = 'slow';
      b.phaseS = 0;
    }
  }

  /** Move along its heading; false if it ran into a wall or furniture (it splashes against it) or the edge of the map. */
  private bullMove(b: Bull, dtS: number, host: AbilityHost): boolean {
    if (b.speed <= 0) return true;
    const from = { x: b.x, y: b.y };
    const to = { x: b.x + Math.cos(b.heading) * b.speed * dtS, y: b.y + Math.sin(b.heading) * b.speed * dtS };
    const bounds = host.bounds?.();
    const out =
      bounds !== undefined &&
      (to.x < BULL_MARGIN_M ||
        to.y < BULL_MARGIN_M ||
        to.x > bounds.w - BULL_MARGIN_M ||
        to.y > bounds.h - BULL_MARGIN_M);
    if (out || host.blocked(from, to) !== null) {
      b.phase = 'ram';
      b.phaseS = 0;
      b.speed = 0;
      host.emit({
        kind: 'impact',
        ability: b.def.id,
        look: b.def.look,
        vfx: 'ink-splash',
        sfx: 'ink-splash',
        x: b.x,
        y: b.y,
        radiusM: 1.4,
        dirX: Math.cos(b.heading),
        dirY: Math.sin(b.heading),
      });
      return false;
    }
    b.gait += b.speed * dtS * 2.2;
    b.x = to.x;
    b.y = to.y;
    b.trail.unshift({ x: b.x, y: b.y });
    let len = 0;
    for (let k = 1; k < b.trail.length; k++) {
      len += Math.hypot(b.trail[k]!.x - b.trail[k - 1]!.x, b.trail[k]!.y - b.trail[k - 1]!.y);
      if (len > BULL_TRAIL_M) {
        b.trail.length = k + 1;
        break;
      }
    }
    return true;
  }

  private updateVortices(dtS: number, host: AbilityHost): void {
    for (let i = this.vortices.length - 1; i >= 0; i--) {
      const v = this.vortices[i]!;
      const spec = v.spec;
      if (v.collapsed) {
        v.collapseS += dtS;
        if (v.collapseS >= COLLAPSE_S) this.vortices.splice(i, 1);
        continue;
      }
      v.ageS += dtS;
      v.sinceTickS += dtS;
      const standing = this.casterStanding(v.casterId, host);
      const tick = v.sinceTickS >= spec.tickS;
      if (tick) v.sinceTickS -= spec.tickS;
      for (const f of host.fighters()) {
        if (!f.hittable || this.friendly(f, v.casterId, host)) continue;
        const dx = v.x - f.x;
        const dy = v.y - f.y;
        const dist = Math.hypot(dx, dy);
        if (dist > spec.radiusM + f.radiusM) continue;
        // A current toward the centre, weaker than walking: it eases off at the centre so nobody is held there.
        if (dist > 0.4) host.nudge?.(f.id, { x: (dx / dist) * spec.pullMps, y: (dy / dist) * spec.pullMps });
        if (tick && standing)
          host.hitFighter(v.casterId, f.id, v.def.payload, norm({ x: -dx, y: -dy }), v.def.look?.hitFlash);
      }
      if (v.ageS >= spec.durationS || !standing) {
        v.collapsed = true;
        if (standing) this.collapse(v, host);
      }
    }
  }

  /** The dramatic ending: everything inside is thrown outward by one collapsing burst. */
  private collapse(v: Vortex, host: AbilityHost): void {
    const spec = v.spec;
    host.emit({
      kind: 'impact',
      ability: v.def.id,
      look: v.def.look,
      vfx: 'ink-collapse',
      sfx: v.def.sfx.impact,
      x: v.x,
      y: v.y,
      radiusM: spec.collapseRadiusM,
    });
    const burst = {
      ...v.def.payload,
      damage: spec.collapseDamage,
      knockbackMps: spec.collapseKnockbackMps,
      noFlinch: false,
    };
    for (const f of host.fighters()) {
      if (!f.hittable || this.friendly(f, v.casterId, host)) continue;
      const dist = Math.hypot(f.x - v.x, f.y - v.y);
      if (dist > spec.collapseRadiusM + f.radiusM) continue;
      host.hitFighter(v.casterId, f.id, burst, norm({ x: f.x - v.x, y: f.y - v.y }), v.def.look?.hitFlash);
    }
  }

  private updateFigures(dtS: number, host: AbilityHost): void {
    for (let i = this.figures.length - 1; i >= 0; i--) {
      const f = this.figures[i]!;
      f.ageS += dtS;
      if (!this.casterStanding(f.casterId, host)) {
        this.figures.splice(i, 1);
        continue;
      }
      if (f.ageS >= (f.spec.drawS ?? 0)) {
        this.figures.splice(i, 1);
        host.emit({
          kind: 'impact',
          ability: f.def.id,
          look: f.def.look,
          vfx: 'ink-clone-rise',
          sfx: f.def.sfx.impact,
          x: f.x,
          y: f.y,
          radiusM: 1.4,
        });
        host.summon?.(f.casterId, f.spec);
      }
    }
  }

  private updateMasterpieces(dtS: number, host: AbilityHost): void {
    for (let i = this.masterpieces.length - 1; i >= 0; i--) {
      const m = this.masterpieces[i]!;
      if (m.awakenS > 0) {
        m.awakenS += dtS;
        if (m.awakenS >= 1.4) this.masterpieces.splice(i, 1);
        continue;
      }
      m.ageS += dtS;
      const cp = host.position(m.casterId);
      m.cx = cp.x;
      m.cy = cp.y;
      if (!this.casterStanding(m.casterId, host)) {
        // The drawing is ruined: the ink runs off the scroll.
        host.emit({ kind: 'fizzle', ability: m.def.id, look: m.def.look, vfx: 'ink-ruin', sfx: null, x: m.x, y: m.y });
        this.masterpieces.splice(i, 1);
        continue;
      }
      if (m.ageS >= m.drawS) {
        m.awakenS = 0.0001;
        host.emit({
          kind: 'impact',
          ability: m.def.id,
          look: m.def.look,
          vfx: 'masterpiece-awaken',
          sfx: m.def.sfx.impact,
          x: m.x,
          y: m.y,
          radiusM: 3,
        });
        host.summon?.(m.casterId, m.summon);
      }
    }
  }
}

/** A turn of `want` radians limited to at most `max` either way. */
function clampTurn(want: number, max: number): number {
  return Math.max(-max, Math.min(max, want));
}
