import { ABILITY_KITS } from '../abilities/kits';
import { CLIPS } from '../animation/clips';
import { hasSound } from '../audio/sound-board';
import { saveDraft } from '../characters/draft';
import { BUILT_IN_LIBRARY, DEFAULT_CAST, FALLBACK_CHARACTER, withEntries } from '../characters/library';
import { resolveCharacter, STRIKE_STATES } from '../characters/resolve';
import {
  ANIMATION_STATES,
  type AnimationProfile,
  type AnimationState,
  CAPABILITY_KEYS,
  type CharacterDefinition,
  type CharacterLibrary,
  LIMITS,
  MOVE_INPUTS,
  type MoveDef,
  type MovesetProfile,
} from '../characters/schema';
import { validateCharacter } from '../characters/validate';
import { EFFECTS } from '../vfx/effects-library';
import { CharacterPreview } from './preview';

/**
 * ADMIN CHARACTER EDITOR (TD-039). A local, validated editor for Character
 * Definitions and their profiles: create, duplicate, assign profiles, toggle
 * capabilities, tune stats and moves, map animation states (showing each
 * state's fallback tier), pick effects and sounds, preview animations with
 * hit areas, validate, export JSON, and try the draft in the game.
 * Nothing is sent anywhere: export the JSON and commit it to publish.
 */
type Table = keyof CharacterLibrary;
type Entry = { id: string } & Record<string, unknown>;

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

/** The working copy: built-in data plus every entry edited or created here. */
const edits: { [K in Table]: Record<string, Entry> } = {
  characters: {},
  animation: {},
  moveset: {},
  stats: {},
  effects: {},
  audio: {},
  ai: {},
};
let selected: string = DEFAULT_CAST.player;
let tab = 'Definition';
const preview = new CharacterPreview($('preview'));

function library(): CharacterLibrary {
  return withEntries(
    BUILT_IN_LIBRARY,
    Object.fromEntries(Object.entries(edits).map(([k, v]) => [k, Object.values(v)])),
  );
}

/** Get an entry for editing (copying a built-in one into the working copy first). */
function editable<T>(table: Table, id: string): T {
  if (!edits[table][id]) {
    const src = (library()[table] as Record<string, unknown>)[id];
    if (!src) throw new Error(`${table} "${id}" not found`);
    edits[table][id] = clone(src) as unknown as Entry;
  }
  return edits[table][id] as unknown as T;
}

function definition(): CharacterDefinition {
  return editable<CharacterDefinition>('characters', selected);
}

// ------------------------------------------------------------------ list, create, duplicate

function renderList(): void {
  const list = $('list');
  list.innerHTML = '';
  for (const id of Object.keys(library().characters)) {
    const b = document.createElement('button');
    b.textContent = `${library().characters[id]!.displayName} (${id})`;
    b.className = id === selected ? 'active' : '';
    b.onclick = () => select(id);
    list.appendChild(b);
  }
}

function select(id: string): void {
  selected = id;
  refresh();
}

/** Copy a character and all of its own profiles under a new id (shared profiles stay shared). */
function duplicate(fromId: string, newId: string, name: string): void {
  const lib = library();
  const src = clone(lib.characters[fromId]!) as CharacterDefinition & Entry;
  const shared = (pid: string) => pid.startsWith('shared') || pid.startsWith('default') || pid.startsWith('style-');
  const profiles = { ...src.profiles };
  for (const [field, table] of [
    ['animation', 'animation'],
    ['moveset', 'moveset'],
    ['stats', 'stats'],
    ['effects', 'effects'],
    ['audio', 'audio'],
    ['ai', 'ai'],
  ] as const) {
    const pid = src.profiles[field];
    if (shared(pid)) continue;
    const copy = clone((lib[table] as unknown as Record<string, Entry>)[pid]!) as unknown as Entry;
    copy.id = `${newId}-${field}`;
    edits[table][copy.id] = copy;
    profiles[field] = copy.id;
  }
  edits.characters[newId] = {
    ...src,
    id: newId,
    displayName: name,
    template: fromId === FALLBACK_CHARACTER ? FALLBACK_CHARACTER : src.template,
    profiles,
  } as unknown as Entry;
  select(newId);
}

