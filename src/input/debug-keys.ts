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

function onKey(target: Window, code: string, callback: () => void): () => void {
  const listener = (event: KeyboardEvent): void => {
    if (event.code === code && !event.repeat) callback();
  };
  target.addEventListener('keydown', listener);
  return () => target.removeEventListener('keydown', listener);
}
