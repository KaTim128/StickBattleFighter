/**
 * Whether the screen should go dark (Hunting Frenzy, master plan B10): the fighter someone is playing
 * is in the dark, but spectators of a watched AI battle are not affected.
 */
/**
 * What the screen shows of a fighter's sight afflictions (owner, 21/11/2026: blinds such as Necro's Soul Drain, Shroud's
 * Hunting Frenzy darkness, Vexoris's fog, and any future one, never work on spectators). Every view effect is read through
 * this one function, so a spectator of a watched AI battle (the fighter is AI-played) always sees clearly.
 */
export function viewAfflictions<
  T extends { blindS: number; splatS?: number; darkS: number; fogS: number; nightVisionS: number },
>(p: T, spectating: boolean): T {
  return spectating
    ? { ...p, blindS: 0, ...(p.splatS === undefined ? {} : { splatS: 0 }), darkS: 0, fogS: 0, nightVisionS: 0 }
    : p;
}

export function inTheDark(darkS: number, spectating: boolean): boolean {
  return darkS > 0 && !spectating;
}

/**
 * Lights out (owner, 12/11/2026, Shroud's Hunting Frenzy). Purely presentation; the game state
 * comes from the scene.
 * - The player in the dark: the whole arena goes almost black except the space right round their own
 *   fighter, which follows them; it fades back in over the last half second (B10: 1 m, 4 s; nobody
 *   merely watching a battle is affected).
 * - The player as Shroud: they see in the dark like night vision (a cold green, grainy, slightly
 *   washed-out view with a soft vignette); nothing is hidden from them.
 */
export class VisionVeil {
  private readonly dark: HTMLDivElement;
  private readonly night: HTMLDivElement;
  private nightShown = -1;
  private readonly fog: HTMLDivElement;

  constructor(parent: HTMLElement) {
    this.dark = document.createElement('div');
    this.dark.className = 'dark-veil';
    this.night = document.createElement('div');
    this.night.className = 'night-vision';
    this.fog = document.createElement('div');
    this.fog.className = 'fog-veil';
    for (const el of [this.dark, this.night, this.fog]) {
      el.setAttribute('aria-hidden', 'true');
      parent.appendChild(el);
    }
  }

  /**
   * Poison fog on the player (Vexoris's Plague Bloom): a thick green haze closes in, clear only in a small circle
   * round their own fighter. Fades in and out with `fogS` (renewed every step they stand in it).
   */
  updateFog(fogS: number, at: { x: number; y: number } | null, radiusPx: number): void {
    const level = Math.min(1, fogS / 0.35);
    this.fog.classList.toggle('on', level > 0 && at !== null);
    if (level > 0 && at) {
      this.fog.style.opacity = level.toFixed(2);
      this.fog.style.setProperty('--x', `${at.x.toFixed(0)}px`);
      this.fog.style.setProperty('--y', `${at.y.toFixed(0)}px`);
      this.fog.style.setProperty('--r', `${radiusPx.toFixed(0)}px`);
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
