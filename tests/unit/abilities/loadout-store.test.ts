import { describe, expect, it } from 'vitest';
import { LOADOUT_KEY, LoadoutStore } from '../../../src/abilities/loadout-store';

function memory(initial?: string) {
  const data = new Map<string, string>(initial ? [[LOADOUT_KEY, initial]] : []);
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
}

describe('LoadoutStore (B14)', () => {
  it('a fighter never touched keeps the standard four', () => {
    expect(new LoadoutStore(memory()).get('Kim', 'rampage')).toEqual({ useFifth: false });
  });

  it('saves per profile and per fighter without touching the others', () => {
    const store = new LoadoutStore(memory());
    store.set('Kim', 'rampage', { useFifth: true });
    expect(store.get('Kim', 'rampage').useFifth).toBe(true);
    expect(store.get('Kim', 'necro').useFifth).toBe(false);
    expect(store.get('Sam', 'rampage').useFifth).toBe(false);
    expect(store.get(null, 'rampage').useFifth).toBe(false);
    store.set('Kim', 'necro', { useFifth: true });
    store.set('Kim', 'rampage', { useFifth: false });
    expect(store.get('Kim', 'necro').useFifth).toBe(true);
    expect(store.get('Kim', 'rampage').useFifth).toBe(false);
  });

  it('survives unreadable or hostile saved data', () => {
    expect(new LoadoutStore(memory('{nope')).get('Kim', 'rampage').useFifth).toBe(false);
    expect(new LoadoutStore(memory('{"Kim":{"rampage":{"useFifth":"yes"}}}')).get('Kim', 'rampage').useFifth).toBe(
      false,
    );
    expect(new LoadoutStore(memory('{"__proto__":{"x":1}}')).get('__proto__', 'x').useFifth).toBe(false);
  });

  it('works without any storage', () => {
    const store = new LoadoutStore(null);
    expect(store.set('Kim', 'rampage', { useFifth: true })).toBe(false);
    expect(store.get('Kim', 'rampage').useFifth).toBe(false);
  });
});
