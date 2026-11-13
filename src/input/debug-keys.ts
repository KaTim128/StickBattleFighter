/**
 * Developer key bindings (Mobile Controls owns all device input, INV-6).
 * Backquote (`) toggles the debug overlay. While the overlay is on, P fires a
 * test camera impact (shake + zoom punch) until combat can trigger real ones.
 */
export function onDebugToggle(target: Window, callback: () => void): () => void {
  return onKey(target, 'Backquote', callback);
}

export function onDebugImpact(target: Window, callback: () => void): () => void {
  return onKey(target, 'KeyP', callback);
}

/** T toggles the dummy's attacks (Practice Zone option, REQ-MOD-5; becomes a menu setting in Phase 10/13). */
export function onToggleDummyAttacks(target: Window, callback: () => void): () => void {
  return onKey(target, 'KeyT', callback);
}

/** M mutes or unmutes sound (a setting in Phase 11). */
export function onToggleMute(target: Window, callback: () => void): () => void {
  return onKey(target, 'KeyM', callback);
}

/** The first key or pointer press (browsers only allow audio to start after one). */
export function onFirstInput(target: Window, callback: () => void): void {
  const once = (): void => {
    target.removeEventListener('keydown', once);
    target.removeEventListener('pointerdown', once);
    callback();
  };
  target.addEventListener('keydown', once);
  target.addEventListener('pointerdown', once);
}

function onKey(target: Window, code: string, callback: () => void): () => void {
  const listener = (event: KeyboardEvent): void => {
    // Typing in a text box (the player's name) never triggers a hotkey.
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
    if (event.code === code && !event.repeat) callback();
  };
  target.addEventListener('keydown', listener);
  return () => target.removeEventListener('keydown', listener);
}
