import type { AbilityHudState, AbilitySlotState } from '../abilities/ability-caster';
import { type Bindings, codeLabel, DEFAULT_BINDINGS, SLOT_ACTION } from '../input/bindings';
import { abilityIcon } from './ability-icons';

/**
 * Ability HUD (CONTROL_SCHEME §3, REQ-CTL): on desktop a bar at the bottom
 * centre shows the keys, names, cooldown sweeps, stamina costs and the ultimate
 * meter; on touch the same state is drawn onto the A1–A3 and ULT buttons (the
 * bar is hidden in touch mode). Read-only: it never changes gameplay.
 * Create it after the touch controls so it can find their buttons.
 */

export class AbilityHud {
  private readonly bar: HTMLElement;
  /** Desktop bar slot plus the matching touch button (if any), per slot. Looked up once. */
  private readonly targets = new Map<string, HTMLElement[]>();
  private readonly keyLabels = new Map<keyof typeof SLOT_ACTION, HTMLElement>();
  private shownKeys: Bindings | null = null;

  /** The key labels on the desktop bar follow the player's own bindings. */
  constructor(
    root: HTMLElement,
    private readonly keys: () => Bindings = () => DEFAULT_BINDINGS,
  ) {
    this.bar = document.createElement('div');
    this.bar.className = 'ability-bar';
    this.bar.hidden = true;
    for (const slot of ['a1', 'a2', 'a3', 'a4', 'ult'] as const) {
      const el = document.createElement('div');
      el.className = `ability-slot${slot === 'ult' ? ' ult' : ''}`;
      el.dataset.slot = slot;
      el.innerHTML = `<span class="ab-key">${codeLabel(this.keys()[SLOT_ACTION[slot]])}</span><span class="ab-icon"></span><span class="ab-cost"></span>`;
      this.bar.appendChild(el);
      this.keyLabels.set(slot, el.querySelector<HTMLElement>('.ab-key')!);
      const button = root.querySelector<HTMLElement>(`.ability-button[data-slot="${slot}"]`);
      this.targets.set(slot, button ? [el, button] : [el]);
    }
    root.appendChild(this.bar);
  }

  update(state: AbilityHudState | null): void {
    this.bar.hidden = state === null;
    if (!state) return;
    const keys = this.keys();
    if (keys !== this.shownKeys) {
      // Only when the bindings object changes (a rebind), never every frame.
      this.shownKeys = keys;
      for (const [slot, key] of this.keyLabels) key.textContent = codeLabel(keys[SLOT_ACTION[slot]]);
    }
    for (const s of state.slots) for (const el of this.targets.get(s.slot) ?? []) paint(el, s, state);
  }

  destroy(): void {
    this.bar.remove();
  }
}

/** Cooldown sweep, unaffordable dimming, and the ultimate's meter and "ready" glow. */
function paint(el: HTMLElement, s: AbilitySlotState, state: AbilityHudState): void {
  const isUlt = s.slot === 'ult';
  const cooling = s.cooldownS > 0 && s.cooldownMaxS > 0 ? s.cooldownS / s.cooldownMaxS : 0;
  const fill = isUlt ? Math.min(1, state.meter / state.meterMax) : 1 - cooling;
  el.style.setProperty('--fill', `${(fill * 100).toFixed(1)}%`);
  el.classList.toggle('cooling', !isUlt && cooling > 0);
  el.classList.toggle('no-stamina', s.block === 'stamina');
  el.classList.toggle('ready', s.block === null);
  el.classList.toggle('casting', state.casting !== null);
  // The ability's picture (its name stays as the tooltip and for screen readers).
  if (el.dataset.ability !== s.name) {
    el.dataset.ability = s.name;
    el.title = s.name;
    el.setAttribute('aria-label', s.name);
    const icon = abilityIcon(s.icon);
    const holder = el.classList.contains('ability-button') ? el : el.querySelector('.ab-icon');
    if (holder && icon) {
      if (holder === el) el.innerHTML = `<span class="ab-icon">${icon}</span><span class="ab-ult"></span>`;
      else holder.innerHTML = icon;
    } else if (holder && holder !== el) holder.textContent = s.label;
  }
  const cost = el.querySelector('.ab-cost');
  if (cost) {
    const text = isUlt
      ? `${Math.floor(state.meter)}%`
      : s.cooldownS > 0
        ? `${s.cooldownS.toFixed(1)}s`
        : `${s.staminaCost} ST`;
    if (cost.textContent !== text) cost.textContent = text;
  }
  if (el.classList.contains('ability-button')) {
    if (!el.querySelector('.ab-icon')) {
      const label = isUlt && s.block === null ? 'ULT!' : s.label;
      if (el.textContent !== label) el.textContent = label;
    } else if (isUlt) {
      // Over the ultimate's icon: a small READY when the meter is full.
      const tag = el.querySelector('.ab-ult');
      const text = s.block === null ? 'READY' : '';
      if (tag && tag.textContent !== text) tag.textContent = text;
    }
  }
}
