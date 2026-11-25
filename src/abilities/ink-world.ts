import type {
  AbilityDef,
  DragonDelivery,
  MasterpieceDelivery,
  SerpentDelivery,
  SummonSpec,
  VortexDelivery,
} from './ability-def';
import type { AbilityHost, AbilityTarget } from './ability-world';

type Vec2 = { x: number; y: number };

/**
 * Inkmaster's living ink (new fighter): the serpent, the dragon, the cyclone and the Masterpiece ritual. They are
 * simulated here and drawn from this state by the VFX layer, so they behave identically against human and AI fighters.
 * Every hit goes through `AbilityHost.hitFighter` (the shared combat engine); nothing here damages anyone directly.
 */

/** The serpent's body is this many metres long, drawn along its recent path. */
export const SERPENT_LENGTH_M = 3.4;
/** How high the dragon flies above the floor (render height), metres. */
export const DRAGON_HEIGHT_M = 2.1;
/** How long the ink trail behind the dragon's head is, metres. */
export const DRAGON_TRAIL_M = 4.6;
/** The dragon never comes closer than this to the edge of the map, metres. */
export const DRAGON_MARGIN_M = 1.2;
/** After its bite lands the dragon holds as a bursting splash of ink this long. */
export const DRAGON_BURST_S = 0.5;
/** How high the lunging head flies at the start of its charge and where it ends (chest height of what it bites), metres. */
export const DRAGON_LUNGE_END_HEIGHT_M = 1.0;
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

export interface Dragon {
  readonly casterId: string;
  readonly def: AbilityDef;
  readonly spec: DragonDelivery;
  x: number;
  y: number;
  heading: number;
  ageS: number;
  leftS: number;
  phase: 'form' | 'fly' | 'rear' | 'lunge' | 'burst' | 'fade';
  phaseS: number;
  /** Seconds spent flying round the opponent since the last phase (the lunge comes when it reaches `lungeAfterS`). */
  flownS: number;
  orbit: number;
  /** The lunge's lane: where it starts, its direction (locked when the warning starts) and how far it really reaches. */
  lungeDir: Vec2;
  lungeFrom: Vec2;
  lungeReachM: number;
  /** Where the bite landed (the burst), or null. */
  burstAt: Vec2 | null;
  /** Where it was drawn (the brush point). */
  readonly home: Vec2;
  targetId: string | null;
  /** Where its head has been, newest first: the ink trail follows this path behind the head. */
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
  readonly dragons: Dragon[] = [];
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
      case 'dragon': {
        // One dragon per caster: a new drawing replaces the old one.
        for (let i = this.dragons.length - 1; i >= 0; i--)
          if (this.dragons[i]!.casterId === casterId) this.dragons.splice(i, 1);
        const home = { x: at.x + dir.x * 0.8, y: at.y + dir.y * 0.8 };
        this.dragons.push({
          casterId,
          def,
          spec: d,
          x: home.x,
          y: home.y,
          heading: Math.atan2(dir.y, dir.x),
          ageS: 0,
          leftS: d.durationS,
          phase: 'form',
          phaseS: 0,
          flownS: 0,
          orbit: Math.atan2(-dir.y, -dir.x),
          lungeDir: dir,
          lungeFrom: home,
          lungeReachM: d.lungeRangeM,
          burstAt: null,
          home,
          targetId: null,
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
    for (const list of [this.serpents, this.dragons, this.vortices, this.masterpieces, this.figures] as {
      casterId: string;
    }[][])
      for (let i = list.length - 1; i >= 0; i--) if (list[i]!.casterId === casterId) list.splice(i, 1);
  }

  clear(): void {
    this.serpents.length = 0;
    this.dragons.length = 0;
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
    this.updateDragons(dtS, host);
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
      if (!this.casterStanding(s.casterId, host) && s.phase !== 'fade') this.fade(s);
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
        if (s.phaseS >= s.spec.restrainS || !t?.hittable) this.fade(s);
      } else if (s.phaseS >= INK_FADE_S) {
        this.serpents.splice(i, 1);
      }
    }
  }

