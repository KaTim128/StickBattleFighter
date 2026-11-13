import type { AbilityDef } from '../abilities/ability-def';

/**
 * Fighter AI (owner, 13/11/2026: "the AI opponent doesn't use the new abilities, heavy attacks or
 * climbing"). Pure decisions, no engine: the scene describes what the fighter perceives each step
 * and turns the answer into the same actions a player takes (move, jump, melee, heavy, abilities),
 * so the AI plays by the same rules (INV-5, INV-6). No character names: everything comes from the
 * fighter's data (its abilities' deliveries and its AI profile).
 */
export type BrainSlot = 'a1' | 'a2' | 'a3' | 'a4' | 'ult';

export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

/** When an ability is worth using: the distance band to the target, metres. */
export interface AbilityBand {
  readonly minM: number;
  readonly maxM: number;
}

/** The useful range of an ability, from its delivery (data-driven, the same for every fighter). */
export function abilityBand(def: AbilityDef): AbilityBand {
  const d = def.delivery;
  switch (d.type) {
    case 'projectile':
      return { minM: 2, maxM: Math.min(d.maxRangeM, 10) };
    case 'dash':
      return { minM: 2, maxM: d.untilBlocked ? 9 : Math.max(2.5, d.distanceM) };
    case 'beam':
      return { minM: 1.2, maxM: d.rangeM * 0.85 };
    case 'leap':
      return { minM: 2, maxM: d.maxRangeM };
    case 'nova':
      return d.atTarget ? { minM: 1.5, maxM: Math.max(2, def.aimRangeM) } : { minM: 0, maxM: d.radiusM * 0.9 };
    case 'grab':
      return { minM: 0, maxM: d.reachM + d.radiusM };
    case 'strike':
      return { minM: 0, maxM: Math.max(1.6, def.aimRangeM) };
    case 'teleport':
      // Behind the target: from a distance; a retreat: when pressed close; aimed: to close in.
      if (d.retreatM !== undefined) return { minM: 0, maxM: 1.4 };
      if (d.behindTargetM !== undefined) return { minM: 2.5, maxM: d.maxRangeM };
      return { minM: 4, maxM: d.maxRangeM };
    case 'buff':
    case 'summon':
      return { minM: 0, maxM: 9 };
    default:
      return { minM: 0, maxM: Math.max(1.5, def.aimRangeM) };
  }
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
    /** Hanging from a ledge. */
    readonly hanging: boolean;
  };
  /** The opponent, or null when it cannot be seen (blinded, in the dark, gone). */
  readonly target: {
    readonly x: number;
    readonly y: number;
    readonly floorM: number;
    /** Knocked down or getting up: no point swinging at it. */
    readonly down: boolean;
  } | null;
  /** How close the target must be for a punch to land. */
  readonly meleeReachM: number;
  readonly canClimb: boolean;
  readonly abilities: readonly { readonly slot: BrainSlot; readonly ready: boolean; readonly band: AbilityBand }[];
  readonly profile: { readonly aggression: number; readonly attackEveryS: number; readonly reactionS: number };
  random(): number;
}

export interface BrainOutput {
  move: Vec2;
  jump: boolean;
  sprint: boolean;
  melee: boolean;
  heavy: boolean;
  ability: { slot: BrainSlot; at: Vec2 } | null;
}

/** Seconds between Jump presses while pulling up a ledge. */
const PULL_EVERY_S = 0.18;
/** A target standing this much higher is on furniture: climb after it. */
const CLIMB_AFTER_M = 0.5;

export class FighterBrain {
  private nextAbilityS = 1.5;
  private nextHeavyS = 2.5;
  private nextMeleeS = 0;
  private burstLeft = 0;
  private nextPullS = 0;
  private nextJumpS = 0;
  private strafe = 1;
  private nextStrafeS = 0;

  think(v: BrainView): BrainOutput {
    const out: BrainOutput = {
      move: { x: 0, y: 0 },
      jump: false,
      sprint: false,
      melee: false,
      heavy: false,
      ability: null,
    };
    const s = v.self;
    if (s.hanging) {
      // Pull up the ledge with steady presses.
      if (v.timeS >= this.nextPullS) {
        out.jump = true;
        this.nextPullS = v.timeS + PULL_EVERY_S;
      }
      return out;
    }
    const t = v.target;
    if (!t || !s.canAct) return out;
    const dx = t.x - s.x;
    const dy = t.y - s.y;
    const dist = Math.hypot(dx, dy) || 1e-6;
    const toward = { x: dx / dist, y: dy / dist };
    const aggression = v.profile.aggression;

    // Chase onto furniture: run at it and jump (the climbing rules land on it or grab the edge).
    const above = t.floorM - s.floorM > CLIMB_AFTER_M;
    if (above && v.canClimb) {
      out.move = toward;
      if (dist < 2.2 && !s.airborne && v.timeS >= this.nextJumpS) {
        out.jump = true;
        this.nextJumpS = v.timeS + 1.1;
      }
      return out;
    }

    if (!s.busy && !t.down && v.timeS >= this.nextAbilityS) {
      // The ultimate first when it is ready and in range; otherwise any ready ability that fits.
      const fits = v.abilities.filter((a) => a.ready && dist >= a.band.minM && dist <= a.band.maxM);
      const ult = fits.find((a) => a.slot === 'ult');
      const pick = ult ?? fits[Math.floor(v.random() * fits.length)];
      if (pick && (ult || v.random() < 0.45 + aggression * 0.5)) {
        out.ability = { slot: pick.slot, at: { x: t.x, y: t.y } };
        this.nextAbilityS = v.timeS + 1.6 + v.random() * (2.4 - aggression * 1.2);
        return out;
      }
      this.nextAbilityS = v.timeS + 0.5; // nothing fitted: look again shortly
    }

    const inReach = dist <= v.meleeReachM;
    if (inReach && !s.busy && !t.down) {
      if (v.timeS >= this.nextHeavyS && v.random() < 0.3 + aggression * 0.3) {
        out.heavy = true;
        this.nextHeavyS = v.timeS + 3 + v.random() * 2.5;
        return out;
      }
      if (v.timeS >= this.nextMeleeS) {
        if (this.burstLeft <= 0) this.burstLeft = 2 + Math.floor(v.random() * (2 + aggression * 2));
        out.melee = true;
        this.burstLeft--;
        // Presses chain the combo; after the string, a pause before the next one.
        this.nextMeleeS = v.timeS + (this.burstLeft > 0 ? 0.3 : v.profile.attackEveryS * (0.7 + v.random() * 0.6));
      }
    }
    if (s.busy) return out;

    // Footwork: close in, then circle a little at punching distance (backing off if too close).
    if (v.timeS >= this.nextStrafeS) {
      this.strafe = v.random() < 0.5 ? -1 : 1;
      this.nextStrafeS = v.timeS + 1 + v.random() * 1.5;
    }
    const side = { x: -toward.y * this.strafe, y: toward.x * this.strafe };
    if (dist > v.meleeReachM * 0.85) {
      out.move = toward;
      out.sprint = dist > 5;
    } else if (dist < v.meleeReachM * 0.45)
      out.move = { x: -toward.x * 0.6 + side.x * 0.3, y: -toward.y * 0.6 + side.y * 0.3 };
    else out.move = { x: side.x * 0.35, y: side.y * 0.35 };
    if (t.down) out.move = { x: -toward.x * 0.3, y: -toward.y * 0.3 }; // give it room to get up
    return out;
  }
}
