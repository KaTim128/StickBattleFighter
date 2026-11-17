import { describe, expect, it } from 'vitest';
import { DEFAULT_BINDINGS, rebind } from '../../../src/input/bindings';
import {
  controlLabel,
  DEFAULT_CONTROLS,
  DEFAULT_HOLD_S,
  FIGHTER_CONTROLS_KEY,
  FighterControlsStore,
  HOLD_RANGE_S,
  HOLDABLE,
  sanitiseControls,
  withHold,
} from '../../../src/input/fighter-controls';
import { PlayerIntents } from '../../../src/input/intents';
import { DesktopInput } from '../../../src/input/keyboard';
import { SettingsState } from '../../../src/input/settings-store';

class MemoryStorage {
  readonly data = new Map<string, string>();
  getItem(k: string): string | null {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.data.set(k, v);
  }
}

/** Per-fighter controls (owner, master plan 16/11/2026, Phase 1 A3). */
describe('per-fighter keybinds', () => {
  it("changing Inferno's controls never changes Titan's", () => {
    const store = new FighterControlsStore(new MemoryStorage());
    const inferno = { bindings: rebind(DEFAULT_BINDINGS, 'ability1', 'KeyZ').bindings, holds: {} };
    store.set('Katim', 'inferno', inferno);
    expect(store.get('Katim', 'inferno').bindings.ability1).toBe('KeyZ');
    expect(store.get('Katim', 'rampage')).toEqual(DEFAULT_CONTROLS); // Titan untouched
    expect(store.get('Katim', 'necro').bindings.ability1).toBe(DEFAULT_BINDINGS.ability1);
  });

  it('is saved per profile and survives a reload; another profile has its own', () => {
    const storage = new MemoryStorage();
    new FighterControlsStore(storage).set('Katim', 'shroud', {
      bindings: rebind(DEFAULT_BINDINGS, 'jump', 'KeyC').bindings,
      holds: {},
    });
    expect(new FighterControlsStore(storage).get('Katim', 'shroud').bindings.jump).toBe('KeyC');
    expect(new FighterControlsStore(storage).get('Ali', 'shroud').bindings.jump).toBe('Space');
    expect(new FighterControlsStore(storage).get(null, 'shroud').bindings.jump).toBe('Space'); // guests too
  });

  it('reset restores only that fighter', () => {
    const store = new FighterControlsStore(new MemoryStorage());
    const changed = { bindings: rebind(DEFAULT_BINDINGS, 'ability2', 'KeyV').bindings, holds: {} };
    store.set('Katim', 'inferno', changed);
    store.set('Katim', 'necro', changed);
    store.reset('Katim', 'inferno');
    expect(store.get('Katim', 'inferno')).toEqual(DEFAULT_CONTROLS);
    expect(store.get('Katim', 'necro').bindings.ability2).toBe('KeyV');
  });

  it('refuses a key already in use, naming the action, and a reserved key', () => {
    const clash = rebind(DEFAULT_BINDINGS, 'ability1', DEFAULT_BINDINGS.ability2);
    expect(clash.check.ok).toBe(false);
    expect(clash.bindings).toBe(DEFAULT_BINDINGS);
    expect(clash.check.ok === false && clash.check.message).toMatch(/already assigned to Ability 2/);
    expect(rebind(DEFAULT_BINDINGS, 'jump', 'Escape').check.ok).toBe(false);
  });

  it('repairs corrupt or hand-edited storage without breaking other fighters', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      FIGHTER_CONTROLS_KEY,
      JSON.stringify({
        Katim: { inferno: { bindings: { jump: 'KeyW' }, holds: { ability1: 99, bogus: 1, moveUp: 1 } }, necro: 'junk' },
      }),
    );
    const store = new FighterControlsStore(storage);
    const got = store.get('Katim', 'inferno');
    expect(got.bindings).toEqual(DEFAULT_BINDINGS); // jump on W clashes with moving up
    expect(got.holds).toEqual({ ability1: HOLD_RANGE_S.max }); // clamped; unknown and non-holdable dropped
    expect(store.get('Katim', 'necro')).toEqual(DEFAULT_CONTROLS);
    storage.setItem(FIGHTER_CONTROLS_KEY, '{nope');
    expect(new FighterControlsStore(storage).get('Katim', 'inferno')).toEqual(DEFAULT_CONTROLS);
  });

  it('the active fighter follows the profile: switching fighter switches the live keys', () => {
    const storage = new MemoryStorage();
    const store = new FighterControlsStore(storage);
    store.set('Katim', 'inferno', { bindings: rebind(DEFAULT_BINDINGS, 'ability3', 'KeyX').bindings, holds: {} });
    const state = new SettingsState(storage, store);
    state.activate('Katim', 'inferno');
    expect(state.bindings.ability3).toBe('KeyX');
    state.activate('Katim', 'rampage');
    expect(state.bindings.ability3).toBe('KeyF');
    state.setControls({ bindings: rebind(state.bindings, 'ability3', 'KeyB').bindings, holds: {} });
    expect(store.get('Katim', 'rampage').bindings.ability3).toBe('KeyB');
    expect(store.get('Katim', 'inferno').bindings.ability3).toBe('KeyX'); // not overwritten
    state.resetControls();
    expect(state.bindings.ability3).toBe('KeyF');
  });
});

