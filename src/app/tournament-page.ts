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
  simulateMatch,
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
}

/** Start a new tournament from the menu's choices and go to its bracket. */
export function startTournament(
  choice: { fighter: string; arena: string; difficulty: string; size: number },
  pool: readonly { fighter: string; name: string }[],
  muted: boolean,
): void {
  const me = pool.find((p) => p.fighter === choice.fighter);
  const state = createTournament(
    choice.size,
    { fighter: choice.fighter, name: `${me?.name ?? choice.fighter} (You)` },
    pool,
    Math.random,
  );
  settleStage(state, strength, Math.random); // a player with a bye goes straight to the battles
  saveTournament({ state, arena: choice.arena, difficulty: choice.difficulty });
  goToBracket(choice.arena, muted);
}

/** A tournament to resume, if one is under way. */
export function tournamentInProgress(): SavedTournament | null {
  const saved = loadTournament();
  return saved && !saved.state.champion ? saved : null;
}

export function goToBracket(arena: string, muted: boolean): void {
  const next = new URLSearchParams();
  next.set('mode', 'tournament');
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
  settleStage(saved.state, strength, Math.random);
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
    if (watch) {
      document.body.classList.add('spectating');
      const skip = document.createElement('button');
      skip.type = 'button';
      skip.className = 'tn-skip-battle';
      skip.textContent = 'Skip battle';
      skip.addEventListener('click', () => scene.endMatchNow());
      document.body.appendChild(skip);
    }
    const mine = m.a === 'p' || m.b === 'p';
    const left = mine ? 'p' : m.a!;
    const right = mine ? (m.a === 'p' ? m.b! : m.a!) : m.b!;
    scene.onMatchEnd = (winner) => {
      const fresh = loadTournament() ?? saved;
      const by = winner === 'player' ? left : right;
      const fm = findMatch(fresh.state, matchId);
      if (fm && !fm.winner) {
        // A watched battle cut short with Skip battle does not use up a watch.
        recordResult(
          fresh.state,
          matchId,
          by,
          mine ? 'played' : scene.matchResult?.by === 'ko' ? 'watched' : 'simulated',
        );
        commit(fresh);
      }
      goToBracket(fresh.arena, ctx.muted);
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
    skip: (id) => {
      simulateMatch(saved.state, id, strength, Math.random);
      commit(saved);
      screen.show(saved.state, tournamentHistory());
    },
    skipAll: () => {
      skipBattles(saved.state, strength, Math.random);
      commit(saved);
      screen.show(saved.state, tournamentHistory());
    },
    leave: () => {
      if (saved.state.champion) clearTournament();
      screen.hide();
      ctx.setPaused('tournament', false);
      ctx.openMenu();
    },
  });
  screen.show(saved.state, tournamentHistory());
  return screen;
}
