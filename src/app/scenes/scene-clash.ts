import type { CameraFocus } from '../../camera/follow-camera';
import { type ClashResult, type ClashSide, ClashTrigger, PunchClash } from '../../combat/clash';
import { CLASH, scaleBy } from '../../data/combat/clash';
import { IMPACTS, type ImpactProfile } from '../../data/combat/impacts';
import type { FighterEntity } from './fighter-entity';

/** What the clash needs from the fight scene. */
export interface ClashHost {
  readonly player: FighterEntity;
  readonly opponent: FighterEntity;
  /** The opponent's mashing speed, presses per second (from its data). */
  readonly opponentMashRate: number;
  random(): number;
  /** Mash presses the player made this step (Button 1 taps). */
  takeMashPresses(): number;
  /** Land the finisher through the shared hit path (unblockable, with a custom impact profile). */
  finisher(
    winner: FighterEntity,
    loser: FighterEntity,
    s: { damage: number; knockbackMps: number; profile: ImpactProfile },
  ): void;
  sound(id: string, gain: number): void;
  impact(x: number, y: number, dir: { x: number; y: number }, profile: ImpactProfile): void;
  shake(trauma: number, punch: number): void;
  hitstop(seconds: number): void;
  /** Interrupt attacks and ability casts and put the fighter on its guard footing. */
  lockUp(f: FighterEntity): void;
}

/** One exchange beat, for the animation: who punches (or both: fists collide). */
export interface ClashBeat {
  readonly by: ClashSide | 'both';
  /** Seconds since the beat. */
  t: number;
  /** Seconds until the next beat (the animation fits the punch into this). */
  readonly intervalS: number;
  /** Which punch shape (alternates jab and hook). */
  readonly index: number;
}

/** What the HUD shows. */
export interface ClashHudState {
  readonly phase: 'intro' | 'mash' | 'done';
  readonly remainingS: number;
  readonly powerA: number;
  readonly powerB: number;
  readonly final: boolean;
  readonly intensity: number;
}

export interface ClashBanner {
  readonly text: 'CLASH WON!' | 'CLASH LOST!' | 'STALEMATE!';
  ageS: number;
}

/**
 * Runs the Punch Clash inside a fight scene (owner request 11/11/2026):
 * watches for a sustained exchange, locks both fighters face to face, counts
 * the player's mashing against the opponent's, drives the rapid exchange
 * (sparks, flashes, sounds and shake that grow with intensity), frames the
 * camera ever closer, then plays the scaled finisher or the stalemate and
 * hands the camera back.
 */
export class SceneClash {
  readonly trigger = new ClashTrigger();
  clash: PunchClash | null = null;
  beat: ClashBeat | null = null;
  banner: ClashBanner | null = null;
  lastResult: ClashResult | null = null;
  private beats = 0;
  private outroS = 0;
  private focusAt: { x: number; y: number } = { x: 0, y: 0 };
  private lastShortSideM: number = CLASH.cameraStartShortSideM;
  /** Where each fighter is held during the clash. */
  private spots: { a: { x: number; y: number }; b: { x: number; y: number } } | null = null;

  constructor(private readonly host: ClashHost) {}

  get active(): boolean {
    return this.clash !== null;
  }

  /** A melee contact (hit or block) — feeds the trigger. */
  contact(by: FighterEntity, timeS: number): void {
    if (this.clash) return;
    this.trigger.record(by === this.host.player ? 'a' : 'b', timeS);
  }

  /** Check the trigger; start a clash if the exchange has been sustained. */
  maybeStart(timeS: number): boolean {
    const { player: a, opponent: b } = this.host;
    if (this.clash || !this.eligible(a) || !this.eligible(b)) return false;
    if (!this.trigger.ready(timeS, Math.hypot(a.x - b.x, a.y - b.y))) return false;
    this.start();
    return true;
  }

