/**
 * Tournament mode (owner, 13/11/2026): a knockout bracket from 4 to 16 fighters (any count from 2
 * up works: the bracket rounds up to the next power of two and fills the gaps with byes, so a
 * bigger cap needs no rebuild). The player's fighter plus AI fighters are drawn at random into
 * pairs; each match's winner goes through, the loser is out for good. Stages are named by how many
 * fighters are left (Top 16, Top 8, Top 4, Top 2; then the champion).
 *
 * Pure rules and state: no engine, no storage, no randomness of its own (the caller passes `rand`),
 * so a tournament is reproducible and every rule is unit-tested.
 */
export const TOURNAMENT = {
  minEntrants: 4,
  /** The current cap; the bracket itself supports any size (owner: "expand beyond 16 in the future"). */
  maxEntrants: 16,
} as const;

export interface Entrant {
  readonly id: string;
  /** The character it fights as. */
  readonly fighter: string;
  readonly name: string;
  readonly isPlayer: boolean;
}

export type MatchOutcome = 'played' | 'watched' | 'simulated' | 'bye';

export interface Match {
  readonly id: string;
  readonly round: number;
  readonly slot: number;
  a: string | null;
  b: string | null;
  winner: string | null;
  how: MatchOutcome | null;
}

export interface TournamentState {
  readonly version: 1;
  readonly entrants: readonly Entrant[];
  readonly rounds: Match[][];
  /** The round being played (index into `rounds`). */
  stage: number;
  champion: string | null;
}

/**
 * The stage name for a round that starts with `fighters` fighters (owner, 13/11/2026: "Top 16,
 * then Top 8, then Top 4, then Top 2, then champion"; any bigger field is Top 32 and so on).
 */
export function stageName(fighters: number): string {
  return `Top ${Math.max(2, fighters)}`;
}

