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

export interface Vec2 {
  readonly x: number;
  readonly y: number;
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
  } | null;
  readonly meleeReachM: number;
  readonly canClimb: boolean;
  readonly abilities: readonly { readonly slot: AbilitySlot; readonly ready: boolean }[];
  readonly profile: { readonly aggression: number; readonly attackEveryS: number; readonly reactionS: number };
  readonly design: BrainDesign;
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
/** How far ahead a projectile is aimed at full prediction, in seconds of the target's motion. */
const LEAD_S = 0.5;

export class FighterBrain {
  private lastS = 0;
  private nextAbilityS = 1.2;
  private nextHeavyS = 2;
  private nextMeleeS = 0;
  private burstLeft = 0;
  private nextPullS = 0;
  private nextJumpS = 0;
  private strafe = 1;
  private nextStrafeS = 0;
  private hesitateUntilS = 0;
  private guardUntilS = 0;
  private retreatUntilS = 0;
  private commitUntilS = 0;
  private brawl = false;
  private nextPhaseS = 0;
  private threatSeenS = -1;
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

  /** Which abilities it has used, for tests and tuning. */
  get used(): ReadonlySet<AbilitySlot> {
    return new Set(this.lastUsed.keys());
  }

  think(v: BrainView): BrainOutput {
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
    if (!t || !s.canAct) return out;
    const diff = v.difficulty;
    const d = v.design;
    const dx = t.x - s.x;
    const dy = t.y - s.y;
    const dist = Math.hypot(dx, dy) || 1e-6;
    const toward = { x: dx / dist, y: dy / dist };

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
    // Reading an incoming blow: after its reaction time, it may dodge or block (by personality).
    if (t.attacking && dist < 2.4) {
      if (this.threatSeenS < 0) this.threatSeenS = now;
      if (!this.threatHandled && now - this.threatSeenS >= diff.reactionS) {
        this.threatHandled = true;
        if (v.random() < diff.defendSkill) {
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

    // An easier opponent hesitates now and then.
    if (now < this.hesitateUntilS) return out;
    if (diff.hesitatePerS > 0 && v.random() < diff.hesitatePerS * dtS) {
      this.hesitateUntilS = now + 0.4 + v.random() * 0.5;
      return out;
    }

    // Seeing an opening takes its reaction time; spotting it at all takes skill.
    let punishing = false;
    if (t.helpless) {
      if (this.openingSeenS < 0) this.openingSeenS = v.random() < diff.punishSkill ? now : Number.POSITIVE_INFINITY;
      punishing = now - this.openingSeenS >= diff.reactionS;
    } else this.openingSeenS = -1;

    // Where it wants to stand: its design's range, pushed out when hurt or (adapting) when rushed.
    let [lo, hi] = d.preferredRangeM;
    if (d.retreatBelowHp > 0 && s.hpFrac < d.retreatBelowHp) lo = hi;
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
      this.brawl = d.movement === 'direct' || v.random() < d.meleeBias;
      this.nextPhaseS = now + 2.5 + v.random() * 2.5;
    }
    // Melee-minded fighters close in to punish an opening; casters punish with their spells.
    // A due basic attack brings even a caster in for a moment.
    const committed =
      now < this.commitUntilS || (punishing && d.meleeBias >= 0.5) || ((heavyDue || stringDue) && dist < 4);
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
      this.nextStrafeS = now + 1 + v.random() * 1.5;
    }
    const side = { x: -toward.y * this.strafe, y: toward.x * this.strafe };
    const away = (k: number, sideK: number): Vec2 => ({
      x: -toward.x * k + side.x * sideK,
      y: -toward.y * k + side.y * sideK,
    });
    if (t.down) {
      out.move = away(0.3, 0.3); // give it room to get up, then meet it
      return out;
    }
    if (now < this.retreatUntilS && !punishing) {
      out.move = away(1, 0.4); // hit and run: slip back out
      return out;
    }
    if (wantsClose) {
      out.move =
        dist > reach * 0.85 ? chase : dist < reach * 0.45 ? away(0.6, 0.3) : { x: side.x * 0.35, y: side.y * 0.35 };
      out.sprint = dist > 5;
      return out;
    }
    if (dist > hi) {
      out.move = chase;
      out.sprint = dist > hi + 4;
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
        if (when.targetCursed !== undefined && unmet(t.cursed === when.targetCursed, 1.8)) continue;
        if (when.targetHelpless !== undefined && unmet(t.helpless, 2)) continue;
        if (when.targetAttacking !== undefined && unmet(t.attacking, 3)) continue;
      }
      if (punishing && (tac.role === 'burst' || tac.role === 'control')) w *= 1.8;
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
