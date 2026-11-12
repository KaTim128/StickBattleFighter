import { RATING_KEYS, RATING_LABELS } from '../characters/ratings';
import { abilityIcon } from './ability-icons';
import type { FighterSheet } from './fighter-sheet';

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
}

export class MainMenu {
  readonly root: HTMLDivElement;
  private choice: { fighter: string; arena: string };
  private open = false;

  constructor(
    parent: HTMLElement,
    fighters: readonly MenuFighter[],
    arenas: readonly MenuArena[],
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
    this.root.setAttribute('aria-label', 'Main menu');
    const title = document.createElement('h1');
    title.textContent = 'STICKMAN ARENA';
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
      const blurb = document.createElement('small');
      blurb.textContent = f.blurb;
      card.append(face, name, blurb);
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
    this.root.append(title, fighterLabel, fighterRow, arenaLabel, arenaRow, play, this.details);
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

    if (sheet) {
      const stats = document.createElement('div');
      stats.className = 'mm-d-stats';
      const fills: { el: HTMLElement; value: number }[] = [];
      for (const k of RATING_KEYS) {
        const value = Math.round(sheet.ratings[k]);
        const row = document.createElement('div');
        row.className = 'mm-d-stat';
        row.dataset.stat = k;
        const label = document.createElement('span');
        label.textContent = RATING_LABELS[k];
        const track = document.createElement('span');
        track.className = 'mm-d-track';
        const fill = document.createElement('span');
        fill.className = 'mm-d-fill';
        fill.dataset.value = String(value);
        track.append(fill);
        const num = document.createElement('b');
        num.textContent = String(value);
        row.append(label, track, num);
        stats.append(row);
        fills.push({ el: fill, value });
      }
      const abilities = document.createElement('div');
      abilities.className = 'mm-d-abilities';
      const heading = document.createElement('h3');
      heading.textContent = 'Abilities';
      for (const a of sheet.abilities) {
        const item = document.createElement('div');
        item.className = 'mm-d-ab';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'mm-d-ab-btn';
        btn.dataset.ability = a.slot;
        btn.setAttribute('aria-expanded', 'false');
        const icon = document.createElement('span');
        icon.className = 'mm-d-ab-icon';
        const svg = a.icon ? abilityIcon(a.icon) : null;
        if (svg) icon.innerHTML = svg;
        else icon.textContent = '✊';
        const label = document.createElement('span');
        label.className = 'mm-d-ab-name';
        label.textContent = a.name;
        const key = document.createElement('kbd');
        key.textContent = a.key;
        btn.append(icon, label, key);
        const info = document.createElement('div');
        info.className = 'mm-d-ab-info';
        info.hidden = true;
        const desc = document.createElement('p');
        desc.textContent = a.description;
        const list = document.createElement('dl');
        for (const s of a.stats) {
          const dt = document.createElement('dt');
          dt.textContent = s.label;
          const dd = document.createElement('dd');
          dd.textContent = s.value;
          list.append(dt, dd);
        }
        const how = document.createElement('p');
        how.className = 'mm-d-how';
        const strong = document.createElement('strong');
        strong.textContent = 'How to use: ';
        how.append(strong, a.howTo);
        info.append(desc, list, how);
        btn.addEventListener('click', () => {
          const open = info.hidden;
          for (const other of d.querySelectorAll<HTMLElement>('.mm-d-ab-info')) other.hidden = true;
          for (const other of d.querySelectorAll<HTMLElement>('.mm-d-ab-btn'))
            other.setAttribute('aria-expanded', 'false');
          info.hidden = !open;
          btn.setAttribute('aria-expanded', String(open));
        });
        item.append(btn, info);
        abilities.append(item);
      }
      card.append(stats, heading, abilities);
      // Fill each bar from empty to its value, smoothly and one after another.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          fills.forEach(({ el, value }, i) => {
            el.style.transitionDelay = `${i * 70}ms`;
            el.style.width = `${value}%`;
          });
        }),
      );
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

  private refresh(): void {
    for (const c of this.root.querySelectorAll<HTMLElement>('[data-fighter]'))
      c.classList.toggle('selected', c.dataset.fighter === this.choice.fighter);
    for (const c of this.root.querySelectorAll<HTMLElement>('[data-arena]'))
      c.classList.toggle('selected', c.dataset.arena === this.choice.arena);
  }
}

/**
 * Fill the whole screen on phones and tablets (owner, 12/11/2026): fullscreen without the
 * browser's bars, locked to landscape where the browser allows. Must be called from a tap.
 * Browsers that refuse (iOS Safari on iPhone) just keep the page as it is.
 */
export function enterFullscreen(): void {
  const el = document.documentElement;
  if (document.fullscreenElement || !el.requestFullscreen) return;
  el.requestFullscreen({ navigationUI: 'hide' })
    .then(() => {
      const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
      return orientation.lock?.('landscape');
    })
    .catch(() => {
      /* not allowed here (desktop, iPhone Safari, or no tap): carry on in the page */
    });
}

export function exitFullscreen(): void {
  if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
}

/** Replace a portrait frame's placeholder with the rendered image. */
export function setPortraitImage(frame: HTMLElement, url: string): void {
  const img = document.createElement('img');
  img.src = url;
  img.alt = '';
  frame.dataset.style = 'image';
  frame.replaceChildren(img);
}
