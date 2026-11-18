import { blendPose, type Limb, type Pose } from '../../animation/skeleton';
import { exitPoint, type HideSpot } from './hiding';
import type { FloorIndex } from './house-types';
import { actionFor, actionPose, type HunterActionKind, NEUTRAL, openAmount } from './hunter-actions';
import type { HouseWorld, Point } from './world';

/**
 * The execution (Hide and Seek, owner 19/11/2026): when Shroud finds the player he does not kill them where they
 * are. He steps in, opens the hiding place, seizes the player by the neck, drags them out into the room, holds
 * them up off the floor by the neck, draws the knife back and stabs them in the stomach three times, drives the
 * last blow in deep, lets go as they crumple, and the screen goes dark. If the player was not hiding he closes
 * in and seizes them by the neck in the open. Pure and deterministic: a `KillSequence` is
 * built once at the catch and then asked for the whole scene (positions, poses, camera, effects) at any time.
 * The game moves the bodies from it, the scene draws it and the page plays its events.
 */
export type KillStage = 'close' | 'open' | 'seize' | 'drag' | 'hold' | 'raise' | 'stab' | 'final' | 'finish';

export type KillEvent =
  | { readonly kind: 'close' | 'seize' | 'drag' | 'hold' | 'raise' | 'finish' }
  /** He opens the place: what he does (a door, a lid, a curtain, kneeling to look under). */
  | { readonly kind: 'open'; readonly action: HunterActionKind }
  | { readonly kind: 'stab'; readonly index: number; readonly final: boolean };

