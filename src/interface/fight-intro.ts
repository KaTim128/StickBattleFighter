/**
 * READY... FIGHT! (owner, 12/11/2026): the cinematic text before every fight. Bold, slanted
 * fighting-game lettering with a metallic face, deep bevelled edges, a light sweep and a glow;
 * READY slides in heavy and steady; FIGHT! slams down from the screen with a flash, a shockwave,
 * speed lines and a shake, then bursts away. Presentation only: the scene's intro timeline drives it.
 */
export class FightIntro {
  private readonly root: HTMLDivElement;
  private readonly ready: HTMLDivElement;
  private readonly fight: HTMLDivElement;
  private shown: 'none' | 'lead-in' | 'ready' | 'fight' = 'none';

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'fight-intro';
    this.root.hidden = true;
    this.root.setAttribute('aria-live', 'assertive');
    this.root.innerHTML = `
      <div class="fi-vignette"></div>
      <div class="fi-lines"></div>
      <div class="fi-ring"></div>
      <div class="fi-flash"></div>
      <div class="fi-word fi-ready" data-text="READY..."><span class="fi-face fi-face-ready">READY...</span></div>
      <div class="fi-word fi-fight" data-text="FIGHT!"><span class="fi-face fi-face-fight">FIGHT!</span></div>`;
    this.ready = this.root.querySelector('.fi-ready')!;
    this.fight = this.root.querySelector('.fi-fight')!;
    parent.appendChild(this.root);
  }

  /**
   * Follow the scene's intro. Returns the phase that just began (so the caller can fire the voice
   * and impact sound on the same frame), or null.
   */
  update(state: { phase: 'lead-in' | 'ready' | 'fight' } | null): 'lead-in' | 'ready' | 'fight' | 'done' | null {
    const next = state?.phase ?? 'none';
    if (next === this.shown) return null;
    const was = this.shown;
    this.shown = next;
    if (next === 'none') {
      // FIGHT bursts away; the overlay hides once its exit animation has played.
      this.root.classList.add('fi-out');
      window.setTimeout(() => {
        if (this.shown === 'none') {
          this.root.hidden = true;
          this.root.className = 'fight-intro';
        }
      }, 700);
      return was === 'none' ? null : 'done';
    }
    this.root.hidden = false;
    this.root.className = `fight-intro fi-${next}`;
    // Restart the word's animation each time it is shown.
    for (const el of [this.ready, this.fight]) {
      el.style.animation = 'none';
      void el.offsetWidth;
      el.style.animation = '';
    }
    return next;
  }
}