$('new').onclick = () => {
  const id = prompt('New character id (lowercase, dashes):', 'new-fighter');
  if (id && /^[a-z0-9-]+$/.test(id) && !library().characters[id]) duplicate(FALLBACK_CHARACTER, id, id);
};
$('duplicate').onclick = () => {
  const id = prompt('Id for the copy:', `${selected}-copy`);
  if (id && /^[a-z0-9-]+$/.test(id) && !library().characters[id])
    duplicate(selected, id, `${library().characters[selected]!.displayName} copy`);
};

// ------------------------------------------------------------------ small form helpers

function row(parent: HTMLElement, label: string, input: HTMLElement): void {
  const l = document.createElement('label');
  l.className = 'row';
  const s = document.createElement('span');
  s.textContent = label;
  l.append(s, input);
  parent.appendChild(l);
}

function numberInput(
  value: number,
  onChange: (v: number) => void,
  limit?: readonly [number, number],
  step = 0.01,
): HTMLInputElement {
  const i = document.createElement('input');
  i.type = 'number';
  i.step = String(step);
  i.value = String(value);
  if (limit) {
    i.min = String(limit[0]);
    i.max = String(limit[1]);
    i.title = `Allowed: ${limit[0]}–${limit[1]}`;
  }
  i.onchange = () => {
    onChange(Number(i.value));
    changed();
  };
  return i;
}

function textInput(value: string, onChange: (v: string) => void): HTMLInputElement {
  const i = document.createElement('input');
  i.value = value;
  i.onchange = () => {
    onChange(i.value);
    changed();
  };
  return i;
}

function selectInput(value: string, options: readonly string[], onChange: (v: string) => void): HTMLSelectElement {
  const s = document.createElement('select');
  for (const o of options) {
    const opt = document.createElement('option');
    opt.value = o;
    opt.textContent = o === '' ? '(inherit)' : o;
    s.appendChild(opt);
  }
  s.value = value;
  s.onchange = () => {
    onChange(s.value);
    changed();
  };
  return s;
}

function fieldset(parent: HTMLElement, title: string): HTMLFieldSetElement {
  const f = document.createElement('fieldset');
  const l = document.createElement('legend');
  l.textContent = title;
  f.appendChild(l);
  parent.appendChild(f);
  return f;
}

// ------------------------------------------------------------------ tabs

const TABS = ['Definition', 'Capabilities', 'Stats', 'Moves', 'Animation', 'Effects', 'Audio', 'AI', 'JSON'] as const;

