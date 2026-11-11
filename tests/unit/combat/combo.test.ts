import { describe, expect, it } from 'vitest';
import { attackVariantCount } from '../../../src/animation/attack-poses';
import { attackDuration, capsuleTouchesRect, distanceToCapsule, hitCapsule } from '../../../src/combat/attacks';
import { seededRandom } from '../../../src/combat/combatant';
import { COMBO_VARIANTS, ComboController } from '../../../src/combat/combo';
import { GREYBOX_STICKMAN } from '../../../src/data/fighters/greybox-stickman';

const A = GREYBOX_STICKMAN.attacks;
const STEP = 1 / 60;

function run(c: ComboController, seconds: number, airborne = false) {
  const hits: string[] = [];
  const started: string[] = [];
  for (let i = 0; i < Math.round(seconds / STEP); i++) {
    const ev = c.update(STEP, airborne);
    if (ev.hit) hits.push(ev.hit.id);
    if (ev.started) started.push(ev.started.id);
  }
  return { hits, started };
}

describe('1-2-3 combo (owner request)', () => {
  it('one press = one left jab that hits once, then returns to idle', () => {
    const c = new ComboController(A);
    c.press(false);
    expect(c.attack?.id).toBe('jab');
    expect(c.step).toBe(1);
    const r = run(c, attackDuration(A.jab) + 0.05);
    expect(r.hits).toEqual(['jab']);
    expect(c.attack).toBeNull();
  });

  it('pressing again during each strike flows jab → hook → heavy finisher without returning to stance', () => {
    const c = new ComboController(A);
    c.press(false);
    const r0 = run(c, 0.1);
    c.press(false); // buffered during the jab
    const r1 = run(c, attackDuration(A.jab));
    expect(r1.started).toEqual(['hook']);
    expect(c.step).toBe(2);
    c.press(false);
    const r2 = run(c, attackDuration(A.hook));
    expect(r2.started).toEqual(['heavy']);
    expect(c.step).toBe(3);
    const r3 = run(c, attackDuration(A.heavy) + 0.05);
    expect([...r0.hits, ...r1.hits, ...r2.hits, ...r3.hits]).toEqual(['jab', 'hook', 'heavy']);
    expect(c.attack).toBeNull();
  });

  it('the finisher is the heavy hitter: far stronger knockback than the jab and hook', () => {
    expect(A.heavy.knockbackSpeedMps).toBeGreaterThan(A.hook.knockbackSpeedMps * 2.5);
    expect(A.heavy.strength).toBeGreaterThan(A.jab.strength * 4);
    expect(A.heavy.trauma).toBeGreaterThan(A.hook.trauma);
  });

  it('the combo resets if you stop pressing, and a fourth press starts a new string', () => {
    const c = new ComboController(A);
    c.press(false);
    run(c, attackDuration(A.jab) + 0.1); // no second press
    expect(c.attack).toBeNull();
    c.press(false);
    expect(c.attack?.id).toBe('jab');
  });

  it('cannot cancel the start of a strike by mashing: extra presses only queue the next one', () => {
    const c = new ComboController(A);
    c.press(false);
    for (let i = 0; i < 5; i++) c.press(false);
    expect(c.attack?.id).toBe('jab');
    const r = run(c, 0.05);
    expect(r.started).toEqual([]);
  });
});

describe('aerial attack', () => {
  it('pressing in the air does a flying kick, once per jump', () => {
    const c = new ComboController(A);
    c.press(true);
    expect(c.attack?.id).toBe('flyingKick');
    expect(c.step).toBe(0);
    run(c, attackDuration(A.flyingKick) + 0.05, true);
    c.press(true);
    expect(c.attack).toBeNull(); // already used this jump
    c.landed();
    c.press(true);
    expect(c.attack?.id).toBe('flyingKick');
  });

  it('the flying kick is a kick strong enough to smash the office door; jab and hook are not', () => {
    expect(A.flyingKick.blow).toBe('kick');
    expect(A.flyingKick.strength).toBeGreaterThanOrEqual(500);
    expect(A.jab.strength).toBeLessThan(500);
    expect(A.hook.strength).toBeLessThan(500);
  });
});

describe('hit area', () => {
  const pos = { x: 10, y: 5 };

  it('covers the whole strike path, from right in front of the body out to full reach', () => {
    const c = hitCapsule(pos, 1, A.heavy);
    const near = { x0: 10.3, y0: 4, x1: 10.45, y1: 6 }; // a door right up against the fighter
    const far = { x0: 10.9, y0: 4, x1: 11.05, y1: 6 };
    const beyond = { x0: 11.6, y0: 4, x1: 11.75, y1: 6 };
    expect(capsuleTouchesRect(c, near)).toBe(true);
    expect(capsuleTouchesRect(c, far)).toBe(true);
    expect(capsuleTouchesRect(c, beyond)).toBe(false);
  });

  it('only hits on the facing side', () => {
    const c = hitCapsule(pos, 1, A.jab);
    expect(distanceToCapsule(c, 10.6, 5)).toBeCloseTo(0, 6);
    expect(distanceToCapsule(c, 9.4, 5)).toBeGreaterThan(A.jab.hitRadiusM + 0.32);
  });
});

describe('combo variations (owner, 11/11/2026: same damage, different looks)', () => {
  it('every attack has COMBO_VARIANTS animations', () => {
    for (const id of ['jab', 'hook', 'heavy', 'flyingKick'] as const)
      expect(attackVariantCount(id)).toBe(COMBO_VARIANTS);
  });

  it('never shows the same look twice in a row, and uses every look', () => {
    const c = new ComboController(A, seededRandom(7));
    const seen = new Set<number>();
    let last = -1;
    for (let i = 0; i < 40; i++) {
      c.press(false);
      expect(c.variant).not.toBe(last);
      last = c.variant;
      seen.add(c.variant);
      c.interrupt();
    }
    expect(seen.size).toBe(COMBO_VARIANTS);
  });

  it('a variant changes only the look: the attack data (damage, reach, timing) is the same object', () => {
    const c = new ComboController(A, seededRandom(3));
    c.press(false);
    const first = { attack: c.attack, variant: c.variant };
    c.interrupt();
    c.press(false);
    expect(c.variant).not.toBe(first.variant);
    expect(c.attack).toBe(first.attack);
  });
});
