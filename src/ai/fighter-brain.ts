import type { AbilitySlot } from '../abilities/ability-def';
import type { AbilityTactic, BrainDesign } from '../data/ai/brains';
import type { Difficulty } from '../data/ai/difficulty';

/**
 * Fighter AI (owner, 13/11/2026). One shared engine that plays each fighter by its OWN brain design
 * (`src/data/ai/brains.ts`: range, movement, defence, a tactic per ability, combo chains), at a
 * difficulty that sets how SMART it is (`src/data/ai/difficulty.ts`). Pure decisions, no engine:
 * the scene describes what the fighter perceives each step and applies the answer through the same
 * actions a player has (move, jump, melee, heavy, abilities, dodge, guard), so the AI plays by the
 * same rules (INV-5, INV-6). No character names here: personality lives in the designs.
 */
export type BrainSlot = AbilitySlot;

/** How the fight is going for one side (A5). */
export type FightPhase = 'opening' | 'even' | 'ahead' | 'behind' | 'critical';

const POSTURE_EVERY_S = 0.15;
/** The first seconds of a fight, before anything has happened. */
const OPENING_S = 5;

export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

/**
 * Something the opponent has put down or set going that hurts to stand in or cross: a warning ring about to burst, a lingering
 * cloud or fog, an armed mine, a beam, a shot in flight. Everything here is visible on screen to a player too.
 */
export interface Hazard {
  readonly kind: 'zone' | 'fog' | 'mine' | 'beam' | 'shot';
  readonly x: number;
  readonly y: number;
  /** Its radius, or half its width for a beam or shot. */
  readonly radiusM: number;
  /** Seconds until it goes off (a warning ring); Infinity for what lingers. */
  readonly leftS: number;
  /** A beam's or shot's far end. */
  readonly toX?: number;
  readonly toY?: number;
}

export interface BrainView {
  readonly timeS: number;
  readonly self: {
    readonly x: number;
    readonly y: number;
    /** What the feet stand on (0 = the floor). */
    readonly floorM: number;
    readonly airborne: boolean;
    readonly canAct: boolean;
    /** An attack or cast is under way (nothing new starts). */
    readonly busy: boolean;
    readonly hanging: boolean;
    /** Health as a share of its maximum. */
    readonly hpFrac: number;
    /** Its own maximum health (A1: a fragile fighter plays more carefully). */
    readonly maxHp?: number;
  };
  /** The opponent, or null when it cannot be seen (blinded, in the dark, gone). */
  readonly target: {
    readonly x: number;
    readonly y: number;
    readonly vx: number;
    readonly vy: number;
    readonly floorM: number;
    readonly hpFrac: number;
    /** Knocked down or getting up: nothing lands; wait. */
    readonly down: boolean;
    /** Stunned, blinded or stuck in a whiffed blow's recovery: an opening. */
    readonly helpless: boolean;
    /** Swinging or casting at the moment. */
    readonly attacking: boolean;
    readonly cursed: boolean;
    /** Its maximum health, as its health bar shows it (observable, A1). */
    readonly maxHp?: number;
    /** In the recovery of a blow it has already thrown: an opening (A3). */
    readonly recovering?: boolean;
    /** Frozen by Time Stop: nothing it does matters until time resumes (CH2). */
    readonly frozen?: boolean;
    /** Toxicity stacks it carries (Vexoris's poison). */
    readonly toxicity: number;
  } | null;
  /** Hazards from the opponent's side (A: hazard sense). Absent = none known. */
  readonly hazards?: readonly Hazard[];
  /** The opponent is mid-cast: how far its ability reaches and whether it is its ultimate (cast awareness). */
  readonly foeCast?: { readonly reachM: number; readonly ult: boolean } | null;
  /** The opponent is firing a sustained stream of shots (a machine gun): keep moving, never stand in it. */
  readonly foeFiring?: boolean;
  readonly meleeReachM: number;
  readonly canClimb: boolean;
  /** `channel`: a long ability (a beam, a machine-gun stream, a wind-up that a hit breaks) that stops if its caster is hit. */
  readonly abilities: readonly { readonly slot: AbilitySlot; readonly ready: boolean; readonly channel?: boolean }[];
  /** The opponent is pouring a beam or firing a stream, or winding up an ability a hit breaks: hitting it stops the ability. */
  readonly foeChannel?: boolean;
  readonly profile: { readonly aggression: number; readonly attackEveryS: number; readonly reactionS: number };
  readonly design: BrainDesign;
  /** Overtime: never retreat or hit-and-run, always engage (tournament T1). */
  readonly forceEngage?: boolean;
  readonly difficulty: Difficulty;
  /** The next waypoint toward the target when walls or furniture are in the way (REQ-AI-5). */
  readonly route: Vec2 | null;
  random(): number;
}

