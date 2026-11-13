import { RATING_KEYS, RATING_LABELS } from '../characters/ratings';
import { abilityIcon } from './ability-icons';
import type { FighterSheet } from './fighter-sheet';

/**
 * A fighter's stats and abilities (owner, 12/11/2026), shared by the fighter select screen and the
 * admin fighter page: the six stat bars filling smoothly to their values, and every ability (and
 * the basic combo) as a button that opens its description, numbers and how to use it on this
 * device. Put `stats`, `heading` and `abilities` on the page, then call `animate()`.
 */
export function buildFighterInfo(sheet: FighterSheet): {
  stats: HTMLElement;
  heading: HTMLElement;
  abilities: HTMLElement;
  animate(): void;
} {
  const stats = document.createElement('div');
  stats.className = 'mm-d-stats';
  const fills: { el: HTMLElement; value: number }[] = [];
  for (const k of RATING_KEYS) {
    const value = Math.round(sheet.ratings[k]);
    const row = document.createElement('div');
    row.className = 'mm-d-stat';
    row.dataset.stat = k;
    const label = document.createElement('span');
    label.textContent = RATING_LABELS[k];
    const track = document.createElement('span');
    track.className = 'mm-d-track';
    const fill = document.createElement('span');
    fill.className = 'mm-d-fill';
    fill.dataset.value = String(value);
    track.append(fill);
    const num = document.createElement('b');
    num.textContent = String(value);
    row.append(label, track, num);
    stats.append(row);
    fills.push({ el: fill, value });
  }
  const heading = document.createElement('h3');
  heading.className = 'mm-d-ab-heading';
  heading.textContent = 'Abilities';
  const abilities = document.createElement('div');
  abilities.className = 'mm-d-abilities';
  for (const a of sheet.abilities) {
    const item = document.createElement('div');
    item.className = 'mm-d-ab';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mm-d-ab-btn';
    btn.dataset.ability = a.slot;
    btn.setAttribute('aria-expanded', 'false');
    const icon = document.createElement('span');
    icon.className = 'mm-d-ab-icon';
    const svg = a.icon ? abilityIcon(a.icon) : null;
    if (svg) icon.innerHTML = svg;
    else icon.textContent = '✊';
    const label = document.createElement('span');
    label.className = 'mm-d-ab-name';
    label.textContent = a.name;
    const key = document.createElement('kbd');
    key.textContent = a.key;
    btn.append(icon, label, key);
    const info = document.createElement('div');
    info.className = 'mm-d-ab-info';
    info.hidden = true;
    const desc = document.createElement('p');
    desc.textContent = a.description;
    const list = document.createElement('dl');
    for (const s of a.stats) {
      const dt = document.createElement('dt');
      dt.textContent = s.label;
      const dd = document.createElement('dd');
      dd.textContent = s.value;
      list.append(dt, dd);
    }
    const how = document.createElement('p');
    how.className = 'mm-d-how';
    const strong = document.createElement('strong');
    strong.textContent = 'How to use: ';
    how.append(strong, a.howTo);
    info.append(desc, list, how);
    btn.addEventListener('click', () => {
      const open = info.hidden;
      for (const other of abilities.querySelectorAll<HTMLElement>('.mm-d-ab-info')) other.hidden = true;
      for (const other of abilities.querySelectorAll<HTMLElement>('.mm-d-ab-btn'))
        other.setAttribute('aria-expanded', 'false');
      info.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
    });
    item.append(btn, info);
    abilities.append(item);
  }
  // Fill each bar from empty to its value, smoothly and one after another.
  const animate = (): void => {
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        fills.forEach(({ el, value }, i) => {
          el.style.transitionDelay = `${i * 70}ms`;
          el.style.width = `${value}%`;
        });
      }),
    );
  };
  return { stats, heading, abilities, animate };
}
