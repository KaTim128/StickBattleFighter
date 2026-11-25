/**
 * Tournament match rules (Batch 6, T1; owner plan 24/11/2026). A match runs for `regulationS` of
 * combat time (the clock starts when the intro ends). If nobody is KO'd it goes to overtime: both
 * fighters take more damage the longer it lasts, the AI is forced to engage and nothing heals.
 * If overtime also runs out, the winner is decided by a deterministic performance score
 * (`match-score.ts`): never random, and never "the player wins ties".
 */
export const TOURNAMENT_RULES = {
  /** Combat seconds before overtime begins. */
  regulationS: 120,
  /** Overtime length in combat seconds, after which the performance score decides. */
  overtimeS: 45,
  /** Overtime: extra damage taken by both sides, as a fraction added per second of overtime (0.04 = +4 %/s). */
  overtimeDamageRampPerS: 0.04,
  /** Overtime: the floor the AI's aggression is raised to (0..1); retreating is switched off. */
  overtimeAiAggression: 0.95,
  /** Seconds after overtime ends before the score is used if the match somehow has no result. */
  fallbackAfterS: 0,
} as const;

export type TournamentRules = typeof TOURNAMENT_RULES;
