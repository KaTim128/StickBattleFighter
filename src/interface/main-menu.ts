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
      card.addEventListener('click', () => {
        this.choice.fighter = f.id;
        this.refresh();
      });
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
    this.root.append(title, fighterLabel, fighterRow, arenaLabel, arenaRow, play);
    parent.appendChild(this.root);
    this.refresh();
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
