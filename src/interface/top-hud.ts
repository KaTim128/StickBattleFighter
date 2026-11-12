import { accentColour } from './accent-colour';

/**
 * Top HUD (PRS-10, owner-adopted presentation targets): both fighters at a glance across the top
 * of the screen: portrait, name, health and stamina bars, status chips (PRS-6), a match timer
 * in the middle and the name of the player's last action. Original design.
 *
 * Look (owner, 12/11/2026, styled after a reference image of an arcade fighter's HUD, not copied):
 * slanted, framed bars with glossy fills, a tick scale and a red damage trail; bold italic names
 * and a big italic timer on a slanted plate; slanted portrait frames; each side in its fighter's
 * colour.
 */
export interface HudFighter {
  readonly name: string;
  readonly hp: number;
  readonly maxHp: number;
  readonly stamina: number;
  readonly maxStamina: number;
  /** Status chips: 'burning', 'stunned', 'guarding', 'down', 'ko'. */
  readonly status: readonly string[];
  /** Portrait style: a living flame or a plain head, in the fighter's colour. */
  readonly portrait: 'flame' | 'brute' | 'round';
  readonly colour: string;
}

export interface TopHudState {
  readonly left: HudFighter;
  readonly right: HudFighter;
  readonly timerS: number;
  readonly lastAction: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  burning: 'BURNING',
  stunned: 'STUNNED',
  guarding: 'GUARD',
  down: 'DOWN',
  ko: 'KO',
};

/** mm:ss for the match timer. */
export function formatTimer(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

class Side {
  readonly root: HTMLDivElement;
  private readonly portrait: HTMLDivElement;
  private readonly name: HTMLDivElement;
  private readonly hp: HTMLDivElement;
  private readonly hpLag: HTMLDivElement;
  private readonly st: HTMLDivElement;
  private readonly status: HTMLDivElement;
  private shown = '';
  private lag = 1;

  constructor(cls: string) {
    this.root = document.createElement('div');
    this.root.className = `th-side ${cls}`;
    this.root.innerHTML = `
      <div class="th-portrait"><span></span></div>
      <div class="th-info">
        <div class="th-name"></div>
        <div class="th-bar th-hp"><div class="th-lag"></div><div class="th-fill"></div></div>
        <div class="th-bar th-st"><div class="th-fill"></div></div>
        <div class="th-status"></div>
      </div>`;
    this.portrait = this.root.querySelector('.th-portrait')!;
    this.name = this.root.querySelector('.th-name')!;
    this.hp = this.root.querySelector('.th-hp .th-fill')!;
    this.hpLag = this.root.querySelector('.th-hp .th-lag')!;
    this.st = this.root.querySelector('.th-st .th-fill')!;
    this.status = this.root.querySelector('.th-status')!;
  }

  private hasImage = false;

  /** The fighter's own rendered face. */
  setPortrait(url: string): void {
    const img = document.createElement('img');
    img.src = url;
    img.alt = '';
    this.portrait.dataset.style = 'image';
    this.portrait.replaceChildren(img);
    this.hasImage = true;
  }

  update(f: HudFighter): void {
    const hp = Math.max(0, Math.min(1, f.hp / f.maxHp));
    // The red "lost health" shadow catches up a moment after a hit, so the damage reads.
    this.lag = Math.max(hp, this.lag - 0.012);
    if (hp > this.lag) this.lag = hp;
    this.hp.style.width = `${hp * 100}%`;
    this.hpLag.style.width = `${this.lag * 100}%`;
    this.st.style.width = `${Math.max(0, Math.min(1, f.stamina / f.maxStamina)) * 100}%`;
    const key = `${f.name}|${f.portrait}|${f.colour}|${f.status.join(',')}`;
    if (key === this.shown) return;
    this.shown = key;
    this.name.textContent = f.name;
    if (!this.hasImage) this.portrait.dataset.style = f.portrait;
    this.portrait.style.setProperty('--fighter', f.colour);
    // Each side's frame and glow take its fighter's own colour (owner, 12/11/2026).
    this.root.style.setProperty('--accent', accentColour(f.colour));
    this.status.replaceChildren(
      ...f.status.map((s) => {
        const chip = document.createElement('span');
        chip.className = `th-chip th-chip-${s}`;
        chip.textContent = STATUS_LABEL[s] ?? s.toUpperCase();
        return chip;
      }),
    );
  }
}

export class TopHud {
  readonly root: HTMLDivElement;
  private readonly left = new Side('th-left');
  private readonly right = new Side('th-right');
  private readonly timer: HTMLDivElement;
  private readonly action: HTMLDivElement;
  private shownAction: string | null = null;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'top-hud';
    const centre = document.createElement('div');
    centre.className = 'th-centre';
    this.timer = document.createElement('div');
    this.timer.className = 'th-timer';
    this.action = document.createElement('div');
    this.action.className = 'th-action';
    centre.append(this.timer, this.action);
    this.root.append(this.left.root, centre, this.right.root);
    parent.appendChild(this.root);
  }

  /** Rendered faces for the two fighters. */
  setPortraits(left: string, right: string): void {
    this.left.setPortrait(left);
    this.right.setPortrait(right);
  }

  update(s: TopHudState): void {
    this.left.update(s.left);
    this.right.update(s.right);
    this.timer.textContent = formatTimer(s.timerS);
    if (s.lastAction !== this.shownAction) {
      this.shownAction = s.lastAction;
      this.action.textContent = s.lastAction ?? '';
      // Restart the pop animation for each new action.
      this.action.classList.remove('pop');
      void this.action.offsetWidth;
      if (s.lastAction) this.action.classList.add('pop');
    }
  }
}

/**
 * Ultimate showcase (PRS-8): a short full-screen flash with speed lines when an ultimate lands,
 * over in about 0.4 s so play is not interrupted.
 */
export class UltimateShowcase {
  private readonly el: HTMLDivElement;

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'ult-showcase';
    parent.appendChild(this.el);
  }

  play(): void {
    this.el.classList.remove('on');
    void this.el.offsetWidth;
    this.el.classList.add('on');
  }
}
