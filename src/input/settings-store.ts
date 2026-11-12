import { type Bindings, DEFAULT_BINDINGS, sanitiseBindings } from './bindings';

/**
 * Player settings kept in this browser between sessions (owner, 11/11/2026; REQ-CTL-15).
 * Purely local preferences: nothing here is valuable, so no server validation is needed.
 */
export interface PlayerSettings {
  /** 0..1 */
  musicVolume: number;
  /** 0..1 */
  sfxVolume: number;
  bindings: Bindings;
}

/**
 * v2 (owner, 12/11/2026): the default layout changed (J attack, K ultimate, L dodge, F ability 3,
 * no launch key), so key layouts saved under v1 are not carried over; volumes are.
 */
export const SETTINGS_STORAGE_KEY = 'stickman-arena.settings.v2';
const OLD_SETTINGS_STORAGE_KEY = 'stickman-arena.settings.v1';

export const DEFAULT_SETTINGS: PlayerSettings = { musicVolume: 0.8, sfxVolume: 0.8, bindings: DEFAULT_BINDINGS };

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
      if (parsed && typeof parsed === 'object') raw = { ...parsed, bindings: null };
    }
  } catch (error) {
    console.warn('[settings] saved settings unreadable, using defaults', error);
  }
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_SETTINGS };
  const r = raw as Record<string, unknown>;
  return {
    musicVolume: volume(r.musicVolume, DEFAULT_SETTINGS.musicVolume),
    sfxVolume: volume(r.sfxVolume, DEFAULT_SETTINGS.sfxVolume),
    bindings: sanitiseBindings(r.bindings),
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

/** A live settings holder: input and audio read it; the settings screen changes and saves it. */
export class SettingsState {
  private value: PlayerSettings;
  private readonly listeners = new Set<(s: PlayerSettings) => void>();

  constructor(private readonly storage: SettingsStorage | null) {
    this.value = loadSettings(storage);
  }

  get current(): PlayerSettings {
    return this.value;
  }

  get bindings(): Bindings {
    return this.value.bindings;
  }

  update(patch: Partial<PlayerSettings>): void {
    this.value = { ...this.value, ...patch };
    saveSettings(this.storage, this.value);
    for (const l of this.listeners) l(this.value);
  }

  onChange(listener: (s: PlayerSettings) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
