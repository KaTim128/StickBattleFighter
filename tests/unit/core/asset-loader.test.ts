import { describe, expect, it } from 'vitest';
import { type AssetFailure, AssetLoader } from '../../../src/core/asset-loader';

describe('AssetLoader', () => {
  it('returns loaded values and loads each URL only once', async () => {
    let calls = 0;
    const loader = new AssetLoader<string>(async (url) => {
      calls++;
      return `data:${url}`;
    });
    const [a, b] = await Promise.all([loader.load('x.png'), loader.load('x.png')]);
    expect(a).toEqual({ ok: true, value: 'data:x.png' });
    expect(b).toBe(a);
    expect(calls).toBe(1);
  });

  it('turns a missing asset into a failed result and a recorded failure, without throwing', async () => {
    const reported: AssetFailure[] = [];
    const loader = new AssetLoader<string>(
      async () => {
        throw new Error('404 Not Found');
      },
      (f) => reported.push(f),
    );
    const result = await loader.load('missing.png');
    expect(result.ok).toBe(false);
    expect(reported).toEqual([{ url: 'missing.png', message: '404 Not Found' }]);
    expect(loader.failures).toHaveLength(1);
  });

  it('treats an empty result and non-Error throws as failures', async () => {
    const empty = new AssetLoader<string | undefined>(async () => undefined);
    expect((await empty.load('a')).ok).toBe(false);
    const weird = new AssetLoader<string>(() => Promise.reject('nope'));
    const r = await weird.load('b');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toBe('nope');
  });
});