function renderEditor(): void {
  const root = $('editor');
  root.innerHTML = '';
  const tabs = document.createElement('div');
  tabs.className = 'tabs';
  for (const t of TABS) {
    const b = document.createElement('button');
    b.textContent = t;
    b.className = t === tab ? 'active' : '';
    b.onclick = () => {
      tab = t;
      renderEditor();
    };
    tabs.appendChild(b);
  }
  root.appendChild(tabs);
  const def = definition();
  const lib = library();
  switch (tab) {
    case 'Definition': {
      const f = fieldset(root, 'Identity');
      row(
        f,
        'Id',
        textInput(def.id, () => {}),
      );
      (f.querySelector('input') as HTMLInputElement).disabled = true;
      row(
        f,
        'Display name',
        textInput(def.displayName, (v) => ((def as { displayName: string }).displayName = v)),
      );
      row(
        f,
        'Description',
        textInput(def.description, (v) => ((def as { description: string }).description = v)),
      );
      row(
        f,
        'Character type',
        selectInput(
          def.characterType,
          ['fighter', 'boss', 'training'],
          (v) => ((def as unknown as Entry).characterType = v),
        ),
      );
      row(
        f,
        'Element',
        selectInput(
          def.element,
          ['none', 'fire', 'electric', 'ice', 'shadow', 'earth'],
          (v) => ((def as unknown as Entry).element = v),
        ),
      );
      row(
        f,
        'Combat style',
        textInput(def.combatStyle, (v) => ((def as unknown as Entry).combatStyle = v)),
      );
      const p = fieldset(root, 'Profiles');
      for (const [field, table] of [
        ['animation', 'animation'],
        ['moveset', 'moveset'],
        ['stats', 'stats'],
        ['effects', 'effects'],
        ['audio', 'audio'],
        ['ai', 'ai'],
      ] as const) {
        row(
          p,
          `${field} profile`,
          selectInput(
            def.profiles[field],
            Object.keys(lib[table]),
            (v) => ((def.profiles as Record<string, string>)[field] = v),
          ),
        );
      }
      row(
        p,
        'Ability kit',
        selectInput(
          def.abilityKit ?? '',
          ['', ...Object.keys(ABILITY_KITS)],
          (v) => ((def as unknown as Entry).abilityKit = v || null),
        ),
      );
      const r = fieldset(root, 'Rig and colours');
      for (const k of ['colour', 'colourBack', 'outline'] as const) {
        const c = document.createElement('input');
        c.type = 'color';
        c.value = def.rig[k];
        c.onchange = () => {
          (def.rig as unknown as Record<string, string>)[k] = c.value;
          changed();
        };
        row(r, k, c);
      }
      for (const [k, v] of Object.entries(def.rig.bones)) {
        row(
          r,
          `bone ${k} (m)`,
          numberInput(v, (n) => ((def.rig.bones as Record<string, number>)[k] = n), LIMITS.boneM),
        );
      }
      const u = fieldset(root, 'Unlock and progression (server-validated in Phase 14)');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = def.unlock.unlockedByDefault;
      cb.onchange = () => {
        (def.unlock as unknown as Entry).unlockedByDefault = cb.checked;
        changed();
      };
      row(u, 'Unlocked by default', cb);
      row(
        u,
        'Token cost (in-game tokens)',
        numberInput(def.unlock.tokenCost, (n) => ((def.unlock as unknown as Entry).tokenCost = n), [0, 100000], 1),
      );
      row(
        u,
        'Requirement',
        textInput(def.unlock.requirement, (v) => ((def.unlock as unknown as Entry).requirement = v)),
      );
      break;
    }
    case 'Capabilities': {
      const f = fieldset(root, 'Capabilities (switching one off removes the moves and states that need it)');
      const grid = document.createElement('div');
      grid.className = 'caps';
      for (const k of CAPABILITY_KEYS) {
        const l = document.createElement('label');
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = def.capabilities[k] === true;
        cb.onchange = () => {
          (def.capabilities as Record<string, boolean>)[k] = cb.checked;
          changed();
        };
        l.append(cb, ` ${k}`);
        grid.appendChild(l);
      }
      f.appendChild(grid);
      break;
    }
    case 'Stats': {
      const s = editable<Record<string, unknown>>('stats', def.profiles.stats);
      const f = fieldset(root, `Stats profile "${def.profiles.stats}"`);
      const scalar: [string, keyof typeof LIMITS][] = [
        ['maxHp', 'maxHp'],
        ['maxStamina', 'maxStamina'],
        ['staminaRegenPerS', 'staminaRegenPerS'],
        ['staminaRegenDelayS', 'staminaRegenDelayS'],
        ['power', 'power'],
        ['defence', 'defence'],
        ['critChance', 'critChance'],
        ['critMultiplier', 'critMultiplier'],
        ['knockbackResistance', 'knockbackResistance'],
        ['hitStunResistance', 'hitStunResistance'],
      ];
      for (const [k, lim] of scalar)
        row(
          f,
          k,
          numberInput(s[k] as number, (n) => (s[k] = n), LIMITS[lim]),
        );
      const m = fieldset(root, 'Movement');
      const mv = s.movement as Record<string, number>;
      const ml: Record<string, keyof typeof LIMITS> = {
        maxSpeedMps: 'maxSpeedMps',
        accelMps2: 'accelMps2',
        decelMps2: 'decelMps2',
        jumpSpeedMps: 'jumpSpeedMps',
        gravityMps2: 'gravityMps2',
      };
      for (const k of Object.keys(mv))
        row(
          m,
          k,
          numberInput(mv[k]!, (n) => (mv[k] = n), LIMITS[ml[k] ?? 'multiplier']),
        );
      const b = s.body as Record<string, number>;
      row(
        m,
        'footRadiusM',
        numberInput(b.footRadiusM!, (n) => (b.footRadiusM = n), LIMITS.footRadiusM),
      );
      row(
        m,
        'massKg',
        numberInput(b.massKg!, (n) => (b.massKg = n), LIMITS.massKg, 1),
      );
      const mu = fieldset(root, 'Multipliers');
      const mult = s.multipliers as Record<string, number>;
      for (const k of Object.keys(mult))
        row(
          mu,
          k,
          numberInput(mult[k]!, (n) => (mult[k] = n), LIMITS.multiplier),
        );
      break;
    }
    case 'Moves': {
      const set = editable<MovesetProfile>('moveset', def.profiles.moveset);
      const f = fieldset(root, `Moveset "${set.id}": starters`);
      const ids = set.moves.map((m) => m.id);
      for (const input of MOVE_INPUTS) {
        row(
          f,
          input,
          selectInput(set.starters[input] ?? '', ['', ...ids], (v) => {
            const st = set.starters as Record<string, string | undefined>;
            if (v) st[input] = v;
            else delete st[input];
          }),
        );
      }
      const t = fieldset(root, 'Moves (seconds; damage before multipliers)');
      const table = document.createElement('table');
      const cols: [keyof MoveDef | 'reach' | 'radius', string][] = [
        ['id', 'id'],
        ['animationState', 'animation'],
        ['category', 'type'],
        ['heavy', 'heavy'],
        ['aerial', 'air'],
        ['startupS', 'startup'],
        ['activeS', 'active'],
        ['recoveryS', 'recovery'],
        ['cancelAt', 'cancel'],
        ['reach', 'reach'],
        ['radius', 'radius'],
        ['damage', 'dmg'],
        ['knockbackMps', 'knock'],
        ['next', 'next (tap)'],
      ];
      table.innerHTML = `<tr>${cols.map(([, h]) => `<th>${h}</th>`).join('')}</tr>`;
      for (const m of set.moves as MoveDef[]) {
        const tr = document.createElement('tr');
        const w = m as unknown as Record<string, unknown>;
        for (const [k] of cols) {
          const td = document.createElement('td');
          if (k === 'id') td.textContent = m.id;
          else if (k === 'animationState')
            td.appendChild(selectInput(m.animationState, [...STRIKE_STATES], (v) => (w.animationState = v)));
          else if (k === 'category')
            td.appendChild(selectInput(m.category, ['punch', 'kick'], (v) => (w.category = v)));
          else if (k === 'heavy' || k === 'aerial') {
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.checked = Boolean(w[k]);
            cb.onchange = () => {
              w[k] = cb.checked;
              changed();
            };
            td.appendChild(cb);
          } else if (k === 'reach')
            td.appendChild(
              numberInput(m.hitbox.reachM, (n) => ((m.hitbox as unknown as Entry).reachM = n), LIMITS.reachM),
            );
          else if (k === 'radius')
            td.appendChild(
              numberInput(m.hitbox.radiusM, (n) => ((m.hitbox as unknown as Entry).radiusM = n), LIMITS.radiusM),
            );
          else if (k === 'next') {
            td.appendChild(
              selectInput(m.next?.tap ?? '', ['', ...ids.filter((x) => x !== m.id)], (v) => {
                const next = { ...(m.next ?? {}) } as Record<string, string>;
                if (v) next.tap = v;
                else delete next.tap;
                w.next = next;
              }),
            );
          } else {
            const lim: Record<string, keyof typeof LIMITS> = {
              startupS: 'moveTimeS',
              activeS: 'moveTimeS',
              recoveryS: 'moveRecoveryS',
              cancelAt: 'cancelAt',
              damage: 'damage',
              knockbackMps: 'knockbackMps',
            };
            td.appendChild(numberInput(w[k] as number, (n) => (w[k] = n), LIMITS[lim[k] ?? 'damage']));
          }
          tr.appendChild(td);
        }
        tr.onclick = () => preview.showMove(m.id);
        table.appendChild(tr);
      }
      t.appendChild(table);
      break;
    }
    case 'Animation': {
      const prof = editable<AnimationProfile>('animation', def.profiles.animation);
      const resolved = resolveCharacter(selected, lib);
      const f = fieldset(root, `Animation profile "${prof.id}" (extends "${prof.extends ?? 'shared-default'}")`);
      row(
        f,
        'Extends (fallback)',
        selectInput(
          prof.extends ?? '',
          ['', ...Object.keys(lib.animation).filter((x) => x !== prof.id)],
          (v) => ((prof as unknown as Entry).extends = v || undefined),
        ),
      );
      const table = document.createElement('table');
      table.innerHTML = '<tr><th>State</th><th>Clip (this profile)</th><th>Resolves to</th><th>From</th></tr>';
      for (const state of ANIMATION_STATES) {
        const tr = document.createElement('tr');
        const own = prof.states[state];
        const strike = STRIKE_STATES.has(state);
        const options = ['', ...Object.keys(CLIPS).filter((c) => (CLIPS[c]!.kind === 'strike') === strike)];
        const td1 = document.createElement('td');
        td1.textContent = state;
        const td2 = document.createElement('td');
        td2.appendChild(
          selectInput(typeof own === 'string' ? own : (own?.[0] ?? ''), options, (v) => {
            const st = prof.states as Record<string, unknown>;
            if (v) st[state] = v;
            else delete st[state];
          }),
        );
        const td3 = document.createElement('td');
        td3.textContent = resolved.animation.clipIds[state].join(', ');
        const td4 = document.createElement('td');
        const src = resolved.animation.source[state];
        td4.innerHTML = `<span class="tier ${src}">${src}</span>`;
        tr.append(td1, td2, td3, td4);
        tr.onclick = () => preview.showState(state as AnimationState);
        table.appendChild(tr);
      }
      f.appendChild(table);
      break;
    }
    case 'Effects': {
      const fx = editable<Record<string, unknown>>('effects', def.profiles.effects);
      const f = fieldset(root, `Effects profile "${def.profiles.effects}"`);
      const ids = Object.keys(EFFECTS);
      for (const k of [
        'punchImpact',
        'kickImpact',
        'heavyImpact',
        'blockImpact',
        'clash',
        'finisher',
        'disintegration',
      ]) {
        row(
          f,
          k,
          selectInput(fx[k] as string, ids, (v) => (fx[k] = v)),
        );
      }
      for (const k of ['limbTrail', 'aura'])
        row(
          f,
          k,
          selectInput((fx[k] as string) ?? '', ['', ...ids], (v) => (fx[k] = v || null)),
        );
      const c = document.createElement('input');
      c.type = 'color';
      c.value = fx.flashColour as string;
      c.onchange = () => {
        fx.flashColour = c.value;
        changed();
      };
      row(f, 'flashColour', c);
      row(
        f,
        'shakeScale',
        numberInput(fx.shakeScale as number, (n) => (fx.shakeScale = n), LIMITS.shakeScale),
      );
      row(
        f,
        'hitstopScale',
        numberInput(fx.hitstopScale as number, (n) => (fx.hitstopScale = n), LIMITS.hitstopScale),
      );
      break;
    }
    case 'Audio': {
      const au = editable<Record<string, unknown>>('audio', def.profiles.audio);
      const f = fieldset(
        root,
        `Audio profile "${def.profiles.audio}" (comma-separated sound ids; one is picked at random each time)`,
      );
      for (const [k, v] of Object.entries(au)) {
        if (k === 'id' || !Array.isArray(v)) continue;
        const i = textInput(
          (v as string[]).join(', '),
          (s) =>
            (au[k] = s
              .split(',')
              .map((x) => x.trim())
              .filter(Boolean)),
        );
        i.style.width = '100%';
        i.title = (v as string[]).map((sid) => `${sid}${hasSound(sid) ? '' : ' (unknown!)'}`).join('\n');
        row(f, k, i);
      }
      break;
    }
    case 'AI': {
      const ai = editable<Record<string, unknown>>('ai', def.profiles.ai);
      const f = fieldset(root, `AI behaviour profile "${def.profiles.ai}"`);
      const lim: Record<string, keyof typeof LIMITS> = {
        attackEveryS: 'attackEveryS',
        aggression: 'aggression',
        clashMashRate: 'clashMashRate',
        settleDecelMps2: 'settleDecelMps2',
        reactionS: 'reactionS',
      };
      for (const [k, v] of Object.entries(ai))
        if (typeof v === 'number')
          row(
            f,
            k,
            numberInput(v, (n) => (ai[k] = n), LIMITS[lim[k] ?? 'multiplier']),
          );
      break;
    }
    case 'JSON': {
      const ta = document.createElement('textarea');
      ta.value = JSON.stringify(bundle(), null, 2);
      const apply = document.createElement('button');
      apply.textContent = 'Apply JSON';
      apply.onclick = () => {
        try {
          const b = JSON.parse(ta.value) as ReturnType<typeof bundle>;
          edits.characters[b.character.id as string] = b.character as unknown as Entry;
          for (const [table, entry] of Object.entries(b.profiles))
            if (entry) edits[table as Table][(entry as unknown as Entry).id] = entry as unknown as Entry;
          selected = b.character.id as string;
          refresh();
        } catch (e) {
          alert(`That is not valid JSON: ${(e as Error).message}`);
        }
      };
      root.append(ta, apply);
      break;
    }
  }
}