/** Shuffle a copy (Fisher–Yates) with the caller's random source. */
function shuffled<T>(items: readonly T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * A new tournament: the player as `playerFighter`, the rest AI fighters cycled from `pool` (named
 * after their fighter, numbered when a fighter appears more than once), drawn at random into the
 * first round.
 */
export function createTournament(
  size: number,
  player: { fighter: string; name: string },
  pool: readonly { fighter: string; name: string }[],
  rand: () => number,
): TournamentState {
  if (!Number.isInteger(size) || size < 2) throw new Error(`a tournament needs at least 2 fighters, not ${size}`);
  if (pool.length === 0) throw new Error('no AI fighters to fill the tournament');
  const entrants: Entrant[] = [{ id: 'p', fighter: player.fighter, name: player.name, isPlayer: true }];
  const seen = new Map<string, number>();
  // AI fighters in a random order, cycling through the pool so every fighter takes part; the
  // player's own fighter comes last in each cycle, so a small field has as many different
  // fighters as possible.
  const others = pool.filter((p) => p.fighter !== player.fighter);
  const order = [...shuffled(others, rand), ...pool.filter((p) => p.fighter === player.fighter)];
  for (let i = 0; entrants.length < size; i++) {
    const pick = order[i % order.length]!;
    const n = (seen.get(pick.fighter) ?? 0) + 1;
    seen.set(pick.fighter, n);
    entrants.push({
      id: `ai${i + 1}`,
      fighter: pick.fighter,
      name: n > 1 ? `${pick.name} ${n}` : pick.name,
      isPlayer: false,
    });
  }
  let bracket = 2;
  while (bracket < size) bracket *= 2;
  const draw: (Entrant | null)[] = shuffled(entrants, rand);
  // Byes go to the last slots of every other pair, so no match is ever bye against bye.
  const pairs = bracket / 2;
  const first: Match[] = [];
  for (let i = 0; i < pairs; i++)
    first.push({ id: `r0m${i}`, round: 0, slot: i, a: null, b: null, winner: null, how: null });
  draw.forEach((e, i) => {
    const m = first[i % pairs]!;
    if (i < pairs) m.a = e!.id;
    else m.b = e!.id;
  });
  const rounds: Match[][] = [first];
  for (let r = 1, n = pairs / 2; n >= 1; r++, n /= 2) {
    const round: Match[] = [];
    for (let i = 0; i < n; i++)
      round.push({ id: `r${r}m${i}`, round: r, slot: i, a: null, b: null, winner: null, how: null });
    rounds.push(round);
  }
  const state: TournamentState = {
    version: 1,
    entrants,
    rounds,
    stage: 0,
    champion: null,
  };
  // A fighter without an opponent goes straight through.
  for (const m of first) if (m.a && !m.b) settle(state, m, m.a, 'bye');
  return state;
}

export function entrant(state: TournamentState, id: string | null): Entrant | undefined {
  return id ? state.entrants.find((e) => e.id === id) : undefined;
}

export function findMatch(state: TournamentState, id: string): Match | undefined {
  for (const round of state.rounds) for (const m of round) if (m.id === id) return m;
  return undefined;
}

/** The fighters still in the tournament. */
export function stillIn(state: TournamentState): Set<string> {
  const out = new Set(state.entrants.map((e) => e.id));
  for (const round of state.rounds) {
    for (const m of round) {
      if (!m.winner) continue;
      if (m.a && m.a !== m.winner) out.delete(m.a);
      if (m.b && m.b !== m.winner) out.delete(m.b);
    }
  }
  return out;
}

/** The player's match in the current stage, if they are in it and it has not been fought. */
export function playerMatch(state: TournamentState): Match | null {
  const round = state.rounds[state.stage];
  return round?.find((m) => !m.winner && (m.a === 'p' || m.b === 'p') && m.a !== null && m.b !== null) ?? null;
}

/** The AI battles in the current stage still to be decided. */
export function openAiMatches(state: TournamentState): Match[] {
  const round = state.rounds[state.stage] ?? [];
  return round.filter((m) => !m.winner && m.a !== null && m.b !== null && m.a !== 'p' && m.b !== 'p');
}

function settle(state: TournamentState, m: Match, winner: string, how: MatchOutcome): void {
  m.winner = winner;
  m.how = how;
  const next = state.rounds[m.round + 1];
  if (!next) {
    state.champion = winner;
    return;
  }
  const into = next[Math.floor(m.slot / 2)]!;
  if (m.slot % 2 === 0) into.a = winner;
  else into.b = winner;
}

/**
 * Record a match result. Only an undecided match in the current stage can be settled, and only by
 * one of its two fighters (results never change and eliminated fighters never come back).
 */
export function recordResult(state: TournamentState, matchId: string, winner: string, how: MatchOutcome): void {
  const m = findMatch(state, matchId);
  if (!m) throw new Error(`no match ${matchId}`);
  if (m.winner) throw new Error(`match ${matchId} is already decided`);
  if (m.round !== state.stage) throw new Error(`match ${matchId} is not in the current stage`);
  if (winner !== m.a && winner !== m.b) throw new Error(`${winner} is not in match ${matchId}`);
  settle(state, m, winner, how);
}

/**
 * Settle an AI battle nobody watches: the stronger fighter (by `strength`, a rating) is likelier
 * to win, never certain.
 */
export function simulateMatch(
  state: TournamentState,
  matchId: string,
  strength: (fighter: string) => number,
  rand: () => number,
): string {
  const m = findMatch(state, matchId);
  if (!m?.a || !m.b) throw new Error(`match ${matchId} cannot be simulated`);
  const sa = Math.max(1, strength(entrant(state, m.a)!.fighter));
  const sb = Math.max(1, strength(entrant(state, m.b)!.fighter));
  const winner = rand() < sa / (sa + sb) ? m.a : m.b;
  recordResult(state, matchId, winner, 'simulated');
  return winner;
}

/** Is every match of the current stage decided? */
export function stageComplete(state: TournamentState): boolean {
  return (state.rounds[state.stage] ?? []).every((m) => m.winner !== null);
}

/** Move on to the next stage once this one is complete. */
export function advance(state: TournamentState): boolean {
  if (!stageComplete(state) || state.champion) return false;
  state.stage++;
  return true;
}

/** How many fighters start a round (its matches times two). */
export function fightersInRound(state: TournamentState, round: number): number {
  return (state.rounds[round]?.length ?? 0) * 2;
}

/** The player's final placement, once they are out or the tournament is over. */
export function playerPlacement(state: TournamentState): string | null {
  if (state.champion === 'p') return 'Champion';
  for (const round of state.rounds) {
    for (const m of round) {
      if (m.winner && m.winner !== 'p' && (m.a === 'p' || m.b === 'p')) {
        const n = fightersInRound(state, m.round);
        return n <= 2 ? 'Runner-up' : `Out in the ${stageName(n)}`;
      }
    }
  }
  return null;
}
