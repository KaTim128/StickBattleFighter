import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MusicLoop } from '../../../src/audio/music';
import { MusicDirector } from '../../../src/audio/music-director';

/** A tiny Web Audio stand-in: counts the sources started and stopped, so overlap and duplicates are visible. */
class FakeCtx {
  currentTime = 0;
  readonly started: FakeSource[] = [];
  createGain() {
    const param = { value: 0, cancelScheduledValues: () => {}, setTargetAtTime: (v: number) => (param.value = v) };
    return { gain: param, connect: () => {}, disconnect: () => {}, context: this };
  }
  createBufferSource() {
    const src = new FakeSource();
    this.started.push(src);
    return src;
  }
}
class FakeSource {
  buffer: unknown = null;
  loop = false;
  loopStart = 0;
  loopEnd = 0;
  running = false;
  connect() {}
  start() {
    this.running = true;
  }
  stop() {
    this.running = false;
  }
}
const buffer = { duration: 10, sampleRate: 100, getChannelData: () => new Float32Array([1]) };
const clip = (id: string) => ({
  def: { ogg: id, mp3: id, level: 0.5, loop: { startS: 0, endS: 10 } },
  load: async () => buffer as unknown as AudioBuffer,
});

function setup(ids: string[] = ['menu', 'battle']) {
  const ctx = new FakeCtx();
  let ready = true;
  const director = new MusicDirector(() =>
    ready ? { ctx: ctx as unknown as AudioContext, out: {} as AudioNode } : null,
  );
  for (const id of ids) director.register(id, new MusicLoop(clip(id)));
  return { ctx, director, setReady: (v: boolean) => (ready = v) };
}
const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};
const running = (ctx: FakeCtx) => ctx.started.filter((s) => s.running).length;

describe('MusicDirector', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('plays only the requested track and fades the previous one out', async () => {
    const { ctx, director } = setup();
    director.request('menu');
    await flush();
    expect(director.audibleIds).toEqual(['menu']);
    director.request('battle', { fadeOutS: 0.6 });
    await flush();
    // The menu track is fading out while the battle track starts, then it is gone.
    expect(director.isPlaying('menu')).toBe(false);
    expect(director.isPlaying('battle')).toBe(true);
    vi.advanceTimersByTime(1000);
    expect(director.audibleIds).toEqual(['battle']);
    expect(running(ctx)).toBe(1);
  });

  it('never starts a second copy when asked for the same track again', async () => {
    const { ctx, director } = setup();
    director.request('menu');
    director.request('menu');
    director.request('menu');
    await flush();
    director.request('menu');
    expect(ctx.started).toHaveLength(1);
  });

  it('rapid flips end with exactly the last request, with no stray copies', async () => {
    const { ctx, director } = setup();
    for (const id of ['menu', 'battle', 'menu', 'battle', 'menu', 'battle', 'menu']) {
      director.request(id, { fadeOutS: 0.3 });
      await flush();
    }
    vi.advanceTimersByTime(2000);
    expect(director.audibleIds).toEqual(['menu']);
    expect(running(ctx)).toBe(1);
  });

  it('taking a fading track back reuses it instead of layering a second one', async () => {
    const { ctx, director } = setup();
    director.request('menu');
    await flush();
    director.request(null, { fadeOutS: 1 });
    vi.advanceTimersByTime(300); // still fading
    director.request('menu');
    await flush();
    vi.advanceTimersByTime(3000);
    expect(ctx.started).toHaveLength(1);
    expect(director.isPlaying('menu')).toBe(true);
    expect(running(ctx)).toBe(1);
  });

  it('a request made before audio is available plays once it is, and a later one replaces it', async () => {
    const { ctx, director, setReady } = setup();
    setReady(false);
    director.request('menu');
    await flush();
    expect(ctx.started).toHaveLength(0);
    director.request('battle');
    setReady(true);
    director.sync();
    await flush();
    expect(director.audibleIds).toEqual(['battle']);
  });

  it('a request that leaves before its track has loaded never plays it', async () => {
    const { ctx, director } = setup();
    director.request('menu');
    director.request('battle'); // the menu track's load resolves after it is no longer wanted
    await flush();
    vi.advanceTimersByTime(1500);
    expect(director.audibleIds).toEqual(['battle']);
    expect(ctx.started).toHaveLength(1);
  });

  it('silence (null) stops everything', async () => {
    const { ctx, director } = setup();
    director.request('menu');
    await flush();
    director.request(null, { fadeOutS: 0.5 });
    vi.advanceTimersByTime(1000);
    expect(director.audibleIds).toEqual([]);
    expect(running(ctx)).toBe(0);
  });

  it('leaving the page silences at once and returning restores the wanted track', async () => {
    const { ctx, director } = setup();
    director.request('menu');
    await flush();
    director.suspend();
    expect(running(ctx)).toBe(0);
    expect(director.audibleIds).toEqual([]);
    director.request('menu'); // asking while hidden must not start it
    await flush();
    expect(running(ctx)).toBe(0);
    director.resume();
    await flush();
    expect(director.audibleIds).toEqual(['menu']);
  });
});
