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
 * (highlighted); then what to do next: fight your match, or tap any AI battle in the draw to watch
 * it (no limit), with one Skip button under the draw that settles the rest of the stage; and the
 * champion's screen at the end. It updates after every match.
 * Original design; interface owner (src/interface).
 */
export interface TournamentActions {
  fight(): void;
  watch(matchId: string): void;
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
    window.addEventListener('resize', () => this.fit());
  }

  /** Portrait images by fighter id (drawn by the game once the page is idle). */
  setPortraits(urls: ReadonlyMap<string, string>): void {
    this.portraits = new Map(urls);
    if (this.last) this.show(this.last.state, this.last.history);
  }

  hide(): void {
    this.root.hidden = true;
  }

  /** The latest result (shown above the actions), e.g. a fight the player left early. */
  private latest: string | null = null;

  setLatest(text: string | null): void {
    this.latest = text;
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
    // The whole draw on one landscape screen: scaled to the space left (owner, 13/11/2026).
    const fit = el('div', 'tn-fit');
    const bracket = this.bracket(state);
    fit.appendChild(bracket);
    this.root.appendChild(fit);
    this.fitBox = { fit, bracket };
    const actions = el('div', 'tn-actions');
    if (this.latest) actions.appendChild(el('p', 'tn-latest', this.latest));
    const out = !stillIn(state).has(me.id);
    if (!state.champion) {
      const mine = playerMatch(state);
      if (mine) {
        const them = entrant(state, mine.a === me.id ? mine.b : mine.a)!;
        const watching = me.ai === true;
        actions.appendChild(el('p', 'tn-note', `${watching ? 'Following' : 'Your match'}: ${me.name} vs ${them.name}`));
        actions.appendChild(button('tn-fight', watching ? 'WATCH' : 'FIGHT', () => this.actions.fight()));
      } else {
        const open = openAiMatches(state);
        if (out) actions.appendChild(el('p', 'tn-note', `You are out (${playerPlacement(state)}). Follow the rest:`));
        if (open.length > 0) {
          actions.appendChild(
            el('p', 'tn-note', 'Tap any battle in the draw to watch it, or skip the rest of this stage.'),
          );
          actions.appendChild(button('tn-skip-all', 'Skip', () => this.actions.skipAll()));
        }
      }
    }
    actions.appendChild(
      button('tn-leave', state.champion ? 'Back to menu' : 'Leave tournament', () => this.actions.leave()),
    );
    this.root.appendChild(actions);
    this.fit();
  }

  private fitBox: { fit: HTMLElement; bracket: HTMLElement } | null = null;

  /** Scale the bracket down (never up) so it fits the space between the header and the actions. */
  fit(): void {
    const box = this.fitBox;
    if (!box || this.root.hidden) return;
    box.bracket.style.transform = '';
    const w = box.bracket.offsetWidth;
    const h = box.bracket.offsetHeight;
    const k = Math.min(1, box.fit.clientWidth / Math.max(1, w), box.fit.clientHeight / Math.max(1, h));
    box.bracket.style.transform = k < 1 ? `scale(${k})` : '';
    box.bracket.dataset.scale = k.toFixed(3);
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

  /**
   * The draw as a symmetrical knockout (owner, 25/11/2026, after the tournament-draw reference): the first round at the far left and far
   * right, each round further in, both halves meeting at the Grand Final in the centre with the champion above it. Every match is
   * placed from the tournament's own rounds (slot s feeds slot floor(s / 2) of the next round), so the draw logic is untouched. Lines join
   * each match to its next one; a fighter that wins glides along its line into the next round, a loser is struck out.
   */
  private bracket(state: TournamentState): HTMLElement {
    const R = state.rounds.length;
    const W = 170;
    const GAP = 46;
    const ROW = 52;
    const MH = ROW * 2;
    const PITCH = MH + 32;
    const HEAD = 40;
    const cols = 2 * (R - 1) + 1;
    const width = cols * W + (cols - 1) * GAP;
    // Which half of the draw a match is in: the final's two feeders are the left and right semi-finals.
    const sideOf = (r: number, slot: number): 'L' | 'R' | 'C' => {
      if (r === R - 1) return 'C';
      const per = state.rounds[r]!.length;
      return slot < per / 2 ? 'L' : 'R';
    };
    const colOf = (r: number, side: 'L' | 'R' | 'C'): number =>
      side === 'L' ? r : side === 'C' ? R - 1 : 2 * (R - 1) - r;
    const centreY = new Map<string, number>();
    // First round: evenly down each half; later rounds sit midway between their two feeders.
    const firstL = state.rounds[0]!.filter((_, s) => sideOf(0, s) === 'L');
    const perSide = Math.max(1, firstL.length);
    const bodyH = perSide * PITCH;
    // A small draw (4 or 8) still needs room above the Grand Final for the champion's place.
    const shift = Math.max(0, 150 + MH / 2 + 14 - bodyH / 2);
    state.rounds.forEach((round, r) => {
      const seen = { L: 0, R: 0, C: 0 };
      round.forEach((m, s) => {
        const side = sideOf(r, s);
        let y: number;
        if (r === 0) y = HEAD + shift + seen[side]++ * PITCH + PITCH / 2;
        else if (r === R - 1) y = HEAD + shift + bodyH / 2;
        else {
          const kids = [state.rounds[r - 1]![2 * s], state.rounds[r - 1]![2 * s + 1]].filter((k) => k !== undefined);
          const ys = kids.map((k) => centreY.get(k.id)!);
          y = ys.reduce((t, v) => t + v, 0) / Math.max(1, ys.length);
        }
        centreY.set(m.id, y);
      });
    });
    const height = HEAD + shift + bodyH + 60;
    const grid = el('div', 'tn-bracket tn-sym');
    grid.style.width = `${width}px`;
    grid.style.height = `${height}px`;
    const xOf = (r: number, side: 'L' | 'R' | 'C'): number => colOf(r, side) * (W + GAP);
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'tn-lines');
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    grid.appendChild(svg);
    const line = (d: string, side: 'L' | 'R' | 'C', won: boolean, id: string): void => {
      const path = document.createElementNS(svgNS, 'path');
      path.setAttribute('d', d);
      path.setAttribute('class', `tn-line tn-line-${side}${won ? ' won' : ''}`);
      path.dataset.from = id;
      svg.appendChild(path);
    };
    // Column headings: each round's name above it, the Grand Final in the middle.
    for (let r = 0; r < R; r++) {
      for (const side of r === R - 1 ? (['C'] as const) : (['L', 'R'] as const)) {
        const h = el('h3', `tn-round-name tn-round-${side}${r === state.stage && !state.champion ? ' current' : ''}`);
        h.textContent = r === R - 1 ? 'Grand Final' : stageName(fightersInRound(state, r));
        h.style.left = `${xOf(r, side)}px`;
        h.style.width = `${W}px`;
        // The Grand Final's heading sits between the champion's place and the final itself; the others stay at the top.
        const colTop = Math.min(
          ...state.rounds[r]!.filter((_, si) => sideOf(r, si) === side).map((m) => centreY.get(m.id)!),
        );
        h.style.top = `${colTop - MH / 2 - 26}px`;
        grid.appendChild(h);
      }
    }
    const boxes = new Map<string, HTMLElement>();
    state.rounds.forEach((round, r) => {
      round.forEach((m, s) => {
        const side = sideOf(r, s);
        const box = el('div', `tn-match tn-side-${side}${r === R - 1 ? ' tn-final' : ''}`);
        box.dataset.match = m.id;
        box.style.left = `${xOf(r, side)}px`;
        box.style.top = `${centreY.get(m.id)! - MH / 2}px`;
        box.style.width = `${W}px`;
        box.style.height = `${MH}px`;
        const watchable = r === state.stage && !state.champion && !m.winner && m.a && m.b && m.a !== 'p' && m.b !== 'p';
        for (const id of [m.a, m.b]) {
          const e = entrant(state, id);
          const row = el('div', 'tn-entry');
          row.style.height = `${ROW}px`;
          if (!e) {
            row.classList.add('empty');
            row.append(
              el('span', 'tn-face tn-face-empty'),
              el('span', 'tn-name', m.how === 'bye' && id === null ? 'bye' : 'to be decided'),
            );
          } else {
            row.dataset.entrant = e.id;
            row.append(this.face(e.fighter), el('span', 'tn-name', e.name));
            if (e.isPlayer) row.classList.add('player');
            if (m.winner === e.id) row.classList.add('winner');
            else if (m.winner) {
              row.classList.add('loser');
              row.append(el('span', 'tn-out', 'OUT'));
            }
          }
          box.appendChild(row);
        }
        if (watchable) {
          box.classList.add('watchable');
          box.setAttribute('role', 'button');
          box.tabIndex = 0;
          box.setAttribute('aria-label', `Watch ${entrant(state, m.a)!.name} vs ${entrant(state, m.b)!.name}`);
          box.appendChild(el('div', 'tn-watch-tag', '▶ WATCH'));
          box.addEventListener('click', () => this.actions.watch(m.id));
          box.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') this.actions.watch(m.id);
          });
        }
        grid.appendChild(box);
        boxes.set(m.id, box);
        // The line to the next round: out of this match's inner edge, along to the midway line, up or down, into the next match.
        if (r < R - 1) {
          const next = state.rounds[r + 1]![Math.floor(s / 2)];
          if (next) {
            const toRight = side === 'L';
            const x1 = xOf(r, side) + (toRight ? W : 0);
            const nSide = sideOf(r + 1, Math.floor(s / 2));
            const x2 = xOf(r + 1, nSide) + (side === 'C' || nSide === 'C' ? (toRight ? 0 : W) : toRight ? 0 : W);
            const xm = (x1 + x2) / 2;
            const y1 = centreY.get(m.id)!;
            const y2 = centreY.get(next.id)!;
            line(`M${x1},${y1} H${xm} V${y2} H${x2}`, side === 'C' ? 'L' : side, !!m.winner, m.id);
          }
        }
      });
    });
    // The champion's place above the Grand Final: a big portrait, a glow, then the details once there is one.
    const finalM = state.rounds[R - 1]![0]!;
    const champBox = el('div', 'tn-match tn-champ-slot');
    const champW = Math.round(W * 1.5);
    champBox.style.width = `${champW}px`;
    champBox.style.left = `${xOf(R - 1, 'C') - (champW - W) / 2}px`;
    champBox.style.top = `${centreY.get(finalM.id)! - MH / 2 - 150}px`;
    const champ = entrant(state, state.champion);
    if (champ) {
      champBox.classList.add('has-champion');
      champBox.appendChild(this.championCard(state, this.last?.history ?? []));
    } else {
      const row = el('div', 'tn-entry empty');
      row.append(el('span', 'tn-face tn-face-empty tn-crown', '♛'), el('span', 'tn-name', 'CHAMPION'));
      champBox.appendChild(row);
    }
    grid.appendChild(champBox);
    const cx = xOf(R - 1, 'C') + W / 2;
    line(
      `M${cx},${centreY.get(finalM.id)! - MH / 2} V${centreY.get(finalM.id)! - MH / 2 - 14}`,
      'C',
      !!state.champion,
      finalM.id,
    );
    this.animateAdvances(state, grid, boxes, centreY, { W, GAP, ROW, MH, xOf, sideOf });
    return grid;
  }

  /**
   * The winners of matches decided since this screen was last shown glide along their line into the next round (the portrait travels from
   * its slot, along the line, into the slot it won). What was already shown is remembered for this tab, so a reload does not repeat it.
   */
  private animateAdvances(
    state: TournamentState,
    grid: HTMLElement,
    boxes: ReadonlyMap<string, HTMLElement>,
    centreY: ReadonlyMap<string, number>,
    g: {
      W: number;
      GAP: number;
      ROW: number;
      MH: number;
      xOf: (r: number, side: 'L' | 'R' | 'C') => number;
      sideOf: (r: number, slot: number) => 'L' | 'R' | 'C';
    },
  ): void {
    // The portraits arrive a moment after the page; the glide waits for them (the screen is shown again when they do) so it is not cut short.
    if (this.portraits.size === 0) return;
    const KEY = 'stickman-arena.tn-seen';
    const decided = state.rounds.flatMap((round) => round.filter((m) => m.winner).map((m) => m.id));
    let prev: string[] = [];
    try {
      prev = JSON.parse(sessionStorage.getItem(KEY) ?? '[]') as string[];
    } catch {
      prev = [];
    }
    const fresh = prev.every((id) => decided.includes(id)) ? decided.filter((id) => !prev.includes(id)) : [];
    try {
      sessionStorage.setItem(KEY, JSON.stringify(decided));
    } catch {
      // private mode: the animation simply plays again next time
    }
    if (fresh.length === 0 || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const R = state.rounds.length;
    let order = 0;
    for (const id of fresh) {
      let r = -1;
      let s = -1;
      state.rounds.forEach((round, ri) => {
        const si = round.findIndex((m) => m.id === id);
        if (si >= 0) {
          r = ri;
          s = si;
        }
      });
      const m = state.rounds[r]?.[s];
      if (!m?.winner || r < 0) continue;
      const winner = entrant(state, m.winner);
      if (!winner) continue;
      const side = g.sideOf(r, s);
      const rowIdx = m.a === m.winner ? 0 : 1;
      const y1 = centreY.get(m.id)! - g.MH / 2 + g.ROW * (rowIdx + 0.5);
      let pts: { x: number; y: number }[];
      if (r === R - 1) {
        // The Grand Final's winner rises to the champion's place.
        const cx = g.xOf(r, 'C') + g.W / 2;
        pts = [
          { x: cx, y: y1 },
          { x: cx, y: centreY.get(m.id)! - g.MH / 2 - 100 },
        ];
      } else {
        const next = state.rounds[r + 1]![Math.floor(s / 2)];
        if (!next) continue;
        const nSide = g.sideOf(r + 1, Math.floor(s / 2));
        const toRight = side === 'L';
        const x1 = g.xOf(r, side) + (toRight ? g.W : 0);
        const x2 = g.xOf(r + 1, nSide) + (toRight ? 0 : g.W);
        const xm = (x1 + x2) / 2;
        const y2 = centreY.get(next.id)!;
        pts = [
          { x: x1, y: y1 },
          { x: xm, y: y1 },
          { x: xm, y: y2 },
          { x: x2, y: y2 },
        ];
      }
      const token = el('div', 'tn-token');
      token.append(this.face(winner.fighter));
      token.style.left = '0';
      token.style.top = '0';
      grid.appendChild(token);
      const frames = pts.map((p, i) => ({
        transform: `translate(${p.x - 22}px, ${p.y - 22}px) scale(${i === pts.length - 1 ? 1.25 : 1})`,
        opacity: i === pts.length - 1 ? 0.2 : 1,
        offset: pts.length === 1 ? 0 : i / (pts.length - 1),
      }));
      const target =
        r === R - 1 ? grid.querySelector('.tn-champ-slot') : boxes.get(state.rounds[r + 1]![Math.floor(s / 2)]!.id);
      const anim = token.animate(frames, {
        duration: 1300 + 120 * pts.length,
        delay: order++ * 350,
        easing: 'ease-in-out',
        fill: 'both',
      });
      anim.onfinish = () => {
        token.remove();
        target?.classList.add('arrive');
        window.setTimeout(() => target?.classList.remove('arrive'), 900);
      };
      // The finished match's line lights as the fighter leaves it.
      for (const path of grid.querySelectorAll<SVGPathElement>('.tn-line'))
        if (path.dataset.from === id) path.classList.add('flow');
    }
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
