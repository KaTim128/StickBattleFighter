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
