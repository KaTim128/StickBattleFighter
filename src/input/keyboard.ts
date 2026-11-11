import type { AbilityPress, PlayerIntents, Vec2 } from './intents';

/** Default movement keys for both desktop presets (CONTROL_SCHEME §4). Rebinding arrives in Phase 11. */
export const MOVE_KEYS: Readonly<Record<string, Vec2>> = {
  KeyW: { x: 0, y: -1 },
  ArrowUp: { x: 0, y: -1 },
  KeyS: { x: 0, y: 1 },
  ArrowDown: { x: 0, y: 1 },
  KeyA: { x: -1, y: 0 },
  ArrowLeft: { x: -1, y: 0 },
  KeyD: { x: 1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
};
export const JUMP_KEYS: ReadonlySet<string> = new Set(['Space']);
/** Button 1 melee: J (both presets); left mouse button is handled in attachMouse. Tap = attack, hold = block. */
export const MELEE_KEYS: ReadonlySet<string> = new Set(['KeyJ']);
/** Pick up and throw (CONTROL_SCHEME §4: G on the WASD preset, U on the keyboard-only preset). */
export const INTERACT_KEYS: ReadonlySet<string> = new Set(['KeyG', 'KeyU']);
/**
 * Abilities and ultimate: Q/E/R/F (keyboard + mouse) and K/L/O/I (keyboard only), CONTROL_SCHEME §4.
 * I is the ultimate (owner, 11/11/2026: "press I to aim, I again to launch"), so A3 moved to O.
 */
export const ABILITY_KEYS: Readonly<Record<string, AbilityPress>> = {
  KeyQ: 'a1',
  KeyE: 'a2',
  KeyR: 'a3',
  KeyF: 'ult',
  KeyK: 'a1',
  KeyL: 'a2',
  KeyO: 'a3',
  KeyI: 'ult',
};
/** Dodge (CONTROL_SCHEME §4). */
export const DODGE_KEYS: ReadonlySet<string> = new Set(['ShiftLeft', 'ShiftRight']);

/** Movement vector from the set of held key codes (opposite keys cancel; length ≤ 1). */
export function moveFromKeys(held: ReadonlySet<string>): Vec2 {
  let x = 0;
  let y = 0;
  for (const code of held) {
    const dir = MOVE_KEYS[code];
    if (dir) {
      x += dir.x;
      y += dir.y;
    }
  }
  x = Math.sign(x);
  y = Math.sign(y);
  const len = Math.hypot(x, y);
  return len > 0 ? { x: x / len, y: y / len } : { x: 0, y: 0 };
}

/** Wire the keyboard to player intents. Returns a function that removes the listeners. */
export function attachKeyboard(target: Window, intents: PlayerIntents): () => void {
  const held = new Set<string>();
  const sync = (): void => intents.setMoveFromScreen('keyboard', moveFromKeys(held));
  const down = (e: KeyboardEvent): void => {
    if (e.code in MOVE_KEYS || JUMP_KEYS.has(e.code)) e.preventDefault(); // no page scrolling
    if (JUMP_KEYS.has(e.code)) {
      if (!e.repeat) intents.pressJump();
      return;
    }
    if (MELEE_KEYS.has(e.code)) {
      if (!e.repeat) intents.meleePress();
      return;
    }
    if (INTERACT_KEYS.has(e.code)) {
      if (!e.repeat) intents.interactPress();
      return;
    }
    const ability = ABILITY_KEYS[e.code];
    if (ability) {
      if (!e.repeat) intents.pressAbility(ability);
      return;
    }
    if (DODGE_KEYS.has(e.code)) {
      if (!e.repeat) intents.pressDodge();
      return;
    }
    if (e.code in MOVE_KEYS) {
      held.add(e.code);
      sync();
    }
  };
  const up = (e: KeyboardEvent): void => {
    if (MELEE_KEYS.has(e.code)) intents.meleeRelease();
    if (INTERACT_KEYS.has(e.code)) intents.interactRelease();
    if (held.delete(e.code)) sync();
  };
  // Releasing keys while the window is unfocused must not leave the fighter running.
  const blur = (): void => {
    held.clear();
    sync();
    intents.meleeRelease();
    intents.interactRelease();
  };
  target.addEventListener('keydown', down);
  target.addEventListener('keyup', up);
  target.addEventListener('blur', blur);
  return () => {
    target.removeEventListener('keydown', down);
    target.removeEventListener('keyup', up);
    target.removeEventListener('blur', blur);
  };
}

/** Keyboard + mouse preset: left click = melee (CONTROL_SCHEME §4). Touch is handled by the touch controls. */
export function attachMouse(target: HTMLElement, intents: PlayerIntents): () => void {
  const down = (e: PointerEvent): void => {
    if (e.pointerType === 'mouse' && e.button === 0) intents.meleePress();
  };
  const up = (e: PointerEvent): void => {
    if (e.pointerType === 'mouse' && e.button === 0) intents.meleeRelease();
  };
  target.addEventListener('pointerdown', down);
  window.addEventListener('pointerup', up);
  return () => {
    target.removeEventListener('pointerdown', down);
    window.removeEventListener('pointerup', up);
  };
}
