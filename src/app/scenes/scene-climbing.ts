import { climbRise } from '../../animation/greybox-motion';
import type { ArenaProps } from '../../environment/arena-props';
import {
  CLIMBING,
  type ClimbSurface,
  canGrab,
  distanceTo,
  fallDamage,
  floorUnder,
  jumpPeakM,
  landingRecoveryS,
} from '../../physics/climbing';
import type { PhysicsWorld } from '../../physics/physics-world';
import type { FighterEntity } from './fighter-entity';

/**
 * Standing on furniture, ledge grabs and fall damage in the fight scene (owner, 12/11/2026). The
 * rules live in `src/physics/climbing.ts`; this keeps them in step with the props and bodies.
 */
export class SceneClimbing {
  /** Climbable tops this step (reused, rebuilt each step from the standing props). */
  private readonly tops: ClimbSurface[] = [];
  /** Every standing solid prop's footprint and height (what a fighter above furniture can bump into). */
  private readonly solids: ClimbSurface[] = [];

  constructor(
    private readonly props: ArenaProps | null,
    private readonly physics: PhysicsWorld,
    private readonly hooks: {
      /** A hard landing hurt the fighter. */
      onFallDamage(f: FighterEntity, damage: number, dropM: number): void;
      /** A climb finished, or was knocked off. */
      onClimb(f: FighterEntity, event: 'grab' | 'pull' | 'top' | 'knocked'): void;
    },
  ) {}

  /** Refresh the furniture (props move, break and get carried). Call once per step. */
  refresh(): void {
    this.tops.length = 0;
    this.solids.length = 0;
    for (const p of this.props?.props ?? []) {
      if (!p.body || p.broken || p.held || !p.kind.solid) continue;
      const r = p.rect;
      const s = { x0: r.x0, y0: r.y0, x1: r.x1, y1: r.y1, topM: p.size.h };
      this.solids.push(s);
      if (p.kind.climbable) this.tops.push(s);
    }
  }

  get surfaces(): readonly ClimbSurface[] {
    return this.tops;
  }

  /** What this fighter stands on (or would land on): the highest top under it not above its feet. */
  floorFor(f: FighterEntity): number {
    return floorUnder(this.tops, f.x, f.y, f.hop.heightM + 0.02);
  }

