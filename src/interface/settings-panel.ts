import { BIND_ACTIONS, type BindAction, codeLabel, DEFAULT_BINDINGS, mouseCode, rebind } from '../input/bindings';
import type { SettingsState } from '../input/settings-store';

/**
 * The Settings screen (owner, 11/11/2026; REQ-CTL-15, REQ-UI settings): opened with the gear
 * button or Escape. Audio: separate music and sound-effect volumes, applied as the sliders move.
 * Controls: every desktop action can be rebound to a key or mouse button; a key that is already
 * in use is refused with a clear message naming the action that has it; one button restores the
 * defaults. Everything is saved in this browser and comes back next session.
 */
export class SettingsPanel {
  readonly root: HTMLElement;
  private readonly button: HTMLButtonElement;
  private readonly message: HTMLElement;
  private readonly rows = new Map<BindAction, HTMLButtonElement>();
  private capturing: BindAction | null = null;
  private openState = false;

  constructor(
    parent: HTMLElement,
    private readonly settings: SettingsState,
    private readonly onOpenChange: (open: boolean) => void,
    /** Game actions shown at the bottom (owner, 12/11/2026): leave the fight, toggle fullscreen. */
    actions: { leave?: () => void; fullscreen?: () => void } = {},
    /** Escape cancels an ability being aimed instead (owner, 12/11/2026); true when it did. */
    private readonly escapeTaken: () => boolean = () => false,
  ) {
    this.button = document.createElement('button');
    this.button.className = 'settings-button';
    this.button.type = 'button';
    this.button.title = 'Settings (Esc)';
    this.button.setAttribute('aria-label', 'Settings');
    this.button.textContent = '⚙';
    this.button.addEventListener('click', () => this.setOpen(!this.openState));
    parent.appendChild(this.button);

    this.root = document.createElement('div');
    this.root.className = 'settings-panel';
    this.root.hidden = true;
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-label', 'Settings');
    this.root.innerHTML = `
      <div class="settings-card">
        <div class="settings-head">
          <h2>Settings</h2>
          <button type="button" class="settings-close" aria-label="Close settings">✕</button>
        </div>
        <div class="settings-tabs" role="tablist">
          <button type="button" role="tab" data-tab="audio" class="active">Audio</button>
          <button type="button" role="tab" data-tab="controls">Controls</button>
        </div>
        <section data-pane="audio">
          <label class="settings-slider">Music and ambience volume
            <input type="range" min="0" max="100" step="1" data-volume="musicVolume" />
            <output></output>
          </label>
          <label class="settings-slider">Sound effects volume
            <input type="range" min="0" max="100" step="1" data-volume="sfxVolume" />
            <output></output>
          </label>
        </section>
        <section data-pane="controls" hidden>
          <p class="settings-hint">Click a control, then press the new key or mouse button (Esc cancels).</p>
          <div class="settings-message" role="status" aria-live="polite"></div>
          <div class="settings-binds"></div>
          <button type="button" class="settings-reset">Reset to defaults</button>
        </section>
        <div class="settings-actions">
          <button type="button" class="settings-fullscreen">Fullscreen</button>
          <button type="button" class="settings-leave">Leave game</button>
        </div>
      </div>`;
    parent.appendChild(this.root);
    this.message = this.root.querySelector('.settings-message')!;
    const leave = this.root.querySelector<HTMLButtonElement>('.settings-leave')!;
    const full = this.root.querySelector<HTMLButtonElement>('.settings-fullscreen')!;
    leave.hidden = !actions.leave;
    full.hidden = !actions.fullscreen;
    leave.addEventListener('click', () => {
      this.setOpen(false);
      actions.leave?.();
    });
    full.addEventListener('click', () => actions.fullscreen?.());

    this.root.querySelector('.settings-close')!.addEventListener('click', () => this.setOpen(false));
    // Clicking the dimmed backdrop (not the card) closes it.
    this.root.addEventListener('click', (e) => {
      if (e.target === this.root) this.setOpen(false);
    });
    for (const tab of this.root.querySelectorAll<HTMLButtonElement>('[data-tab]')) {
      tab.addEventListener('click', () => this.showTab(tab.dataset.tab ?? 'audio'));
    }

    for (const input of this.root.querySelectorAll<HTMLInputElement>('[data-volume]')) {
      const key = input.dataset.volume as 'musicVolume' | 'sfxVolume';
      input.addEventListener('input', () => {
        this.settings.update({ [key]: Number(input.value) / 100 });
        this.refreshVolumes();
      });
    }

    const list = this.root.querySelector('.settings-binds')!;
    let group = '';
    for (const { action, label, group: g } of BIND_ACTIONS) {
      if (g !== group) {
        group = g;
        const h = document.createElement('h3');
        h.textContent = g;
        list.appendChild(h);
      }
      const row = document.createElement('div');
      row.className = 'settings-bind';
      const name = document.createElement('span');
      name.textContent = label;
      const key = document.createElement('button');
      key.type = 'button';
      key.className = 'settings-key';
      key.dataset.action = action;
      key.addEventListener('click', (e) => {
        // A click on the key button itself must not immediately bind the left mouse button.
        if (this.capturing === null) {
          e.stopPropagation();
          this.startCapture(action);
        }
      });
      row.append(name, key);
      list.appendChild(row);
      this.rows.set(action, key);
    }
    this.root.querySelector('.settings-reset')!.addEventListener('click', () => {
      this.capturing = null;
      this.settings.update({ bindings: DEFAULT_BINDINGS });
      this.say('Controls reset to defaults.', 'ok');
      this.refreshBindings();
    });

    // Capture phase on window: while waiting for a key, the key goes to the panel, not the game.
    window.addEventListener('keydown', this.onKey, true);
    this.root.addEventListener('mousedown', this.onMouse, true);
    this.root.addEventListener('contextmenu', (e) => e.preventDefault());

    this.refreshVolumes();
    this.refreshBindings();
  }

