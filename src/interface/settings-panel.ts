import type { SettingsState } from '../input/settings-store';
import { isTypingTarget } from '../input/typing';
import type { NameCheck } from '../progression/player-name';

/**
 * The General Settings screen (owner, 11/11/2026; master plan 16/11/2026): opened with the gear
 * button or Escape. Global settings only: separate music and sound-effect volumes (applied as the
 * sliders move) and the player's profile name. Key layouts are per fighter and live in Fighter
 * Controls (`fighter-controls.ts`), reached with "Change Fighter Keybinds". There is no Fullscreen
 * button (the game is fullscreen automatically, REQ-UI-39), no Fire Beam controls and no touch button size here.
 */
export class SettingsPanel {
  readonly root: HTMLElement;
  private readonly button: HTMLButtonElement;
  private openState = false;

  constructor(
    parent: HTMLElement,
    private readonly settings: SettingsState,
    private readonly onOpenChange: (open: boolean) => void,
    /** Game actions shown at the bottom: leave the fight; open the controls of the fighter being played. */
    actions: { leave?: () => void; fighterControls?: () => void; changeCharacter?: () => void } = {},
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
          <button type="button" role="tab" data-tab="profile" hidden>Profile</button>
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
        <section data-pane="profile" hidden>
          <label class="settings-name">Player name
            <input type="text" class="settings-name-input" autocomplete="off" spellcheck="false" />
          </label>
          <div class="settings-name-message" role="status" aria-live="polite"></div>
          <button type="button" class="settings-name-save">Save name</button>
        </section>
        <div class="settings-actions">
          <button type="button" class="settings-change-character" hidden>Change Character</button>
          <button type="button" class="settings-fighter-keys">Change Fighter Keybinds</button>
          <button type="button" class="settings-leave">Leave</button>
        </div>
      </div>`;
    parent.appendChild(this.root);
    const leave = this.root.querySelector<HTMLButtonElement>('.settings-leave')!;
    const keys = this.root.querySelector<HTMLButtonElement>('.settings-fighter-keys')!;
    const change = this.root.querySelector<HTMLButtonElement>('.settings-change-character')!;
    change.hidden = !actions.changeCharacter;
    change.addEventListener('click', () => {
      this.setOpen(false);
      actions.changeCharacter?.();
    });
    leave.hidden = !actions.leave;
    keys.hidden = !actions.fighterControls;
    leave.addEventListener('click', () => {
      this.setOpen(false);
      actions.leave?.();
    });
    keys.addEventListener('click', () => {
      this.setOpen(false);
      actions.fighterControls?.();
    });

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

    // Capture phase on window: Esc opens and closes the settings through the game's own key handling.
    window.addEventListener('keydown', this.onKey, true);
    this.root.addEventListener('contextmenu', (e) => e.preventDefault());

    this.refreshVolumes();
  }

  get isOpen(): boolean {
    return this.openState;
  }

  private profile: { name(): string | null; save(raw: string): NameCheck } | null = null;

  /**
   * The Profile tab (owner, 13/11/2026): change the registered player name, validated like the
   * first time (10 characters at most).
   */
  setProfile(profile: { name(): string | null; save(raw: string): NameCheck }): void {
    this.profile = profile;
    const tab = this.root.querySelector<HTMLButtonElement>('[data-tab="profile"]')!;
    tab.hidden = false;
    const input = this.root.querySelector<HTMLInputElement>('.settings-name-input')!;
    const msg = this.root.querySelector<HTMLElement>('.settings-name-message')!;
    const save = (): void => {
      const r = profile.save(input.value);
      msg.textContent = r.ok ? `Saved: ${r.name}` : r.error;
      msg.dataset.kind = r.ok ? 'ok' : 'error';
      if (r.ok) input.value = r.name;
    };
    this.root.querySelector('.settings-name-save')!.addEventListener('click', save);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') save();
    });
  }

  setOpen(open: boolean): void {
    if (open === this.openState) return;
    this.openState = open;
    this.root.hidden = !open;
    this.button.classList.toggle('active', open);
    if (open) {
      this.refreshVolumes();
      const input = this.root.querySelector<HTMLInputElement>('.settings-name-input');
      if (input && this.profile) input.value = this.profile.name() ?? '';
      const msg = this.root.querySelector<HTMLElement>('.settings-name-message');
      if (msg) msg.textContent = '';
    }
    this.onOpenChange(open);
  }

  private showTab(tab: string): void {
    for (const t of this.root.querySelectorAll<HTMLButtonElement>('[data-tab]'))
      t.classList.toggle('active', t.dataset.tab === tab);
    for (const p of this.root.querySelectorAll<HTMLElement>('[data-pane]')) p.hidden = p.dataset.pane !== tab;
  }

  /** Esc opens and closes the settings (owner, master plan: handled by the game's own key events). */
  private readonly onKey = (e: KeyboardEvent): void => {
    if (e.code !== 'Escape' || e.repeat) return;
    // Another panel on top (fighter controls, a rebinding in progress) takes Escape itself.
    if (document.querySelector('.fighter-controls:not([hidden])')) return;
    if (isTypingTarget(e.target) && !this.openState) return;
    e.preventDefault();
    if (!this.openState && this.escapeTaken()) return;
    this.setOpen(!this.openState);
  };

  private refreshVolumes(): void {
    const s = this.settings.current;
    for (const input of this.root.querySelectorAll<HTMLInputElement>('[data-volume]')) {
      const v = s[input.dataset.volume as 'musicVolume' | 'sfxVolume'];
      input.value = String(Math.round(v * 100));
      const out = input.nextElementSibling;
      if (out) out.textContent = `${Math.round(v * 100)}%`;
    }
  }
}
