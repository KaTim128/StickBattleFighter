import { describe, expect, it } from 'vitest';
import { inTheDark } from '../../../src/interface/vision-veil';

describe('Hunting Frenzy darkness and spectators (master plan B10)', () => {
  it('darkens the screen of a fighter someone is playing', () => {
    expect(inTheDark(3, false)).toBe(true);
    expect(inTheDark(0, false)).toBe(false);
  });

  it('never darkens the screen of someone only watching an AI battle', () => {
    expect(inTheDark(3, true)).toBe(false);
    expect(inTheDark(0.1, true)).toBe(false);
  });
});

describe('spectators are never blinded (owner, 21/11/2026)', () => {
  const afflicted = { blindS: 3, darkS: 4, fogS: 2, nightVisionS: 1, x: 5 };
  it('a watched AI battle shows every sight affliction as nothing', async () => {
    const { viewAfflictions } = await import('../../../src/interface/vision-veil');
    expect(viewAfflictions(afflicted, true)).toEqual({ blindS: 0, darkS: 0, fogS: 0, nightVisionS: 0, x: 5 });
  });
  it('the fighter someone is playing keeps them', async () => {
    const { viewAfflictions } = await import('../../../src/interface/vision-veil');
    expect(viewAfflictions(afflicted, false)).toBe(afflicted);
  });
});
