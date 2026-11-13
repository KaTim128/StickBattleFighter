/** Input types where the keyboard writes text (a range slider or a checkbox is not one). */
const TEXT_INPUTS = new Set(['text', 'search', 'email', 'password', 'number', 'tel', 'url']);

/**
 * Is the player typing into this element (owner, 13/11/2026: "typing in the username field must
 * never trigger game controls")? Text inputs, text areas, drop-downs and editable content.
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (typeof HTMLElement === 'undefined' || !(target instanceof HTMLElement)) return false;
  if (target instanceof HTMLInputElement) return TEXT_INPUTS.has(target.type);
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  return target.isContentEditable;
}