export interface KillFrame {
  readonly stage: KillStage;
  readonly hunter: { readonly x: number; readonly y: number; readonly face: number; readonly pose: Pose };
  readonly player: {
    readonly x: number;
    readonly y: number;
    /** 0 upright .. 1 flat on the floor (a little while held and stabbed, flat once he lets go). */
    readonly lie: number;
    /** How far off the floor the neck grip lifts them, metres. */
    readonly lift: number;
    /** Out of the hiding place (the figure shows again). */
    readonly revealed: boolean;
    /** Hauled along limp (not standing by themselves). */
    readonly limp: boolean;
  };
  /** The place Shroud is opening and how far open it is, 0..1; null when nothing is being opened. */
  readonly spot: { readonly id: string; readonly amount: number } | null;
  /** The camera: how far in (1 = normal) and where, shaking by `shake` (0..1). */
  readonly zoom: number;
  readonly focus: Point;
  readonly shake: number;
  /** A red flash at each blow, 0..1. */
  readonly flash: number;
  /** Letterbox bars, 0..1. */
  readonly bars: number;
  /** Fade to black, 0..1, at the very end. */
  readonly fade: number;
  /** How fast game time runs: slow-motion into each blow. */
  readonly timeScale: number;
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const ease = (t: number): number => {
  const k = Math.min(1, Math.max(0, t));
  return k * k * (3 - 2 * k);
};
const clamp01 = (t: number): number => Math.min(1, Math.max(0, t));
const deg = (d: number): number => (d * Math.PI) / 180;
const limb = (root: number, bend: number): Limb => ({ root: deg(root), bend: deg(bend) });
const pose = (lean: number, head: number, armFront: Limb, armBack: Limb, legFront: Limb, legBack: Limb): Pose => ({
  lean: deg(lean),
  head: deg(head),
  armFront,
  armBack,
  legFront,
  legBack,
});

// His knife arm (front) stays low and ready at his waist; the other arm (back) reaches up and takes the neck.
const SEIZE = pose(-20, 4, limb(64, 18), limb(106, 8), limb(16, -18), limb(-12, -10));
const DRAG = pose(12, -6, limb(60, 22), limb(90, 26), limb(-14, -20), limb(18, -8));
/** Holding the victim up by the neck at arm's length, knife hand low. */
const HOLD = pose(-24, 6, limb(66, 14), limb(110, 4), limb(18, -20), limb(-14, -12));
/** The knife drawn back to the hip, elbow bent, ready to thrust into the stomach. */
const DRAWN = pose(-12, 4, limb(36, 78), limb(110, 4), limb(14, -16), limb(-10, -10));
/** The thrust: the knife arm straight out at stomach height, his weight behind it. */
const THRUST = pose(-36, 6, limb(86, 2), limb(110, 4), limb(32, -32), limb(-22, -18));
/** The last blow: driven in to the hilt. */
const DEEP = pose(-46, 8, limb(90, 0), limb(112, 2), limb(38, -40), limb(-26, -22));
const SPENT = pose(-26, 10, limb(40, 18), limb(-24, 24), limb(26, -34), limb(-16, -20));
/** Held this far off the floor by the neck, metres, and the little lean of a held body. */
const LIFT_M = 0.22;
const HELD_LIE = 0.1;
/** How close to him the victim is held (arm's length), metres. */
const HOLD_GAP_M = 0.55;

/** Seconds each stage takes. The blows land at `HIT_AT` of the way through each stab stage. */
export const STAGE_S = {
  close: 0.35,
  open: 1.0,
  seize: 0.45,
  drag: 0.85,
  hold: 0.35,
  raise: 0.4,
  stab: 0.24, // each of three
  final: 0.45,
  finish: 0.8,
} as const;
const STABS = 3;
const HIT_AT = 0.7;
const FINAL_HIT_AT = 0.6;
const BLEND_IN_S = 0.16;

interface Timeline {
  readonly stage: KillStage;
  readonly from: number;
  readonly to: number;
  /** Which of the three blows, for stab stages. */
  readonly index?: number;
}

export interface KillSetup {
  readonly world: HouseWorld;
  readonly floor: FloorIndex;
  readonly hunter: Point;
  readonly player: Point;
  /** The place the player is hiding in, or null when caught in the open. */
  readonly spot: HideSpot | null;
}

/** Where the victim is held: arm's length from the hunter, in the direction they already are from him. */
function heldAt(hunter: Point, player: Point, fits: (p: Point) => boolean): Point {
  const dx = player.x - hunter.x;
  const dy = player.y - hunter.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return { ...player };
  const held = { x: hunter.x + (dx / len) * HOLD_GAP_M, y: hunter.y + (dy / len) * HOLD_GAP_M };
  return fits(held) ? held : { ...player };
}

export class KillSequence {
  readonly durationS: number;
  readonly hidden: boolean;
  readonly floor: FloorIndex;
  private readonly line: readonly Timeline[];
  private readonly hunterFrom: Point;
  private readonly hunterAt: Point; // where he stands to work (open, seize)
  private readonly hunterEnd: Point; // where he stands once the player is out
  private readonly playerFrom: Point;
  private readonly playerOut: Point; // where the player ends up, on the floor
  private readonly playerHeld: Point; // where he holds them up by the neck
  private readonly openKind: HunterActionKind;
  private readonly spotId: string | null;
  private readonly hits: number[] = [];