export interface BrainOutput {
  move: Vec2;
  jump: boolean;
  sprint: boolean;
  melee: boolean;
  heavy: boolean;
  dodge: boolean;
  guard: boolean;
  ability: { slot: AbilitySlot; at: Vec2 } | null;
}

const PULL_EVERY_S = 0.18;
const CLIMB_AFTER_M = 0.5;
/** How long a combo chain stays open after its first ability, seconds. */
const COMBO_WINDOW_S = 2.5;
/** A punch string or heavy not thrown for this long is due at the next chance, seconds. */
const BASIC_ROTATION_S = 12;
/** A planner holds an ability for its moment at most this long, seconds. */
const PLANNER_PATIENCE_S = 20;
/** An ultimate held back for its moment is still used after this many seconds, so it never sits unused for good. */
const ULT_PATIENCE_S = 40;
/** How far ahead a projectile is aimed at full prediction, in seconds of the target's motion. */
const LEAD_S = 0.5;

/** How long an unsighted AI still heads for where it last saw its target (seconds). */
const UNSIGHTED_MEMORY_S = 4;
/**
 * An overdue punch string or heavy brings it in from this far (owner: every fighter uses its whole
 * kit; a keep-away fighter like Necro would otherwise never get close enough for its heavy).
 */
const BASIC_DUE_CHASE_M = 9;

export class FighterBrain {
  private lastS = 0;
  private nextAbilityS = 1.2;
  private nextHeavyS = 2;
  private nextMeleeS = 0;
  private burstLeft = 0;
  private nextPullS = 0;
  private nextJumpS = 0;
  private strafe = 1;
  private nextWeaveS = 0;
  private channelSeenS = -1;
  private nextStrafeS = 0;
  private hesitateUntilS = 0;
  private guardUntilS = 0;
  private retreatUntilS = 0;
  private commitUntilS = 0;
  private brawl = false;
  private nextPhaseS = 0;
  private threatSeenS = -1;
  /** Where the target was last seen, and when (game seconds); null before it was ever seen. */
  private lastSeen: { x: number; y: number; atS: number } | null = null;
  /** Unsighted: the way it is searching, until when. */
  private searchDir = { x: 1, y: 0 };
  private nextSearchTurnS = 0;
  private threatHandled = false;
  private openingSeenS = -1;
  private comboNext: AbilitySlot | null = null;
  private comboUntilS = 0;
  private readonly lastUsed = new Map<AbilitySlot, number>();
  /** Adaptation: how much the player keeps in close (0..1, smoothed). */
  private playerClose = 0.5;
  /** When the player started its recent attacks (reading its rhythm). */
  private readonly playerSwings: number[] = [];
  private wasAttacking = false;
  private stringEndS = -10;
  private lastHeavyS = 0;
  private lastStringS = 0;
  private nextReadS = 0;
  /** A5: where the fight stands, re-read a few times a second (A6: cheap per-step decisions, the evaluation cached). */
  private phase: FightPhase = 'opening';
  private fragile = false;
  private sturdy = false;
  private nextPostureS = 0;
  /** Backed against something: a retreat that gets nowhere turns into a fight (never stands idle). */
  private cornerSince: { x: number; y: number; atS: number } | null = null;
  private corneredUntilS = 0;

  /** The current reading of the fight (for tests and tuning). */
  get fightPhase(): FightPhase {
    return this.phase;
  }

  /**
   * Stat, health and opponent awareness (A1, A2, A5), from what a player can see too: both health bars, their sizes and
   * how the fight is going. Smarter tiers only; Easy keeps playing from its design alone.
   */
  private readPosture(v: BrainView): void {
    const now = v.timeS;
    if (now < this.nextPostureS) return;
    this.nextPostureS = now + POSTURE_EVERY_S;
    const s = v.self;
    const t = v.target;
    if (!t || v.difficulty.punishSkill < 0.35) {
      this.phase = 'even';
      this.fragile = false;
      this.sturdy = false;
      return;
    }
    const selfMax = s.maxHp ?? 1000;
    const foeMax = t.maxHp ?? selfMax;
    const toughness = selfMax / Math.max(1, foeMax);
    this.fragile = toughness < 0.85;
    this.sturdy = toughness > 1.2;
    const selfHp = s.hpFrac * selfMax;
    const foeHp = t.hpFrac * foeMax;
    if (now < OPENING_S && s.hpFrac > 0.95 && t.hpFrac > 0.95) this.phase = 'opening';
    else if (s.hpFrac < 0.25 || selfHp < foeHp * 0.4) this.phase = 'critical';
    else if (selfHp < foeHp * 0.7) this.phase = 'behind';
    else if (selfHp > foeHp * 1.35) this.phase = 'ahead';
    else this.phase = 'even';
  }

