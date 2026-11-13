import titleArt from '../../assets/ui/title-menu.webp?url';
import { RATING_KEYS, RATING_LABELS } from '../characters/ratings';
import { draftPool } from '../modes/team/team-battle';
import type { NameCheck } from '../progression/player-name';
import { PLAYER_NAME_MAX } from '../progression/player-name';
import { abilityIcon } from './ability-icons';
import { accentColour } from './accent-colour';
import type { FighterSheet } from './fighter-sheet';
import type { MenuArena, MenuFighter, MenuOpponent } from './main-menu';
import { TOURNAMENT_SIZES } from './main-menu';
import { quitGame } from './quit-game';

/**
 * The game's front end (owner, 13/11/2026: "Main Menu, Player Identification and Interface
 * Redesign"; "Stickman Selection Screen and Unique 2.5D Fighter Stances"). Original design.
 *
 * - Title: the logo top left, the menu down the left (Story Mode, locked; Game Modes; Settings;
 *   Quit Game; Admin Panel only for the admin name), the fighters striking their stances on the right.
 * - Name: before Story Mode or Game Modes the player registers a name (10 characters at most).
 * - Game Modes: Tournament, and 3 vs 3 (shown, coming soon).
 * - Fighter select: the selected fighter large in its select stance, its name, title, story and
 *   style, six stats, four abilities and its ultimate beside it; the roster below; the tournament's
 *   arena, size and difficulty, then FIGHT.
 * - Quit: browsers only let a page close a window it opened, so Quit tries, then shows a goodbye.
 */

export type FrontScreen = 'title' | 'name' | 'modes' | 'practice' | 'select' | 'team';

export interface FighterPresentation {
  readonly title: string;
  readonly style: string;
}

/** A fighter's animated select stance (frames side by side, played back and forth). */
export interface StanceStrip {
  readonly url: string;
  readonly frames: number;
  readonly cellW: number;
  readonly cellH: number;
  readonly spanS: number;
}

/** 3 vs 3 (owner, 13/11/2026): the player's three, in order; the AI's team is drawn at random. */
export interface TeamSetup {
  readonly team: readonly string[];
  readonly arena: string;
  readonly difficulty: string;
}

/** Open Zone (owner, 13/11/2026): try any fighter against the dummy or an AI fighter. */
export interface PracticeSetup {
  readonly fighter: string;
  readonly arena: string;
  readonly opponent: string;
  readonly difficulty: string;
}

export interface TournamentSetup {
  readonly fighter: string;
  readonly arena: string;
  readonly difficulty: string;
  readonly size: number;
}

export interface FrontEndOptions {
  readonly fighters: readonly MenuFighter[];
  readonly arenas: readonly MenuArena[];
  readonly difficulties: readonly MenuOpponent[];
  /** Open Zone opponents: the training dummy first, then every fighter. */
  readonly opponents: readonly MenuOpponent[];
  readonly initial: TournamentSetup;
  presentation(fighterId: string): FighterPresentation | undefined;
  sheetFor(fighterId: string): FighterSheet | null;
  playerName(): string | null;
  saveName(raw: string): NameCheck;
  isAdmin(): boolean;
  onOpenChange(open: boolean): void;
  /** The screen shown now (the music is lowered on fighter select). */
  onScreen?(screen: FrontScreen): void;
  openSettings(): void;
  openAdmin(): void;
  startTournament(setup: TournamentSetup): void;
  startPractice(setup: PracticeSetup): void;
  startTeam(setup: TeamSetup): void;
  startTutorial(fighter: string): void;
}

export class FrontEnd {
  readonly root: HTMLDivElement;
  private screen: FrontScreen = 'title';
  private open = false;
  private choice: { fighter: string; arena: string; difficulty: string; size: number; opponent: string };
  /** What fighter select leads to: a tournament or the Open Zone. */
  private selectFor: 'tournament' | 'practice' = 'tournament';
  private afterName: FrontScreen = 'modes';
  private resume: (() => void) | null = null;
  private readonly portraits = new Map<string, string>();
  private readonly strips = new Map<string, StanceStrip>();
  private readonly names = new Map<string, string>();
  private readonly screens = new Map<FrontScreen, HTMLElement>();
  private toastTimer = 0;

