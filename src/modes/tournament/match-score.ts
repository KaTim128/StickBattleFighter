/**
 * The fallback decision for a match that reaches the end of overtime (or is left early) without a
 * KO (T1). Pure and deterministic: the same numbers always give the same winner, nobody is
 * favoured on a tie by who they are, and no randomness is involved.
 *
 * Order of comparison: health share left, damage dealt, landed hits, knockdowns, then who landed
 * the first hit earlier. If every one of those is equal the fighter on the left (`a`) wins, a fixed
 * rule that does not depend on whether a human or the AI plays that side.
 */
export interface SideRecord {
  /** Health left as a share of its maximum (0..1). */
  readonly hpShare: number;
  /** Damage this fighter removed from the other (hit points). */
  readonly damageDealt: number;
  /** Blows that landed (not blocked or dodged). */
  readonly hitsLanded: number;
  /** Times it put the other fighter on the ground. */
  readonly knockdowns: number;
  /** Combat seconds of its first landed hit, or null if it never landed one. */
  readonly firstHitS: number | null;
}

const EPS = 1e-6;

/** Positive when `a` did better than `b`; 0 on a tie. */
function cmp(a: number, b: number): number {
  return Math.abs(a - b) <= EPS ? 0 : a > b ? 1 : -1;
}

export function decideByScore(a: SideRecord, b: SideRecord): 'a' | 'b' {
  const steps = [
    cmp(a.hpShare, b.hpShare),
    cmp(a.damageDealt, b.damageDealt),
    cmp(a.hitsLanded, b.hitsLanded),
    cmp(a.knockdowns, b.knockdowns),
    // Earlier first hit is better; a side that never hit loses this step.
    cmp(b.firstHitS ?? Number.POSITIVE_INFINITY, a.firstHitS ?? Number.POSITIVE_INFINITY),
  ];
  for (const s of steps) if (s !== 0) return s > 0 ? 'a' : 'b';
  return 'a';
}
