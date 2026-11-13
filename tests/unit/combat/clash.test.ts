import { describe, expect, it } from 'vitest';
import { ClashTrigger, decideClash, PunchClash } from '../../../src/combat/clash';
import { seededRandom } from '../../../src/combat/combatant';
import { CLASH, scaleBy } from '../../../src/data/combat/clash';

const run = (c: PunchClash, s: number, onStep?: (i: number) => void) => {
  let exchanges = 0;
  for (let i = 0; i < Math.round(s * 60); i++) {
    onStep?.(i);
    exchanges += c.update(1 / 60).exchanges;
  }
  return exchanges;
};

describe('Punch Clash trigger: a sustained exchange of punches and blocks', () => {
  it('fires after enough contacts from both sides, close together, within the window', () => {
    const t = new ClashTrigger();
    for (let i = 0; i < 6; i++) t.record(i % 2 ? 'a' : 'b', i * 0.5);
    expect(t.ready(3, 1.2)).toBe(true);
    expect(t.ready(3, 3)).toBe(false); // too far apart
  });

  it('does not fire for one-sided beatings or stale contacts', () => {
    const one = new ClashTrigger();
    for (let i = 0; i < 8; i++) one.record('a', i * 0.3);
    expect(one.ready(2.5, 1)).toBe(false);
    const old = new ClashTrigger();
    for (let i = 0; i < 6; i++) old.record(i % 2 ? 'a' : 'b', i * 0.5);
    expect(old.ready(3 + CLASH.triggerWindowS, 1)).toBe(false);
  });

  it('has a cooldown after a clash', () => {
    const t = new ClashTrigger();
    t.ended(10);
    for (let i = 0; i < 6; i++) t.record(i % 2 ? 'a' : 'b', 10 + i * 0.3);
    expect(t.ready(12, 1)).toBe(false);
    for (let i = 0; i < 6; i++) t.record(i % 2 ? 'a' : 'b', 18.5 + i * 0.1);
    expect(t.ready(19.2, 1)).toBe(true);
  });
});

describe('Punch Clash rules', () => {
  it('lasts 3–5 s of mashing, with the final stretch 0.75–1 s', () => {
    expect(CLASH.mashS).toBeGreaterThanOrEqual(3);
    expect(CLASH.mashS).toBeLessThanOrEqual(5);
    expect(CLASH.finalS).toBeGreaterThanOrEqual(0.75);
    expect(CLASH.finalS).toBeLessThanOrEqual(1);
  });

  it('only counts presses while mashing; both sides build power; ends with a result', () => {
    const c = new PunchClash(6.5, seededRandom(1));
    c.press('a'); // during the intro: ignored
    run(c, CLASH.introS + 0.02);
    expect(c.phase).toBe('mash');
    expect(c.powerA).toBe(0);
    run(c, CLASH.mashS + 0.1, (i) => i % 4 === 0 && c.press('a')); // 15 presses/s
    expect(c.phase).toBe('done');
    expect(c.powerA).toBeGreaterThan(50);
    expect(c.powerB).toBeGreaterThan(15);
    expect(c.result?.winner).toBe('a');
  });

  it('when the AI plays both sides (a watched battle), side A mashes too (owner, 13/11/2026)', () => {
    const c = new PunchClash(6.5, seededRandom(3), 6.5);
    run(c, CLASH.introS + CLASH.mashS + 0.1); // nobody presses anything
    expect(c.phase).toBe('done');
    expect(c.powerA).toBeGreaterThan(15);
    expect(c.powerB).toBeGreaterThan(15);
  });

  it('speeds up the exchange through the clash and spikes in the final stretch', () => {
    const c = new PunchClash(6.5, seededRandom(2));
    run(c, CLASH.introS);
    const early = run(c, 1);
    run(c, CLASH.mashS - 1 - CLASH.finalS + 0.05);
    expect(c.final).toBe(true);
    const finalRate = run(c, CLASH.finalS - 0.1) / (CLASH.finalS - 0.1);
    expect(finalRate).toBeGreaterThan(early * 1.6);
    expect(c.intensity).toBeGreaterThan(0.75);
  });

  it('scores within 5% are a stalemate; otherwise the higher score wins with the right gap', () => {
    expect(decideClash(40, 39).winner).toBeNull();
    expect(decideClash(0, 0).winner).toBeNull();
    const r = decideClash(30, 60);
    expect(r.winner).toBe('b');
    expect(r.gap).toBeCloseTo(0.5, 5);
  });

  it('the finisher grows with the gap, with 3–6 frames of hit-stop', () => {
    expect(scaleBy(CLASH.finishDamage, 0.9)).toBeGreaterThan(scaleBy(CLASH.finishDamage, 0.1));
    expect(scaleBy(CLASH.finishKnockbackMps, 1)).toBeGreaterThan(scaleBy(CLASH.finishKnockbackMps, 0));
    expect(CLASH.finishHitstopS.min).toBeGreaterThanOrEqual(3 / 60 - 1e-9);
    expect(CLASH.finishHitstopS.max).toBeLessThanOrEqual(6 / 60 + 1e-9);
  });
});
