import { type BindAction, type Bindings, codeLabel, DEFAULT_BINDINGS, sanitiseBindings } from './bindings';

/**
 * Per-fighter controls (owner, master plan 16/11/2026, Phase 1 A3): every fighter has its own key
 * layout, saved locally for the player's profile. Changing Inferno's keys never changes Titan's.
 * An action can be a **tap** (the default) or a **hold**: it then fires only after the key has been
 * held for its hold time, and the controls screen shows it as "R (Hold)".
 */

/** Seconds a key must be held for an action set to Hold. Absent = a plain tap. */
export type HoldRules = Partial<Record<BindAction, number>>;

export interface FighterControls {
  readonly bindings: Bindings;
  readonly holds: HoldRules;
}

/** Actions that can be a hold: the one-press actions (movement, sprint, attack and beam keys are inherently held or tapped). */
export const HOLDABLE: ReadonlySet<BindAction> = new Set<BindAction>([
  'jump',
  'dodge',
  'grab',
  'tag',
  'ability1',
  'ability2',
  'ability3',
  'ability4',
  'heavyAttack',
  'ultimate',
]);

export const HOLD_RANGE_S = { min: 0.2, max: 2 } as const;
export const DEFAULT_HOLD_S = 1;

export const DEFAULT_CONTROLS: FighterControls = { bindings: DEFAULT_BINDINGS, holds: {} };

const clampHold = (s: number): number =>
  Math.min(HOLD_RANGE_S.max, Math.max(HOLD_RANGE_S.min, Math.round(s * 20) / 20));

/** Saved hold rules, repaired: only holdable actions, seconds inside the range. */
export function sanitiseHolds(raw: unknown): HoldRules {
  const out: HoldRules = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [action, seconds] of Object.entries(raw as Record<string, unknown>)) {
    if (!HOLDABLE.has(action as BindAction)) continue;
    if (typeof seconds !== 'number' || !Number.isFinite(seconds)) continue;
    out[action as BindAction] = clampHold(seconds);
  }
  return out;
}

export function sanitiseControls(raw: unknown): FighterControls {
  if (!raw || typeof raw !== 'object') return DEFAULT_CONTROLS;
  const r = raw as Record<string, unknown>;
  return { bindings: sanitiseBindings(r.bindings), holds: sanitiseHolds(r.holds) };
}

/** A copy with `action` set to a tap, or to a hold of `seconds` (default one second). */
export function withHold(holds: HoldRules, action: BindAction, seconds: number | null): HoldRules {
  const next = { ...holds };
  if (seconds === null || !HOLDABLE.has(action)) delete next[action];
  else next[action] = clampHold(seconds);
  return next;
}

/** How a control is shown: "R" for a tap, "R (Hold)" for a hold (owner, master plan). */
export function controlLabel(action: BindAction, controls: FighterControls): string {
  const key = codeLabel(controls.bindings[action]);
  return controls.holds[action] !== undefined ? `${key} (Hold)` : key;
}

type ControlsStorage = Pick<Storage, 'getItem' | 'setItem'>;

export const FIGHTER_CONTROLS_KEY = 'stickman-arena.fighter-controls.v1';
const GUEST = '(guest)';

interface StoredControls {
  [profile: string]: { [fighter: string]: { bindings: Bindings; holds: HoldRules } };
}

/**
 * Where each profile's controls for each fighter live (this browser only; nothing here is valuable
 * enough to need a server). A fighter never touched keeps the defaults.
 */
export class FighterControlsStore {
  constructor(private readonly storage: ControlsStorage | null) {}

  private read(): StoredControls {
    try {
      const text = this.storage?.getItem(FIGHTER_CONTROLS_KEY);
      const raw: unknown = text ? JSON.parse(text) : null;
      return raw && typeof raw === 'object' ? (raw as StoredControls) : {};
    } catch (error) {
      console.warn('[controls] saved fighter controls unreadable, using defaults', error);
      return {};
    }
  }

  private write(all: StoredControls): boolean {
    try {
      this.storage?.setItem(FIGHTER_CONTROLS_KEY, JSON.stringify(all));
      return this.storage !== null;
    } catch (error) {
      console.warn('[controls] could not save fighter controls', error);
      return false;
    }
  }

  /** The profile's controls for one fighter (defaults when none were saved). */
  get(profile: string | null, fighterId: string): FighterControls {
    const mine = this.read()[profile ?? GUEST];
    const saved = mine && Object.hasOwn(mine, fighterId) ? mine[fighterId] : undefined;
    return saved ? sanitiseControls(saved) : DEFAULT_CONTROLS;
  }

  /** Save one fighter's controls for the profile; other fighters are left exactly as they were. */
  set(profile: string | null, fighterId: string, controls: FighterControls): boolean {
    const all = this.read();
    const key = profile ?? GUEST;
    const mine = Object.hasOwn(all, key) && all[key] ? all[key] : {};
    all[key] = { ...mine, [fighterId]: { bindings: controls.bindings, holds: controls.holds } };
    return this.write(all);
  }

  /** Back to the defaults for this fighter only. */
  reset(profile: string | null, fighterId: string): boolean {
    const all = this.read();
    const key = profile ?? GUEST;
    if (!Object.hasOwn(all, key) || !all[key]) return true;
    const { [fighterId]: _gone, ...rest } = all[key];
    all[key] = rest;
    return this.write(all);
  }
}
