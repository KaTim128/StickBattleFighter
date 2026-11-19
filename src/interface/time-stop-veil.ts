/**
 * The screen during Chronos's Time Stop: the arena drains to a washed-out blue and gold, and when time resumes a gold flash
 * flares and fades. Presentation only; the scene decides when time is stopped.
 */
export class TimeStopVeil {
  private readonly el: HTMLDivElement;
  private on = false;
  private flash = -1;

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'time-stop-veil';
    this.el.setAttribute('aria-hidden', 'true');
    parent.appendChild(this.el);
  }

  /** `active`: time is stopped; `resumeS`: seconds since it resumed (large = long ago). */
  update(active: boolean, resumeS: number): void {
    if (active !== this.on) {
      this.on = active;
      this.el.classList.toggle('stopped', active);
    }
    const flare = active ? 0 : Math.max(0, 1 - resumeS / 0.6);
    const level = Math.round(flare * 20) / 20;
    if (level === this.flash) return;
    this.flash = level;
    this.el.style.setProperty('--flare', String(level));
  }
}
