/**
 * Rebindable desktop controls (owner, 11/11/2026; REQ-CTL-15, TD-049).
 *
 * Every desktop action has exactly one input code: a `KeyboardEvent.code` (e.g. "KeyW", "Space")
 * or a mouse button written "Mouse0" (left), "Mouse1" (middle), "Mouse2" (right). One code drives
 * one action, except the Fire Beam keys, which only act while a beam pours and may share a key with a
 * normal action. An ability that needs a target is confirmed by pressing its own key again.
 */
export type BindAction =
  | 'moveUp'
  | 'moveDown'
  | 'moveLeft'
  | 'moveRight'
  | 'sprint'
  | 'jump'
  | 'attack'
  | 'dodge'
  | 'ability1'
  | 'ability2'
  | 'ability3'
  | 'ability4'
  | 'heavyAttack'
  | 'ultimate'
  | 'beamLeft'
  | 'beamRight'
  | 'grab';

export type Bindings = Readonly<Record<BindAction, string>>;

/** The binding that uses each ability slot. */
export const SLOT_ACTION = {
  a1: 'ability1',
  a2: 'ability2',
  a3: 'ability3',
  a4: 'ability4',
  ult: 'ultimate',
} as const satisfies Record<string, BindAction>;

/**
 * The owner's default layout (12/11/2026): J attack, K Heavy Attack, L dodge, Q E F R abilities,
 * I ultimate; while a Fire Beam pours, J sweeps it left and L right.
 */
export const DEFAULT_BINDINGS: Bindings = {
  moveUp: 'KeyW',
  moveDown: 'KeyS',
  moveLeft: 'KeyA',
  moveRight: 'KeyD',
  sprint: 'ShiftLeft',
  jump: 'Space',
  attack: 'KeyJ',
  dodge: 'KeyL',
  ability1: 'KeyQ',
  ability2: 'KeyE',
  ability3: 'KeyF',
  ability4: 'KeyR',
  heavyAttack: 'KeyK',
  ultimate: 'KeyI',
  beamLeft: 'KeyJ',
  beamRight: 'KeyL',
  grab: 'KeyG',
};

/** Settings-screen order and names. */
export const BIND_ACTIONS: readonly { action: BindAction; label: string; group: string }[] = [
  { action: 'moveUp', label: 'Move up', group: 'Movement' },
  { action: 'moveDown', label: 'Move down', group: 'Movement' },
  { action: 'moveLeft', label: 'Move left', group: 'Movement' },
  { action: 'moveRight', label: 'Move right', group: 'Movement' },
  { action: 'sprint', label: 'Sprint (hold)', group: 'Movement' },
  { action: 'jump', label: 'Jump', group: 'Movement' },
  { action: 'dodge', label: 'Dodge', group: 'Movement' },
  { action: 'attack', label: 'Tap attack (hold: block)', group: 'Combat' },
  { action: 'ability1', label: 'Ability 1', group: 'Combat' },
  { action: 'ability2', label: 'Ability 2', group: 'Combat' },
  { action: 'ability3', label: 'Ability 3', group: 'Combat' },
  { action: 'ability4', label: 'Ability 4', group: 'Combat' },
  { action: 'heavyAttack', label: 'Heavy attack', group: 'Combat' },
  { action: 'ultimate', label: 'Ultimate (again: launch)', group: 'Combat' },
  { action: 'grab', label: 'Grab (again: throw)', group: 'Combat' },
  { action: 'beamLeft', label: 'Rotate beam left', group: 'Fire Beam controls' },
  { action: 'beamRight', label: 'Rotate beam right', group: 'Fire Beam controls' },
];

export function actionLabel(action: BindAction): string {
  return BIND_ACTIONS.find((a) => a.action === action)?.label ?? action;
}

