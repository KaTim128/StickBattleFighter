import type { HitOutcome } from './combatant';

/**
 * Things that happened in combat this step (simulation → presentation). The
 * scene records them; the HUD turns them into floating numbers and callouts
 * (PRS-4). Positions are world metres at the target's head.
 */
export interface CombatEvent {
  /** A hit outcome, or 'burn' for damage over time from fire. */
  readonly kind: Exclude<HitOutcome, 'ignored'> | 'burn';
  readonly target: string;
  readonly x: number;
  readonly y: number;
  readonly amount: number;
}
