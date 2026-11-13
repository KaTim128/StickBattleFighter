import type { TournamentState } from './tournament';
import type { TournamentRecord } from './tournament-flow';

/**
 * The tournament in progress and the player's past results, kept in this browser between fights
 * (each fight is its own page). Display only: anything that pays out is decided by the server
 * (REQ-BE, security rules), which does not exist yet.
 */
export interface SavedTournament {
  readonly state: TournamentState;
  /** Where its fights take place, and how hard the AI plays. */
  readonly arena: string;
  readonly difficulty: string;
}

const KEY = 'stickman-arena.tournament.v1';
const HISTORY_KEY = 'stickman-arena.tournament-history.v1';
/** How many past results are kept. */
const HISTORY_MAX = 50;

function store(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null; // storage blocked (private mode): the tournament lasts this page only
  }
}

export function loadTournament(): SavedTournament | null {
  const raw = store()?.getItem(KEY);
  if (!raw) return null;
  try {
    const saved = JSON.parse(raw) as SavedTournament;
    return saved?.state?.version === 1 && Array.isArray(saved.state.rounds) ? saved : null;
  } catch {
    return null; // unreadable: start again
  }
}

export function saveTournament(saved: SavedTournament): void {
  store()?.setItem(KEY, JSON.stringify(saved));
}

export function clearTournament(): void {
  store()?.removeItem(KEY);
}

export function tournamentHistory(): TournamentRecord[] {
  try {
    const raw = store()?.getItem(HISTORY_KEY);
    const list = raw ? (JSON.parse(raw) as TournamentRecord[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function addToHistory(record: TournamentRecord): void {
  const list = [record, ...tournamentHistory()].slice(0, HISTORY_MAX);
  store()?.setItem(HISTORY_KEY, JSON.stringify(list));
}
