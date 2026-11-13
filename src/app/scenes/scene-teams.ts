import { aiWantsTag, benchHp, type Member, nextStanding, TEAM, teamHealth, wiped } from '../../modes/team/team-battle';
import type { FighterEntity } from './fighter-entity';

export type TeamSide = 'player' | 'opponent';

/** One member as the HUD shows it. */
export interface TeamMemberState {
  readonly id: string;
  readonly name: string;
  readonly hpFrac: number;
  readonly ko: boolean;
  readonly active: boolean;
}

export interface TeamHudState {
  readonly player: readonly TeamMemberState[];
  readonly opponent: readonly TeamMemberState[];
  /** 0..1 how ready the player's tag is (1 = ready). */
  readonly playerTagReady: number;
}

/**
 * The two teams of a 3 vs 3 fight (owner, 13/11/2026; tag team, src/modes/team). Holds every
 * member's fighter (only the active one of each side is in the arena), the tag cooldowns, the
 * resting members' recovery and the replacement after a KO. The scene does the swapping itself
 * (`swap`), as only it can take a fighter out of the arena and put another in.
 */
export class SceneTeams {
  private readonly members: Record<TeamSide, FighterEntity[]>;
  private readonly active: Record<TeamSide, number> = { player: 0, opponent: 0 };
  private readonly cooldownS: Record<TeamSide, number> = { player: 0, opponent: 0 };
  /** A KO waiting to be replaced: seconds left. */
  private readonly koSwapS: Record<TeamSide, number | null> = { player: null, opponent: null };

  constructor(
    player: FighterEntity[],
    opponent: FighterEntity[],
    private readonly swap: (side: TeamSide, incoming: FighterEntity) => void,
  ) {
    this.members = { player, opponent };
  }

  activeFighter(side: TeamSide): FighterEntity {
    return this.members[side][this.active[side]]!;
  }

  private view(side: TeamSide): Member[] {
    return this.members[side].map((f) => ({ hpFrac: f.combatant.hp / f.combatant.stats.maxHp, ko: f.combatant.isKo }));
  }

  /** Every fixed step: cooldowns, the bench recovering, a KO'd fighter replaced after a beat. */
  step(dtS: number): void {
    for (const side of ['player', 'opponent'] as const) {
      this.cooldownS[side] = Math.max(0, this.cooldownS[side] - dtS);
      this.members[side].forEach((f, i) => {
        if (i === this.active[side] || f.combatant.isKo) return;
        f.combatant.hp = benchHp(f.combatant.hp, f.combatant.stats.maxHp, dtS);
      });
      const active = this.activeFighter(side);
      if (active.combatant.isKo && this.koSwapS[side] === null) {
        if (nextStanding(this.view(side), this.active[side]) !== null) this.koSwapS[side] = TEAM.koSwapDelayS;
      }
      const left = this.koSwapS[side];
      if (left !== null) {
        if (left - dtS <= 0) {
          this.koSwapS[side] = null;
          this.bringIn(side, nextStanding(this.view(side), this.active[side]));
        } else this.koSwapS[side] = left - dtS;
      }
    }
  }

  /** Tag (the player's button, or the AI): swap in the next standing teammate if allowed. */
  tryTag(side: TeamSide, canSwap: boolean, to?: number | null): boolean {
    const f = this.activeFighter(side);
    if (!canSwap || this.cooldownS[side] > 0 || f.combatant.isKo || !f.combatant.canAct) return false;
    const next = to ?? nextStanding(this.view(side), this.active[side]);
    if (next === null || next === this.active[side]) return false;
    this.bringIn(side, next);
    this.cooldownS[side] = TEAM.tagCooldownS;
    return true;
  }

  /** The AI's wish to tag (hurt, with a fresher teammate), or null. */
  aiTagChoice(side: TeamSide): number | null {
    if (this.cooldownS[side] > 0) return null;
    return aiWantsTag(this.view(side), this.active[side]);
  }

  private bringIn(side: TeamSide, index: number | null): void {
    if (index === null) return;
    this.active[side] = index;
    const incoming = this.members[side][index]!;
    incoming.combatant.grantInvulnerability(TEAM.tagInvulnS);
    this.swap(side, incoming);
  }

  /** Is this whole side down (no KO replacement pending)? */
  beaten(side: TeamSide): boolean {
    return wiped(this.view(side));
  }

  /** A KO is about to be replaced: the match goes on. */
  replacing(side: TeamSide): boolean {
    return this.koSwapS[side] !== null;
  }

  health(side: TeamSide): number {
    return teamHealth(this.view(side));
  }

  get hud(): TeamHudState {
    const state = (side: TeamSide): TeamMemberState[] =>
      this.members[side].map((f, i) => ({
        id: f.def.id,
        name: f.def.displayName,
        hpFrac: Math.max(0, f.combatant.hp / f.combatant.stats.maxHp),
        ko: f.combatant.isKo,
        active: i === this.active[side],
      }));
    return {
      player: state('player'),
      opponent: state('opponent'),
      playerTagReady: 1 - this.cooldownS.player / TEAM.tagCooldownS,
    };
  }
}
