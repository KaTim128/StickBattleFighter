import { accentColour } from './accent-colour';
import { type FighterConfigHost, renderConfigPanel } from './fighter-config';
import { buildFighterInfo } from './fighter-info';
import type { FighterSheet } from './fighter-sheet';
import { topWindow } from './quit-game';

/**
 * Main menu (owner, 12/11/2026: "the settings also has a button to leave game"): the screen the
 * Leave game button returns to, and the first screen on a fresh visit. Pick a fighter and an
 * arena, then Play. Original design; menu owner (src/interface).
 */
export interface MenuFighter {
  readonly id: string;
  readonly name: string;
  readonly blurb: string;
  /** Portrait look for the card. */
  readonly portrait: 'flame' | 'brute' | 'round';
  readonly colour: string;
}

export interface MenuArena {
  readonly id: string;
  readonly name: string;
}

export interface MenuChoice {
  readonly fighter: string;
  readonly arena: string;
  /** Who the player fights (owner, 13/11/2026): the training dummy by default, or an AI fighter. */
  readonly opponent: string;
  /** How hard an AI opponent plays (REQ-AI-4). */
  readonly difficulty: string;
  /** Game mode (owner, 13/11/2026): practice against one opponent, or a knockout tournament. */
  readonly mode: 'practice' | 'tournament';
  /** Tournament size (fighters). */
  readonly size: number;
}

/** Tournament sizes offered (the bracket supports more; owner: up to 16 for now). */
export const TOURNAMENT_SIZES = [4, 8, 16] as const;

/** An opponent the menu offers: the training dummy or a playable fighter run by the AI. */
export interface MenuOpponent {
  readonly id: string;
  readonly name: string;
}

export class MainMenu {
  readonly root: HTMLDivElement;
  private choice: {
    fighter: string;
    arena: string;
    opponent: string;
    difficulty: string;
    mode: 'practice' | 'tournament';
    size: number;
  };
  private readonly opponentBlock: HTMLElement[] = [];
  private readonly sizeBlock: HTMLElement[] = [];
  private resumeButton: HTMLButtonElement | null = null;
  /** Admin fighter settings (owner, 13/11/2026); null hides the settings buttons. */
  private configHost: FighterConfigHost | null = null;

  setConfigHost(host: FighterConfigHost | null): void {
    this.configHost = host;
  }

  /** Show a fighter's (possibly edited) name on its card. */
  setFighterName(id: string, name: string): void {
    const el = this.root.querySelector<HTMLElement>(`[data-fighter="${id}"] strong`);
    if (el) el.textContent = name;
  }
  private open = false;