  constructor(
    parent: HTMLElement,
    private readonly o: FrontEndOptions,
  ) {
    this.choice = { ...o.initial, opponent: o.opponents[0]?.id ?? '' };
    for (const f of o.fighters) this.names.set(f.id, f.name);
    this.root = el('div', 'front-end');
    this.root.hidden = true;
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-label', 'Stickman Arena');
    for (const s of ['title', 'name', 'modes', 'practice', 'select', 'team'] as const) {
      const sec = el('section', `fe-screen fe-${s}`);
      sec.dataset.screen = s;
      sec.hidden = true;
      this.screens.set(s, sec);
      this.root.appendChild(sec);
    }
    this.toast = el('div', 'fe-toast');
    this.toast.setAttribute('role', 'status');
    this.root.appendChild(this.toast);
    parent.appendChild(this.root);
    window.addEventListener('keydown', (e) => {
      if (!this.open || e.code !== 'Escape' || this.screen === 'title') return;
      if (document.querySelector('.settings-panel:not([hidden])')) return;
      e.stopPropagation();
      this.back();
    });
    this.render();
  }

  private readonly toast: HTMLDivElement;

  get isOpen(): boolean {
    return this.open;
  }

  get current(): FrontScreen {
    return this.screen;
  }

  setOpen(open: boolean, screen: FrontScreen = 'title'): void {
    if (open) this.show(screen);
    if (open === this.open) return;
    this.open = open;
    this.root.hidden = !open;
    this.o.onOpenChange(open);
  }

  /** Offer to resume a tournament in progress on the Game Modes screen (null removes it). */
  setResume(onResume: (() => void) | null): void {
    this.resume = onResume;
    if (this.screen === 'modes') this.show('modes');
  }

  setPortrait(id: string, url: string): void {
    this.portraits.set(id, url);
    for (const img of this.root.querySelectorAll<HTMLImageElement>(`[data-face="${id}"]`)) img.src = url;
  }

  setStrip(id: string, strip: StanceStrip): void {
    this.strips.set(id, strip);
    for (const m of this.root.querySelectorAll<HTMLElement>(`.fe-model[data-model="${id}"]`)) playStrip(m, strip);
  }

  setFighterName(id: string, name: string): void {
    this.names.set(id, name);
    if (this.open) this.show(this.screen);
  }

  /** Re-draw the current screen (e.g. the player's name changed in Settings). */
  refresh(): void {
    if (this.open) this.show(this.screen);
  }

  show(screen: FrontScreen): void {
    this.screen = screen;
    for (const [s, sec] of this.screens) sec.hidden = s !== screen;
    const sec = this.screens.get(screen)!;
    sec.replaceChildren();
    if (screen === 'title') this.buildTitle(sec);
    else if (screen === 'name') this.buildName(sec);
    else if (screen === 'modes') this.buildModes(sec);
    else if (screen === 'practice') this.buildPractice(sec);
    else if (screen === 'team') this.buildTeam(sec);
    else this.buildSelect(sec);
    this.root.dataset.screen = screen;
    this.o.onScreen?.(screen);
  }

  private render(): void {
    this.show(this.screen);
  }

  /** Fighter select for a tournament or for the Open Zone. */
  openSelect(forWhat: 'tournament' | 'practice'): void {
    this.selectFor = forWhat;
    this.show('select');
  }

  private back(): void {
    if (this.screen === 'select') this.show(this.selectFor === 'practice' ? 'practice' : 'modes');
    else if (this.screen === 'team') this.show('modes');
    else this.show('title');
  }