  constructor(s: KillSetup) {
    this.floor = s.floor;
    this.hidden = s.spot !== null;
    this.hunterFrom = { ...s.hunter };
    const stages: [KillStage, number, number?][] = [['close', STAGE_S.close]];
    if (s.spot) stages.push(['open', STAGE_S.open]);
    stages.push(['seize', STAGE_S.seize]);
    if (s.spot) stages.push(['drag', STAGE_S.drag]);
    stages.push(['hold', STAGE_S.hold], ['raise', STAGE_S.raise]);
    for (let i = 0; i < STABS; i++) stages.push(['stab', STAGE_S.stab, i]);
    stages.push(['final', STAGE_S.final], ['finish', STAGE_S.finish]);
    const line: Timeline[] = [];
    let t = 0;
    for (const [stage, len, index] of stages) {
      line.push({ stage, from: t, to: t + len, ...(index !== undefined ? { index } : {}) });
      t += len;
    }
    this.line = line;
    this.durationS = t;
    for (const seg of line) {
      if (seg.stage === 'stab') this.hits.push(lerp(seg.from, seg.to, HIT_AT));
      if (seg.stage === 'final') this.hits.push(lerp(seg.from, seg.to, FINAL_HIT_AT));
    }

    const fits = (p: Point): boolean => s.world.fits(s.floor, p.x, p.y);
    this.openKind = s.spot ? actionFor(s.spot.spec.kind, true) : 'glance';
    this.spotId = s.spot?.id ?? null;
    if (s.spot) {
      const at = s.spot.spec.at;
      const exit = exitPoint(s.world, s.spot);
      const len = Math.hypot(exit.x - at.x, exit.y - at.y) || 1;
      const dir = { x: (exit.x - at.x) / len, y: (exit.y - at.y) / len };
      const along = (k: number): Point => ({ x: exit.x + dir.x * k, y: exit.y + dir.y * k });
      const work = [0.45, 0.2, 0][[0.45, 0.2, 0].findIndex((k) => fits(along(k)))] ?? 0;
      this.hunterAt = fits(along(work)) ? along(work) : { ...exit };
      // He backs away as he pulls: as far as there is room (the player ends between him and the place).
      let back = 0;
      for (const k of [1.1, 0.8, 0.5, 0.25]) {
        if (fits({ x: this.hunterAt.x + dir.x * k, y: this.hunterAt.y + dir.y * k })) {
          back = k;
          break;
        }
      }
      this.hunterEnd = { x: this.hunterAt.x + dir.x * back, y: this.hunterAt.y + dir.y * back };
      const gap = Math.max(0.6, Math.min(0.85, back + 0.35));
      this.playerOut = { x: this.hunterEnd.x - dir.x * gap, y: this.hunterEnd.y - dir.y * gap };
      this.playerFrom = { ...at };
      this.playerHeld = heldAt(this.hunterEnd, this.playerOut, fits);
    } else {
      const dx = s.player.x - s.hunter.x;
      const dy = s.player.y - s.hunter.y;
      const len = Math.hypot(dx, dy) || 1;
      const dir = { x: dx / len, y: dy / len };
      const near: Point = { x: s.player.x - dir.x * 0.95, y: s.player.y - dir.y * 0.95 };
      this.hunterAt = len > 0.95 && fits(near) ? near : { ...s.hunter };
      this.hunterEnd = this.hunterAt;
      this.playerFrom = { ...s.player };
      this.playerOut = { ...s.player };
      this.playerHeld = heldAt(this.hunterEnd, this.playerOut, fits);
    }
  }

  /** Where each blow lands, seconds from the start. */
  get hitTimes(): readonly number[] {
    return this.hits;
  }

  private segmentAt(t: number): Timeline {
    const x = Math.min(this.durationS - 1e-9, Math.max(0, t));
    return this.line.find((s) => x >= s.from && x < s.to) ?? this.line[this.line.length - 1]!;
  }

  /** The events that happen in (from, to]: a stage beginning, a blow landing. */
  eventsBetween(from: number, to: number): KillEvent[] {
    const out: KillEvent[] = [];
    for (const seg of this.line) {
      if (seg.stage === 'stab' || seg.stage === 'final') continue;
      // A stage begins at `seg.from`; the very first one (time 0) is reported to a window that starts before 0.
      const fires = (seg.from > from && seg.from <= to) || (seg.from === 0 && from < 0 && to >= 0);
      if (!fires) continue;
      out.push(seg.stage === 'open' ? { kind: 'open', action: this.openKind } : { kind: seg.stage });
    }
    let blow = 0;
    for (const seg of this.line) {
      if (seg.stage !== 'stab' && seg.stage !== 'final') continue;
      const at = this.hits[blow]!;
      if (at > from && at <= to) out.push({ kind: 'stab', index: blow, final: seg.stage === 'final' });
      blow++;
    }
    return out;
  }

