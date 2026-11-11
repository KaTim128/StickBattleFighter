import { describe, expect, it } from 'vitest';
import {
  actionsFor,
  BIND_ACTIONS,
  checkBinding,
  codeLabel,
  DEFAULT_BINDINGS,
  rebind,
  sanitiseBindings,
} from '../../../src/input/bindings';
import { PlayerIntents } from '../../../src/input/intents';
import { DesktopInput } from '../../../src/input/keyboard';
import { DEFAULT_SETTINGS, loadSettings, SETTINGS_STORAGE_KEY, SettingsState } from '../../../src/input/settings-store';

class MemoryStorage {
  readonly data = new Map<string, string>();
  getItem(k: string): string | null {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.data.set(k, v);
  }
}

describe('default controls (owner, 11/11/2026; REQ-CTL-15)', () => {
  it('match the owner table', () => {
    expect(DEFAULT_BINDINGS).toEqual({
      moveUp: 'KeyW',
      moveDown: 'KeyS',
      moveLeft: 'KeyA',
      moveRight: 'KeyD',
      sprint: 'ShiftLeft',
      jump: 'Space',
      attack: 'Mouse0',
      dodge: 'Mouse2',
      ability1: 'KeyQ',
      ability2: 'KeyE',
      ability3: 'KeyR',
      ultimate: 'KeyF',
      ultimateLaunch: 'Mouse0',
      grab: 'KeyG',
    });
    expect(BIND_ACTIONS.map((a) => a.action).sort()).toEqual(Object.keys(DEFAULT_BINDINGS).sort());
  });

  it('every default is conflict-free; left click is the attack and (while aiming) the ultimate launch', () => {
    for (const { action } of BIND_ACTIONS)
      expect(checkBinding(DEFAULT_BINDINGS, action, DEFAULT_BINDINGS[action])).toEqual({ ok: true });
    expect(actionsFor(DEFAULT_BINDINGS, 'Mouse0').sort()).toEqual(['attack', 'ultimateLaunch']);
    expect(actionsFor(DEFAULT_BINDINGS, 'Mouse2')).toEqual(['dodge']);
  });
});

describe('rebinding and conflicts', () => {
  it('a free key is accepted', () => {
    const { bindings, check } = rebind(DEFAULT_BINDINGS, 'ability1', 'KeyZ');
    expect(check.ok).toBe(true);
    expect(bindings.ability1).toBe('KeyZ');
    expect(DEFAULT_BINDINGS.ability1).toBe('KeyQ'); // the defaults are never changed
  });

  it('a key already in use is refused with a message naming its action, and nothing changes', () => {
    const { bindings, check } = rebind(DEFAULT_BINDINGS, 'ability1', 'KeyW');
    expect(check.ok).toBe(false);
    if (!check.ok && check.reason === 'conflict') {
      expect(check.with).toBe('moveUp');
      expect(check.message).toBe('W is already assigned to Move up.');
    } else throw new Error('expected a conflict');
    expect(bindings).toBe(DEFAULT_BINDINGS);
  });

  it('moving the attack onto the dodge button is refused', () => {
    expect(rebind(DEFAULT_BINDINGS, 'attack', 'Mouse2').check).toMatchObject({ ok: false, with: 'dodge' });
  });

  it('the ultimate launch may share only with the attack or the ultimate key, never movement or abilities', () => {
    expect(checkBinding(DEFAULT_BINDINGS, 'ultimateLaunch', 'KeyF').ok).toBe(true); // press the ultimate again
    expect(checkBinding(DEFAULT_BINDINGS, 'ultimateLaunch', 'Mouse0').ok).toBe(true);
    for (const [code, other] of [
      ['KeyW', 'moveUp'],
      ['KeyD', 'moveRight'],
      ['ShiftLeft', 'sprint'],
      ['Space', 'jump'],
      ['Mouse2', 'dodge'],
      ['KeyQ', 'ability1'],
      ['KeyE', 'ability2'],
      ['KeyR', 'ability3'],
      ['KeyG', 'grab'],
    ] as const) {
      expect(checkBinding(DEFAULT_BINDINGS, 'ultimateLaunch', code)).toMatchObject({ ok: false, with: other });
    }
    // ...and the other direction: an ability cannot take the launch key when it is not shared.
    const moved = rebind(DEFAULT_BINDINGS, 'ultimateLaunch', 'KeyX').bindings;
    expect(checkBinding(moved, 'ability2', 'KeyX')).toMatchObject({ ok: false, with: 'ultimateLaunch' });
  });

  it('reserved keys (settings, mute, debug) are refused', () => {
    expect(checkBinding(DEFAULT_BINDINGS, 'jump', 'Escape')).toMatchObject({ ok: false, reason: 'reserved' });
    expect(checkBinding(DEFAULT_BINDINGS, 'jump', 'KeyM')).toMatchObject({ ok: false, reason: 'reserved' });
  });

  it('labels keys and mouse buttons for the player', () => {
    expect(codeLabel('Mouse0')).toBe('Left click');
    expect(codeLabel('Mouse2')).toBe('Right click');
    expect(codeLabel('KeyQ')).toBe('Q');
    expect(codeLabel('ShiftLeft')).toBe('Left Shift');
    expect(codeLabel('Digit4')).toBe('4');
  });
});

