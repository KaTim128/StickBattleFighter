import { describe, expect, it } from 'vitest';
import { pauseAudioWhenHidden, type SuspendableAudio } from '../../../src/audio/pause-when-hidden';

class FakeContext implements SuspendableAudio {
  state = 'running';
  async suspend(): Promise<void> {
    this.state = 'suspended';
  }
  async resume(): Promise<void> {
    this.state = 'running';
  }
}

class FakeDoc extends EventTarget {
  hidden = false;
  setHidden(h: boolean): void {
    this.hidden = h;
    this.dispatchEvent(new Event('visibilitychange'));
  }
}

const settle = () => new Promise((r) => setTimeout(r, 0));

describe('audio stops when the game tab is not showing (owner, 12/11/2026)', () => {
  it('suspends at once when the tab is hidden and resumes when it is shown again', async () => {
    const doc = new FakeDoc();
    const ctx = new FakeContext();
    pauseAudioWhenHidden(doc, () => ctx);
    doc.setHidden(true);
    await settle();
    expect(ctx.state).toBe('suspended');
    doc.setHidden(false);
    await settle();
    expect(ctx.state).toBe('running');
  });

  it('also on leaving the page; never resumes audio it did not pause; no audio yet is fine', async () => {
    const doc = new FakeDoc();
    const win = new EventTarget();
    const ctx = new FakeContext();
    pauseAudioWhenHidden(doc, () => ctx, win);
    win.dispatchEvent(new Event('pagehide'));
    await settle();
    expect(ctx.state).toBe('suspended');
    win.dispatchEvent(new Event('pageshow'));
    await settle();
    expect(ctx.state).toBe('running');

    const locked = new FakeContext();
    locked.state = 'suspended'; // the browser has not allowed audio yet
    pauseAudioWhenHidden(doc, () => locked);
    doc.setHidden(true);
    doc.setHidden(false);
    await settle();
    expect(locked.state).toBe('suspended'); // left for the first input to unlock

    expect(() => pauseAudioWhenHidden(new FakeDoc(), () => null)).not.toThrow();
  });
});