/** Keys the game keeps for itself: the settings screen and developer toggles. */
export const RESERVED_CODES: Readonly<Record<string, string>> = {
  Escape: 'Settings and cancelling an aimed ability',
  Backquote: 'Debug overlay',
  KeyM: 'Mute',
  KeyT: 'Dummy attacks toggle',
  KeyP: 'Debug impact',
};

/**
 * The Fire Beam keys only act while a beam pours (and then the beam takes them), so they may share a
 * key with any normal action, but not with each other.
 */
const BEAM_KEYS: ReadonlySet<BindAction> = new Set(['beamLeft', 'beamRight']);
function mayShare(a: BindAction, b: BindAction): boolean {
  return BEAM_KEYS.has(a) !== BEAM_KEYS.has(b);
}

export type BindCheck =
  | { ok: true }
  | { ok: false; reason: 'reserved'; message: string }
  | { ok: false; reason: 'conflict'; with: BindAction; message: string };

/** Can `action` take `code` without clashing? */
export function checkBinding(bindings: Bindings, action: BindAction, code: string): BindCheck {
  const reserved = RESERVED_CODES[code];
  if (reserved) return { ok: false, reason: 'reserved', message: `${codeLabel(code)} is reserved for ${reserved}.` };
  for (const other of Object.keys(bindings) as BindAction[]) {
    if (other === action || bindings[other] !== code || mayShare(action, other)) continue;
    return {
      ok: false,
      reason: 'conflict',
      with: other,
      message: `${codeLabel(code)} is already assigned to ${actionLabel(other)}.`,
    };
  }
  return { ok: true };
}

/** A copy with `action` bound to `code`, or the reason it was refused (nothing changes then). */
export function rebind(bindings: Bindings, action: BindAction, code: string): { bindings: Bindings; check: BindCheck } {
  const check = checkBinding(bindings, action, code);
  return { bindings: check.ok ? { ...bindings, [action]: code } : bindings, check };
}

/** Every action a code triggers (one normal action, plus a Fire Beam key sharing it). */
export function actionsFor(bindings: Bindings, code: string): BindAction[] {
  const out: BindAction[] = [];
  for (const a of Object.keys(bindings) as BindAction[]) if (bindings[a] === code) out.push(a);
  return out;
}

/** Saved bindings from storage, repaired: unknown actions dropped, missing or clashing ones defaulted. */
export function sanitiseBindings(raw: unknown): Bindings {
  const out: Record<BindAction, string> = { ...DEFAULT_BINDINGS };
  if (!raw || typeof raw !== 'object') return out;
  const saved = raw as Record<string, unknown>;
  for (const { action } of BIND_ACTIONS) {
    const code = saved[action];
    if (typeof code !== 'string' || code.length === 0 || code.length > 32) continue;
    out[action] = code;
  }
  // Any clash left (e.g. hand-edited storage): fall back to the default layout.
  for (const { action } of BIND_ACTIONS) {
    if (!checkBinding(out, action, out[action]).ok) return { ...DEFAULT_BINDINGS };
  }
  return out;
}

/** How a code is shown to the player. */
export function codeLabel(code: string): string {
  const mouse: Record<string, string> = {
    Mouse0: 'Left click',
    Mouse1: 'Middle click',
    Mouse2: 'Right click',
    Mouse3: 'Mouse back',
    Mouse4: 'Mouse forward',
  };
  if (mouse[code]) return mouse[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Arrow')) return `${code.slice(5)} arrow`;
  if (code.startsWith('Numpad')) return `Numpad ${code.slice(6)}`;
  const named: Record<string, string> = {
    ShiftLeft: 'Left Shift',
    ShiftRight: 'Right Shift',
    ControlLeft: 'Left Ctrl',
    ControlRight: 'Right Ctrl',
    AltLeft: 'Left Alt',
    AltRight: 'Right Alt',
    Space: 'Space',
  };
  return named[code] ?? code;
}

/** The mouse button as a bindable code. */
export function mouseCode(button: number): string {
  return `Mouse${button}`;
}
