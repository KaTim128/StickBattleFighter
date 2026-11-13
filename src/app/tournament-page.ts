import { BUILT_IN_LIBRARY } from '../characters/library';
import { fighterRatings, ratingTotal } from '../characters/ratings';
import { resolveCharacter } from '../characters/resolve';
import { TournamentScreen } from '../interface/tournament-screen';
import {
  createTournament,
  entrant,
  fightersInRound,
  findMatch,
  playerMatch,
  recordResult,
  stageName,
} from '../modes/tournament/tournament';
import { recordFor, settleStage, skipBattles } from '../modes/tournament/tournament-flow';
import {
  addToHistory,
  clearTournament,
  loadTournament,
  type SavedTournament,
  saveTournament,
  tournamentHistory,
} from '../modes/tournament/tournament-store';
import type { FightArenaScene } from './scenes/fight-arena-scene';

/**
 * Tournament pages (owner, 13/11/2026). `?mode=tournament` shows the bracket screen (the game is
 * paused behind it); `?mode=tournament&match=<id>` plays one match (`&watch`: an AI battle the
 * player watches). After each match the result is recorded, the tournament moves on as far as it
 * can, and the bracket page comes back. Each page reloads, so the tournament is saved in between.
 */

/** A fighter's overall rating: the stronger fighter is likelier to win an unwatched battle. */
function strength(fighter: string): number {
  return ratingTotal(fighterRatings(resolveCharacter(fighter, BUILT_IN_LIBRARY)));
}

export interface TournamentPageContext {
  readonly params: URLSearchParams;
  readonly scene: FightArenaScene | null;
  readonly muted: boolean;
  setPaused(key: string, paused: boolean): void;
  openMenu(): void;
  /** What Settings → Leave does on this page (a tournament fight is settled rather than abandoned). */
  setLeave(leave: () => void): void;
}

/** Start a new tournament from the menu's choices and go to its bracket. */
export function startTournament(
  choice: { fighter: string; arena: string; difficulty: string; size: number },
  pool: readonly { fighter: string; name: string }[],
  muted: boolean,
  /** The player's registered name (owner, 13/11/2026): their identity in the draw, with their fighter. */
  playerName: string | null = null,
): void {
  const me = pool.find((p) => p.fighter === choice.fighter);
  const state = createTournament(
    choice.size,
    { fighter: choice.fighter, name: `${playerName ?? 'You'} (${me?.name ?? choice.fighter})` },
    pool,
    Math.random,
  );
  settleStage(state); // a player with a bye goes straight to the battles
  saveTournament({ state, arena: choice.arena, difficulty: choice.difficulty });
  goToBracket(choice.arena, muted);
}

/** A tournament to resume, if one is under way. */
export function tournamentInProgress(): SavedTournament | null {
  const saved = loadTournament();
  return saved && !saved.state.champion ? saved : null;
}

export function goToBracket(arena: string, muted: boolean, latest?: { match: string; early: boolean }): void {
  const next = new URLSearchParams();
  next.set('mode', 'tournament');
  if (latest) {
    next.set('last', latest.match);
    if (latest.early) next.set('early', '');
  }
  if (arena !== 'office') next.set('scene', arena);
  if (muted) next.set('mute', '');
  next.set('play', '');
  window.location.search = next.toString();
}

function goToMatch(saved: SavedTournament, matchId: string, watch: boolean, muted: boolean): void {
  const m = findMatch(saved.state, matchId);
  if (!m) return;
  // In your match you are the player side; in a watched battle the first fighter is.
  const mine = m.a === 'p' || m.b === 'p';
  const left = entrant(saved.state, mine ? 'p' : m.a)!;
  const right = entrant(saved.state, mine ? (m.a === 'p' ? m.b : m.a) : m.b)!;
  const next = new URLSearchParams();
  next.set('mode', 'tournament');
  next.set('match', matchId);
  if (watch) next.set('watch', '');
  next.set('character', left.fighter);
  next.set('opponent', right.fighter);
  if (saved.arena !== 'office') next.set('scene', saved.arena);
  next.set('difficulty', saved.difficulty);
  if (muted) next.set('mute', '');
  next.set('play', '');
  window.location.search = next.toString();
}

