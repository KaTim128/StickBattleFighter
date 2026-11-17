import { BIND_ACTIONS, type BindAction, codeLabel, DEFAULT_BINDINGS, mouseCode, rebind } from '../input/bindings';
import { DEFAULT_HOLD_S, type FighterControls, HOLD_RANGE_S, HOLDABLE, withHold } from '../input/fighter-controls';

/** What the panel needs from the game: one fighter's saved controls, in and out. */
export interface FighterControlsHost {
  get(fighterId: string): FighterControls;
  save(fighterId: string, controls: FighterControls): void;
  reset(fighterId: string): void;
}

export interface ControlsFighter {
  readonly id: string;
  readonly name: string;
  /** Has a Fire Beam: its beam-turn keys are shown. */
  readonly hasBeam: boolean;
}

/**
 * Fighter Controls (owner, master plan 16/11/2026, Phase 1 A3): one fighter's own keys. Click a key
 * and press the new one; a key already in use is refused with the action that has it; every
 * holdable action can be a Tap or a Hold with its own hold time (shown "R (Hold)"); a button resets
 * only this fighter to its defaults. Reachable from Fighter Selection, Practice, the Tutorial and
 * in-game Settings.
 */
export class FighterControlsPanel {
  readonly root: HTMLElement;
  private readonly title: HTMLElement;
  private readonly message: HTMLElement;
  private readonly list: HTMLElement;
  private fighter: ControlsFighter | null = null;
  private capturing: BindAction | null = null;
  private openState = false;

