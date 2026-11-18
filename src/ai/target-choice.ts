/**
 * Who an AI fighter goes for when an enemy has summoned minions (master plan Phase 1 B10: "ensure the
 * opponent AI knows to hit the skeletons first or the player or both, dependent on the situation").
 * Pure rules: the scene lists the enemies it can see and acts on the answer.
 *
 * - No minions about: the summoner (the default target).
 * - The summoner is nearly beaten and within reach of a dash in: finish them, ignore the minions.
 * - Two or more minions on top of it and the summoner out of reach: clear the minions first, nearest
 *   one, which are frail and die to a punch string.
 * - A minion at its throat and the summoner far off: kill that minion first.
 * - Otherwise (the summoner is close enough to hit): the summoner.
 * A choice is kept for `STICKY_S` seconds so it does not flip between targets every frame.
 */

export interface TargetCandidate {
  readonly id: string;
  /** A summoned minion rather than a fighter. */
  readonly isSummon: boolean;
  readonly distM: number;
  /** 0..1 of its health left. */
  readonly hpFrac: number;
}

export interface TargetContext {
  /** How far its own blows reach. */
  readonly reachM: number;
  /** Who it is going for now, and for how long (seconds). */
  readonly currentId: string | null;
  readonly heldS: number;
}

/** A minion this close counts as "on top of" the fighter. */
export const MINION_CLOSE_M = 3;
/** The summoner this much beaten is worth finishing over the minions. */
export const FINISH_HP_FRAC = 0.3;
/** ...if they are within this distance. */
export const FINISH_RANGE_M = 6;
/** Keep a chosen target this long before reconsidering. */
export const STICKY_S = 1;

export function chooseTarget(cands: readonly TargetCandidate[], ctx: TargetContext): string | null {
  if (cands.length === 0) return null;
  const minions = cands.filter((c) => c.isSummon);
  const fighters = cands.filter((c) => !c.isSummon);
  const nearest = (list: readonly TargetCandidate[]) => list.reduce((a, b) => (b.distM < a.distM ? b : a));
  const main = fighters.length > 0 ? nearest(fighters) : null;
  if (!main) return nearest(minions).id;
  if (minions.length === 0) return main.id;

  // Keep the current choice for a moment, if it is still a candidate.
  if (ctx.currentId !== null && ctx.heldS < STICKY_S && cands.some((c) => c.id === ctx.currentId)) return ctx.currentId;

  if (main.hpFrac < FINISH_HP_FRAC && main.distM <= FINISH_RANGE_M) return main.id;
  const near = minions.filter((m) => m.distM <= MINION_CLOSE_M);
  const summonerOutOfReach = main.distM > ctx.reachM * 1.5;
  if (near.length >= 2 && summonerOutOfReach) return nearest(near).id;
  const closest = nearest(minions);
  if (closest.distM <= ctx.reachM * 1.6 && main.distM > 4) return closest.id;
  return main.id;
}
