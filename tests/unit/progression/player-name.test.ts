import { describe, expect, it } from 'vitest';
import { ADMIN_NAME, isAdminName } from '../../../src/admin/local-access';
import {
  loadPlayerName,
  PLAYER_NAME_KEY,
  savePlayerName,
  validatePlayerName,
} from '../../../src/progression/player-name';

const memory = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};

/** Player name registration (owner, 13/11/2026). */
describe('player name', () => {
  it('accepts 1 to 10 characters of letters, numbers, spaces and - _ .', () => {
    expect(validatePlayerName('Katim')).toEqual({ ok: true, name: 'Katim' });
    expect(validatePlayerName('  Ali   Bin ')).toEqual({ ok: true, name: 'Ali Bin' });
    expect(validatePlayerName('Zoë_99')).toEqual({ ok: true, name: 'Zoë_99' });
    expect(validatePlayerName('abcdefghij').ok).toBe(true); // exactly 10
  });

  it('refuses empty, too long and unsafe names with a reason', () => {
    expect(validatePlayerName('   ')).toEqual({ ok: false, error: 'Enter a name.' });
    expect(validatePlayerName('abcdefghijk')).toMatchObject({ ok: false, error: /10 characters/ });
    expect(validatePlayerName('<b>x</b>')).toMatchObject({ ok: false });
    expect(validatePlayerName('a;drop')).toMatchObject({ ok: false });
  });

  it('is saved and loaded; an invalid saved value is ignored', () => {
    const store = memory();
    expect(loadPlayerName(store)).toBeNull();
    expect(savePlayerName(' Katim ', store)).toEqual({ ok: true, name: 'Katim' });
    expect(loadPlayerName(store)).toBe('Katim');
    expect(savePlayerName('waytoolongname', store).ok).toBe(false);
    expect(loadPlayerName(store)).toBe('Katim'); // unchanged
    store.setItem(PLAYER_NAME_KEY, '<script>');
    expect(loadPlayerName(store)).toBeNull();
  });
});

/** The Admin Screen name gate (owner, 13/11/2026; TD-065: a screen choice, not security). */
describe('admin name', () => {
  it('only the exact admin name sees the Admin Screen', () => {
    expect(ADMIN_NAME).toBe('addmen1280');
    expect(isAdminName('addmen1280')).toBe(true);
    for (const n of ['Addmen1280', 'addmen128', 'admin128', 'admin', 'addmen1280 ', null, 'Katim'])
      expect(isAdminName(n)).toBe(false);
  });

  it('the admin name is a valid player name (it can be registered)', () => {
    expect(validatePlayerName(ADMIN_NAME)).toEqual({ ok: true, name: ADMIN_NAME });
  });
});
