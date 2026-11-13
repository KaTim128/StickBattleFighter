/**
 * Fighter settings panel (owner, 13/11/2026): opened from a fighter's details in the menu, it edits
 * that fighter's appearance, stats, moves and abilities (Move Config) and other settings without
 * leaving the page. The panel only shows fields and collects values; what the fields are and how
 * the values are checked and kept is the host's business (`src/app/fighter-settings.ts`).
 */
export interface ConfigField {
  readonly key: string;
  readonly label: string;
  readonly kind: 'number' | 'text' | 'colour' | 'bool';
  readonly value: string | number | boolean;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  /** Differs from the built-in fighter. */
  readonly changed?: boolean;
}

export interface ConfigGroup {
  readonly title: string;
  readonly fields: readonly ConfigField[];
}

export interface ConfigTab {
  readonly id: 'appearance' | 'stats' | 'moves' | 'other';
  readonly label: string;
  readonly groups: readonly ConfigGroup[];
}

export interface FighterConfigHost {
  tabs(fighterId: string): readonly ConfigTab[];
  /** Check and keep the values; returns what is wrong (empty when saved). */
  save(fighterId: string, values: Readonly<Record<string, string | number | boolean>>): readonly string[];
  /** Back to the built-in fighter. */
  reset(fighterId: string): void;
}

export function renderConfigPanel(
  host: FighterConfigHost,
  fighterId: string,
  startTab: ConfigTab['id'],
  onClose: (saved: boolean) => void,
): HTMLElement {
  const panel = document.createElement('div');
  panel.className = 'fc-panel';
  const tabs = host.tabs(fighterId);
  const values: Record<string, string | number | boolean> = {};
  for (const t of tabs) for (const g of t.groups) for (const f of g.fields) values[f.key] = f.value;

  const bar = document.createElement('div');
  bar.className = 'fc-tabs';
  bar.setAttribute('role', 'tablist');
  const body = document.createElement('div');
  body.className = 'fc-body';
  const message = document.createElement('div');
  message.className = 'fc-message';
  message.setAttribute('role', 'status');

  const show = (id: ConfigTab['id']): void => {
    for (const b of bar.querySelectorAll<HTMLElement>('button')) b.classList.toggle('active', b.dataset.tab === id);
    body.replaceChildren();
    const tab = tabs.find((t) => t.id === id) ?? tabs[0];
    if (!tab) return;
    tab.groups.forEach((g, gi) => {
      const box = document.createElement('details');
      box.className = 'fc-group';
      box.open = tab.groups.length <= 3 || gi === 0;
      const sum = document.createElement('summary');
      sum.textContent = g.title;
      box.append(sum);
      const grid = document.createElement('div');
      grid.className = 'fc-fields';
      for (const f of g.fields) grid.append(fieldRow(f, values));
      box.append(grid);
      body.append(box);
    });
  };
  for (const t of tabs) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.tab = t.id;
    b.textContent = t.label;
    b.setAttribute('role', 'tab');
    b.addEventListener('click', () => show(t.id));
    bar.append(b);
  }

  const actions = document.createElement('div');
  actions.className = 'fc-actions';
  const close = button('fc-close', 'Close', () => onClose(false));
  const reset = button('fc-reset', 'Reset to default', () => {
    host.reset(fighterId);
    onClose(true);
  });
  const save = button('fc-save', 'Save changes', () => {
    const errors = host.save(fighterId, values);
    if (errors.length === 0) {
      onClose(true);
      return;
    }
    message.textContent = `Not saved: ${errors.slice(0, 3).join(' ')}`;
    message.classList.add('error');
  });
  actions.append(close, reset, save);
  panel.append(bar, body, message, actions);
  show(startTab);
  return panel;
}

function fieldRow(f: ConfigField, values: Record<string, string | number | boolean>): HTMLElement {
  const row = document.createElement('label');
  row.className = 'fc-field';
  if (f.changed) row.classList.add('changed');
  const name = document.createElement('span');
  name.textContent = f.label;
  const input = document.createElement('input');
  input.dataset.key = f.key;
  if (f.kind === 'bool') {
    input.type = 'checkbox';
    input.checked = Boolean(f.value);
    input.addEventListener('change', () => {
      values[f.key] = input.checked;
    });
  } else if (f.kind === 'number') {
    input.type = 'number';
    input.inputMode = 'decimal';
    input.value = String(f.value);
    if (f.min !== undefined) input.min = String(f.min);
    if (f.max !== undefined) input.max = String(f.max);
    input.step = String(f.step ?? 'any');
    input.addEventListener('input', () => {
      const n = Number(input.value);
      if (input.value.trim() !== '' && Number.isFinite(n)) values[f.key] = n;
    });
  } else {
    input.type = f.kind === 'colour' ? 'color' : 'text';
    input.value = String(f.value);
    input.addEventListener('input', () => {
      values[f.key] = input.value;
    });
  }
  row.append(name, input);
  return row;
}

function button(cls: string, text: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = cls;
  b.textContent = text;
  b.addEventListener('click', onClick);
  return b;
}