  constructor(
    parent: HTMLElement,
    private readonly host: FighterControlsHost,
    private readonly onOpenChange: (open: boolean) => void,
  ) {
    this.root = document.createElement('div');
    this.root.className = 'settings-panel fighter-controls';
    this.root.hidden = true;
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-label', 'Fighter controls');
    this.root.innerHTML = `
      <div class="settings-card">
        <div class="settings-head">
          <h2 class="fc-title">Fighter Controls</h2>
          <button type="button" class="settings-close fc-close" aria-label="Close fighter controls">✕</button>
        </div>
        <p class="settings-hint">Click a key, then press the new key or mouse button (Esc cancels). Tap fires at once; Hold fires after the key is held for its time.</p>
        <div class="settings-message" role="status" aria-live="polite"></div>
        <div class="settings-binds fc-list"></div>
        <div class="settings-actions">
          <button type="button" class="fc-reset">Reset to defaults</button>
          <button type="button" class="fc-done">Done</button>
        </div>
      </div>`;
    parent.appendChild(this.root);
    this.title = this.root.querySelector('.fc-title')!;
    this.message = this.root.querySelector('.settings-message')!;
    this.list = this.root.querySelector('.fc-list')!;
    this.root.querySelector('.fc-close')!.addEventListener('click', () => this.close());
    this.root.querySelector('.fc-done')!.addEventListener('click', () => this.close());
    this.root.addEventListener('click', (e) => {
      if (e.target === this.root) this.close();
    });
    this.root.querySelector('.fc-reset')!.addEventListener('click', () => {
      if (!this.fighter) return;
      this.capturing = null;
      this.host.reset(this.fighter.id);
      this.say(`${this.fighter.name}'s controls reset to defaults.`, 'ok');
      this.render();
    });
    // Capture phase on window: while waiting for a key, the key goes to the panel, not the game.
    window.addEventListener('keydown', this.onKey, true);
    this.root.addEventListener('mousedown', this.onMouse, true);
    this.root.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  get isOpen(): boolean {
    return this.openState;
  }

  open(fighter: ControlsFighter): void {
    this.fighter = fighter;
    this.capturing = null;
    this.title.textContent = `${fighter.name}: Controls`;
    this.say('', 'ok');
    this.render();
    this.openState = true;
    this.root.hidden = false;
    this.onOpenChange(true);
  }

  close(): void {
    if (!this.openState) return;
    this.openState = false;
    this.capturing = null;
    this.root.hidden = true;
    this.onOpenChange(false);
  }

  private controls(): FighterControls {
    return this.host.get(this.fighter!.id);
  }

  private render(): void {
    const fighter = this.fighter;
    if (!fighter) return;
    const c = this.controls();
    this.list.replaceChildren();
    let group = '';
    for (const { action, label, group: g } of BIND_ACTIONS) {
      if (g === 'Fire Beam controls' && !fighter.hasBeam) continue;
      if (g !== group) {
        group = g;
        const h = document.createElement('h3');
        h.textContent = g;
        this.list.appendChild(h);
      }
      const row = document.createElement('div');
      row.className = 'settings-bind';
      row.dataset.action = action;
      const name = document.createElement('span');
      name.textContent = label;
      const key = document.createElement('button');
      key.type = 'button';
      key.className = 'settings-key';
      key.dataset.action = action;
      const waiting = this.capturing === action;
      const hold = c.holds[action];
      key.textContent = waiting
        ? 'Press a key…'
        : hold !== undefined
          ? `${codeLabel(c.bindings[action])} (Hold)`
          : codeLabel(c.bindings[action]);
      key.classList.toggle('waiting', waiting);
      key.classList.toggle('changed', c.bindings[action] !== DEFAULT_BINDINGS[action] || hold !== undefined);
      key.addEventListener('click', (e) => {
        // A click on the key button itself must not immediately bind the left mouse button.
        if (this.capturing === null) {
          e.stopPropagation();
          this.capturing = action;
          this.say(`Press the new key for "${label}"…`, 'ok');
          this.render();
        }
      });
      row.append(name, key);
      if (HOLDABLE.has(action)) {
        const mode = document.createElement('button');
        mode.type = 'button';
        mode.className = 'fc-mode';
        mode.dataset.mode = hold !== undefined ? 'hold' : 'tap';
        mode.textContent = hold !== undefined ? 'Hold' : 'Tap';
        mode.setAttribute('aria-label', `${label}: ${hold !== undefined ? 'hold' : 'tap'}. Click to change`);
        mode.addEventListener('click', () => this.setHold(action, hold === undefined ? DEFAULT_HOLD_S : null));
        row.append(mode);
        if (hold !== undefined) {
          const secs = document.createElement('input');
          secs.type = 'number';
          secs.className = 'fc-seconds';
          secs.min = String(HOLD_RANGE_S.min);
          secs.max = String(HOLD_RANGE_S.max);
          secs.step = '0.05';
          secs.value = String(hold);
          secs.setAttribute('aria-label', `${label}: hold time in seconds`);
          secs.addEventListener('change', () => {
            const v = Number(secs.value);
            this.setHold(action, Number.isFinite(v) ? v : DEFAULT_HOLD_S);
          });
          const unit = document.createElement('span');
          unit.className = 'fc-unit';
          unit.textContent = 's';
          row.append(secs, unit);
        }
      }
      this.list.appendChild(row);
    }
  }

  private setHold(action: BindAction, seconds: number | null): void {
    if (!this.fighter) return;
    const c = this.controls();
    const holds = withHold(c.holds, action, seconds);
    this.host.save(this.fighter.id, { bindings: c.bindings, holds });
    const label = BIND_ACTIONS.find((a) => a.action === action)?.label ?? action;
    this.say(seconds === null ? `${label}: tap.` : `${label}: hold ${holds[action]} s.`, 'ok');
    this.render();
  }

  private readonly onKey = (e: KeyboardEvent): void => {
    if (!this.openState) return;
    if (this.capturing !== null) {
      e.preventDefault();
      e.stopPropagation();
      if (e.code === 'Escape') {
        this.capturing = null;
        this.say('Cancelled.', 'ok');
        this.render();
        return;
      }
      this.assign(e.code);
      return;
    }
    if (e.code === 'Escape' && !e.repeat) {
      e.preventDefault();
      e.stopPropagation();
      this.close();
    }
  };

  private readonly onMouse = (e: MouseEvent): void => {
    if (this.capturing === null) return;
    e.preventDefault();
    e.stopPropagation();
    this.assign(mouseCode(e.button));
  };

  private assign(code: string): void {
    const action = this.capturing;
    const fighter = this.fighter;
    if (!action || !fighter) return;
    this.capturing = null;
    const c = this.controls();
    const { bindings, check } = rebind(c.bindings, action, code);
    if (check.ok) {
      this.host.save(fighter.id, { bindings, holds: c.holds });
      const label = BIND_ACTIONS.find((a) => a.action === action)?.label ?? action;
      this.say(`${label}: ${codeLabel(code)}.`, 'ok');
    } else {
      this.say(`${check.message} Choose another key.`, 'error');
    }
    this.render();
  }

  private say(text: string, kind: 'ok' | 'error'): void {
    this.message.textContent = text;
    this.message.dataset.kind = kind;
    this.message.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  }
}