// ------------------------------------------------------------------ validation, preview, export

/** The selected character with its own (non-shared) profiles, ready to save as files. */
function bundle(): { character: Entry; profiles: Partial<Record<Table, Entry>> } {
  const lib = library();
  const def = lib.characters[selected]!;
  const profiles: Partial<Record<Table, Entry>> = {};
  for (const [field, table] of [
    ['animation', 'animation'],
    ['moveset', 'moveset'],
    ['stats', 'stats'],
    ['effects', 'effects'],
    ['audio', 'audio'],
    ['ai', 'ai'],
  ] as const) {
    profiles[table] = (lib[table] as unknown as Record<string, Entry>)[def.profiles[field]];
  }
  return { character: def as unknown as Entry, profiles };
}

function renderValidation(): boolean {
  const report = validateCharacter(selected, library());
  const box = $('validation');
  const items = [
    ...report.errors.map((e) => `<li class="err">✖ ${escapeHtml(e)}</li>`),
    ...report.warnings.map((w) => `<li class="warn">⚠ ${escapeHtml(w)}</li>`),
  ];
  box.innerHTML =
    report.errors.length === 0
      ? `<p class="ok" data-valid="true">✔ Valid${report.warnings.length ? ` (${report.warnings.length} warning(s))` : ''}</p><ul>${items.join('')}</ul>`
      : `<p class="err" data-valid="false">✖ ${report.errors.length} error(s): fix them before exporting</p><ul>${items.join('')}</ul>`;
  return report.errors.length === 0;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

function changed(): void {
  const ok = renderValidation();
  renderList();
  if (ok) preview.setCharacter(resolveCharacter(selected, library()));
}

function refresh(): void {
  renderList();
  renderEditor();
  changed();
}

$('validate').onclick = () => renderValidation();
$('export').onclick = () => {
  if (!renderValidation()) return;
  const blob = new Blob([JSON.stringify(bundle(), null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${selected}.character-bundle.json`;
  a.click();
  URL.revokeObjectURL(a.href);
};
// Admin preview only (owner, 12/11/2026): pick who the draft fights. The public menu always pairs
// the player with the training dummy; this choice exists only here.
const opponentSelect = $('try-opponent') as HTMLSelectElement;
const fillOpponents = (): void => {
  const keep = opponentSelect.value || DEFAULT_CAST.opponent;
  opponentSelect.replaceChildren();
  for (const [id, def] of Object.entries(library().characters)) {
    const o = document.createElement('option');
    o.value = id;
    o.textContent = def.displayName;
    opponentSelect.appendChild(o);
  }
  opponentSelect.value = keep;
};
fillOpponents();
opponentSelect.onfocus = fillOpponents; // new or renamed characters show up
$('try').onclick = () => {
  if (!renderValidation()) return;
  const b = bundle();
  saveDraft({
    characterId: selected,
    entries: { characters: [b.character], ...Object.fromEntries(Object.entries(b.profiles).map(([k, v]) => [k, [v]])) },
  });
  const opponent = encodeURIComponent(opponentSelect.value || DEFAULT_CAST.opponent);
  window.open(`${import.meta.env.BASE_URL}?scene=training-yard&character=draft&opponent=${opponent}`, '_blank');
};

const stateSelect = $('preview-state') as HTMLSelectElement;
for (const s of ANIMATION_STATES) {
  const o = document.createElement('option');
  o.value = s;
  o.textContent = s;
  stateSelect.appendChild(o);
}
stateSelect.onchange = () => preview.showState(stateSelect.value as AnimationState);
($('preview-hitbox') as HTMLInputElement).onchange = (e) =>
  preview.setShowHitbox((e.target as HTMLInputElement).checked);

/** For tests and tools: the editor's state. */
declare global {
  interface Window {
    __characterEditor?: { select(id: string): void; valid(): boolean; library(): CharacterLibrary; selected(): string };
  }
}
window.__characterEditor = { select, valid: renderValidation, library, selected: () => selected };

await preview.init();
refresh();