describe('tap and hold', () => {
  it('shows a hold as "R (Hold)" and a tap as just the key', () => {
    const holds = withHold({}, 'ability4', DEFAULT_HOLD_S);
    expect(controlLabel('ability4', { bindings: DEFAULT_BINDINGS, holds })).toBe('R (Hold)');
    expect(controlLabel('ability1', { bindings: DEFAULT_BINDINGS, holds })).toBe('Q');
  });

  it('only one-press actions can be a hold; the time is kept inside its range', () => {
    expect(HOLDABLE.has('ability1')).toBe(true);
    expect(HOLDABLE.has('moveUp')).toBe(false);
    expect(withHold({}, 'moveUp', 1)).toEqual({});
    expect(withHold({}, 'jump', 99).jump).toBe(HOLD_RANGE_S.max);
    expect(withHold({}, 'jump', 0.01).jump).toBe(HOLD_RANGE_S.min);
    expect(withHold({ jump: 1 }, 'jump', null)).toEqual({});
    expect(sanitiseControls(null)).toEqual(DEFAULT_CONTROLS);
  });

  const holdInput = (holds: Record<string, number>) => {
    const i = new PlayerIntents();
    const input = new DesktopInput(i, { holds: () => holds });
    return { i, input };
  };

  it('a hold fires once after its time, not before', () => {
    const { i, input } = holdInput({ ability4: 1 });
    input.down('KeyR');
    input.update(0.5);
    expect(i.consumeAbility()).toBeNull();
    expect(input.holdProgress('ability4')).toBeCloseTo(0.5, 5);
    input.update(0.55);
    expect(i.consumeAbility()).toBe('a4');
    input.update(5);
    expect(i.consumeAbility()).toBeNull(); // only once, however long it is held
    expect(input.holdProgress('ability4')).toBeNull();
  });

  it('letting go early fires nothing, and a tap on another action still fires at once', () => {
    const { i, input } = holdInput({ ability4: 1 });
    input.down('KeyR');
    input.update(0.4);
    input.up('KeyR');
    input.update(2);
    expect(i.consumeAbility()).toBeNull();
    input.down('KeyQ'); // ability 1 is a tap
    expect(i.consumeAbility()).toBe('a1');
  });

  it('a hold waits while paused and is dropped when everything is released', () => {
    let paused = false;
    const i = new PlayerIntents();
    const input = new DesktopInput(i, { holds: () => ({ jump: 0.5 }), paused: () => paused });
    input.down('Space');
    paused = true;
    input.update(2);
    paused = false;
    expect(i.consumeJump()).toBe(false);
    input.releaseAll();
    input.update(2);
    expect(i.consumeJump()).toBe(false);
  });
});