/** After a result: settle what can be settled, record a finished tournament, save. */
function commit(saved: SavedTournament): void {
  settleStage(saved.state);
  if (saved.state.champion) {
    const rec = recordFor(saved.state, new Date());
    if (rec) addToHistory(rec);
  }
  saveTournament(saved);
}

/** Set up whichever tournament page this is. Returns the bracket screen (for portraits), if shown. */
export function setupTournamentPage(ctx: TournamentPageContext): TournamentScreen | null {
  if (ctx.params.get('mode') !== 'tournament') return null;
  const saved = loadTournament();
  if (!saved) {
    ctx.openMenu();
    return null;
  }
  const matchId = ctx.params.get('match');
  if (matchId && ctx.scene) {
    const watch = ctx.params.has('watch');
    const m = findMatch(saved.state, matchId);
    if (!m || m.winner || m.round !== saved.state.stage) {
      goToBracket(saved.arena, ctx.muted); // already decided (a reload): back to the bracket
      return null;
    }
    const banner = document.createElement('div');
    banner.className = 'tn-banner';
    banner.textContent = `${watch ? 'Watching · ' : ''}Tournament · ${stageName(fightersInRound(saved.state, saved.state.stage))}`;
    document.body.appendChild(banner);
    const scene = ctx.scene;
    if (watch) document.body.classList.add('spectating');
    const mine = m.a === 'p' || m.b === 'p';
    const left = mine ? 'p' : m.a!;
    const right = mine ? (m.a === 'p' ? m.b! : m.a!) : m.b!;
    // Leaving the fight (Settings → Leave) settles it on the health left, so the bracket always
    // moves on correctly (owner, 13/11/2026). On a tie the side that stayed wins your own match;
    // a watched battle is a coin toss weighted like any unwatched battle.
    let leftEarly = false;
    ctx.setLeave(() => {
      leftEarly = true;
      const sl = strength(entrant(saved.state, left)!.fighter);
      const sr = strength(entrant(saved.state, right)!.fighter);
      scene.endMatchNow(mine ? 'opponent' : Math.random() < sl / (sl + sr) ? 'player' : 'opponent');
    });
    scene.onMatchEnd = (winner) => {
      const fresh = loadTournament() ?? saved;
      const by = winner === 'player' ? left : right;
      const fm = findMatch(fresh.state, matchId);
      if (fm && !fm.winner) {
        recordResult(fresh.state, matchId, by, mine ? 'played' : 'watched');
        commit(fresh);
      }
      goToBracket(fresh.arena, ctx.muted, { match: matchId, early: leftEarly });
    };
    return null;
  }
  // The bracket page: the game waits behind the screen.
  ctx.setPaused('tournament', true);
  const screen = new TournamentScreen(document.body, {
    fight: () => {
      const pm = playerMatch(saved.state);
      if (pm) goToMatch(saved, pm.id, false, ctx.muted);
    },
    watch: (id) => goToMatch(saved, id, true, ctx.muted),
    skipAll: () => {
      skipBattles(saved.state, strength, Math.random);
      commit(saved);
      screen.setLatest(null);
      screen.show(saved.state, tournamentHistory());
    },
    leave: () => {
      if (saved.state.champion) clearTournament();
      screen.hide();
      ctx.setPaused('tournament', false);
      ctx.openMenu();
    },
  });
  screen.setLatest(latestResult(saved, ctx.params));
  screen.show(saved.state, tournamentHistory());
  return screen;
}

/** "Top 4: Titan beat Shroud" for the match just finished (`?last=<id>`, `&early` if left). */
function latestResult(saved: SavedTournament, params: URLSearchParams): string | null {
  const id = params.get('last');
  const m = id ? findMatch(saved.state, id) : undefined;
  if (!m?.winner || !m.a || !m.b) return null;
  const won = entrant(saved.state, m.winner)!;
  const lost = entrant(saved.state, m.winner === m.a ? m.b : m.a)!;
  const stage = stageName(fightersInRound(saved.state, m.round));
  const how = params.has('early') ? ' (fight left early: decided on health left)' : '';
  return `${stage}: ${won.name} beat ${lost.name}${how}`;
}
