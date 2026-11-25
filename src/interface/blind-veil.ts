/**
 * Blinded (owner, 12/11/2026, Necro's Soul Drain): while the player is blinded their view closes
 * in, a dark violet veil leaving only a small window round the middle of the screen, and opens
 * again in its last half second. Purely presentation; the game state comes from the scene.
 */
export class BlindVeil {
  private readonly el: HTMLDivElement;
  private shown = -1;

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'blind-veil';
    this.el.setAttribute('aria-hidden', 'true');
    parent.appendChild(this.el);
  }

  /** Seconds of blindness left (0 = clear). Cheap: the DOM is touched only when the level changes. */
  update(blindS: number): void {
    const level = Math.round(Math.min(1, blindS / 0.5) * 20) / 20;
    if (level === this.shown) return;
    this.shown = level;
    this.el.style.opacity = String(level);
    this.el.classList.toggle('on', level > 0);
  }
}

/**
 * Ink Dragon's burst (owner, 25/11/2026): a black ink splat covers the CENTRE of the screen for its short duration, the edges still
 * showing; it thins out over the last 0.3 s and disappears by itself. Presentation only.
 */
export class InkSplatVeil {
  private readonly el: HTMLDivElement;
  private shown = -1;

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'ink-splat-veil';
    this.el.setAttribute('aria-hidden', 'true');
    parent.appendChild(this.el);
  }

  /** Seconds of ink left (0 = clear). Cheap: the DOM is touched only when the level changes. */
  update(splatS: number): void {
    const level = Math.round(Math.min(1, splatS / 0.3) * 20) / 20;
    if (level === this.shown) return;
    this.shown = level;
    this.el.style.opacity = String(level);
    this.el.classList.toggle('on', level > 0);
  }
}

/**
 * Hypnosis (Psion, owner 25/11/2026): when the trance takes hold a white spiral swirls out across the whole view and clears as the copy
 * steps out and control passes to it; a small banner then counts down the seconds the copy has left. Presentation only.
 */
export class HypnosisVeil {
  private readonly spiral: HTMLDivElement;
  private readonly banner: HTMLDivElement;
  private shown = '';

  constructor(parent: HTMLElement) {
    this.spiral = document.createElement('div');
    this.spiral.className = 'hypno-veil';
    this.spiral.setAttribute('aria-hidden', 'true');
    this.banner = document.createElement('div');
    this.banner.className = 'hypno-banner';
    this.banner.setAttribute('aria-hidden', 'true');
    parent.append(this.spiral, this.banner);
  }

  /** The scene's hypnosis (null: none). `mine` is true when it is the viewer's own side that was hypnotised into the copy. */
  update(h: { phase: 'form' | 'live'; leftS: number; totalS: number; formK: number } | null, mine: boolean): void {
    const spiral = h && h.phase === 'form' ? Math.round((1 - h.formK) * 20) / 20 : 0;
    const banner = h && mine ? `${Math.ceil(h.leftS)}` : '';
    const key = `${spiral}|${banner}`;
    if (key === this.shown) return;
    this.shown = key;
    this.spiral.style.opacity = String(spiral * 0.85);
    this.spiral.style.setProperty('--turn', `${(h?.formK ?? 0) * 360}deg`);
    this.spiral.classList.toggle('on', spiral > 0);
    this.banner.textContent = banner ? `HYPNOSIS ${banner}s` : '';
    this.banner.classList.toggle('on', banner !== '');
  }
}
