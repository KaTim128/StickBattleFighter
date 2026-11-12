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
