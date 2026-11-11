/**
 * Developer key bindings (Mobile Controls owns all device input, INV-6).
 * Backquote (`) toggles the debug overlay. Gameplay input arrives in Phase 2.
 */
export function onDebugToggle(target: Window, callback: () => void): () => void {
  const listener = (event: KeyboardEvent): void => {
    if (event.code === 'Backquote' && !event.repeat) callback();
  };
  target.addEventListener('keydown', listener);
  return () => target.removeEventListener('keydown', listener);
}
