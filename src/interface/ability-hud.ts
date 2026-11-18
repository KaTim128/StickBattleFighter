import type { AbilityHudState, AbilitySlotState } from '../abilities/ability-caster';
import { type Bindings, codeLabel, DEFAULT_BINDINGS, SLOT_ACTION } from '../input/bindings';
import { abilityIcon } from './ability-icons';

/**
 * Ability HUD (CONTROL_SCHEME §3, REQ-CTL): on desktop a bar at the bottom
 * centre shows each ability's key and name, cooldown sweeps, stamina costs and the ultimate
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
  private readonly notice: HTMLElement;
  private readonly infoButton: HTMLButtonElement;
  private readonly panel: HTMLElement;
  private lastCasting: string | null = null;
  private noticeTimer = 0;
  private latest: AbilityHudState | null = null;

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
      el.innerHTML = `<span class="ab-key">${codeLabel(this.keys()[SLOT_ACTION[slot]])}</span><span class="ab-icon"></span><span class="ab-name"></span><span class="ab-cost"></span>`;
      this.bar.appendChild(el);
      this.keyLabels.set(slot, el.querySelector<HTMLElement>('.ab-key')!);
      const button = root.querySelector<HTMLElement>(`.ability-button[data-slot="${slot}"]`);
      this.targets.set(slot, button ? [el, button] : [el]);
    }
    root.appendChild(this.bar);

    // A short notice with the name of the ability just cast (master plan B14).
    this.notice = document.createElement('div');
    this.notice.className = 'ability-notice';
    this.notice.setAttribute('aria-live', 'polite');
    this.notice.hidden = true;
    root.appendChild(this.notice);

    // An info control that never casts: it lists the equipped abilities, their keys, cooldowns and what they do.
    this.infoButton = document.createElement('button');
    this.infoButton.type = 'button';
    this.infoButton.className = 'ability-info-button';
    this.infoButton.textContent = 'i';
    this.infoButton.title = 'Ability info';
    this.infoButton.setAttribute('aria-label', 'Ability info');
    this.infoButton.tabIndex = -1; // Space and Enter belong to the game, never to this button
    this.infoButton.hidden = true;
    this.panel = document.createElement('div');
    this.panel.className = 'ability-info-panel';
    this.panel.hidden = true;
    const toggle = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      this.panel.hidden = !this.panel.hidden;
      if (!this.panel.hidden) this.fillPanel();
      this.infoButton.blur();
    };
    this.infoButton.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.infoButton.addEventListener('click', toggle);
    this.panel.addEventListener('pointerdown', (e) => e.stopPropagation());
    root.append(this.infoButton, this.panel);
  }

  private fillPanel(): void {
    const state = this.latest;
    this.panel.replaceChildren();
    if (!state) return;
    const keys = this.keys();
    const title = document.createElement('div');
    title.className = 'ability-info-title';
    title.textContent = 'Abilities';
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'ability-info-close';
    close.textContent = '✕';
    close.setAttribute('aria-label', 'Close');
    close.tabIndex = -1;
    close.addEventListener('click', (e) => {
      e.stopPropagation();
      this.panel.hidden = true;
    });
    title.append(close);
    this.panel.append(title);
    for (const s of state.slots) {
      const row = document.createElement('div');
      row.className = 'ability-info-row';
      const icon = abilityIcon(s.icon);
      const pic = document.createElement('span');
      pic.className = 'ab-icon';
      if (icon) pic.innerHTML = icon;
      const text = document.createElement('div');
      const key = codeLabel(keys[SLOT_ACTION[s.slot]]);
      const head = document.createElement('strong');
      head.textContent = `${s.name} `;
      const meta = document.createElement('span');
      meta.textContent =
        s.slot === 'ult' ? `[${key}] ultimate` : `[${key}] ${s.cooldownMaxS}s cooldown, ${s.staminaCost} stamina`;
      const desc = document.createElement('p');
      desc.textContent = s.description;
      text.append(head, meta, desc);
      row.append(pic, text);
      this.panel.append(row);
    }
  }

  update(state: AbilityHudState | null): void {
    this.bar.hidden = state === null;
    this.infoButton.hidden = state === null;
    this.latest = state;
    if (!state) {
      this.panel.hidden = true;
      return;
    }
    // The name of an ability appears briefly as it is cast.
    if (state.casting !== this.lastCasting) {
      this.lastCasting = state.casting;
      const cast = state.casting ? state.slots.find((s) => s.id === state.casting) : undefined;
      if (cast) {
        this.notice.textContent = cast.name;
        this.notice.hidden = false;
        this.notice.classList.remove('show');
        void this.notice.offsetWidth; // restart the fade
        this.notice.classList.add('show');
        clearTimeout(this.noticeTimer);
        this.noticeTimer = window.setTimeout(() => {
          this.notice.hidden = true;
        }, 1400);
      }
    }
    const keys = this.keys();
    if (keys !== this.shownKeys) {
      // Only when the bindings object changes (a rebind), never every frame.
      this.shownKeys = keys;
      for (const [slot, key] of this.keyLabels) key.textContent = codeLabel(keys[SLOT_ACTION[slot]]);
    }
    for (const s of state.slots) for (const el of this.targets.get(s.slot) ?? []) paint(el, s, state);
  }

  destroy(): void {
    clearTimeout(this.noticeTimer);
    this.notice.remove();
    this.infoButton.remove();
    this.panel.remove();
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
    const named = el.querySelector('.ab-name'); // the desktop bar spells the name out (B3); touch buttons stay icon-only
    if (named) named.textContent = s.name;
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
