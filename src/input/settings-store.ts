import type { Bindings } from './bindings';
import { DEFAULT_CONTROLS, type FighterControls, type FighterControlsStore, type HoldRules } from './fighter-controls';

/**
 * Player settings kept in this browser between sessions (owner, 11/11/2026; REQ-CTL-15).
 * Purely local preferences: nothing here is valuable, so no server validation is needed.
 */
export interface PlayerSettings {
  /** 0..1 */
  musicVolume: number;
  /** 0..1 */
  sfxVolume: number;
  /**
   * Size of the touch combat buttons, 0.8..1.3. Not in General Settings any more (owner, master plan
   * 16/11/2026); the saved value and default stay.
   */
  touchScale: number;
}

export const TOUCH_SCALE_RANGE = { min: 0.8, max: 1.3 } as const;

/**
 * General settings only (volumes, touch size). Key layouts used to live here (v3 and older); from
 * 17/11/2026 each fighter has its own (`FighterControlsStore`), so any `bindings` saved here are
 * ignored and the layouts start from the defaults.
 */
export const SETTINGS_STORAGE_KEY = 'stickman-arena.settings.v3';
/** Older settings (v2): volumes carried over. */
const OLD_SETTINGS_STORAGE_KEY = 'stickman-arena.settings.v2';

export const DEFAULT_SETTINGS: PlayerSettings = {
  musicVolume: 0.8,
  sfxVolume: 0.8,
  touchScale: 1,
};

const volume = (v: unknown, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback;

/** Storage that can be missing or refuse writes (private browsing, quota): settings still work this session. */
export type SettingsStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function loadSettings(storage: SettingsStorage | null): PlayerSettings {
  let raw: unknown = null;
  try {
    const text = storage?.getItem(SETTINGS_STORAGE_KEY);
    if (text) raw = JSON.parse(text);
    else {
      const old = storage?.getItem(OLD_SETTINGS_STORAGE_KEY);
      const parsed: unknown = old ? JSON.parse(old) : null;
      if (parsed && typeof parsed === 'object') raw = parsed;
    }
  } catch (error) {
    console.warn('[settings] saved settings unreadable, using defaults', error);
  }
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_SETTINGS };
  const r = raw as Record<string, unknown>;
  return {
    musicVolume: volume(r.musicVolume, DEFAULT_SETTINGS.musicVolume),
    sfxVolume: volume(r.sfxVolume, DEFAULT_SETTINGS.sfxVolume),
    touchScale:
      typeof r.touchScale === 'number' && Number.isFinite(r.touchScale)
        ? Math.min(TOUCH_SCALE_RANGE.max, Math.max(TOUCH_SCALE_RANGE.min, r.touchScale))
        : 1,
  };
}

export function saveSettings(storage: SettingsStorage | null, settings: PlayerSettings): boolean {
  try {
    storage?.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    return storage !== null;
  } catch (error) {
    console.warn('[settings] could not save settings', error);
    return false;
  }
}

/**
 * A live settings holder: input and audio read it; the settings screens change and save it. It also
 * holds the **active fighter's controls** (the fighter this page plays), loaded from the per-fighter
 * store for the player's profile.
 */
export class SettingsState {
  private value: PlayerSettings;
  private controlsValue: FighterControls = DEFAULT_CONTROLS;
  private profile: string | null = null;
  private fighterId: string | null = null;
  private readonly listeners = new Set<(s: PlayerSettings) => void>();

  constructor(
    private readonly storage: SettingsStorage | null,
    private readonly controlsStore: FighterControlsStore | null = null,
  ) {
    this.value = loadSettings(storage);
  }

  get current(): PlayerSettings {
    return this.value;
  }

  /** Which fighter's controls are live (null before a fighter is chosen: the defaults). */
  get activeFighter(): string | null {
    return this.fighterId;
  }

  /** Make this profile's controls for this fighter the live ones. */
  activate(profile: string | null, fighterId: string): void {
    this.profile = profile;
    this.fighterId = fighterId;
    this.controlsValue = this.controlsStore?.get(profile, fighterId) ?? DEFAULT_CONTROLS;
    this.notify();
  }

  get controls(): FighterControls {
    return this.controlsValue;
  }

  get bindings(): Bindings {
    return this.controlsValue.bindings;
  }

  get holds(): HoldRules {
    return this.controlsValue.holds;
  }

  /** Save the active fighter's controls (only that fighter's). */
  setControls(controls: FighterControls): void {
    this.controlsValue = controls;
    if (this.fighterId) this.controlsStore?.set(this.profile, this.fighterId, controls);
    this.notify();
  }

  resetControls(): void {
    this.controlsValue = DEFAULT_CONTROLS;
    if (this.fighterId) this.controlsStore?.reset(this.profile, this.fighterId);
    this.notify();
  }

  update(patch: Partial<PlayerSettings>): void {
    this.value = { ...this.value, ...patch };
    saveSettings(this.storage, this.value);
    this.notify();
  }

  private notify(): void {
    for (const l of this.listeners) l(this.value);
  }

  onChange(listener: (s: PlayerSettings) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

/** Local storage, or null where the browser refuses it (settings then last for this session only). */
export function browserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
