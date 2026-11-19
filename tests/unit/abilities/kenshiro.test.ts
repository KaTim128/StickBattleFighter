import { describe, expect, it } from 'vitest';
import { type AbilityHost, AbilityWorld } from '../../../src/abilities/ability-world';
import { Combatant, type CombatStats } from '../../../src/combat/combatant';
import { KENSHIRO_KIT } from '../../../src/data/abilities/kenshiro';
import profile from '../../../src/data/characters/kenshiro/animation-profile.json';
import set from '../../../src/data/characters/kenshiro/moveset.json';

/** Kenshiro (master plan section 4, fighter 10): two-sword duelist; the owner's order after Aerion, 21/11/2026. */
function arena(foe = { x: 3, y: 0 }) {
  const me = { id: 'me', x: 0, y: 0, radiusM: 0.3, hittable: true };
  const them = { id: 'foe', ...foe, radiusM: 0.3, hittable: true };
  const hits: { target: string; damage: number; sword?: boolean }[] = [];
  const teleports: { x: number; y: number }[] = [];
  const host: AbilityHost = {
    fighters: () => [me, them],
    hitFighter: (_c, target, payload) => {
      hits.push({ target, damage: payload.damage, ...(payload.sword ? { sword: true } : {}) });
      return true;
    },
    hitEnvironment: () => {},
    blocked: () => null,
    position: () => ({ x: me.x, y: me.y }),
    drive: (id, v) => {
      if (id === 'me' && v) {
        me.x += v.x / 60;
        me.y += v.y / 60;
      }
    },
    teleport: (_id, to) => {
      teleports.push(to);
      me.x = to.x;
      me.y = to.y;
      return to;
    },
    burnFighter: () => {},
    buff: () => {},
    parryWindowFactor: () => 1,
    emit: () => {},
  };
  return { me, them, hits, teleports, host, world: new AbilityWorld() };
}
const run = (a: ReturnType<typeof arena>, seconds: number) => {
  for (let i = 0; i < Math.round(seconds * 60); i++) a.world.update(1 / 60, a.host);
};

describe('Kenshiro kit', () => {
  it('has five distinct sword abilities, the ultimate Final Judgement and the Sword Mastery passive', () => {
    const all = [KENSHIRO_KIT.a1, KENSHIRO_KIT.a2, KENSHIRO_KIT.a3, KENSHIRO_KIT.a4, KENSHIRO_KIT.a5!];
    expect(new Set(all.map((a) => a.id)).size).toBe(5);
    for (const a of all.filter((x) => x.payload.damage > 0)) expect(a.payload.sword, a.id).toBe(true);
    expect(KENSHIRO_KIT.ult.id).toBe('finalJudgement');
    expect(KENSHIRO_KIT.passive?.id).toBe('mastery');
  });

  it('Twin Fang cuts twice and Blade Tempest six times, each cut its own hit', () => {
    for (const [def, cuts] of [
      [KENSHIRO_KIT.a1, 2],
      [KENSHIRO_KIT.a3, 6],
    ] as const) {
      const a = arena({ x: 1.6, y: 0 });
      a.world.release('me', def, { x: 1.6, y: 0 }, a.host);
      run(a, 2);
      expect(
        a.hits.filter((h) => h.target === 'foe'),
        def.id,
      ).toHaveLength(cuts);
    }
  });

  it('Focus Stance sharpens cuts a little, lightens damage taken, lengthens the parry, and is no crit or free damage', () => {
    const d = KENSHIRO_KIT.a4.delivery;
    if (d.type !== 'buff') throw new Error('Focus Stance is a buff');
    expect(d.abilityDamageFactor).toBeGreaterThan(1);
    expect(d.abilityDamageFactor).toBeLessThanOrEqual(1.25);
    expect(d.damageTakenFactor).toBeLessThan(1);
    expect(d.parryWindowFactor).toBeGreaterThan(1);
    expect(KENSHIRO_KIT.a4.payload.damage).toBe(0);
  });

  it('Iaido Draw (the fifth ability) cuts everyone in a five metre line', () => {
    const a = arena({ x: 3, y: 0 });
    a.world.release('me', KENSHIRO_KIT.a5!, { x: 5, y: 0 }, a.host);
    run(a, 0.5);
    expect(a.hits.filter((h) => h.target === 'foe')).toHaveLength(1);
    expect(a.me.x).toBeGreaterThan(4);
  });
});

