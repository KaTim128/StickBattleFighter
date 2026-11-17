import { describe, expect, it } from 'vitest';
import { decideProp, HOLD_LIMIT_S, type PropSituation } from '../../../src/ai/prop-plan';

const base: PropSituation = {
  carrying: false,
  carryingReady: false,
  heldS: 0,
  free: true,
  targetDistM: 7,
  targetAhead: true,
  propDistM: 0.5,
  reachM: 1.2,
  cooldownS: 0,
  roll: 0,
  appetitePerS: 0.3,
  dtS: 1 / 60,
  throwRangeM: 12,
};

describe('AI furniture plan (B9)', () => {
  it('picks up an object in reach when the target is far, and walks to one that is further', () => {
    expect(decideProp(base)).toBe('pickup');
    expect(decideProp({ ...base, propDistM: 2.2 })).toBe('approach');
  });

  it('does nothing without a target, up close, on cooldown, busy, or when nothing is near', () => {
    expect(decideProp({ ...base, targetDistM: null })).toBe('none');
    expect(decideProp({ ...base, targetDistM: 2 })).toBe('none'); // close: hands instead
    expect(decideProp({ ...base, cooldownS: 3 })).toBe('none');
    expect(decideProp({ ...base, free: false })).toBe('none');
    expect(decideProp({ ...base, propDistM: null })).toBe('none');
    expect(decideProp({ ...base, propDistM: 4 })).toBe('none');
  });

  it('wants it only as often as its difficulty says', () => {
    expect(decideProp({ ...base, roll: 0.99 })).toBe('none');
    expect(decideProp({ ...base, appetitePerS: 0 })).toBe('none');
  });

  it('holds while lifting, throws once it is up and the target is in range', () => {
    const carrying = { ...base, carrying: true, propDistM: null };
    expect(decideProp({ ...carrying, carryingReady: false })).toBe('hold');
    expect(decideProp({ ...carrying, carryingReady: true })).toBe('throw');
  });

  it('does not throw at a target that is too close or too far, until it has held it too long', () => {
    const c = { ...base, carrying: true, carryingReady: true, propDistM: null };
    expect(decideProp({ ...c, targetDistM: 1.2 })).toBe('hold');
    expect(decideProp({ ...c, targetDistM: 30 })).toBe('hold');
    expect(decideProp({ ...c, targetDistM: 1.2, heldS: HOLD_LIMIT_S + 0.1 })).toBe('throw');
    expect(decideProp({ ...c, targetDistM: null })).toBe('hold');
  });
});