  /** Which abilities it has used, for tests and tuning. */
  get used(): ReadonlySet<AbilitySlot> {
    return new Set(this.lastUsed.keys());
  }

  /**
   * Fighting without sight: head for the target's last known position and swing when there (the
   * target may well have moved); once that memory is stale or reached, wander in a direction that
   * changes every second or so, guarding at random. It never stands still and never reads the
   * target's real position.
   */
  private unsighted(v: BrainView, out: BrainOutput): BrainOutput {
    const now = v.timeS;
    const s = v.self;
    const mem = this.lastSeen;
    if (mem && now - mem.atS < UNSIGHTED_MEMORY_S) {
      const dx = mem.x - s.x;
      const dy = mem.y - s.y;
      const d = Math.hypot(dx, dy);
      if (d > v.meleeReachM * 0.8) {
        out.move = { x: dx / d, y: dy / d };
        return out;
      }
      // At the spot: a strike where it was, then search from here.
      if (!s.busy && now >= this.nextMeleeS) {
        out.melee = true;
        this.nextMeleeS = now + v.profile.attackEveryS;
      }
      this.lastSeen = null;
      return out;
    }
    if (now >= this.nextSearchTurnS) {
      const a = v.random() * Math.PI * 2;
      this.searchDir = { x: Math.cos(a), y: Math.sin(a) };
      this.nextSearchTurnS = now + 0.7 + v.random() * 0.9;
      // Now and then it raises its guard for a moment instead (it cannot see what is coming).
      if (v.random() < 0.25) this.guardUntilS = now + 0.4;
    }
    if (now < this.guardUntilS) {
      out.guard = true;
      return out;
    }
    out.move = this.searchDir;
    if (!s.busy && now >= this.nextMeleeS && v.random() < 0.02) {
      out.melee = true; // a wild swing into the dark
      this.nextMeleeS = now + v.profile.attackEveryS;
    }
    return out;
  }

  /** One decision, then the hazard sense: a smart opponent never walks into what the other side has set going. */
  think(v: BrainView): BrainOutput {
    return this.avoidHazards(v, this.decide(v));
  }

  private hazardSeenS = -1;
  private hazardBlind = false;
  private nextCastReadS = 0;

  /**
   * Hazard sense (difficulty `hazardSense`): after its reaction time it steps out of a ring, cloud or beam it is standing in, and
   * the better tiers also refuse to walk into one. Easy never notices them.
   */
  private avoidHazards(v: BrainView, out: BrainOutput): BrainOutput {
    const hs = v.hazards;
    const sense = v.difficulty.hazardSense;
    if (!hs || hs.length === 0 || sense <= 0 || v.self.hanging) {
      this.hazardSeenS = -1;
      return out;
    }
    const s = v.self;
    const now = v.timeS;
    let px = 0;
    let py = 0;
    let threatened = false;
    let urgent = false;
    const inside = (x: number, y: number): { x: number; y: number; soon: boolean } | null => {
      let ax = 0;
      let ay = 0;
      let hit = false;
      let soon = false;
      for (const h of hs) {
        let cx = h.x;
        let cy = h.y;
        let d: number;
        if ((h.kind === 'beam' || h.kind === 'shot') && h.toX !== undefined && h.toY !== undefined) {
          const sx = h.toX - h.x;
          const sy = h.toY - h.y;
          const len2 = sx * sx + sy * sy || 1;
          const k = Math.max(0, Math.min(1, ((x - h.x) * sx + (y - h.y) * sy) / len2));
          cx = h.x + sx * k;
          cy = h.y + sy * k;
        }
        d = Math.hypot(x - cx, y - cy);
        const margin = h.radiusM + (h.kind === 'mine' ? 0.7 : 0.5);
        if (d >= margin) continue;
        // A ring that is not about to burst is only worth leaving once it nears; what lingers or flies is always worth it.
        if (h.kind === 'zone' && h.leftS > 1.6) continue;
        hit = true;
        if (h.leftS < 0.8 || h.kind === 'beam' || h.kind === 'shot') soon = true;
        const away = d < 1e-3 ? { x: 1, y: 0 } : { x: (x - cx) / d, y: (y - cy) / d };
        ax += away.x * (margin - d + 0.3);
        ay += away.y * (margin - d + 0.3);
      }
      return hit ? { x: ax, y: ay, soon } : null;
    };
    const here = inside(s.x, s.y);
    if (here) {
      threatened = true;
      urgent = here.soon;
      px = here.x;
      py = here.y;
    }
    if (!threatened) {
      // The better tiers also refuse to walk into one: the step it is about to take lands inside a hazard.
      this.hazardSeenS = -1;
      const mv = Math.hypot(out.move.x, out.move.y);
      if (sense >= 0.7 && mv > 0.1 && !s.busy) {
        const ahead = inside(s.x + (out.move.x / mv) * 1.1, s.y + (out.move.y / mv) * 1.1);
        if (ahead) {
          const tx = -ahead.y;
          const ty = ahead.x; // slide along the edge rather than in
          const dot = tx * out.move.x + ty * out.move.y;
          const sgn = dot >= 0 ? 1 : -1;
          const tl = Math.hypot(tx, ty) || 1;
          out.move = { x: (tx / tl) * sgn, y: (ty / tl) * sgn };
          out.sprint = false;
        }
      }
      return out;
    }
    if (this.hazardSeenS < 0) {
      this.hazardSeenS = now;
      this.hazardBlind = v.random() >= sense; // misses it this time: the lower tiers keep standing there
    }
    if (this.hazardBlind || now - this.hazardSeenS < v.difficulty.reactionS) return out;
    const l = Math.hypot(px, py) || 1;
    out.move = { x: px / l, y: py / l };
    out.sprint = true;
    out.jump = false;
    if (urgent) {
      out.melee = false;
      out.heavy = false;
    }
    return out;
  }

