import { describe, expect, it } from 'vitest';
import { hashText, STRIP_RENDERER_VERSION, stripKey } from '../../../src/rendering/strip-cache';

describe('select strip cache key (S1)', () => {
  it('is stable for the same data and changes when the fighter or its stance changes', () => {
    const a = stripKey('inferno', { def: { hp: 1 }, stance: { scale: 1 } });
    expect(a).toBe(stripKey('inferno', { def: { hp: 1 }, stance: { scale: 1 } }));
    expect(a).not.toBe(stripKey('inferno', { def: { hp: 2 }, stance: { scale: 1 } }));
    expect(a).not.toBe(stripKey('inferno', { def: { hp: 1 }, stance: { scale: 2 } }));
    expect(a).not.toBe(stripKey('titan', { def: { hp: 1 }, stance: { scale: 1 } }));
    expect(a).toContain(`r${STRIP_RENDERER_VERSION}`);
  });
  it('is null (never cached) when the data cannot be hashed', () => {
    const loop: Record<string, unknown> = {};
    loop.self = loop;
    expect(stripKey('x', loop)).toBeNull();
    expect(hashText('a')).not.toBe(hashText('b'));
  });
});
