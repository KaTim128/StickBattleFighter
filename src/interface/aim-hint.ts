import type { AbilitySlot } from '../abilities/ability-def';
import { type Bindings, codeLabel, SLOT_ACTION } from '../input/bindings';

/**
 * Targeting instructions (owner, 12/11/2026: "Display clear WASD instructions on screen while
 * aiming"). Shown while the player picks a target for an aimed ability; also marks the page with
 * the `aiming` class so the touch ✕ (cancel) button appears. Presentation only.
 */
export class AimHint {
  private readonly el: HTMLDivElement;
  private shown = '';

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'aim-hint';
    this.el.hidden = true;
    this.el.setAttribute('role', 'status');
    parent.appendChild(this.el);
  }

  update(targeting: { slot: AbilitySlot; name: string } | null, touch: boolean, keys: Bindings): void {
    const text = targeting ? aimHintText(targeting, touch, keys) : '';
    if (text === this.shown) return;
    this.shown = text;
    this.el.hidden = !text;
    this.el.textContent = text;
    document.body.classList.toggle('aiming', Boolean(text));
  }
}

/** The instruction line for this device and the player's own keys. */
export function aimHintText(targeting: { slot: AbilitySlot; name: string }, touch: boolean, keys: Bindings): string {
  const verb = targeting.slot === 'ult' ? 'launch' : 'confirm';
  if (touch)
    return `${targeting.name}: move the target with the joystick · tap the button again to ${verb} · ✕ to cancel`;
  const k = codeLabel;
  const move = `${k(keys.moveUp)} ${k(keys.moveLeft)} ${k(keys.moveDown)} ${k(keys.moveRight)}`;
  return `${targeting.name}: ${move} to move the target · ${k(keys[SLOT_ACTION[targeting.slot]])} to ${verb} · Esc to cancel`;
}