  private decide(v: BrainView): BrainOutput {
    const out: BrainOutput = {
      move: { x: 0, y: 0 },
      jump: false,
      sprint: false,
      melee: false,
      heavy: false,
      dodge: false,
      guard: false,
      ability: null,
    };
    const now = v.timeS;
    const dtS = Math.max(0, now - this.lastS);
    this.lastS = now;
    const s = v.self;
    if (s.hanging) {
      if (now >= this.nextPullS) {
        out.jump = true;
        this.nextPullS = now + PULL_EVERY_S;
      }
      return out;
    }
    const t = v.target;
    if (!s.canAct) return out;
    // Unsighted (blinded, or the target outside its sight in the dark; owner, 13/11/2026): it never
    // freezes and never knows where the target is. It goes for where it last saw it and strikes
    // there, or searches unpredictably, guarding now and then.
    if (!t) return this.unsighted(v, out);
    this.lastSeen = { x: t.x, y: t.y, atS: now };
    const diff = v.difficulty;
    const d = v.design;
    this.readPosture(v);
    const dx = t.x - s.x;
    const dy = t.y - s.y;
    const dist = Math.hypot(dx, dy) || 1e-6;
    const toward = { x: dx / dist, y: dy / dist };

    // Cast awareness: it reads the opponent's wind-up. Inside its reach it gives ground before the ability goes off; a smart tier
    // also gets in to interrupt an ultimate (see `pickAbility`), and one that cannot be seen coming is simply taken.
    if (v.foeCast && diff.castAwareness > 0 && now >= this.nextCastReadS) {
      this.nextCastReadS = now + Math.max(0.35, diff.reactionS * 2);
      if (dist < v.foeCast.reachM + 1 && v.random() < diff.castAwareness * (v.foeCast.ult ? 0.8 : 0.5)) {
        if (!(v.foeCast.ult && diff.castAwareness >= 0.6 && dist < 3.2))
          this.retreatUntilS = now + 0.7 + diff.reactionS;
      }
    }

    // Adapting to the player (Hard and up): does the player rush in or keep away?
    if (diff.adapts) this.playerClose += ((dist < 2 ? 1 : 0) - this.playerClose) * Math.min(1, dtS / 5);

    // The player's rhythm: how many attacks it started in the last few seconds.
    if (t.attacking && !this.wasAttacking) this.playerSwings.push(now);
    this.wasAttacking = t.attacking;
    while (this.playerSwings.length > 0 && now - this.playerSwings[0]! > 4) this.playerSwings.shift();
    const swingRate = this.playerSwings.length / 4;
    // Anticipating (smarter opponents): close to a player who keeps swinging, it defends before
    // the blow lands (a fast jab beats any reaction; a read does not).
    if (diff.adapts && dist < v.meleeReachM * 1.5 && swingRate > 0.3 && now >= this.nextReadS && !s.busy) {
      this.nextReadS = now + Math.max(0.3, diff.reactionS * 3);
      if (v.random() < diff.defendSkill * 0.6) {
        const block = d.defence === 'block' || (d.defence === 'mixed' && v.random() < 0.5);
        if (block) this.guardUntilS = now + 0.5;
        else out.dodge = true;
        this.nextReadS = now + 1.5; // then back on the attack before reading again
      }
    }
    // A3: a player who swings on a steady beat is met just before the next swing (a read, not a reaction).
    if (
      diff.adapts &&
      this.playerSwings.length >= 3 &&
      now >= this.nextReadS &&
      !s.busy &&
      dist < v.meleeReachM * 1.7
    ) {
      const n = this.playerSwings.length;
      const i1 = this.playerSwings[n - 1]! - this.playerSwings[n - 2]!;
      const i2 = this.playerSwings[n - 2]! - this.playerSwings[n - 3]!;
      const due = this.playerSwings[n - 1]! + i1;
      if (Math.abs(i1 - i2) < 0.25 && i1 > 0.35 && now >= due - 0.2 && now <= due + 0.05) {
        this.nextReadS = now + 1.2;
        if (v.random() < diff.defendSkill * 0.7) {
          if (d.defence === 'block' || (d.defence === 'mixed' && v.random() < 0.5)) this.guardUntilS = now + 0.5;
          else out.dodge = true;
        }
      }
    }
    // Reading an incoming blow: after its reaction time, it may dodge or block (by personality).
    if (t.attacking && dist < 2.4) {
      if (this.threatSeenS < 0) this.threatSeenS = now;
      if (!this.threatHandled && now - this.threatSeenS >= diff.reactionS) {
        this.threatHandled = true;
        // A2/A5: hurt and behind it defends harder; well ahead it can afford to trade.
        const care = this.phase === 'critical' ? 1.25 : this.phase === 'ahead' ? 0.85 : this.fragile ? 1.1 : 1;
        if (v.random() < Math.min(1, diff.defendSkill * care)) {
          const block = d.defence === 'block' || (d.defence === 'mixed' && v.random() < 0.5);
          if (block) this.guardUntilS = now + 0.55;
          else out.dodge = true;
        }
      }
    } else {
      this.threatSeenS = -1;
      this.threatHandled = false;
    }
    if (now < this.guardUntilS) {
      out.guard = true;
      return out;
    }
    if (out.dodge) return out;

    // An easier opponent hesitates now and then: no attack for a moment, but it keeps moving
    // round the target (owner, 13/11/2026: an AI never stands idle).
    const hesitating = (): BrainOutput => {
      out.move = { x: -toward.y * this.strafe * 0.45, y: toward.x * this.strafe * 0.45 };
      return out;
    };
    if (now < this.hesitateUntilS) return hesitating();
    if (diff.hesitatePerS > 0 && v.random() < diff.hesitatePerS * dtS) {
      this.hesitateUntilS = now + 0.4 + v.random() * 0.5;
      return hesitating();
    }

    // Seeing an opening takes its reaction time; spotting it at all takes skill.
    let punishing = false;
    const opening = t.helpless || (diff.punishSkill >= 0.35 && t.recovering === true && dist <= v.meleeReachM * 2.2);
    // A foe pouring a beam or stream is open to being hit, and a hit stops it: a smart tier closes in to break it.
    if (v.foeChannel && diff.castAwareness >= 0.3 && dist <= v.meleeReachM * 5) {
      if (this.channelSeenS < 0) this.channelSeenS = now;
      punishing = now - this.channelSeenS >= diff.reactionS;
    } else this.channelSeenS = -1;
    if (t.frozen)
      punishing = true; // CH2: a foe frozen in Time Stop cannot answer: pile every blow in
    else if (opening) {
      if (this.openingSeenS < 0) this.openingSeenS = v.random() < diff.punishSkill ? now : Number.POSITIVE_INFINITY;
      punishing = now - this.openingSeenS >= diff.reactionS;
    } else this.openingSeenS = -1;

    // Where it wants to stand: its design's range, pushed out when hurt or (adapting) when rushed.
    let [lo, hi] = d.preferredRangeM;
    // Movement skill: a novice holds its range loosely and wanders; an expert keeps the exact distance its design wants.
    lo = Math.max(0.8, lo - 1.0 * (1 - diff.moveSkill));
    hi += 1.5 * (1 - diff.moveSkill);
    // A1/A2: a fragile fighter keeps further off, a sturdy one presses in; hurt and behind, even a brawler gives ground.
    if (this.fragile) {
      lo += 0.8;
      hi += 0.8;
    } else if (this.sturdy) {
      lo = Math.max(1, lo - 0.5);
      hi = Math.max(lo, hi - 0.5);
    }
    const retreatBelow = d.retreatBelowHp + (this.fragile ? 0.1 : 0) + (this.phase === 'critical' ? 0.1 : 0);
    if (retreatBelow > 0 && s.hpFrac < retreatBelow && !t.frozen && !v.forceEngage) lo = hi;
    if (diff.adapts && d.movement === 'kite' && this.playerClose > 0.5) {
      lo += 1;
      hi += 1;
    }

    // Chase onto furniture after a player standing on it.
    const route = v.route;
    let chase = toward;
    if (route) {
      const rx = route.x - s.x;
      const ry = route.y - s.y;
      const rl = Math.hypot(rx, ry) || 1;
      chase = { x: rx / rl, y: ry / rl };
    }
    if (t.floorM - s.floorM > CLIMB_AFTER_M && v.canClimb) {
      out.move = chase;
      if (dist < 2.2 && !s.airborne && now >= this.nextJumpS) {
        out.jump = true;
        this.nextJumpS = now + 1.1;
      }
      return out;
    }

    // Basic attacks rotate like abilities: one not thrown for a while is due.
    const heavyDue = now - this.lastHeavyS > BASIC_ROTATION_S;
    const stringDue = now - this.lastStringS > BASIC_ROTATION_S;
    // Up close, a fighter who loves melee often fights hand to hand instead of reaching for an
    // ability (and always does when a punch string or its heavy is due).
    const handToHand = dist <= v.meleeReachM * 1.1 && (stringDue || heavyDue || v.random() < d.meleeBias * 0.5);

    // ---------------------------------------------------------------- abilities
    if (!s.busy && !t.down && !handToHand && now >= this.nextAbilityS) {
      const pick = this.pickAbility(v, dist, punishing);
      if (pick) {
        const lead = diff.predictLead * LEAD_S;
        out.ability = { slot: pick.slot, at: { x: t.x + t.vx * lead, y: t.y + t.vy * lead } };
        this.lastUsed.set(pick.slot, now);
        const chain = d.combos.find(([first]) => first === pick.slot);
        this.comboNext = chain ? chain[1] : null;
        this.comboUntilS = now + COMBO_WINDOW_S;
        // A chained follow-up comes quickly; otherwise a breath between abilities.
        this.nextAbilityS = now + (this.comboNext ? 0.6 : 1.3 + v.random() * 1.4) * diff.tempo;
        const role = pick.tactic.role;
        if (role === 'ambush' || role === 'gapClose') this.commitUntilS = now + 2;
        if (d.hitAndRunS > 0 && role === 'burst') this.retreatUntilS = now + 0.8 + d.hitAndRunS;
        return out;
      }
      this.nextAbilityS = now + 0.4 * diff.tempo;
    }

    // ---------------------------------------------------------------- melee
    // Its fighting phase: brutes always brawl; others go in and out by their love of melee.
    if (now >= this.nextPhaseS) {
      const push = this.phase === 'ahead' || this.sturdy ? 0.15 : this.phase === 'critical' || this.fragile ? -0.15 : 0;
      this.brawl = d.movement === 'direct' || v.random() < d.meleeBias + push;
      this.nextPhaseS = now + 2.5 + v.random() * 2.5;
    }
    // Melee-minded fighters close in to punish an opening; casters punish with their spells.
    // A due basic attack brings even a caster in for a moment.
    const committed =
      now < this.commitUntilS ||
      (punishing && d.meleeBias >= 0.5) ||
      ((heavyDue || stringDue) && dist < BASIC_DUE_CHASE_M);
    // Kiters and stalkers step in only briefly (their hit and run takes them out again).
    const wantsClose = d.movement === 'direct' || committed || this.brawl;
    const reach = v.meleeReachM;
    // A sloppy opponent swings from a little too far.
    const swingRange = v.random() < diff.mistakeChance ? reach * 1.5 : reach;
    const cornered = dist <= reach;
    if (dist <= swingRange && !s.busy && !t.down && (wantsClose || cornered)) {
      // The heavy mostly finishes a punch string (string, then heavy), now and then opens one.
      const finisher = this.burstLeft <= 0 && now - this.stringEndS < 1.2;
      const heavyChance =
        stringDue && !heavyDue ? 0 : heavyDue ? 1 : d.heavyBias * (finisher ? 1 : 0.4) * (punishing ? 1.5 : 1);
      if (now >= this.nextHeavyS && v.random() < heavyChance) {
        out.heavy = true;
        this.lastHeavyS = now;
        this.nextHeavyS = now + (2.5 + v.random() * 2.5) * diff.tempo;
        if (d.hitAndRunS > 0) this.retreatUntilS = now + 0.6 + d.hitAndRunS;
        return out;
      }
      if (now >= this.nextMeleeS) {
        if (this.burstLeft <= 0) this.burstLeft = Math.min(diff.maxString, 2 + Math.floor(v.random() * 3));
        out.melee = true;
        this.lastStringS = now;
        this.burstLeft--;
        this.nextMeleeS =
          now + (this.burstLeft > 0 ? 0.3 : v.profile.attackEveryS * (0.7 + v.random() * 0.6) * diff.tempo);
        if (this.burstLeft <= 0) {
          this.stringEndS = now;
          if (d.hitAndRunS > 0) this.retreatUntilS = now + d.hitAndRunS;
        }
      }
    }
    if (s.busy) return out;

    // ---------------------------------------------------------------- movement
    if (now >= this.nextStrafeS) {
      this.strafe = v.random() < 0.5 ? -1 : 1;
      this.nextStrafeS = now + (1 + v.random() * 1.5) * (1.4 - 0.6 * diff.moveSkill);
    }
    const side = { x: -toward.y * this.strafe, y: toward.x * this.strafe };
    // Under a sustained stream of fire it keeps moving across the line of fire, switching side often, rather than standing in it.
    if (v.foeFiring && diff.moveSkill > 0 && dist > v.meleeReachM * 1.5 && !t.down) {
      if (now >= this.nextWeaveS) {
        this.strafe = -this.strafe;
        this.nextWeaveS = now + 0.35 + v.random() * 0.4 * (1.3 - diff.moveSkill);
      }
      const w = { x: -toward.y * this.strafe, y: toward.x * this.strafe };
      out.move = { x: w.x * 0.95 + toward.x * 0.2, y: w.y * 0.95 + toward.y * 0.2 };
      return out;
    }
    const away = (k: number, sideK: number): Vec2 => ({
      x: -toward.x * k + side.x * sideK,
      y: -toward.y * k + side.y * sideK,
    });
    if (t.down) {
      out.move = away(0.3, 0.3); // give it room to get up, then meet it
      return out;
    }
    if (now < this.retreatUntilS && !punishing && !v.forceEngage) {
      out.move = away(1, 0.4); // hit and run: slip back out
      return out;
    }
    if (wantsClose) {
      out.move =
        dist > reach * 0.85 ? chase : dist < reach * 0.45 ? away(0.6, 0.3) : { x: side.x * 0.35, y: side.y * 0.35 };
      out.sprint = dist > 9 - 5 * diff.moveSkill;
      return out;
    }
    if (dist > hi) {
      out.move = chase;
      out.sprint = dist > hi + 8 - 5 * diff.moveSkill;
    } else if (dist < lo) out.move = away(1, 0.35);
    else
      out.move = {
        x: side.x * (d.movement === 'stalk' ? 0.7 : 0.45),
        y: side.y * (d.movement === 'stalk' ? 0.7 : 0.45),
      };
    return out;
  }

