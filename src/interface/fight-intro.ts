import type { IntroPhase } from '../app/scenes/fight-arena-scene';

/**
 * The fight countdown (owner, 13/11/2026: "3, 2, 1, FIGHT", no READY). Each number punches in as
 * the supplied voice says it; FIGHT slams down with a flash, a shockwave and speed lines, then
 * bursts away. Only transforms and opacity animate (no blurs or animated filters), so it stays
 * smooth on phones. Presentation only: the scene's intro timeline drives it.
 */
export class FightIntro {
  private readonly root: HTMLDivElement;
  private readonly num: HTMLDivElement;
  private readonly numFace: HTMLSpanElement;
  private readonly fight: HTMLDivElement;
  private shown: IntroPhase | 'none' = 'none';

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
      <div class="fi-word fi-num" data-text="3"><span class="fi-face fi-face-num">3</span></div>
      <div class="fi-word fi-fight" data-text="FIGHT!"><span class="fi-face fi-face-fight">FIGHT!</span></div>`;
    this.num = this.root.querySelector('.fi-num')!;
    this.numFace = this.root.querySelector('.fi-face-num')!;
    this.fight = this.root.querySelector('.fi-fight')!;
    parent.appendChild(this.root);
  }

  /**
   * Follow the scene's intro. Returns the phase that just began (so the caller can start the voice
   * on the same frame), 'done' when it has finished, or null.
   */
  update(state: { phase: IntroPhase } | null): IntroPhase | 'done' | null {
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
      }, 600);
      return was === 'none' ? null : 'done';
    }
    this.root.hidden = false;
    const digit = next === 'three' ? '3' : next === 'two' ? '2' : next === 'one' ? '1' : null;
    this.root.className = `fight-intro fi-${digit ? 'count' : next}`;
    if (digit) {
      this.num.dataset.text = digit;
      this.numFace.textContent = digit;
    }
    // Restart the word's animation each time it is shown.
    for (const el of [this.num, this.fight]) {
      el.style.animation = 'none';
      void el.offsetWidth;
      el.style.animation = '';
    }
    return next;
  }
}