  private say(text: string): void {
    this.toast.textContent = text;
    this.toast.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toast.classList.remove('show'), 2600);
  }

  /** Story Mode and Game Modes need a registered name first. */
  private needName(then: FrontScreen): boolean {
    if (this.o.playerName()) return false;
    this.afterName = then;
    this.show('name');
    return true;
  }

  private buildTitle(sec: HTMLElement): void {
    // The owner's title art (13/11/2026) as the backdrop, its painted menu removed; the menu is
    // the game's own buttons, all in the style of the Admin Panel plate (owner, 13/11/2026), in a
    // column under the logo.
    const art = el('div', 'fe-art');
    art.style.backgroundImage = `url(${titleArt})`;
    const embers = el('div', 'fe-embers');
    for (let i = 0; i < 14; i++) {
      const e = el('span', 'fe-ember');
      e.style.left = `${30 + ((i * 37) % 70)}%`;
      e.style.animationDelay = `${(i * 0.73) % 6}s`;
      e.style.animationDuration = `${5 + (i % 5)}s`;
      embers.append(e);
    }
    const nav = el('nav', 'fe-nav');
    art.append(nav);
    const items: HTMLButtonElement[] = [];
    const highlight = (b: HTMLButtonElement) => {
      for (const it of items) it.classList.toggle('active', it === b);
    };
    const item = (id: string, label: string, onClick: () => void): HTMLButtonElement => {
      const b = button(`fe-item fe-plate fe-item-${id}`, '', onClick);
      b.dataset.nav = id;
      b.append(el('span', 'fe-item-label', label));
      b.addEventListener('pointerenter', () => highlight(b));
      b.addEventListener('focus', () => highlight(b));
      nav.append(b);
      items.push(b);
      return b;
    };
    const story = item('story', 'Story Mode', () => this.say('Story Mode is locked. It arrives in a later update.'));
    story.classList.add('locked');
    story.setAttribute('aria-disabled', 'true');
    story.append(el('span', 'fe-lock', 'LOCKED'));
    const modes = item('modes', 'Game Modes', () => {
      if (!this.needName('modes')) this.show('modes');
    });
    // Practice (owner, 13/11/2026), under Game Modes: the tutorial or the Open Zone.
    item('practice', 'Practice', () => {
      if (!this.needName('practice')) this.show('practice');
    });
    item('settings', 'Settings', () => this.o.openSettings());
    item('quit', 'Quit Game', () => this.quit());
    if (this.o.isAdmin()) item('admin', 'Admin Panel', () => this.o.openAdmin());
    highlight(modes);
    // Up and down move between the plates; Enter picks one.
    nav.addEventListener('keydown', (e) => {
      const at = items.indexOf(document.activeElement as HTMLButtonElement);
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      items[(Math.max(0, at) + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length]!.focus();
    });
    const name = this.o.playerName();
    if (name) {
      const who = el('div', 'fe-player');
      who.append(el('span', 'fe-player-label', 'PLAYER'), el('strong', '', name));
      sec.append(who);
    }
    sec.prepend(art, embers);
  }

  private buildName(sec: HTMLElement): void {
    const card = el('div', 'fe-panel fe-name-card');
    const h = el('h2', 'fe-h', 'NAME YOUR FIGHTER');
    const p = el('p', 'fe-sub', `Your name is shown in fights and tournaments. Up to ${PLAYER_NAME_MAX} characters.`);
    const input = document.createElement('input');
    input.className = 'fe-name-input';
    input.type = 'text';
    input.maxLength = PLAYER_NAME_MAX;
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.setAttribute('aria-label', 'Player name');
    input.value = this.o.playerName() ?? '';
    const count = el('div', 'fe-name-count');
    const error = el('div', 'fe-name-error');
    error.setAttribute('role', 'alert');
    const update = () => {
      count.textContent = `${[...input.value].length}/${PLAYER_NAME_MAX}`;
    };
    input.addEventListener('input', () => {
      update();
      error.textContent = '';
    });
    update();
    const submit = () => {
      const r = this.o.saveName(input.value);
      if (!r.ok) {
        error.textContent = r.error;
        return;
      }
      this.show(this.afterName);
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit();
    });
    const row = el('div', 'fe-row');
    row.append(
      button('fe-back', 'Back', () => this.show('title')),
      button('fe-go fe-name-ok', 'Continue', submit),
    );
    card.append(h, p, input, count, error, row);
    sec.append(card);
    requestAnimationFrame(() => input.focus());
  }

  private buildModes(sec: HTMLElement): void {
    sec.append(el('h2', 'fe-h fe-screen-title', 'GAME MODES'));
    const list = el('div', 'fe-mode-list');
    const card = (id: string, name: string, text: string, locked: boolean, onClick: () => void) => {
      const b = button(`fe-mode${locked ? ' locked' : ''}`, '', onClick);
      b.dataset.gm = id;
      b.append(el('strong', 'fe-mode-name', name), el('span', 'fe-mode-text', text));
      if (locked) {
        b.setAttribute('aria-disabled', 'true');
        b.append(el('span', 'fe-lock', 'COMING SOON'));
      }
      list.append(b);
    };
    card(
      'tournament',
      'Tournament',
      'A knockout bracket of 4 to 16 fighters. Win every round to be champion.',
      false,
      () => this.openSelect('tournament'),
    );
    card('3v3', '3 vs 3', 'Pick three from a pool of five and tag-team against an AI team.', false, () => {
      this.pool = draftPool(
        this.o.fighters.map((f) => f.id),
        Math.random,
      );
      this.picks = [];
      this.show('team');
    });
    sec.append(list);
    const row = el('div', 'fe-row');
    row.append(button('fe-back', 'Back', () => this.show('title')));
    if (this.resume) {
      const go = this.resume;
      row.append(button('fe-go fe-resume', 'Resume tournament', go));
    }
    sec.append(row);
  }

  /** 3 vs 3: the pool of five on offer, and the player's picks (pool indices, in order). */
  private pool: string[] = [];
  private picks: number[] = [];

  private buildTeam(sec: HTMLElement): void {
    sec.append(el('h2', 'fe-h fe-screen-title', '3 VS 3 · PICK YOUR TEAM'));
    sec.append(
      el(
        'p',
        'fe-team-hint',
        'Pick three fighters, in the order they fight. In the fight, Tag swaps in your next teammate; resting fighters slowly recover. Knock out all three of theirs to win.',
      ),
    );
    const pool = el('div', 'fe-team-pool');
    this.pool.forEach((id, i) => {
      const f = this.o.fighters.find((x) => x.id === id);
      const tile = button('fe-tile', '', () => {
        const at = this.picks.indexOf(i);
        if (at >= 0) this.picks.splice(at, 1);
        else if (this.picks.length < 3) this.picks.push(i);
        this.show('team');
      });
      tile.dataset.pool = String(i);
      tile.classList.add('fe-team-tile');
      tile.dataset.fighter = id;
      if (f) tile.style.setProperty('--tile', accentColour(f.colour));
      const order = this.picks.indexOf(i);
      if (order >= 0) {
        tile.classList.add('selected');
        tile.append(el('span', 'fe-pick', String(order + 1)));
      }
      const img = document.createElement('img');
      img.className = 'fe-tile-face';
      img.alt = '';
      img.dataset.face = id;
      const url = this.portraits.get(id);
      if (url) img.src = url;
      tile.append(img, el('span', 'fe-tile-name', this.names.get(id) ?? f?.name ?? id));
      pool.append(tile);
    });
    const row = el('div', 'fe-team-row');
    row.append(el('span', '', 'YOUR TEAM'));
    for (let k = 0; k < 3; k++) {
      const slot = el('span', 'fe-team-slot');
      const id = this.picks[k] !== undefined ? this.pool[this.picks[k]!] : undefined;
      if (id) {
        const img = document.createElement('img');
        img.className = 'fe-team-face';
        img.alt = this.names.get(id) ?? id;
        const url = this.portraits.get(id);
        if (url) img.src = url;
        slot.append(img);
      }
      row.append(slot);
    }
    row.append(el('span', '', 'vs a random AI team'));
    const bar = el('div', 'fe-sel-bar');
    const chips = (
      label: string,
      key: string,
      items: readonly { id: string; name: string }[],
      get: () => string,
      set: (v: string) => void,
    ) => {
      const g = el('div', 'fe-chips');
      g.append(el('span', 'fe-chips-label', label));
      for (const it of items) {
        const b = button('fe-chip', it.name, () => {
          set(it.id);
          for (const c of g.querySelectorAll('.fe-chip')) c.classList.toggle('selected', c === b);
        });
        b.dataset[key] = it.id;
        if (it.id === get()) b.classList.add('selected');
        g.append(b);
      }
      bar.append(g);
    };
    chips(
      'Arena',
      'arena',
      this.o.arenas,
      () => this.choice.arena,
      (v) => {
        this.choice.arena = v;
      },
    );
    chips(
      'AI',
      'difficulty',
      this.o.difficulties,
      () => this.choice.difficulty,
      (v) => {
        this.choice.difficulty = v;
      },
    );
    const actions = el('div', 'fe-sel-actions');
    const fight = button('fe-go fe-fight fe-team-fight', 'FIGHT', () => {
      if (this.picks.length < 3) return;
      this.o.startTeam({
        team: this.picks.map((i) => this.pool[i]!),
        arena: this.choice.arena,
        difficulty: this.choice.difficulty,
      });
    });
    fight.disabled = this.picks.length < 3;
    actions.append(
      button('fe-back', 'Back', () => this.show('modes')),
      fight,
    );
    bar.append(actions);
    sec.append(pool, row, bar);
  }

  private buildPractice(sec: HTMLElement): void {
    sec.append(el('h2', 'fe-h fe-screen-title', 'PRACTICE'));
    const list = el('div', 'fe-mode-list');
    const card = (id: string, name: string, text: string, onClick: () => void) => {
      const b = button('fe-mode', '', onClick);
      b.dataset.practice = id;
      b.append(el('strong', 'fe-mode-name', name), el('span', 'fe-mode-text', text));
      list.append(b);
    };
    card(
      'tutorial',
      'Tutorial',
      'Learn to move, punch, combo, block, dodge and use your abilities, step by step.',
      () => this.o.startTutorial(this.choice.fighter),
    );
    card('open-zone', 'Open Zone', 'Try any fighter against the training dummy or an AI fighter, in any arena.', () =>
      this.openSelect('practice'),
    );
    sec.append(list);
    const row = el('div', 'fe-row');
    row.append(button('fe-back', 'Back', () => this.show('title')));
    sec.append(row);
  }

  private buildSelect(sec: HTMLElement): void {
    const f = this.o.fighters.find((x) => x.id === this.choice.fighter) ?? this.o.fighters[0];
    if (!f) return;
    sec.style.setProperty('--fighter', accentColour(f.colour));
    const head = el('header', 'fe-sel-head');
    head.append(el('h2', 'fe-h', this.selectFor === 'practice' ? 'OPEN ZONE' : 'SELECT YOUR FIGHTER'));
    const who = el('div', 'fe-who');
    who.append(el('span', 'fe-player-label', 'PLAYER'), el('strong', '', this.o.playerName() ?? 'Player'));
    head.append(who);

    // The information beside the fighter (owner: name and title, story and style, stats,
    // four abilities and the ultimate), updated the moment another fighter is picked.
    const info = el('div', 'fe-sel-info');
    const pres = this.o.presentation(f.id);
    info.append(el('h3', 'fe-sel-name', this.names.get(f.id) ?? f.name));
    if (pres) info.append(el('div', 'fe-sel-title', pres.title));
    if (pres) info.append(el('p', 'fe-sel-style', pres.style));
    info.append(el('p', 'fe-sel-story', f.blurb));
    const sheet = this.o.sheetFor(f.id);
    if (sheet) {
      const stats = el('div', 'fe-stats');
      for (const k of RATING_KEYS) {
        const v = Math.round(sheet.ratings[k]);
        const row = el('div', 'fe-stat');
        row.dataset.stat = k;
        const track = el('span', 'fe-stat-track');
        const fill = el('span', 'fe-stat-fill');
        fill.style.width = `${v}%`;
        track.append(fill);
        row.append(el('span', 'fe-stat-label', RATING_LABELS[k]), track, el('b', '', String(v)));
        stats.append(row);
      }
      info.append(stats);
      const abilities = el('div', 'fe-abilities');
      for (const a of sheet.abilities) {
        if (a.slot === 'combo' || a.slot === 'heavy') continue;
        const row = el('div', `fe-ab${a.slot === 'ult' ? ' fe-ult' : ''}`);
        row.dataset.ability = a.slot;
        const icon = el('span', 'fe-ab-icon');
        const svg = a.icon ? abilityIcon(a.icon) : null;
        if (svg) icon.innerHTML = svg;
        const words = el('div', 'fe-ab-words');
        const name = el('strong', 'fe-ab-name', a.name);
        if (a.slot === 'ult') name.prepend(el('span', 'fe-ab-tag', 'ULTIMATE'));
        words.append(name, el('span', 'fe-ab-desc', a.description));
        row.append(icon, words);
        abilities.append(row);
      }
      info.append(abilities);
    }

    const stage = el('div', 'fe-sel-stage');
    stage.append(el('div', 'fe-sel-glow'), this.model(f.id));

    const roster = el('div', 'fe-roster');
    for (const r of this.o.fighters) {
      const tile = button('fe-tile', '', () => {
        this.choice.fighter = r.id;
        this.show('select');
      });
      tile.dataset.fighter = r.id;
      tile.style.setProperty('--tile', accentColour(r.colour));
      if (r.id === f.id) tile.classList.add('selected');
      const img = document.createElement('img');
      img.className = 'fe-tile-face';
      img.alt = '';
      img.dataset.face = r.id;
      const url = this.portraits.get(r.id);
      if (url) img.src = url;
      tile.append(img, el('span', 'fe-tile-name', this.names.get(r.id) ?? r.name));
      roster.append(tile);
    }

    const bar = el('div', 'fe-sel-bar');
    const chips = <T extends string | number>(
      label: string,
      key: string,
      items: readonly { id: T; name: string }[],
      get: () => T,
      set: (v: T) => void,
    ) => {
      const g = el('div', 'fe-chips');
      g.append(el('span', 'fe-chips-label', label));
      for (const it of items) {
        const b = button('fe-chip', it.name, () => {
          set(it.id);
          for (const c of g.querySelectorAll('.fe-chip')) c.classList.toggle('selected', c === b);
        });
        b.dataset[key] = String(it.id);
        if (it.id === get()) b.classList.add('selected');
        g.append(b);
      }
      bar.append(g);
    };
    chips(
      'Arena',
      'arena',
      this.o.arenas.map((a) => ({ id: a.id, name: a.name })),
      () => this.choice.arena,
      (v) => {
        this.choice.arena = v;
      },
    );
    if (this.selectFor === 'practice')
      chips(
        'Opponent',
        'opponent',
        this.o.opponents.map((d) => ({ id: d.id, name: d.name })),
        () => this.choice.opponent,
        (v) => {
          this.choice.opponent = v;
        },
      );
    else
      chips(
        'Fighters',
        'size',
        TOURNAMENT_SIZES.map((n) => ({ id: n as number, name: String(n) })),
        () => this.choice.size,
        (v) => {
          this.choice.size = v;
        },
      );
    chips(
      'AI',
      'difficulty',
      this.o.difficulties.map((d) => ({ id: d.id, name: d.name })),
      () => this.choice.difficulty,
      (v) => {
        this.choice.difficulty = v;
      },
    );
    const actions = el('div', 'fe-sel-actions');
    actions.append(
      button('fe-back', 'Back', () => this.back()),
      this.selectFor === 'tournament'
        ? button('fe-go fe-fight', 'FIGHT', () => this.o.startTournament({ ...this.choice }))
        : button('fe-go fe-fight fe-enter', 'ENTER', () =>
            this.o.startPractice({
              fighter: this.choice.fighter,
              arena: this.choice.arena,
              opponent: this.choice.opponent,
              difficulty: this.choice.difficulty,
            }),
          ),
    );
    bar.append(actions);
    sec.append(head, info, stage, roster, bar);
  }

  private quit(): void {
    quitGame();
  }

  /** The fighter, large, in its select stance (or its portrait until the stance is drawn). */
  private model(id: string): HTMLElement {
    const m = el('div', 'fe-model');
    m.dataset.model = id;
    const f = this.o.fighters.find((x) => x.id === id);
    if (f) m.style.setProperty('--fighter', accentColour(f.colour));
    const strip = this.strips.get(id);
    if (strip) playStrip(m, strip);
    return m;
  }
}

/** Show a stance strip on a model box: frames stepped forwards then back, so it breathes. */
function playStrip(m: HTMLElement, s: StanceStrip): void {
  m.style.backgroundImage = `url(${s.url})`;
  m.style.backgroundSize = `${s.frames * 100}% 100%`;
  m.style.aspectRatio = `${s.cellW} / ${s.cellH}`;
  // Forward on a loop: the strip's last frame leads back into its first (see renderIdleStrips).
  m.style.animation = `fe-frames ${s.spanS}s steps(${s.frames}, jump-none) infinite`;
  m.classList.add('ready');
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function button(cls: string, text: string, onClick: () => void): HTMLButtonElement {
  const b = el('button', cls, text || undefined);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}