  constructor(
    parent: HTMLElement,
    fighters: readonly MenuFighter[],
    arenas: readonly MenuArena[],
    opponents: readonly MenuOpponent[],
    difficulties: readonly MenuOpponent[],
    current: MenuChoice,
    private readonly onPlay: (choice: MenuChoice) => void,
    private readonly onOpenChange: (open: boolean) => void,
    /** The fighter details screen's data (stats and abilities), built for the current device and keys. */
    private readonly sheetFor: (fighterId: string) => FighterSheet | null = () => null,
  ) {
    this.choice = { ...current };
    this.root = document.createElement('div');
    this.root.className = 'main-menu';
    this.root.hidden = true;
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-label', 'Admin panel');
    const title = document.createElement('h1');
    // The Admin Panel (owner, 13/11/2026): every set-up and test tool, for the admin name only.
    title.textContent = 'ADMIN PANEL';
    const fighterLabel = document.createElement('h2');
    fighterLabel.textContent = 'Choose your fighter';
    const fighterRow = document.createElement('div');
    fighterRow.className = 'mm-fighters';
    for (const f of fighters) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'mm-card';
      card.dataset.fighter = f.id;
      const face = document.createElement('span');
      face.className = 'mm-portrait th-portrait';
      face.dataset.style = f.portrait;
      face.style.setProperty('--fighter', f.colour);
      face.appendChild(document.createElement('span'));
      const name = document.createElement('strong');
      name.textContent = f.name;
      // Cards show the portrait and name only (owner, 13/11/2026); the story is in the details.
      card.append(face, name);
      // A card opens the fighter's details (owner, 12/11/2026); Select there picks the fighter.
      card.addEventListener('click', () => this.openDetails(f));
      fighterRow.appendChild(card);
    }
    const arenaLabel = document.createElement('h2');
    arenaLabel.textContent = 'Arena';
    const arenaRow = document.createElement('div');
    arenaRow.className = 'mm-arenas';
    for (const a of arenas) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'mm-arena';
      b.dataset.arena = a.id;
      b.textContent = a.name;
      b.addEventListener('click', () => {
        this.choice.arena = a.id;
        this.refresh();
      });
      arenaRow.appendChild(b);
    }
    // Opponent (owner, 13/11/2026): the training dummy by default, or any fighter played by the AI.
    const opponentLabel = document.createElement('h2');
    opponentLabel.textContent = 'Opponent';
    const opponentRow = document.createElement('div');
    opponentRow.className = 'mm-arenas mm-opponents';
    for (const o of opponents) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'mm-arena mm-opponent';
      b.dataset.opponent = o.id;
      b.textContent = o.name;
      b.addEventListener('click', () => {
        this.choice.opponent = o.id;
        this.refresh();
      });
      opponentRow.appendChild(b);
    }
    // Game modes (owner, 13/11/2026: "Add a new Tournament option to the existing Game Modes list").
    const modeLabel = document.createElement('h2');
    modeLabel.textContent = 'Game mode';
    const modeRow = document.createElement('div');
    modeRow.className = 'mm-arenas mm-opponents';
    for (const [id, name] of [
      ['practice', 'Practice'],
      ['tournament', 'Tournament'],
    ] as const) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'mm-arena';
      b.dataset.mode = id;
      b.textContent = name;
      b.addEventListener('click', () => {
        this.choice.mode = id;
        this.refresh();
      });
      modeRow.appendChild(b);
    }
    const sizeLabel = document.createElement('h2');
    sizeLabel.textContent = 'Tournament size';
    const sizeRow = document.createElement('div');
    sizeRow.className = 'mm-arenas mm-opponents';
    for (const n of TOURNAMENT_SIZES) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'mm-arena';
      b.dataset.size = String(n);
      b.textContent = `${n} fighters`;
      b.addEventListener('click', () => {
        this.choice.size = n;
        this.refresh();
      });
      sizeRow.appendChild(b);
    }
    this.opponentBlock.push(opponentLabel, opponentRow);
    this.sizeBlock.push(sizeLabel, sizeRow);
    const difficultyLabel = document.createElement('h2');
    difficultyLabel.textContent = 'AI difficulty';
    const difficultyRow = document.createElement('div');
    difficultyRow.className = 'mm-arenas mm-opponents';
    for (const d of difficulties) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'mm-arena';
      b.dataset.difficulty = d.id;
      b.textContent = d.name;
      b.addEventListener('click', () => {
        this.choice.difficulty = d.id;
        this.refresh();
      });
      difficultyRow.appendChild(b);
    }
    const play = document.createElement('button');
    play.type = 'button';
    play.className = 'mm-play';
    play.textContent = 'PLAY';
    play.addEventListener('click', () => this.onPlay({ ...this.choice }));
    this.details = document.createElement('div');
    this.details.className = 'mm-details';
    this.details.hidden = true;
    this.details.setAttribute('role', 'dialog');
    this.details.setAttribute('aria-label', 'Fighter details');
    // Landscape layout (owner, 13/11/2026): fighters on the left, the match settings on the right,
    // Play along the bottom, all on one screen.
    title.className = 'mm-title';
    const left = document.createElement('div');
    left.className = 'mm-col mm-col-left';
    left.append(fighterLabel, fighterRow);
    const right = document.createElement('div');
    right.className = 'mm-col mm-col-right';
    right.append(
      arenaLabel,
      arenaRow,
      modeLabel,
      modeRow,
      opponentLabel,
      opponentRow,
      sizeLabel,
      sizeRow,
      difficultyLabel,
      difficultyRow,
    );
    const bottom = document.createElement('div');
    bottom.className = 'mm-bottom';
    bottom.append(play);
    this.root.append(title, left, right, bottom, this.details);
    parent.appendChild(this.root);
    window.addEventListener(
      'keydown',
      (e) => {
        if (e.code === 'Escape' && !this.details.hidden && this.open) {
          e.stopPropagation();
          this.closeDetails();
        }
      },
      true,
    );
    this.refresh();
  }

  private readonly details: HTMLDivElement;

  /**
   * The fighter details screen (owner, 12/11/2026): portrait, name and story; the six stat bars,
   * each filling smoothly from left to right to its value; every ability (and the basic combo) as a
   * button that opens its description, numbers and how to use it on this device; Select or Back.
   */
  openDetails(f: MenuFighter): void {
    const sheet = this.sheetFor(f.id);
    const d = this.details;
    d.replaceChildren();
    const card = document.createElement('div');
    card.className = 'mm-d-card';
    // The bars and highlights take the fighter's own colour (owner, 12/11/2026: Necro purple).
    card.style.setProperty('--fighter', accentColour(f.colour));
    const head = document.createElement('div');
    head.className = 'mm-d-head';
    const face = this.root.querySelector<HTMLElement>(`[data-fighter="${f.id}"] .mm-portrait`)?.cloneNode(true);
    const name = document.createElement('h2');
    name.textContent = f.name;
    const blurb = document.createElement('p');
    blurb.textContent = f.blurb;
    const words = document.createElement('div');
    words.append(name, blurb);
    if (face) head.append(face);
    head.append(words);
    card.append(head);
    // Admin fighter settings: edit this fighter here, without leaving its page (owner, 13/11/2026).
    const host = this.configHost;
    const content: HTMLElement[] = [];
    const openConfig = (tab: 'appearance' | 'moves'): void => {
      if (!host) return;
      for (const el of content) el.hidden = true;
      const panel = renderConfigPanel(host, f.id, tab, (saved) => {
        panel.remove();
        if (saved) this.openDetails({ ...f, name: this.cardName(f.id) ?? f.name });
        else for (const el of content) el.hidden = false;
      });
      head.after(panel);
    };
    if (host) {
      const gear = document.createElement('button');
      gear.type = 'button';
      gear.className = 'mm-d-config';
      gear.textContent = '⚙ Fighter settings';
      gear.addEventListener('click', () => openConfig('appearance'));
      head.append(gear);
    }

    if (sheet) {
      const info = buildFighterInfo(sheet);
      if (host) {
        const moveConfig = document.createElement('button');
        moveConfig.type = 'button';
        moveConfig.className = 'mm-d-moveconfig';
        moveConfig.textContent = 'Move Config';
        moveConfig.addEventListener('click', () => openConfig('moves'));
        info.heading.append(moveConfig);
      }
      card.append(info.stats, info.heading, info.abilities);
      content.push(info.stats, info.heading, info.abilities);
      info.animate();
    }

    const actions = document.createElement('div');
    actions.className = 'mm-d-actions';
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'mm-d-back';
    back.textContent = 'Back';
    back.addEventListener('click', () => this.closeDetails());
    const select = document.createElement('button');
    select.type = 'button';
    select.className = 'mm-d-select';
    select.textContent = 'Select';
    select.addEventListener('click', () => {
      this.choice.fighter = f.id;
      this.refresh();
      this.closeDetails();
    });
    actions.append(back, select);
    card.append(actions);
    d.append(card);
    d.hidden = false;
  }

  closeDetails(): void {
    this.details.hidden = true;
    this.details.replaceChildren();
  }

  /** Show a fighter's rendered portrait on its card (the fighter's own face, not an icon). */
  setPortrait(fighterId: string, url: string): void {
    const face = this.root.querySelector<HTMLElement>(`[data-fighter="${fighterId}"] .mm-portrait`);
    if (face) setPortraitImage(face, url);
  }

  get isOpen(): boolean {
    return this.open;
  }

  setOpen(open: boolean): void {
    if (open === this.open) return;
    this.open = open;
    this.root.hidden = !open;
    this.onOpenChange(open);
  }

  /** A Back button to the title screen. */
  setBack(onBack: () => void): void {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mm-arena mm-back';
    b.textContent = 'Back';
    b.addEventListener('click', onBack);
    this.root.querySelector('.mm-play')?.before(b);
  }

  /** Offer to resume a tournament in progress (or remove the offer with null). */
  setResume(label: string | null, onResume: () => void): void {
    this.resumeButton?.remove();
    this.resumeButton = null;
    if (!label) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mm-arena mm-resume';
    b.textContent = label;
    b.addEventListener('click', onResume);
    this.root.querySelector('.mm-play')?.after(b);
    this.resumeButton = b;
  }

  private cardName(id: string): string | undefined {
    return this.root.querySelector<HTMLElement>(`[data-fighter="${id}"] strong`)?.textContent ?? undefined;
  }

  private refresh(): void {
    for (const c of this.root.querySelectorAll<HTMLElement>('[data-fighter]'))
      c.classList.toggle('selected', c.dataset.fighter === this.choice.fighter);
    for (const c of this.root.querySelectorAll<HTMLElement>('[data-arena]'))
      c.classList.toggle('selected', c.dataset.arena === this.choice.arena);
    for (const c of this.root.querySelectorAll<HTMLElement>('[data-opponent]'))
      c.classList.toggle('selected', c.dataset.opponent === this.choice.opponent);
    for (const c of this.root.querySelectorAll<HTMLElement>('[data-difficulty]'))
      c.classList.toggle('selected', c.dataset.difficulty === this.choice.difficulty);
    for (const c of this.root.querySelectorAll<HTMLElement>('[data-mode]'))
      c.classList.toggle('selected', c.dataset.mode === this.choice.mode);
    for (const c of this.root.querySelectorAll<HTMLElement>('[data-size]'))
      c.classList.toggle('selected', c.dataset.size === String(this.choice.size));
    // A tournament draws its own opponents; practice picks one.
    for (const e of this.opponentBlock) e.hidden = this.choice.mode === 'tournament';
    for (const e of this.sizeBlock) e.hidden = this.choice.mode !== 'tournament';
  }
}