  /** Start a clash now (also the Practice/test entry point). */
  start(): void {
    const { player: a, opponent: b } = this.host;
    this.clash = new PunchClash(this.host.opponentMashRate, () => this.host.random());
    this.beats = 0;
    this.beat = null;
    this.banner = null;
    this.outroS = 0;
    // Lock up face to face, level, at clash distance.
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const aLeft = a.x <= b.x;
    const half = CLASH.gapM / 2;
    this.spots = {
      a: { x: mid.x + (aLeft ? -half : half), y: mid.y },
      b: { x: mid.x + (aLeft ? half : -half), y: mid.y },
    };
    a.facing = aLeft ? 1 : -1;
    b.facing = aLeft ? -1 : 1;
    for (const f of [a, b]) {
      this.host.lockUp(f);
      f.combatant.grantInvulnerability(CLASH.introS + CLASH.mashS + 0.2); // nothing from outside interrupts it
    }
    this.focusAt = { x: mid.x, y: mid.y - 0.9 };
    this.host.sound('clash-start', 1);
    this.host.shake(0.3, 0.04);
  }

  /** One fixed step while a clash runs. Returns true while it owns the fighters. */
  step(stepS: number, timeS: number): boolean {
    if (this.banner) this.banner.ageS += stepS;
    if (this.banner && this.banner.ageS > 1.6) this.banner = null;
    if (this.beat) this.beat.t += stepS;
    if (!this.clash) {
      this.outroS = Math.max(0, this.outroS - stepS);
      return false;
    }
    const { player: a, opponent: b } = this.host;
    if (a.combatant.isKo || b.combatant.isKo) {
      // Someone burned out mid-clash: end it with no finisher.
      this.clash = null;
      this.spots = null;
      this.trigger.ended(timeS);
      for (const f of [a, b]) f.combatant.clearInvulnerability();
      return false;
    }
    // Hold both fighters on their spots.
    if (this.spots) {
      for (const [f, at] of [
        [a, this.spots.a],
        [b, this.spots.b],
      ] as const) {
        f.body?.setTranslation(at, true);
        f.body?.setLinvel({ x: 0, y: 0 }, true);
      }
    }
    const presses = this.host.takeMashPresses();
    for (let i = 0; i < presses; i++) this.clash.press('a');
    const out = this.clash.update(stepS);
    const interval = 1 / this.rate();
    for (let i = 0; i < out.exchanges; i++) this.exchange(interval);
    if (out.result) this.finish(out.result, timeS);
    return true;
  }

  /** Camera target: closer and closer as the clash builds, tightest at the end; held briefly after. */
  focus(): CameraFocus | null {
    const c = this.clash;
    if (c) {
      const shortSideM =
        c.phase === 'intro'
          ? CLASH.cameraStartShortSideM
          : c.final
            ? CLASH.cameraFinalShortSideM
            : CLASH.cameraStartShortSideM +
              (CLASH.cameraEndShortSideM - CLASH.cameraStartShortSideM) *
                Math.min(1, (c.t - CLASH.introS) / (CLASH.mashS - CLASH.finalS));
      this.lastShortSideM = shortSideM;
      return { ...this.focusAt, shortSideM };
    }
    return this.outroS > 0 ? { ...this.focusAt, shortSideM: this.lastShortSideM } : null;
  }

  hud(): ClashHudState | null {
    const c = this.clash;
    if (!c) return null;
    return {
      phase: c.phase,
      remainingS: c.remainingS,
      powerA: c.powerA,
      powerB: c.powerB,
      final: c.final,
      intensity: c.intensity,
    };
  }

  private eligible(f: FighterEntity): boolean {
    const c = f.combatant;
    return (
      !c.isKo &&
      (c.state === 'free' || c.state === 'guarding' || c.state === 'stunned') &&
      !f.airborne &&
      !f.caster?.cast
    );
  }

  private rate(): number {
    const c = this.clash;
    if (!c) return CLASH.exchangeRateStart;
    if (c.final) return CLASH.exchangeRateFinal;
    const k = Math.min(1, Math.max(0, (c.t - CLASH.introS) / CLASH.mashS));
    return CLASH.exchangeRateStart + (CLASH.exchangeRateEnd - CLASH.exchangeRateStart) * k;
  }

