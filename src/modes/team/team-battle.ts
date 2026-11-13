/**
 * 3 vs 3, tag team (owner, 13/11/2026; REQ-MOD-2, OQ-07 resolved: tag team). Each side has three
 * fighters, one in the arena at a time. A Tag swaps in the next standing teammate; resting
 * teammates slowly get health back; a knocked-out fighter is replaced by the next teammate after a
 * short beat; a team loses when all three are down. At the time limit the team with the larger
 * share of its total health left wins. The player picks three from a random pool of five.
 *
 * Pure rules and numbers; the fight scene applies them (src/app/scenes/scene-teams.ts).
 */
export const TEAM = {
  size: 3,
  poolSize: 5,
  /** Seconds between tags (each side). */
  tagCooldownS: 4,
  /** The incoming fighter cannot be hit for this long (a fair entrance). */
  tagInvulnS: 0.6,
  /** Health a resting fighter gets back per second, as a share of its maximum. */
  benchRegenPerS: 0.02,
  /** After a KO, the next teammate enters this long after (the KO plays out). */
  koSwapDelayS: 2,
  /** The AI tags out below this share of health, if a teammate has at least `aiFreshHp`. */
  aiTagBelowHp: 0.3,
  aiFreshHp: 0.6,
} as const;

/** A team member as the rules see it. */
export interface Member {
  readonly hpFrac: number;
  readonly ko: boolean;
}

/** The next teammate able to come in after `active` (in team order, wrapping), or null. */
export function nextStanding(members: readonly Member[], active: number): number | null {
  for (let k = 1; k < members.length; k++) {
    const i = (active + k) % members.length;
    if (!members[i]!.ko && members[i]!.hpFrac > 0) return i;
  }
  return null;
}

/** Health a resting fighter has after `dtS` on the bench. */
export function benchHp(hp: number, maxHp: number, dtS: number): number {
  return Math.min(maxHp, hp + maxHp * TEAM.benchRegenPerS * dtS);
}

/** Is every member down? */
export function wiped(members: readonly Member[]): boolean {
  return members.every((m) => m.ko || m.hpFrac <= 0);
}

/** The team's share of its total health left (0..1), for a decision on time. */
export function teamHealth(members: readonly Member[]): number {
  return members.reduce((a, m) => a + (m.ko ? 0 : Math.max(0, m.hpFrac)), 0) / Math.max(1, members.length);
}

/** Should the AI tag out now? When hurt, with a fresher teammate waiting. */
export function aiWantsTag(members: readonly Member[], active: number): number | null {
  const me = members[active]!;
  if (me.ko || me.hpFrac >= TEAM.aiTagBelowHp) return null;
  let best: number | null = null;
  members.forEach((m, i) => {
    if (i === active || m.ko || m.hpFrac < TEAM.aiFreshHp) return;
    if (best === null || m.hpFrac > members[best]!.hpFrac) best = i;
  });
  return best;
}

/**
 * The pool of five to pick from (REQ-MOD-2). With fewer than five fighters in the roster, every
 * fighter appears and the rest are repeats, at most one more of each (owner, 13/11/2026).
 */
export function draftPool(roster: readonly string[], rand: () => number): string[] {
  const shuffled = <T>(xs: readonly T[]): T[] => {
    const out = [...xs];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [out[i], out[j]] = [out[j]!, out[i]!];
    }
    return out;
  };
  if (roster.length >= TEAM.poolSize) return shuffled(roster).slice(0, TEAM.poolSize);
  const extra = shuffled(roster).slice(0, TEAM.poolSize - roster.length);
  return shuffled([...roster, ...extra]);
}

/** The AI's team: three fighters at random from the roster (repeats allowed when the roster is small). */
export function aiTeam(roster: readonly string[], rand: () => number): string[] {
  const out: string[] = [];
  const left = [...roster];
  for (let i = 0; i < TEAM.size; i++) {
    const from = left.length > 0 ? left : roster;
    const k = Math.floor(rand() * from.length);
    out.push(from[k]!);
    if (left.length > 0) left.splice(k, 1);
  }
  return out;
}
