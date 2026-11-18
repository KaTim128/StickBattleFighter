import { clockText } from '../modes/hide-seek/rules';

/**
 * The Hide and Seek heads-up display (Phase 2): the preparation countdown, the survival clock, the
 * context prompt (open a door, hide, ...) and, on a touch screen, buttons for crouch, run, act and
 * peek. Pure DOM; it reads state and never changes the game.
 */
export interface HideSeekHudState {
  readonly phase: 'prep' | 'hunt' | 'victory' | 'killing' | 'gameover';
  readonly prepLeftS: number;
  readonly survivalLeftS: number;
  /** What pressing the interact key would do right now ("Open the door"), or null. */
  readonly prompt: string | null;
  /** Posture words for the status line: "Crouching", "Running", "Hiding". */
  readonly posture: string;
}

export interface HideSeekTouch {
  setRun(down: boolean): void;
  crouch(): void;
  act(): void;
  setPeek(down: boolean): void;
}

export class HideSeekHud {
  private readonly root = document.createElement('div');
  private readonly banner = document.createElement('div');
  private readonly clock = document.createElement('div');
  private readonly status = document.createElement('div');
  private readonly promptEl = document.createElement('div');

  constructor(
    parent: HTMLElement,
    touch: HideSeekTouch,
    private readonly keys: { act: string; crouch: string; run: string; peek: string } = {
      act: 'G',
      crouch: 'Space',
      run: 'Shift',
      peek: 'K',
    },
  ) {
    this.root.className = 'hs-hud';
    this.banner.className = 'hs-banner';
    this.clock.className = 'hs-clock';
    this.status.className = 'hs-status';
    this.promptEl.className = 'hs-prompt';
    this.promptEl.hidden = true;
    const hint = document.createElement('div');
    hint.className = 'hs-hint';
    hint.textContent = `WASD move · ${keys.run} run · ${keys.crouch} crouch · ${keys.act} act · hold ${keys.peek} to peek`;
    this.root.append(this.banner, this.clock, this.status, this.promptEl, hint, this.touchButtons(touch));
    parent.appendChild(this.root);
  }

  private touchButtons(touch: HideSeekTouch): HTMLElement {
    const box = document.createElement('div');
    box.className = 'hs-touch';
    const make = (label: string, aria: string, hold?: (down: boolean) => void, tap?: () => void) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'hs-btn';
      b.textContent = label;
      b.setAttribute('aria-label', aria);
      b.tabIndex = -1;
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        hold?.(true);
        tap?.();
      });
      for (const ev of ['pointerup', 'pointercancel', 'pointerleave'] as const)
        b.addEventListener(ev, () => hold?.(false));
      return b;
    };
    box.append(
      make('RUN', 'Run (hold)', (d) => touch.setRun(d)),
      make('CROUCH', 'Crouch', undefined, () => touch.crouch()),
      make('PEEK', 'Peek (hold)', (d) => touch.setPeek(d)),
      make('ACT', 'Open, hide, pick up, throw', undefined, () => touch.act()),
    );
    return box;
  }

  update(s: HideSeekHudState): void {
    if (s.phase === 'prep') {
      this.banner.textContent = `HIDE! The hunter comes in ${Math.ceil(s.prepLeftS - 1e-9)}`;
      this.banner.hidden = false;
      this.clock.textContent = clockText(s.prepLeftS);
      this.clock.dataset.mode = 'prep';
    } else {
      this.banner.hidden = s.phase !== 'hunt' || s.survivalLeftS < 115;
      this.banner.textContent = 'SURVIVE';
      this.clock.textContent = clockText(s.survivalLeftS);
      this.clock.dataset.mode = 'hunt';
    }
    this.status.textContent = s.posture;
    this.promptEl.hidden = s.prompt === null;
    if (s.prompt !== null) this.promptEl.textContent = `${this.keys.act}: ${s.prompt}`;
  }

  destroy(): void {
    this.root.remove();
  }
}
