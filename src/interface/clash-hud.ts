/**
 * Punch Clash HUD (owner request 11/11/2026): both fighters' Clash Power in
 * real time as a tug-of-war bar with numbers, the countdown, a "mash" prompt
 * for the player's device, a red-hot final stretch, and the result banner.
 * Read-only: it never changes gameplay.
 */
export interface ClashHudInput {
  readonly state: {
    readonly phase: 'intro' | 'mash' | 'done';
    readonly remainingS: number;
    readonly powerA: number;
    readonly powerB: number;
    readonly final: boolean;
    readonly intensity: number;
  } | null;
  readonly banner: { readonly text: string; readonly ageS: number } | null;
}

export class ClashHud {
  private readonly root: HTMLElement;
  private readonly fill: HTMLElement;
  private readonly a: HTMLElement;
  private readonly b: HTMLElement;
  private readonly timer: HTMLElement;
  private readonly prompt: HTMLElement;
  private readonly banner: HTMLElement;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'clash-hud';
    this.root.hidden = true;
    this.root.innerHTML = `
      <div class="clash-title">PUNCH CLASH</div>
      <div class="clash-row">
        <span class="clash-power clash-a">0</span>
        <div class="clash-bar"><div class="clash-fill"></div></div>
        <span class="clash-power clash-b">0</span>
      </div>
      <div class="clash-timer">4.0</div>
      <div class="clash-prompt"></div>`;
    parent.appendChild(this.root);
    this.banner = document.createElement('div');
    this.banner.className = 'clash-banner';
    this.banner.hidden = true;
    parent.appendChild(this.banner);
    this.fill = this.root.querySelector('.clash-fill')!;
    this.a = this.root.querySelector('.clash-a')!;
    this.b = this.root.querySelector('.clash-b')!;
    this.timer = this.root.querySelector('.clash-timer')!;
    this.prompt = this.root.querySelector('.clash-prompt')!;
  }

  update(input: ClashHudInput): void {
    const s = input.state;
    this.root.hidden = s === null;
    if (s) {
      const total = s.powerA + s.powerB;
      const share = total > 0 ? s.powerA / total : 0.5;
      this.fill.style.width = `${(share * 100).toFixed(1)}%`;
      this.setText(this.a, String(s.powerA));
      this.setText(this.b, String(s.powerB));
      this.setText(this.timer, s.phase === 'intro' ? 'READY…' : s.remainingS.toFixed(1));
      const touch = document.body.classList.contains('touch-mode');
      this.setText(this.prompt, s.phase === 'intro' ? 'GET READY' : touch ? 'TAP MELEE FAST!' : 'MASH J / CLICK!');
      this.root.classList.toggle('final', s.final);
      this.root.style.setProperty('--intensity', s.intensity.toFixed(2));
    }
    const b = input.banner;
    this.banner.hidden = b === null;
    if (b) {
      this.setText(this.banner, b.text);
      this.banner.dataset.kind = b.text === 'STALEMATE!' ? 'tie' : b.text === 'CLASH WON!' ? 'win' : 'lose';
    }
  }

  private setText(el: HTMLElement, text: string): void {
    if (el.textContent !== text) el.textContent = text;
  }
}