/**
 * The whole game in fullscreen, on every device (owner, 13/11/2026: "fullscreen throughout the
 * entire game, from the main menu; only Quit Game leaves it"): without the browser's bars, locked
 * to landscape where the browser allows. Browsers grant fullscreen only from a tap, click or key
 * press, so `keepFullscreen` asks on the very first one (on the title screen) and again on any
 * later one if it was lost (Escape on a desktop always leaves it: the browser's own rule). Browsers
 * that refuse (iPhone Safari) keep the page as it is: there the game can be added to the home
 * screen, where it opens full screen (the web app manifest).
 */
/**
 * The document that holds fullscreen: the outer shell when the game runs inside it (owner,
 * 13/11/2026: fullscreen must survive every mode change; each fight is its own page, and a page
 * change only ends fullscreen for the page being left, never for the shell around it).
 */
function screenDoc(): Document {
  return topWindow().document;
}

export function enterFullscreen(): void {
  const top = topWindow();
  const doc = top.document;
  const el = doc.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void };
  const lock = () => {
    const orientation = top.screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    return orientation?.lock?.('landscape');
  };
  if (doc.fullscreenElement) {
    void Promise.resolve(lock()).catch(() => {});
    return;
  }
  try {
    if (el.requestFullscreen)
      el.requestFullscreen({ navigationUI: 'hide' })
        .then(lock)
        .catch(() => {
          /* not allowed here (desktop, or no tap): carry on in the page */
        });
    else el.webkitRequestFullscreen?.();
  } catch {
    /* not allowed here: carry on in the page */
  }
}

export function exitFullscreen(): void {
  const doc = screenDoc();
  if (doc.fullscreenElement) void doc.exitFullscreen().catch(() => {});
}

/** Whether the game fills the screen right now (in the shell or in its own page). */
export function isFullscreen(): boolean {
  return screenDoc().fullscreenElement !== null;
}

/** On any device: ask for the whole screen on every tap, click or key press until it is granted. */
export function keepFullscreen(): void {
  const ask = (e: Event): void => {
    if (isFullscreen()) return;
    if (e instanceof KeyboardEvent && e.key === 'Escape') return; // the browser's way out
    enterFullscreen();
  };
  window.addEventListener('pointerup', ask, { passive: true });
  window.addEventListener('touchend', ask, { passive: true });
  window.addEventListener('keydown', ask, { passive: true });
}

/** Replace a portrait frame's placeholder with the rendered image. */
export function setPortraitImage(frame: HTMLElement, url: string): void {
  const img = document.createElement('img');
  img.src = url;
  img.alt = '';
  frame.dataset.style = 'image';
  frame.replaceChildren(img);
}
