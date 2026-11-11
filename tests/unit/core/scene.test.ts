import { describe, expect, it } from 'vitest';
import { type GameScene, SceneManager } from '../../../src/core/scene';

function fakeScene(
  name: string,
  log: string[],
  opts: { failLoad?: boolean; loadGate?: Promise<void> } = {},
): GameScene {
  return {
    name,
    async load() {
      log.push(`load:${name}`);
      if (opts.loadGate) await opts.loadGate;
      if (opts.failLoad) throw new Error('boom');
    },
    update: () => log.push(`update:${name}`),
    render: () => log.push(`render:${name}`),
    unload: () => log.push(`unload:${name}`),
  };
}

describe('SceneManager', () => {
  it('loads a scene, drives it, and unloads it when switching', async () => {
    const log: string[] = [];
    const scenes = new SceneManager();
    await scenes.switchTo(() => fakeScene('a', log));
    scenes.update(1 / 60);
    scenes.render(0.5, 1 / 60);
    await scenes.switchTo(() => fakeScene('b', log));
    expect(log).toEqual(['load:a', 'update:a', 'render:a', 'unload:a', 'load:b']);
    expect(scenes.active?.name).toBe('b');
  });

  it('reports a failed load, cleans up the half-built scene and keeps running with no scene', async () => {
    const log: string[] = [];
    const errors: string[] = [];
    const scenes = new SceneManager({ onError: (name) => errors.push(name) });
    const result = await scenes.switchTo(() => fakeScene('bad', log, { failLoad: true }));
    expect(result).toBeNull();
    expect(scenes.active).toBeNull();
    expect(log).toEqual(['load:bad', 'unload:bad']);
    expect(errors).toEqual(['bad']);
    expect(() => scenes.update(1 / 60)).not.toThrow();
  });

  it('discards a scene that finishes loading after a newer switch was requested', async () => {
    const log: string[] = [];
    const scenes = new SceneManager();
    let release!: () => void;
    const slow = scenes.switchTo(() => fakeScene('slow', log, { loadGate: new Promise((r) => (release = r)) }));
    const fast = scenes.switchTo(() => fakeScene('fast', log));
    await fast;
    release();
    expect(await slow).toBeNull();
    expect(scenes.active?.name).toBe('fast');
    expect(log).toContain('unload:slow');
    expect(log).not.toContain('unload:fast');
  });

  it('clear() unloads the active scene exactly once', async () => {
    const log: string[] = [];
    const scenes = new SceneManager();
    await scenes.switchTo(() => fakeScene('a', log));
    scenes.clear();
    scenes.clear();
    expect(log.filter((l) => l === 'unload:a')).toHaveLength(1);
  });
});
