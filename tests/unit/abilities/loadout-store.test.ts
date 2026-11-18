import { describe, expect, it } from 'vitest';
import { LOADOUT_KEY, LoadoutStore } from '../../../src/abilities/loadout-store';

function memory(initial?: string) {
  const data = new Map<string, string>(initial ? [[LOADOUT_KEY, initial]] : []);
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
}

describe('LoadoutStore (B14)', () => {
  it('a fighter never touched keeps the standard four', () => {
    expect(new LoadoutStore(memory()).get('Kim', 'rampage')).toEqual({ equipped: [] });
  });

  it('saves per profile and per fighter without touching the others', () => {
    const store = new LoadoutStore(memory());
    store.set('Kim', 'rampage', { equipped: ['a', 'b', 'c', 'd'] });
    expect(store.get('Kim', 'rampage').equipped).toEqual(['a', 'b', 'c', 'd']);
    expect(store.get('Kim', 'necro').equipped).toEqual([]);
    expect(store.get('Sam', 'rampage').equipped).toEqual([]);
    expect(store.get(null, 'rampage').equipped).toEqual([]);
    store.set('Kim', 'necro', { equipped: ['a', 'b', 'c', 'd'] });
    store.set('Kim', 'rampage', { equipped: [] });
    expect(store.get('Kim', 'necro').equipped).toEqual(['a', 'b', 'c', 'd']);
    expect(store.get('Kim', 'rampage').equipped).toEqual([]);
  });

  it('survives unreadable or hostile saved data', () => {
    expect(new LoadoutStore(memory('{nope')).get('Kim', 'rampage').equipped).toEqual([]);
    for (const bad of ['"yes"', '[1,2,3,4]', '["a","b","c"]', '["a","b","c","d","e"]', '{"0":"a"}'])
      expect(
        new LoadoutStore(memory(`{"Kim":{"rampage":{"equipped":${bad}}}}`)).get('Kim', 'rampage').equipped,
      ).toEqual([]);
    expect(new LoadoutStore(memory('{"__proto__":{"x":1}}')).get('__proto__', 'x').equipped).toEqual([]);
  });

  it('works without any storage', () => {
    const store = new LoadoutStore(null);
    expect(store.set('Kim', 'rampage', { equipped: ['a', 'b', 'c', 'd'] })).toBe(false);
    expect(store.get('Kim', 'rampage').equipped).toEqual([]);
  });
});
