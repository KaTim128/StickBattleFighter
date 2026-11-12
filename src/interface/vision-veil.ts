/**
 * Lights out (owner, 12/11/2026, Shroud's Hunting Frenzy). Purely presentation; the game state
 * comes from the scene.
 * - The player in the dark: everything goes almost black except a small circle round their own
 *   fighter, which follows them; it fades back in over the last half second.
 * - The player as Shroud: they see in the dark like night vision (a cold green, grainy, slightly
 *   washed-out view with a soft vignette); nothing is hidden from them.
 */
export class VisionVeil {
  private readonly dark: HTMLDivElement;
  private readonly night: HTMLDivElement;
  private nightShown = -1;

  constructor(parent: HTMLElement) {
    this.dark = document.createElement('div');
    this.dark.className = 'dark-veil';
    this.night = document.createElement('div');
    this.night.className = 'night-vision';
    for (const el of [this.dark, this.night]) {
      el.setAttribute('aria-hidden', 'true');
      parent.appendChild(el);
    }
  }

  /**
   * @param darkS seconds of darkness left on the player (0 = none)
   * @param at the player's position on screen, CSS pixels
   * @param radiusPx how far they can see, in CSS pixels
   * @param nightS seconds of the player's own night vision left (0 = none)
   */
  update(darkS: number, at: { x: number; y: number } | null, radiusPx: number, nightS: number): void {
    const level = Math.min(1, darkS / 0.5);
    this.dark.classList.toggle('on', level > 0 && at !== null);
    if (level > 0 && at) {
      this.dark.style.opacity = level.toFixed(2);
      this.dark.style.setProperty('--x', `${at.x.toFixed(0)}px`);
      this.dark.style.setProperty('--y', `${at.y.toFixed(0)}px`);
      this.dark.style.setProperty('--r', `${radiusPx.toFixed(0)}px`);
    }
    const night = Math.round(Math.min(1, nightS / 0.4) * 20) / 20;
    if (night === this.nightShown) return;
    this.nightShown = night;
    this.night.style.opacity = String(night);
    this.night.classList.toggle('on', night > 0);
  }
}