describe('Perfect Parry', () => {
  it('puts a stance up for exactly its window, and the window ends it', () => {
    const a = arena();
    a.world.release('me', KENSHIRO_KIT.a2, { x: 3, y: 0 }, a.host);
    expect(a.world.parryOf('me')).toBeDefined();
    run(a, 0.5);
    expect(a.world.parryOf('me')).toBeDefined();
    run(a, 0.2);
    expect(a.world.parryOf('me')).toBeUndefined();
  });

  it('is spent when it deflects once, and a Focus Stance makes the window 50% longer', () => {
    const a = arena();
    a.world.release('me', KENSHIRO_KIT.a2, { x: 3, y: 0 }, a.host);
    a.world.consumeParry('me');
    expect(a.world.parryOf('me')).toBeUndefined();
    a.host.parryWindowFactor = () => 1.5;
    a.world.release('me', KENSHIRO_KIT.a2, { x: 3, y: 0 }, a.host);
    run(a, 0.8);
    expect(a.world.parryOf('me')).toBeDefined();
    run(a, 0.2);
    expect(a.world.parryOf('me')).toBeUndefined();
  });

  it('keeps its cooldown waiting while the stance is up', () => {
    const a = arena();
    a.world.release('me', KENSHIRO_KIT.a2, { x: 3, y: 0 }, a.host);
    expect(a.world.executingIds('me').has('perfectParry')).toBe(true);
  });
});

describe('Final Judgement', () => {
  it('rushes in and cuts eight times with nothing landing, returns to the start, then all the cuts land as one blow', () => {
    const a = arena({ x: 5, y: 0 });
    a.world.release('me', KENSHIRO_KIT.ult, { x: 5, y: 0 }, a.host);
    const d = KENSHIRO_KIT.ult.delivery;
    if (d.type !== 'judgement') throw new Error('the ultimate is a judgement');
    let sawCut = false;
    for (let i = 0; i < 60 * 2.5; i++) {
      a.world.update(1 / 60, a.host);
      if (a.world.judgementOf('me')?.phase === 'cut') sawCut = true;
    }
    expect(sawCut).toBe(true);
    expect(a.teleports).toHaveLength(1);
    expect(a.teleports[0]).toEqual({ x: 0, y: 0 }); // back where he began
    // One blow: the damage of every cut together.
    const landed = a.hits.filter((h) => h.target === 'foe');
    expect(landed).toHaveLength(1);
    expect(landed[0]?.damage).toBe(KENSHIRO_KIT.ult.payload.damage * d.strikes);
    expect(a.world.judgementOf('me')).toBeNull();
  });

  it('deals nothing before the cuts are done', () => {
    const a = arena({ x: 5, y: 0 });
    a.world.release('me', KENSHIRO_KIT.ult, { x: 5, y: 0 }, a.host);
    run(a, 0.6);
    expect(a.hits).toHaveLength(0);
  });
});

describe('Kenshiro combo, heavy and Sword Mastery', () => {
  const states = profile.states as Record<string, string>;
  const STATS: CombatStats = {
    maxHp: 1000,
    maxStamina: 100,
    staminaRegenPerS: 30,
    staminaRegenDelayS: 0.7,
    power: 1,
    defence: 1,
    critChance: 0.05,
    critMultiplier: 1.5,
    knockbackResistance: 0,
  };

  it('a four-hit sword combo ending in a powerful finishing cut, and an overhead slash heavy', () => {
    const chain: string[] = [];
    let id: string | undefined = set.starters.tap;
    while (id && !chain.includes(id)) {
      chain.push(id);
      id = (set.moves.find((m) => m.id === id) as { next?: { tap?: string } } | undefined)?.next?.tap;
    }
    expect(chain).toEqual(['katana-slash', 'reverse-slash', 'dual-strike', 'finishing-cut']);
    for (const m of set.moves.filter((x) => chain.includes(x.id)))
      expect(states[m.animationState]).toMatch(/^kenshiro\./);
    expect(set.starters.heavy).toBe('overhead-cut');
    expect(states.HeavyAttack).toBe('kenshiro.overhead');
  });

  it('mastery builds to the threshold, enhances every hit of the next sword ability, then is spent', () => {
    const m = KENSHIRO_KIT.passive!.mastery!;
    const c = new Combatant(STATS);
    expect(c.swordFactor(m.threshold, m.damageFactor, m.windowS)).toBe(1);
    c.gainMastery(m.threshold - 1, 8);
    expect(c.swordFactor(m.threshold, m.damageFactor, m.windowS)).toBe(1);
    c.gainMastery(1, 8);
    expect(c.swordFactor(m.threshold, m.damageFactor, m.windowS)).toBe(m.damageFactor);
    expect(c.masteryStacks).toBe(0);
    // The same ability's later cuts keep the enhancement, then it lapses.
    expect(c.swordFactor(m.threshold, m.damageFactor, m.windowS)).toBe(m.damageFactor);
    for (let i = 0; i < Math.round((m.windowS + 0.2) * 60); i++) c.update(1 / 60);
    expect(c.swordFactor(m.threshold, m.damageFactor, m.windowS)).toBe(1);
  });

  it('a parry is worth three blows of mastery', () => {
    expect(KENSHIRO_KIT.passive?.mastery?.threshold).toBeLessThanOrEqual(8);
    const c = new Combatant(STATS);
    c.gainMastery(3, 8);
    expect(c.masteryStacks).toBe(3);
  });
});
