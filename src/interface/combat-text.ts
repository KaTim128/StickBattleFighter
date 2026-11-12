import type { CombatEvent } from '../combat/events';

/**
 * Floating combat text (PRS-4): damage numbers and callouts that pop at the
 * hit point and drift up as they fade. Original styling; HUD owner.
 * Positions are taken once at spawn (the callouts are brief).
 */
const STYLE: Record<CombatEvent['kind'], { text: (e: CombatEvent) => string; cls: string }> = {
  hit: { text: (e) => `-${e.amount}`, cls: 'ct-hit' },
  crit: { text: (e) => `CRIT -${e.amount}`, cls: 'ct-crit' },
  blocked: { text: () => 'BLOCKED', cls: 'ct-blocked' },
  parried: { text: () => 'PARRY!', cls: 'ct-parry' },
  guardBreak: { text: () => 'GUARD BREAK', cls: 'ct-break' },
  dodged: { text: () => 'DODGE', cls: 'ct-dodge' },
  ko: { text: () => 'KO!', cls: 'ct-ko' },
  burn: { text: (e) => `-${e.amount}`, cls: 'ct-burn' },
  combo: { text: (e) => `${e.amount} HIT COMBO`, cls: 'ct-combo' },
  miss: { text: () => 'MISS', cls: 'ct-miss' },
};

const MAX_LIVE = 24;
const LIFETIME_MS = 900;

export class CombatText {
  private readonly layer: HTMLDivElement;

  constructor(root: HTMLElement) {
    this.layer = document.createElement('div');
    this.layer.className = 'combat-text-layer';
    root.appendChild(this.layer);
  }

  show(events: readonly CombatEvent[], toScreen: (x: number, y: number) => { x: number; y: number } | null): void {
    for (const e of events) {
      const at = toScreen(e.x, e.y);
      if (!at) continue;
      while (this.layer.childElementCount >= MAX_LIVE) this.layer.firstElementChild?.remove();
      const style = STYLE[e.kind];
      const el = document.createElement('div');
      el.className = `combat-text ${style.cls}`;
      el.textContent = style.text(e);
      el.style.left = `${at.x + (Math.random() - 0.5) * 24}px`;
      el.style.top = `${at.y}px`;
      this.layer.appendChild(el);
      window.setTimeout(() => el.remove(), LIFETIME_MS);
    }
  }
}
