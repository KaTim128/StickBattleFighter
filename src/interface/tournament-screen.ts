import {
  entrant,
  fightersInRound,
  openAiMatches,
  playerMatch,
  playerPlacement,
  stageName,
  stillIn,
  type TournamentState,
} from '../modes/tournament/tournament';
import type { TournamentRecord } from '../modes/tournament/tournament-flow';

/**
 * The tournament screen (owner, 13/11/2026): the whole bracket with every fighter's portrait, the
 * current stage, winners and eliminated fighters, upcoming pairings and the player's place
 * (highlighted); then what to do next: fight your match, watch up to 3 AI battles (or skip them
 * one by one, or all at once); and the champion's screen at the end. It updates after every match.
 * Original design; interface owner (src/interface).
 */
export interface TournamentActions {
  fight(): void;
  watch(matchId: string): void;
  skip(matchId: string): void;
  skipAll(): void;
  leave(): void;
}

export class TournamentScreen {
  readonly root: HTMLDivElement;
  private portraits = new Map<string, string>();
  private last: { state: TournamentState; history: readonly TournamentRecord[] } | null = null;

  constructor(
    parent: HTMLElement,
    private readonly actions: TournamentActions,
  ) {
    this.root = document.createElement('div');
    this.root.className = 'tournament';
    this.root.hidden = true;
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-label', 'Tournament');
    parent.appendChild(this.root);
  }

  /** Portrait images by fighter id (drawn by the game once the page is idle). */
  setPortraits(urls: ReadonlyMap<string, string>): void {
    this.portraits = new Map(urls);
    if (this.last) this.show(this.last.state, this.last.history);
  }

  hide(): void {
    this.root.hidden = true;
  }

  show(state: TournamentState, history: readonly TournamentRecord[]): void {
    this.last = { state, history };
    this.root.hidden = false;
    this.root.replaceChildren();
    const me = state.entrants.find((e) => e.isPlayer)!;
    const head = el('div', 'tn-head');
    const title = el('h1', 'tn-title', state.champion ? 'TOURNAMENT CHAMPION' : 'TOURNAMENT');
    const stage = el(
      'div',
      'tn-stage',
      state.champion
        ? `${state.entrants.length} fighters · final results`
        : stageName(fightersInRound(state, state.stage)),
    );
    head.append(title, stage);
    this.root.appendChild(head);
    if (state.champion) this.root.appendChild(this.championCard(state, history));
    this.root.appendChild(this.bracket(state));
    const actions = el('div', 'tn-actions');
    const out = !stillIn(state).has(me.id);
    if (!state.champion) {
      const mine = playerMatch(state);
      if (mine) {
        const them = entrant(state, mine.a === me.id ? mine.b : mine.a)!;
        actions.appendChild(el('p', 'tn-note', `Your match: ${me.name} vs ${them.name}`));
        actions.appendChild(button('tn-fight', 'FIGHT', () => this.actions.fight()));
      } else {
        const open = openAiMatches(state);
        if (out) actions.appendChild(el('p', 'tn-note', `You are out (${playerPlacement(state)}). Follow the rest:`));
        if (open.length > 0) {
          actions.appendChild(
            el(
              'p',
              'tn-note',
              `Watch battles: ${state.watchesLeft} of 3 left this stage. Skip any you do not want to see.`,
            ),
          );
          const list = el('div', 'tn-watch-list');
          for (const m of open) {
            const row = el('div', 'tn-watch');
            row.dataset.match = m.id;
            row.appendChild(
              el('span', 'tn-watch-names', `${entrant(state, m.a)!.name} vs ${entrant(state, m.b)!.name}`),
            );
            row.appendChild(button('tn-watch-btn', 'Watch', () => this.actions.watch(m.id)));
            row.appendChild(button('tn-skip-btn', 'Skip', () => this.actions.skip(m.id)));
            list.appendChild(row);
          }
          actions.appendChild(list);
          actions.appendChild(button('tn-skip-all', 'Skip Battles', () => this.actions.skipAll()));
        }
      }
    }
    actions.appendChild(
      button('tn-leave', state.champion ? 'Back to menu' : 'Leave tournament', () => this.actions.leave()),
    );
    this.root.appendChild(actions);
  }

  private face(fighter: string): HTMLElement {
    const box = el('span', 'tn-face');
    const url = this.portraits.get(fighter);
    if (url) {
      const img = document.createElement('img');
      img.src = url;
      img.alt = '';
      box.appendChild(img);
    }
    return box;
  }

  private bracket(state: TournamentState): HTMLElement {
    const grid = el('div', 'tn-bracket');
    state.rounds.forEach((round, r) => {
      const col = el('div', 'tn-round');
      if (r === state.stage && !state.champion) col.classList.add('current');
      col.appendChild(el('h3', 'tn-round-name', stageName(fightersInRound(state, r))));
      for (const m of round) {
        const box = el('div', 'tn-match');
        box.dataset.match = m.id;
        for (const id of [m.a, m.b]) {
          const e = entrant(state, id);
          const row = el('div', 'tn-entry');
          if (!e) {
            row.classList.add('empty');
            row.textContent = m.how === 'bye' && id === null ? 'bye' : '—';
          } else {
            row.append(this.face(e.fighter), el('span', 'tn-name', e.name));
            if (e.isPlayer) row.classList.add('player');
            if (m.winner === e.id) row.classList.add('winner');
            else if (m.winner) row.classList.add('loser');
          }
          box.appendChild(row);
        }
        col.appendChild(box);
      }
      grid.appendChild(col);
    });
    return grid;
  }

  private championCard(state: TournamentState, history: readonly TournamentRecord[]): HTMLElement {
    const champ = entrant(state, state.champion)!;
    const card = el('div', 'tn-champion');
    card.appendChild(this.face(champ.fighter));
    const words = el('div', 'tn-champion-words');
    words.appendChild(el('div', 'tn-champion-title', 'CHAMPION'));
    words.appendChild(el('div', 'tn-champion-name', champ.name));
    words.appendChild(el('div', 'tn-placement', `Your result: ${playerPlacement(state) ?? 'Champion'}`));
    const wins = history.filter((h) => h.placement === 'Champion').length;
    words.appendChild(el('div', 'tn-record', `Tournaments played: ${history.length} · won: ${wins}`));
    card.appendChild(words);
    if (champ.isPlayer) card.classList.add('player');
    return card;
  }
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function button(cls: string, text: string, onClick: () => void): HTMLButtonElement {
  const b = el('button', cls, text);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}