  /** What each stage's figure looks like at its own progress `u` (0..1). */
  private huntPose(seg: Timeline, u: number): Pose {
    const open = actionPose(this.openKind, 0.8 * clamp01(u));
    const before = this.hidden ? actionPose(this.openKind, 0.8) : NEUTRAL;
    switch (seg.stage) {
      case 'close':
        return NEUTRAL;
      case 'open':
        return open;
      case 'seize':
        return blendPose(before, SEIZE, ease(u * 1.6));
      case 'drag':
        return blendPose(SEIZE, DRAG, ease(u * 2));
      case 'hold':
        return blendPose(this.hidden ? DRAG : SEIZE, HOLD, ease(u));
      case 'raise':
        return blendPose(HOLD, DRAWN, ease(u));
      case 'stab': {
        // Drawn back, the knife thrust into the stomach at the hit, and pulled back out for the next.
        if (u < HIT_AT) return blendPose(DRAWN, THRUST, ease(u / HIT_AT));
        return blendPose(THRUST, DRAWN, ease((u - HIT_AT) / (1 - HIT_AT)));
      }
      case 'final': {
        // Drawn back further for a beat, then the whole weight driven in to the hilt, and held there.
        if (u < 0.3) return blendPose(DRAWN, blendPose(DRAWN, HOLD, 0.35), ease(u / 0.3));
        if (u < FINAL_HIT_AT)
          return blendPose(blendPose(DRAWN, HOLD, 0.35), DEEP, ease((u - 0.3) / (FINAL_HIT_AT - 0.3)));
        return DEEP;
      }
      case 'finish':
        // He lets go: the arm falls, the knife comes out, he straightens.
        return blendPose(DEEP, blendPose(SPENT, NEUTRAL, ease((u - 0.4) / 0.6)), ease(u * 2));
    }
  }