  /** One beat of the rapid exchange: a punch blocked, or both fists colliding. Effects grow with intensity. */
  private exchange(intervalS: number): void {
    const c = this.clash;
    if (!c) return;
    const { player: a, opponent: b } = this.host;
    this.beats++;
    const by: ClashSide | 'both' = this.beats % 4 === 0 ? 'both' : this.beats % 2 === 0 ? 'a' : 'b';
    this.beat = { by, t: 0, intervalS, index: this.beats };
    const i = c.intensity + (c.final ? 0.35 : 0);
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const striker = by === 'b' ? b : a;
    const defender = by === 'b' ? a : b;
    const dir = by === 'both' ? { x: 0, y: -1 } : { x: Math.sign(defender.x - striker.x) || 1, y: 0 };
    const base = by === 'both' ? IMPACTS['knuckle-heavy'] : IMPACTS.blocked;
    const profile: ImpactProfile = {
      ...base,
      sparks: Math.round(6 + 16 * i),
      sparkSpeedMps: 4 + 4 * i,
      sparkColour: by === 'a' ? 0xffb060 : by === 'b' ? 0xfff4d6 : 0xffffff,
      burstM: 0.3 + 0.35 * i,
    };
    const at = by === 'both' ? mid : { x: mid.x + dir.x * 0.15, y: mid.y };
    this.host.impact(at.x, at.y, dir, profile);
    if (by === 'both') {
      a.flashS = Math.max(a.flashS, 0.04 + 0.04 * i);
      b.flashS = Math.max(b.flashS, 0.04 + 0.04 * i);
    } else {
      defender.flashS = Math.max(defender.flashS, 0.03 + 0.04 * i);
    }
    const gain = 0.6 + 0.7 * Math.min(1.3, i);
    this.host.sound(by === 'both' ? 'clash-collide' : this.beats % 3 === 0 ? 'punch-light' : 'block', gain);
    this.host.shake(0.07 + 0.16 * i, by === 'both' ? 0.01 + 0.015 * i : 0);
  }

  private finish(result: ClashResult, timeS: number): void {
    const { player: a, opponent: b } = this.host;
    this.clash = null;
    this.spots = null;
    this.lastResult = result;
    this.trigger.ended(timeS);
    this.outroS = CLASH.outroS;
    for (const f of [a, b]) f.combatant.clearInvulnerability();
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };

    if (result.winner === null) {
      // Stalemate: the punches meet head-on and both are thrown back.
      for (const f of [a, b]) {
        const away = Math.sign(f.x - mid.x) || 1;
        f.body?.setLinvel({ x: away * CLASH.stalemateKnockbackMps, y: 0 }, true);
        f.knockFlightS = 0.5;
        f.combatant.stun(CLASH.stalemateStunS);
        f.flashS = 0.12;
      }
      const profile: ImpactProfile = {
        ...IMPACTS['knuckle-heavy'],
        sparks: 40,
        sparkSpeedMps: 9,
        sparkColour: 0xffffff,
        burstM: 1.1,
      };
      this.host.impact(mid.x, mid.y, { x: 1, y: 0 }, profile);
      this.host.impact(mid.x, mid.y, { x: -1, y: 0 }, profile);
      this.host.sound('clash-collide', 1.5);
      this.host.sound('punch-heavy', 1.2);
      this.host.shake(0.65, 0.07);
      this.host.hitstop(0.08);
      this.banner = { text: 'STALEMATE!', ageS: 0 };
      return;
    }

    const winner = result.winner === 'a' ? a : b;
    const loser = result.winner === 'a' ? b : a;
    const g = result.gap;
    const profile: ImpactProfile = {
      ...IMPACTS['knuckle-heavy'],
      sparks: Math.round(scaleBy(CLASH.finishSparks, g)),
      sparkSpeedMps: 8 + 5 * g,
      burstM: 0.8 + 0.6 * g,
      recoilMps: CLASH.winnerRecoilMps,
      hitstopS: scaleBy(CLASH.finishHitstopS, g),
      shake: scaleBy(CLASH.finishShake, g),
    };
    winner.scriptedAttack = { def: winner.def.attacks.heavy, t: 0 };
    this.host.finisher(winner, loser, {
      damage: scaleBy(CLASH.finishDamage, g),
      knockbackMps: scaleBy(CLASH.finishKnockbackMps, g),
      profile,
    });
    this.host.sound('clash-break', 1 + 0.5 * g);
    this.host.shake(0, 0.06 + 0.05 * g);
    this.banner = { text: result.winner === 'a' ? 'CLASH WON!' : 'CLASH LOST!', ageS: 0 };
  }
}