  private fade(s: Serpent): void {
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
      this.fade(s);
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
      this.fade(s); // it splashes against a wall or furniture
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
        host.trap?.(f.id, spec.restrainS);
        s.targetId = f.id;
        s.phase = 'wrap';
        s.phaseS = 0;
      } else this.fade(s);
      return;
    }
  }

  private updateDragons(dtS: number, host: AbilityHost): void {
    for (let i = this.dragons.length - 1; i >= 0; i--) {
      const d = this.dragons[i]!;
      const spec = d.spec;
      d.ageS += dtS;
      d.phaseS += dtS;
      if (d.phase === 'fade') {
        if (d.phaseS >= INK_FADE_S) this.dragons.splice(i, 1);
        continue;
      }
      d.leftS -= dtS;
      if (d.leftS <= 0 || !this.casterStanding(d.casterId, host)) {
        d.phase = 'fade';
        d.phaseS = 0;
        continue;
      }
      if (d.phase === 'form') {
        if (d.phaseS >= spec.formS) {
          d.phase = 'fly';
          d.phaseS = 0;
          host.emit({
            kind: 'impact',
            ability: d.def.id,
            look: d.def.look,
            vfx: 'ink-dragon-live',
            sfx: d.def.sfx.release,
            x: d.x,
            y: d.y,
            radiusM: 1.2,
          });
        }
        continue;
      }
      const target = this.nearestEnemy(d.casterId, d, 30, host);
      d.targetId = target?.id ?? null;
      if (d.phase === 'fly') {
        d.flownS += dtS;
        this.flyStep(d, target, dtS, host.bounds?.());
        if (target && d.flownS >= spec.lungeAfterS) {
          // The warning: it rears with its jaws opening and the lane it will strike along is marked, locked at this moment.
          const dir = norm({ x: target.x - d.x, y: target.y - d.y });
          const end = { x: d.x + dir.x * spec.lungeRangeM, y: d.y + dir.y * spec.lungeRangeM };
          const block = host.blocked({ x: d.x, y: d.y }, end);
          d.lungeDir = dir;
          d.lungeFrom = { x: d.x, y: d.y };
          d.lungeReachM = block === null ? spec.lungeRangeM : Math.max(1, spec.lungeRangeM * block - 0.4);
          d.heading = Math.atan2(dir.y, dir.x);
          d.phase = 'rear';
          d.phaseS = 0;
          host.emit({
            kind: 'telegraph',
            ability: d.def.id,
            look: d.def.look,
            vfx: 'ink-dragon-warn',
            sfx: 'ink-dragon-roar',
            x: d.x,
            y: d.y,
            radiusM: spec.biteWidthM,
          });
        }
      } else if (d.phase === 'rear') {
        if (d.phaseS >= spec.windupS) {
          d.phase = 'lunge';
          d.phaseS = 0;
        }
      } else if (d.phase === 'lunge') {
        this.lungeStep(d, dtS, host);
      } else if (d.phase === 'burst') {
        if (d.phaseS >= DRAGON_BURST_S) {
          d.phase = 'fade';
          d.phaseS = 0;
        }
      }
    }
  }

  /** The head drives straight along the locked lane with its jaws open; the first fighter it reaches is bitten and the dragon bursts into ink. */
  private lungeStep(d: Dragon, dtS: number, host: AbilityHost): void {
    const spec = d.spec;
    const travelled = Math.hypot(d.x - d.lungeFrom.x, d.y - d.lungeFrom.y);
    const step = Math.min(spec.lungeSpeedMps * dtS, Math.max(0, d.lungeReachM - travelled));
    d.x += d.lungeDir.x * step;
    d.y += d.lungeDir.y * step;
    // The head never leaves the map: at the edge the lane ends there.
    const bounds = host.bounds?.();
    if (bounds) {
      const cx = Math.max(DRAGON_MARGIN_M, Math.min(bounds.w - DRAGON_MARGIN_M, d.x));
      const cy = Math.max(DRAGON_MARGIN_M, Math.min(bounds.h - DRAGON_MARGIN_M, d.y));
      if (cx !== d.x || cy !== d.y) {
        d.x = cx;
        d.y = cy;
        d.lungeReachM = Math.hypot(d.x - d.lungeFrom.x, d.y - d.lungeFrom.y);
      }
    }
    this.trailStep(d);
    for (const f of host.fighters()) {
      if (!f.hittable || this.friendly(f, d.casterId, host)) continue;
      if (Math.hypot(f.x - d.x, f.y - d.y) > spec.biteWidthM / 2 + f.radiusM) continue;
      host.hitFighter(d.casterId, f.id, d.def.payload, d.lungeDir, d.def.look?.hitFlash);
      d.burstAt = { x: d.x, y: d.y };
      d.phase = 'burst';
      d.phaseS = 0;
      host.emit({
        kind: 'impact',
        ability: d.def.id,
        look: d.def.look,
        vfx: d.def.vfx,
        sfx: d.def.sfx.impact,
        x: d.x,
        y: d.y,
        radiusM: 1.6,
        dirX: d.lungeDir.x,
        dirY: d.lungeDir.y,
      });
      return;
    }
    if (Math.hypot(d.x - d.lungeFrom.x, d.y - d.lungeFrom.y) >= d.lungeReachM - 1e-6) {
      // Nothing was in the way: the head dissolves into ink at the end of the lane.
      d.phase = 'fade';
      d.phaseS = 0;
    }
  }

  /** It circles the target at its orbit radius, never closer than the orbit, drifting round slowly. */
  private flyStep(d: Dragon, target: AbilityTarget | null, dtS: number, bounds?: { w: number; h: number }): void {
    const spec = d.spec;
    const centre = target ?? { x: d.x, y: d.y };
    d.orbit += 0.55 * dtS;
    const px = d.x;
    const py = d.y;
    let want = { x: centre.x + Math.cos(d.orbit) * spec.orbitM, y: centre.y + Math.sin(d.orbit) * spec.orbitM };
    // It flies inside the map: the circle it flies round the opponent is pressed in from the walls (never outside the arena).
    if (bounds)
      want = {
        x: Math.max(DRAGON_MARGIN_M, Math.min(bounds.w - DRAGON_MARGIN_M, want.x)),
        y: Math.max(DRAGON_MARGIN_M, Math.min(bounds.h - DRAGON_MARGIN_M, want.y)),
      };
    const dx = want.x - d.x;
    const dy = want.y - d.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 0.05) {
      const step = Math.min(dist, spec.speedMps * dtS);
      d.x += (dx / dist) * step;
      d.y += (dy / dist) * step;
    }
    if (bounds) {
      d.x = Math.max(DRAGON_MARGIN_M, Math.min(bounds.w - DRAGON_MARGIN_M, d.x));
      d.y = Math.max(DRAGON_MARGIN_M, Math.min(bounds.h - DRAGON_MARGIN_M, d.y));
    }
    // The head always faces the opponent, whichever way it is flying round them; the ink trail follows the path it has flown.
    if (target) d.heading = Math.atan2(target.y - d.y, target.x - d.x);
    if (Math.hypot(d.x - px, d.y - py) > 0) this.trailStep(d);
  }

  /** The ink trail records the path the head has flown, as long as `DRAGON_TRAIL_M`. */
  private trailStep(d: Dragon): void {
    d.trail.unshift({ x: d.x, y: d.y });
    let len = 0;
    for (let k = 1; k < d.trail.length; k++) {
      len += Math.hypot(d.trail[k]!.x - d.trail[k - 1]!.x, d.trail[k]!.y - d.trail[k - 1]!.y);
      if (len > DRAGON_TRAIL_M) {
        d.trail.length = k + 1;
        break;
      }
    }
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
