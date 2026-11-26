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
import { seededRandom } from '../combat/combatant';
import type { FightArenaScene } from './scenes/fight-arena-scene';

/**
 * Tournament pages (owner, 13/11/2026). `?mode=tournament` shows the bracket screen (the game is
 * paused behind it); `?mode=tournament&match=<id>` plays one match (`&watch`: an AI battle the
 * player watches). After each match the result is recorded, the tournament moves on as far as it
 * can, and the bracket page comes back. Each page reloads, so the tournament is saved in between.
 */

export interface TournamentPageContext {
  readonly params: URLSearchParams;
  readonly scene: FightArenaScene | null;
  readonly muted: boolean;
  setPaused(key: string, paused: boolean): void;
  openMenu(): void;
  /** What Settings → Leave does on this page (a tournament fight is settled rather than abandoned). */
  setLeave(leave: () => void): void;
}

/** The main menu page (the title), with sound allowed at once. */
export function goToTitle(muted: boolean): void {
  const next = new URLSearchParams();
  next.set('home', '');
  if (muted) next.set('mute', '');
  next.set('play', '');
  window.location.search = next.toString();
}

/** Start a new tournament from the menu's choices and go to its bracket. */
export function startTournament(
  choice: { fighter: string; arena: string; difficulty: string; size: number; spectate?: boolean },
  pool: readonly { fighter: string; name: string }[],
  muted: boolean,
  /** The player's registered name (owner, 13/11/2026): their identity in the draw, with their fighter. */
  playerName: string | null = null,
): void {
  const me = pool.find((p) => p.fighter === choice.fighter);
  const state = createTournament(
    choice.size,
    {
      fighter: choice.fighter,
      name: `${playerName ?? 'You'} (${me?.name ?? choice.fighter})`,
      spectate: choice.spectate === true,
    },
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
  const mine = isPlayersOwn(saved, m);
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

/** The player's own match: fought by hand, unless they are only spectating (T4), when it is watched. */
function isPlayersOwn(saved: SavedTournament, m: { a: string | null; b: string | null }): boolean {
  return (m.a === 'p' || m.b === 'p') && entrant(saved.state, 'p')?.ai !== true;
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
    const following = entrant(saved.state, 'p')?.ai === true && (m.a === 'p' || m.b === 'p');
    const stageLabel = stageName(fightersInRound(saved.state, saved.state.stage));
    banner.textContent = following
      ? `Following ${entrant(saved.state, 'p')!.name} · ${stageLabel}`
      : `${watch ? 'Watching · ' : ''}Tournament · ${stageLabel}`;
    document.body.appendChild(banner);
    const scene = ctx.scene;
    if (watch) document.body.classList.add('spectating');
    const mine = isPlayersOwn(saved, m);
    const left = mine ? 'p' : m.a!;
    const right = mine ? (m.a === 'p' ? m.b! : m.a!) : m.b!;
    // Leaving the fight (Settings → Leave) settles it on the performance score (T1: health left, damage,
    // hits, knockdowns, first hit; never a coin toss), so the bracket always moves on correctly
    // (owner, 13/11/2026). Only a 3 vs 3 health tie falls back to the side that stayed.
    let leftEarly = false;
    ctx.setLeave(() => {
      leftEarly = true;
      scene.endMatchNow('opponent');
    });
    scene.onOvertime = () => {
      banner.textContent = `OVERTIME · ${banner.textContent}`;
      banner.classList.add('tn-overtime');
    };
    // Skip Battle (T2): fast-forward the real simulation of a watched fight, once.
    if (watch) {
      const skip = document.createElement('button');
      skip.className = 'tn-skip-battle';
      skip.textContent = 'Skip Battle';
      skip.addEventListener('click', () => {
        if (skip.disabled) return;
        skip.disabled = true;
        skip.textContent = 'Skipping…';
        ctx.setPaused('skip', true); // the live loop rests while this one runs the fight
        // One frame to show the state, then the whole result is computed at once and the battle ends (no fast-forward).
        setTimeout(() => scene.skipToEnd(), 0);
      });
      document.body.appendChild(skip);
    }
    scene.onMatchEnd = (winner) => {
      const fresh = loadTournament() ?? saved;
      const by = winner === 'player' ? left : right;
      const fm = findMatch(fresh.state, matchId);
      if (fm && !fm.winner) {
        recordResult(fresh.state, matchId, by, mine ? 'played' : 'watched');
        commit(fresh);
      }
      // Leave (owner, 13/11/2026): the fight is settled and recorded, then straight to the main menu.
      if (leftEarly) goToTitle(ctx.muted);
      else goToBracket(fresh.arena, ctx.muted, { match: matchId, early: false });
    };
    return null;
  }
  // The bracket page: the game waits behind the screen.
  let skipping = false;
  ctx.setPaused('tournament', true);
  const screen = new TournamentScreen(document.body, {
    fight: () => {
      const pm = playerMatch(saved.state);
      if (pm) goToMatch(saved, pm.id, entrant(saved.state, 'p')?.ai === true, ctx.muted);
    },
    watch: (id) => goToMatch(saved, id, true, ctx.muted),
    skipAll: () => {
      if (skipping) return; // one skip at a time (double taps do nothing)
      skipping = true;
      // Owner 26/11/2026: Skip names the stage's winners at once (Top 16 shows Top 8 straight away), so each
      // skipped battle is settled instantly from its fixed match seed rather than fought out.
      void skipBattles(saved.state, async (_a, _b, seed) => (seededRandom(seed)() < 0.5 ? 'a' : 'b')).finally(() => {
        skipping = false;
        commit(saved);
        screen.setLatest(null);
        screen.show(saved.state, tournamentHistory());
      });
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