  /**
   * Choose an ability: a combo follow-up first (by skill), then any ready ability whose tactic
   * fits the distance and the moment, weighted by its design, by how well its conditions are met
   * and by how long since it was last used (so the whole kit gets used, never one move on repeat).
   */
  private pickAbility(
    v: BrainView,
    dist: number,
    punishing: boolean,
  ): { slot: AbilitySlot; tactic: AbilityTactic } | null {
    const d = v.design;
    const diff = v.difficulty;
    const t = v.target!;
    const now = v.timeS;
    const ready = v.abilities.filter((a) => a.ready);
    if (ready.length === 0) return null;
    const sloppy = v.random() < diff.mistakeChance;
    const inBand = (tac: AbilityTactic, slack: number) => dist >= tac.minM / slack && dist <= tac.maxM * slack;

    if (this.comboNext && now < this.comboUntilS && v.random() < diff.comboSkill) {
      const next = this.comboNext;
      this.comboNext = null;
      const tac = d.tactics[next];
      if (ready.some((a) => a.slot === next) && inBand(tac, 1.3)) return { slot: next, tactic: tac };
    }

    let total = 0;
    const weighted: { slot: AbilitySlot; tactic: AbilityTactic; w: number }[] = [];
    for (const a of ready) {
      const tac = d.tactics[a.slot];
      if (!inBand(tac, sloppy ? 1.5 : 1)) continue;
      let w = tac.weight;
      const when = tac.when;
      // Even a planner never sits on an ability for good: unused for long, it gets used.
      const plan = diff.cooldownPlanning && now - (this.lastUsed.get(a.slot) ?? 0) < PLANNER_PATIENCE_S;
      // A condition not met: a planner saves the ability; a simpler opponent uses it anyway, less often.
      const unmet = (ok: boolean, bonus: number): boolean => {
        if (ok) {
          w *= bonus;
          return false;
        }
        if (plan) return true;
        w *= 0.35;
        return false;
      };
      if (when) {
        if (when.targetHpBelow !== undefined && unmet(t.hpFrac < when.targetHpBelow, 1.6)) continue;
        if (when.selfHpBelow !== undefined && unmet(v.self.hpFrac < when.selfHpBelow, 1.5)) continue;
        if (when.toxicityBelow !== undefined && unmet(t.toxicity < when.toxicityBelow, 1.6)) continue;
        if (when.targetCursed !== undefined && unmet(t.cursed === when.targetCursed, 1.8)) continue;
        if (when.targetHelpless !== undefined && unmet(t.helpless, 2)) continue;
        if (when.targetAttacking !== undefined && unmet(t.attacking, 3)) continue;
      }
      if (punishing && (tac.role === 'burst' || tac.role === 'control')) w *= 1.8;
      // A4: expect the ability to connect. Far off its band's centre or aimed at a quick mover it is a poor bet; a smart
      // planner saves it, others just use it less.
      const chance = hitChance(tac, dist, t);
      if (diff.cooldownPlanning && chance < 0.3 && tac.role !== 'buff' && tac.role !== 'escape') continue;
      // The ultimate is its big moment: a smarter tier fires it only when it should connect and there is a reason (an opening,
      // a hurt foe, or it is losing), never just because the foe is standing there. It still never sits on it for good.
      if (a.slot === 'ult' && now - (this.lastUsed.get('ult') ?? 0) < ULT_PATIENCE_S) {
        if (chance < diff.ultPatience) continue;
        const moment =
          punishing || t.helpless || t.hpFrac < 0.5 || this.phase === 'behind' || this.phase === 'critical';
        if (diff.ultNeedsMoment && !moment) continue;
      }
      // A channelled ability stops when its caster is hit: a planner does not start one with a free foe at its shoulder, and a foe that
      // is itself channelling cannot answer, so a channel is safer then.
      if (a.channel && diff.cooldownPlanning && dist < v.meleeReachM * 2 && !t.helpless && !t.down && !t.frozen && !t.attacking) w *= 0.2;
      if (a.channel && v.foeChannel) w *= 0.5; // two channels trading in the open: hitting it matters more
      if (v.foeChannel && diff.castAwareness >= 0.3 && (tac.role === 'burst' || tac.role === 'gapClose')) w *= 2;
      // Interrupting an ultimate that is winding up (a smart tier closes in on it).
      if (v.foeCast?.ult && diff.castAwareness >= 0.6 && (tac.role === 'burst' || tac.role === 'gapClose')) w *= 2.5;
      // Movement abilities (dashes, teleports) are used readily only by those who move well.
      if (tac.role === 'escape' || tac.role === 'gapClose') w *= 0.4 + 0.9 * diff.moveSkill;
      w *= 0.4 + 0.6 * chance;
      // A5: how the fight is going shapes what it reaches for.
      if (this.phase === 'opening' && tac.role === 'burst') w *= 0.7;
      if ((this.phase === 'behind' || this.phase === 'critical') && tac.role === 'burst') w *= 1.3;
      if (this.phase === 'critical' && (tac.role === 'escape' || tac.role === 'buff')) w *= 1.5;
      if (this.phase === 'ahead' && (tac.role === 'poke' || tac.role === 'zone')) w *= 1.15;
      // Rotation: an ability waiting longer becomes more likely.
      const since = now - (this.lastUsed.get(a.slot) ?? -30);
      w *= 1 + Math.min(2, since / 6);
      weighted.push({ slot: a.slot, tactic: tac, w });
      total += w;
    }
    if (weighted.length === 0) return null;
    let r = v.random() * total;
    for (const c of weighted) {
      r -= c.w;
      if (r <= 0) return c;
    }
    return weighted[weighted.length - 1]!;
  }
}

/**
 * A4: how likely an ability is to connect now (0..1), from where the target stands in the ability's own range band, how fast it
 * is moving and whether it is open. A guess from what a player could also see, never the target's hidden state.
 */
export function hitChance(
  tac: AbilityTactic,
  dist: number,
  t: { readonly vx: number; readonly vy: number; readonly helpless: boolean; readonly frozen?: boolean },
): number {
  if (t.frozen) return 1;
  const span = Math.max(0.5, (tac.maxM - tac.minM) / 2);
  const centre = (tac.minM + tac.maxM) / 2;
  let p = 1 - 0.45 * Math.min(1, Math.abs(dist - centre) / span);
  // Projectiles and zones can be walked out of; bursts and control land on whoever is close.
  if (tac.role === 'poke' || tac.role === 'zone') p *= 1 - Math.min(0.5, Math.hypot(t.vx, t.vy) / 12);
  if (t.helpless) p = Math.min(1, p * 1.4);
  return Math.max(0, Math.min(1, p));
}