  get isOpen(): boolean {
    return this.openState;
  }

  setOpen(open: boolean): void {
    if (open === this.openState) return;
    this.openState = open;
    this.root.hidden = !open;
    this.button.classList.toggle('active', open);
    this.capturing = null;
    if (open) {
      this.refreshVolumes();
      this.refreshBindings();
      this.say('', 'ok');
    }
    this.onOpenChange(open);
  }

  private showTab(tab: string): void {
    for (const t of this.root.querySelectorAll<HTMLButtonElement>('[data-tab]'))
      t.classList.toggle('active', t.dataset.tab === tab);
    for (const p of this.root.querySelectorAll<HTMLElement>('[data-pane]')) p.hidden = p.dataset.pane !== tab;
    this.capturing = null;
    this.refreshBindings();
  }

  private startCapture(action: BindAction): void {
    this.capturing = action;
    this.refreshBindings();
    this.say('Press a key or mouse button…', 'ok');
  }

  private readonly onKey = (e: KeyboardEvent): void => {
    if (this.capturing !== null) {
      e.preventDefault();
      e.stopPropagation();
      if (e.code === 'Escape') {
        this.capturing = null;
        this.say('Cancelled.', 'ok');
        this.refreshBindings();
        return;
      }
      this.assign(e.code);
      return;
    }
    if (e.code === 'Escape' && !e.repeat) {
      e.preventDefault();
      if (!this.openState && this.escapeTaken()) return;
      this.setOpen(!this.openState);
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
    if (!action) return;
    this.capturing = null;
    const { bindings, check } = rebind(this.settings.bindings, action, code);
    if (check.ok) {
      this.settings.update({ bindings });
      const label = BIND_ACTIONS.find((a) => a.action === action)?.label ?? action;
      this.say(`${label}: ${codeLabel(code)}.`, 'ok');
    } else {
      this.say(`${check.message} Choose another key.`, 'error');
    }
    this.refreshBindings();
  }

  private say(text: string, kind: 'ok' | 'error'): void {
    this.message.textContent = text;
    this.message.dataset.kind = kind;
    this.message.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  }

  private refreshVolumes(): void {
    const s = this.settings.current;
    for (const input of this.root.querySelectorAll<HTMLInputElement>('[data-volume]')) {
      const v = s[input.dataset.volume as 'musicVolume' | 'sfxVolume'];
      input.value = String(Math.round(v * 100));
      const out = input.nextElementSibling;
      if (out) out.textContent = `${Math.round(v * 100)}%`;
    }
  }

  private refreshBindings(): void {
    const b = this.settings.bindings;
    for (const [action, key] of this.rows) {
      const waiting = this.capturing === action;
      key.textContent = waiting ? 'Press a key…' : codeLabel(b[action]);
      key.classList.toggle('waiting', waiting);
      key.classList.toggle('changed', b[action] !== DEFAULT_BINDINGS[action]);
    }
  }
}
