import {
  advance,
  type Entrant,
  entrant,
  type Match,
  openAiMatches,
  playerMatch,
  playerPlacement,
  recordResult,
  type TournamentState,
} from './tournament';

/**
 * How a tournament moves between stages (owner, 13/11/2026; no watch limit since 13/11/2026). After
 * every result: once the player has fought their match (or is out), the AI battles left wait for
 * the player, who may watch any of them (as many as they like); Skip settles the rest without
 * showing them. Then the next stage starts. The tournament never moves on while the player's own
 * match, or a battle they may still choose to watch, is open.
 */
export function settleStage(state: TournamentState): void {
  for (let guard = 0; guard < 64 && !state.champion; guard++) {
    if (playerMatch(state)) return; // the player fights first
    if (openAiMatches(state).length > 0) return; // watch any of them, or skip the rest
    if (!advance(state)) return;
  }
}

/** Fights one AI battle for real and says who won (`a` is the match's first fighter). */
export type FightSimulator = (a: Entrant, b: Entrant, seed: number) => Promise<'a' | 'b'>;

/** A fixed seed for a match, from its id and fighters, so a skipped stage is reproducible. */
export function matchSeed(m: Match, a: Entrant, b: Entrant): number {
  let h = 2166136261;
  for (const ch of `${m.id}|${a.fighter}|${b.fighter}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

/**
 * Skip Battles (T2): settle every AI battle left in this stage by really simulating it (never a
 * dice roll), reporting progress, then move on. A match decided meanwhile (a second skip, a reload)
 * is left alone, so each match is recorded once.
 */
export async function skipBattles(
  state: TournamentState,
  fight: FightSimulator,
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  const open = openAiMatches(state);
  let done = 0;
  for (const m of open) {
    if (!m.winner) {
      const a = entrant(state, m.a)!;
      const b = entrant(state, m.b)!;
      const side = await fight(a, b, matchSeed(m, a, b));
      if (!m.winner) recordResult(state, m.id, side === 'a' ? a.id : b.id, 'simulated');
    }
    onProgress?.(++done, open.length);
  }
  settleStage(state);
}

/** A finished tournament as the player's record (local history until server progression exists). */
export interface TournamentRecord {
  /** DD/MM/YYYY. */
  readonly date: string;
  readonly fighter: string;
  readonly size: number;
  readonly placement: string;
  readonly champion: string;
}

export function recordFor(state: TournamentState, now: Date): TournamentRecord | null {
  if (!state.champion) return null;
  const p = state.entrants.find((e) => e.isPlayer)!;
  const champ = state.entrants.find((e) => e.id === state.champion)!;
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return {
    date: `${dd}/${mm}/${now.getFullYear()}`,
    fighter: p.fighter,
    size: state.entrants.length,
    placement: playerPlacement(state) ?? 'Champion',
    champion: champ.name,
  };
}
