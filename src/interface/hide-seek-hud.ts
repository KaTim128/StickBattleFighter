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
  /** 0..1 through the killing animation (a red flash builds), 1 on Game Over. */
  readonly killProgress: number;
  /** Seconds of the hunt survived, for the result text. */
  readonly survivedS: number;
}

export interface HideSeekTouch {
  setRun(down: boolean): void;
  crouch(): void;
  act(): void;
  setPeek(down: boolean): void;
}

/** A floating HIDE bubble over a hiding place, in screen pixels. */
export interface HideBubble {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  /** The act key would hide the player here now: the bubble is bigger and brighter. */
  readonly inReach: boolean;
}

export interface HideSeekActions {
  restart(): void;
  menu(): void;
}

export class HideSeekHud {
  private readonly root = document.createElement('div');
  private readonly banner = document.createElement('div');
  private readonly clock = document.createElement('div');
  private readonly status = document.createElement('div');
  private readonly promptEl = document.createElement('div');
  private readonly flash = document.createElement('div');
  private readonly vignette = document.createElement('div');
  private readonly bubbleLayer = document.createElement('div');
  private readonly bubbles = new Map<string, HTMLElement>();
  private readonly result = document.createElement('div');
  private readonly resultTitle = document.createElement('div');
  private readonly resultText = document.createElement('div');

  constructor(
    parent: HTMLElement,
    touch: HideSeekTouch,
    actions: HideSeekActions,
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
    this.vignette.className = 'hs-vignette';
    this.bubbleLayer.className = 'hs-bubbles';
    this.flash.className = 'hs-flash';
    this.result.className = 'hs-result';
    this.result.hidden = true;
    this.resultTitle.className = 'hs-result-title';
    this.resultText.className = 'hs-result-text';
    const buttons = document.createElement('div');
    buttons.className = 'hs-result-buttons';
    const button = (label: string, run: () => void) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'hs-result-btn';
      b.textContent = label;
      b.addEventListener('click', run);
      return b;
    };
    buttons.append(button('Restart', actions.restart), button('Return to Menu', actions.menu));
    this.result.append(this.resultTitle, this.resultText, buttons);
    this.root.append(
      this.vignette,
      this.bubbleLayer,
      this.flash,
      this.banner,
      this.clock,
      this.status,
      this.promptEl,
      hint,
      this.touchButtons(touch),
      this.result,
    );
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
    this.flash.style.opacity = String(Math.min(0.85, s.killProgress * 0.85));
    const over = s.phase === 'victory' || s.phase === 'gameover';
    this.result.hidden = !over;
    if (over) {
      const won = s.phase === 'victory';
      this.result.dataset.outcome = won ? 'victory' : 'gameover';
      this.resultTitle.textContent = won ? 'YOU SURVIVED' : 'GAME OVER';
      this.resultText.textContent = won
        ? 'The hunter never found you. Two minutes survived.'
        : `The hunter caught you after ${clockText(s.survivedS)}.`;
    }
    this.status.textContent = s.posture;
    this.promptEl.hidden = s.prompt === null;
    if (s.prompt !== null) this.promptEl.textContent = `${this.keys.act}: ${s.prompt}`;
  }

  /** Show a floating HIDE bubble at each given spot and remove the rest. Pure DOM; never changes the game. */
  setBubbles(list: readonly HideBubble[]): void {
    const seen = new Set<string>();
    for (const b of list) {
      seen.add(b.id);
      let el = this.bubbles.get(b.id);
      if (!el) {
        el = document.createElement('div');
        el.className = 'hs-bubble';
        el.dataset.spot = b.id;
        const inner = document.createElement('div');
        inner.className = 'hs-bubble-body';
        inner.textContent = 'HIDE';
        el.appendChild(inner);
        this.bubbleLayer.appendChild(el);
        this.bubbles.set(b.id, el);
      }
      el.style.transform = `translate(${Math.round(b.x)}px, ${Math.round(b.y)}px)`;
      el.classList.toggle('near', b.inReach);
    }
    for (const [id, el] of this.bubbles)
      if (!seen.has(id)) {
        el.remove();
        this.bubbles.delete(id);
      }
  }

  destroy(): void {
    this.root.remove();
  }
}