  frame(t: number): KillFrame {
    const seg = this.segmentAt(t);
    const u = clamp01((t - seg.from) / (seg.to - seg.from));
    const index = this.line.indexOf(seg);
    // Crossfade from the previous stage's last pose into this one.
    let hpose = this.huntPose(seg, u);
    const prev = this.line[index - 1];
    const sinceS = t - seg.from;
    if (prev && sinceS < BLEND_IN_S) hpose = blendPose(this.huntPose(prev, 1), hpose, ease(sinceS / BLEND_IN_S));

    // Bodies.
    let hx = this.hunterAt.x;
    let hy = this.hunterAt.y;
    let px = this.playerFrom.x;
    let py = this.playerFrom.y;
    let lie = 0;
    let lift = 0;
    let revealed = !this.hidden;
    switch (seg.stage) {
      case 'close':
        hx = lerp(this.hunterFrom.x, this.hunterAt.x, ease(u));
        hy = lerp(this.hunterFrom.y, this.hunterAt.y, ease(u));
        break;
      case 'open':
        break;
      case 'seize':
        revealed = true;
        lie = this.hidden ? lerp(0, 0.25, ease(u)) : 0; // taken by the neck: the body begins to hang
        break;
      case 'drag':
        revealed = true;
        hx = lerp(this.hunterAt.x, this.hunterEnd.x, ease(u));
        hy = lerp(this.hunterAt.y, this.hunterEnd.y, ease(u));
        px = lerp(this.playerFrom.x, this.playerOut.x, ease(u));
        py = lerp(this.playerFrom.y, this.playerOut.y, ease(u));
        lie = lerp(0.25, 0.4, ease(u)); // dragged by the neck, feet trailing
        break;
      case 'hold':
        // Taken by the neck and lifted: the body comes up off the floor, hanging in his grip.
        revealed = true;
        hx = this.hunterEnd.x;
        hy = this.hunterEnd.y;
        px = lerp(this.playerOut.x, this.playerHeld.x, ease(u));
        py = lerp(this.playerOut.y, this.playerHeld.y, ease(u));
        lie = lerp(this.hidden ? 0.4 : 0.1, HELD_LIE, ease(u));
        lift = LIFT_M * ease(u);
        break;
      default: {
        revealed = true;
        hx = this.hunterEnd.x;
        hy = this.hunterEnd.y;
        px = this.playerHeld.x;
        py = this.playerHeld.y;
        // Still held and stabbed: the body jerks with each blow. Then he lets go and it crumples to the floor.
        let jerk = 0;
        for (const at of this.hits) {
          const since = t - at;
          if (since < 0) continue;
          // The body is snapped back by the blow in a few frames, then slumps.
          const k = since < 0.06 ? ease(since / 0.06) : Math.exp(-(since - 0.06) / 0.18);
          jerk = Math.max(jerk, k * 0.14);
        }
        if (seg.stage === 'finish') {
          lie = lerp(HELD_LIE + jerk, 1, ease(u * 1.3));
          lift = LIFT_M * (1 - ease(u * 4));
        } else {
          lie = HELD_LIE + jerk;
          lift = LIFT_M;
        }
      }
    }
    if (seg.stage === 'seize' && !this.hidden) {
      px = this.playerFrom.x;
      py = this.playerFrom.y;
      lie = lerp(0, HELD_LIE, ease(u));
    }
    if (seg.stage === 'seize' && this.hidden) {
      hx = this.hunterAt.x;
      hy = this.hunterAt.y;
    }
    const face = Math.atan2(py - hy, px - hx);
    const limp = seg.stage === 'drag' || (seg.stage === 'seize' && !this.hidden && u > 0.5);

    // The place he is opening.
    const spot =
      this.spotId && (seg.stage === 'open' || seg.stage === 'seize' || seg.stage === 'drag')
        ? { id: this.spotId, amount: seg.stage === 'open' ? openAmount(this.openKind, 0.8 * u) : 1 }
        : this.spotId && index > this.line.findIndex((s) => s.stage === 'drag')
          ? { id: this.spotId, amount: 1 }
          : null;

    // The camera: pushes in, hard at each blow.
    const frac = clamp01(t / this.durationS);
    const zoomKeys: [number, number][] = [
      [0, 1.0],
      [0.1, 1.25],
      [0.45, 1.5],
      [0.7, 1.72],
      [0.88, 1.92],
      [1, 2.05],
    ];
    let zoom = 2.05;
    for (let i = 0; i < zoomKeys.length - 1; i++) {
      const a = zoomKeys[i]!;
      const b = zoomKeys[i + 1]!;
      if (frac <= b[0]) {
        zoom = lerp(a[1], b[1], ease((frac - a[0]) / (b[0] - a[0])));
        break;
      }
    }
    let shake = 0;
    let flash = 0;
    this.hits.forEach((at, i) => {
      if (t < at) return;
      const final = i === this.hits.length - 1;
      shake = Math.max(shake, Math.exp(-(t - at) / 0.22) * (final ? 1 : 0.6));
      flash = Math.max(flash, Math.exp(-(t - at) / 0.16) * (final ? 0.95 : 0.55));
    });
    for (const seg2 of this.line) {
      if ((seg2.stage === 'seize' || seg2.stage === 'hold') && t >= seg2.from + 0.12)
        shake = Math.max(shake, Math.exp(-(t - seg2.from - 0.12) / 0.15) * 0.3);
    }
    zoom += shake * 0.06;

    // Slow-motion into each blow, a held beat on it.
    let timeScale: number;
    switch (seg.stage) {
      case 'close':
        timeScale = 0.9;
        break;
      case 'open':
        timeScale = 0.8;
        break;
      case 'seize':
        timeScale = 0.75;
        break;
      case 'drag':
        timeScale = 0.85;
        break;
      case 'hold':
        timeScale = 0.7;
        break;
      case 'raise':
        timeScale = 0.5;
        break;
      case 'stab':
        timeScale = Math.abs(u - HIT_AT) < 0.08 ? 0.25 : 0.6;
        break;
      case 'final':
        timeScale = Math.abs(u - FINAL_HIT_AT) < 0.1 ? 0.15 : 0.35;
        break;
      case 'finish':
        timeScale = 0.5;
        break;
    }

    const fadeSeg = this.line[this.line.length - 1]!;
    return {
      stage: seg.stage,
      hunter: { x: hx, y: hy, face, pose: hpose },
      player: { x: px, y: py, lie, lift, revealed, limp },
      spot,
      zoom,
      focus: { x: (hx + px) / 2, y: (hy + py) / 2 },
      shake,
      flash,
      bars: ease(t / 0.5),
      fade: seg === fadeSeg ? ease((u - 0.5) / 0.5) : 0,
      timeScale,
    };
  }
}
