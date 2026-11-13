import {
  advance,
  openAiMatches,
  playerMatch,
  playerPlacement,
  simulateMatch,
  type TournamentState,
} from './tournament';

/**
 * How a tournament moves between stages (owner, 13/11/2026). After every result: once the player
 * has fought their match (or is out), the AI battles left wait for the player to watch (up to 3
 * per stage) or skip them; when no watches are left, or the player skips the rest, they are
 * settled without being shown. Then the next stage starts. The tournament never moves on while the
 * player's own match, or a battle they may still choose to watch, is open.
 */
export function settleStage(state: TournamentState, strength: (fighter: string) => number, rand: () => number): void {
  for (let guard = 0; guard < 64 && !state.champion; guard++) {
    if (playerMatch(state)) return; // the player fights first
    const open = openAiMatches(state);
    if (open.length > 0 && state.watchesLeft > 0) return; // watch or skip
    for (const m of open) simulateMatch(state, m.id, strength, rand);
    if (!advance(state)) return;
  }
}

/** Skip Battles: settle every AI battle left in this stage without watching, then move on. */
export function skipBattles(state: TournamentState, strength: (fighter: string) => number, rand: () => number): void {
  for (const m of openAiMatches(state)) simulateMatch(state, m.id, strength, rand);
  settleStage(state, strength, rand);
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