  /**
   * Before the hop step: hanging fighters pull up (each Jump press) or are knocked off; airborne
   * fighters pushing into a high edge grab it. Returns true while the fighter hangs (the scene then
   * holds the body still and skips its usual movement and hop).
   */
  step(f: FighterEntity, stepS: number, move: { x: number; y: number }, jumpPressed: boolean): boolean {
    const c = f.climb;
    if (c) {
      if (!f.combatant.canAct || f.combatant.isKo) {
        // Hit while climbing (owner: "cancel the climb and make the stickman fall naturally").
        f.climb = null;
        f.hop = { heightM: f.hop.heightM, verticalSpeedMps: 0 };
        f.fallPeakM = f.hop.heightM;
        this.hooks.onClimb(f, 'knocked');
        return false;
      }
      // Pushing away lets go.
      if (move.x * c.dir.x + move.y * c.dir.y < -0.6) {
        f.climb = null;
        f.hop = { heightM: f.hop.heightM, verticalSpeedMps: 0 };
        f.fallPeakM = f.hop.heightM;
        return false;
      }
      if (c.stepUp) {
        // Up and over: the body moves in over the top as it rises off its hands (no snap).
        c.stepUp.t = Math.min(1, c.stepUp.t + stepS / STEP_UP_S);
        const u = c.stepUp.t;
        const k = u * u * (3 - 2 * u);
        // (Moved directly: placeAt is a teleport and would end the climb.)
        const at = {
          x: c.stepUp.from.x + (c.stepUp.to.x - c.stepUp.from.x) * k,
          y: c.stepUp.from.y + (c.stepUp.to.y - c.stepUp.from.y) * k,
        };
        f.body?.setTranslation(at, true);
        Object.assign(f.curr, at);
        f.hop =
          u >= 1
            ? { heightM: c.surface.topM, verticalSpeedMps: 0, floorM: c.surface.topM }
            : { heightM: c.hangM + (c.surface.topM - c.hangM) * climbRise(1 + u), verticalSpeedMps: 0 };
        if (u >= 1) {
          f.fallPeakM = c.surface.topM;
          f.climb = null;
          this.hooks.onClimb(f, 'top');
        }
        f.body?.setLinvel({ x: 0, y: 0 }, true);
        return true;
      }
      if (jumpPressed) {
        c.progress = Math.min(1, c.progress + CLIMBING.pullPerPress);
        this.hooks.onClimb(f, 'pull');
      } else if (c.progress < 1) c.progress = Math.max(0, c.progress - CLIMBING.slipPerS * stepS); // over the edge: committed
      // The body follows each heave with weight: quick to start, easing in (a spring, not a jump).
      c.shown += (c.progress - c.shown) * Math.min(1, stepS * HEAVE_RATE);
      f.hop = { heightM: c.hangM + (c.surface.topM - c.hangM) * climbRise(c.shown), verticalSpeedMps: 0 };
      if (c.progress >= 1 && c.shown > 0.97) {
        // Over the edge: step in, clear of the edge where the top is wide enough, else along its
        // middle (a narrow shelf).
        const s = c.surface;
        const inset = f.def.body.footRadiusM + 0.12;
        const along = (lo: number, hi: number, want: number) =>
          hi - lo > inset * 2 ? Math.min(hi - inset, Math.max(lo + inset, want)) : (lo + hi) / 2;
        const reach = f.def.body.footRadiusM + 0.4;
        c.shown = 1;
        c.stepUp = {
          t: 0,
          from: { x: f.x, y: f.y },
          to: { x: along(s.x0, s.x1, f.x + c.dir.x * reach), y: along(s.y0, s.y1, f.y + c.dir.y * reach) },
        };
      }
      f.body?.setLinvel({ x: 0, y: 0 }, true);
      return true; // hanging, or just stepped onto the top this step
    }
    if (!f.airborne || !f.def.capabilities.canJump || !f.combatant.canAct || f.carrying) return false;
    const peak = jumpPeakM(f.def.movement.jumpSpeedMps, f.def.movement.hopGravityMps2);
    const body = {
      radiusM: f.def.body.footRadiusM,
      heightM: f.hop.heightM,
      floorM: f.hop.floorM ?? 0,
      peakM: peak,
      scale: f.def.sizeScale ?? 1,
    };
    for (const s of this.tops) {
      if (!canGrab(s, f, move, body)) continue;
      // Hang from the edge: the hands on the top, the body against the side.
      const cx = Math.min(s.x1, Math.max(s.x0, f.x));
      const cy = Math.min(s.y1, Math.max(s.y0, f.y));
      const len = Math.hypot(cx - f.x, cy - f.y) || 1;
      const dir = { x: (cx - f.x) / len, y: (cy - f.y) / len };
      const hangM = Math.max(f.hop.floorM ?? 0, s.topM - CLIMBING.hangDepthM * (f.def.sizeScale ?? 1));
      f.combo.interrupt();
      f.placeAt({ x: cx - dir.x * (body.radiusM + 0.03), y: cy - dir.y * (body.radiusM + 0.03) });
      f.climb = { surface: s, progress: 0, shown: 0, hangM, dir, stepUp: null };
      f.hop = { heightM: Math.max(hangM, Math.min(f.hop.heightM, s.topM)), verticalSpeedMps: 0 };
      f.climb.hangM = f.hop.heightM;
      f.faceToward(dir.x, dir.y);
      this.hooks.onClimb(f, 'grab');
      return true;
    }
    return false;
  }

  /** Before the physics step: above furniture height the body passes over furniture (the scene blocks taller pieces itself). */
  beforePhysics(f: FighterEntity): void {
    if (!f.body) return;
    const over = f.hop.heightM > CLIMBING.overFurnitureM || f.climb !== null;
    if (over !== f.overFurniture) {
      this.physics.setOverFurniture(f.body, over);
      f.overFurniture = over;
    }
  }

  /** After the physics step: a fighter above furniture cannot move into a piece taller than its feet. */
  afterPhysics(f: FighterEntity): void {
    if (!f.overFurniture || !f.body || f.climb) return;
    const r = f.def.body.footRadiusM;
    for (const s of this.solids) {
      if (s.topM <= f.hop.heightM + 0.02) continue;
      const now = distanceTo(s, f.curr.x, f.curr.y) < r;
      const before = distanceTo(s, f.prev.x, f.prev.y) < r;
      if (!now || before) continue;
      // Blocked by its side: stay where it was this step.
      f.body.setTranslation({ x: f.prev.x, y: f.prev.y }, true);
      Object.assign(f.curr, f.prev);
      return;
    }
  }

  /** After the hop step: track the fall and hurt a hard landing. */
  land(f: FighterEntity, wasAirborne: boolean): void {
    if (f.airborne) {
      f.fallPeakM = Math.max(f.fallPeakM, f.hop.heightM);
      return;
    }
    if (wasAirborne) {
      const drop = f.fallPeakM - (f.hop.floorM ?? 0);
      const damage = fallDamage(drop, f.def.body.massKg);
      if (damage > 0) this.hooks.onFallDamage(f, damage, drop);
    }
    f.fallPeakM = f.hop.heightM;
  }

  /** Seconds a hard landing keeps a fighter recovering. */
  static recoveryFor(dropM: number): number {
    return landingRecoveryS(dropM);
  }
}

/** How quickly the body catches up with each heave (per second). */
const HEAVE_RATE = 9;
/** Seconds to rise off the hands and step in over the top. */
const STEP_UP_S = 0.4;