describe('settings persistence', () => {
  it('saves and restores volumes and bindings between sessions', () => {
    const storage = new MemoryStorage();
    const a = new SettingsState(storage);
    a.update({ musicVolume: 0.25, sfxVolume: 0.6, bindings: rebind(a.bindings, 'jump', 'KeyC').bindings });
    const b = new SettingsState(storage);
    expect(b.current.musicVolume).toBe(0.25);
    expect(b.current.sfxVolume).toBe(0.6);
    expect(b.bindings.jump).toBe('KeyC');
  });

  it('falls back to defaults for missing, corrupt or clashing saved data', () => {
    expect(loadSettings(null)).toEqual(DEFAULT_SETTINGS);
    const s = new MemoryStorage();
    s.setItem(SETTINGS_STORAGE_KEY, '{not json');
    expect(loadSettings(s)).toEqual(DEFAULT_SETTINGS);
    s.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ musicVolume: 7, sfxVolume: 'x', bindings: { jump: 'KeyW' } }));
    const got = loadSettings(s);
    expect(got.musicVolume).toBe(1);
    expect(got.sfxVolume).toBe(DEFAULT_SETTINGS.sfxVolume);
    expect(got.bindings).toEqual(DEFAULT_BINDINGS); // jump on W would clash with moving up
    expect(sanitiseBindings({ jump: 'KeyC', bogus: 'KeyV' }).jump).toBe('KeyC');
  });

  it('survives storage that refuses writes', () => {
    const state = new SettingsState({
      getItem: () => null,
      setItem: () => {
        throw new Error('quota');
      },
    });
    state.update({ musicVolume: 0.1 });
    expect(state.current.musicVolume).toBe(0.1);
  });
});

describe('desktop input from bindings', () => {
  it('hold sprint, right click dodges, left click attacks and queues an ultimate launch', () => {
    const i = new PlayerIntents();
    const input = new DesktopInput(i);
    input.down('ShiftLeft');
    expect(i.sprint).toBe(true);
    input.up('ShiftLeft');
    expect(i.sprint).toBe(false);
    input.down('Mouse2');
    expect(i.consumeDodge()).toBe(true);
    input.down('Mouse0');
    expect(i.meleeHeld).toBe(true);
    expect(i.consumeUltLaunch()).toBe(true);
    input.up('Mouse0');
    expect(i.consumeMeleeEdges()).toEqual({ pressed: true, released: true });
  });

  it('a rebind applies at once; the old key stops working', () => {
    const i = new PlayerIntents();
    let bindings = DEFAULT_BINDINGS;
    const input = new DesktopInput(i, { bindings: () => bindings });
    bindings = rebind(bindings, 'jump', 'KeyC').bindings;
    input.down('Space');
    expect(i.consumeJump()).toBe(false);
    input.down('KeyC');
    expect(i.consumeJump()).toBe(true);
  });

  it('ignores everything while paused, and a held key repeat counts once', () => {
    const i = new PlayerIntents();
    let paused = true;
    const input = new DesktopInput(i, { paused: () => paused });
    input.down('Space');
    expect(i.consumeJump()).toBe(false);
    paused = false;
    input.down('KeyD');
    input.down('KeyD');
    expect(i.move.x).toBeGreaterThan(0);
    input.releaseAll();
    expect(i.move).toEqual({ x: 0, y: 0 });
  });
});
