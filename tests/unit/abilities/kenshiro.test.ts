import { describe, expect, it } from 'vitest';
import { finisherFactor } from '../../../src/abilities/ability-def';
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

  it('Blade Tempest cuts six times, each cut its own hit', () => {
    const a = arena({ x: 1.6, y: 0 });
    a.world.release('me', KENSHIRO_KIT.a3, { x: 1.6, y: 0 }, a.host);
    run(a, 2);
    expect(a.hits.filter((h) => h.target === 'foe')).toHaveLength(6);
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

  it('Sliding Slice slides a very short way, slicing through everyone in the path once and pushing nobody', () => {
    const a = arena({ x: 2, y: 0 });
    a.world.release('me', KENSHIRO_KIT.a1, { x: 3, y: 0 }, a.host);
    run(a, 0.6);
    expect(a.hits.filter((h) => h.target === 'foe')).toHaveLength(1);
    expect(a.me.x).toBeGreaterThan(2.5);
    expect(a.me.x).toBeLessThan(3.6); // a very short slide (3.2 m)
    const d = KENSHIRO_KIT.a1.delivery;
    expect(d.type === 'dash' && d.distanceM).toBeLessThanOrEqual(3.5);
    expect(KENSHIRO_KIT.a1.payload.knockbackMps).toBeLessThan(1);
  });

  it('Sliding Slice deals 60% more to a target at 15% health or less, and only then', () => {
    const p = KENSHIRO_KIT.a1.payload;
    expect(p.finisher).toEqual({ belowHp: 0.15, bonus: 0.6 });
    expect(finisherFactor(p, 1)).toBe(1);
    expect(finisherFactor(p, 0.16)).toBe(1);
    expect(finisherFactor(p, 0.15)).toBeCloseTo(1.6, 6);
    expect(finisherFactor(p, 0.02)).toBeCloseTo(1.6, 6);
    // Nothing else in the kit has the bonus.
    for (const def of [KENSHIRO_KIT.a2, KENSHIRO_KIT.a3, KENSHIRO_KIT.a5!, KENSHIRO_KIT.ult])
      expect(def.payload.finisher, def.id).toBeUndefined();
  });

  it('Iaido (the fifth ability) is a forward charge: it cuts everyone in the line once, with no knockback and no launch', () => {
    const a = arena({ x: 3, y: 0 });
    const second = { id: 'foe2', x: 5, y: 0.2, radiusM: 0.3, hittable: true };
    const fighters = a.host.fighters();
    a.host.fighters = () => [...fighters, second];
    a.world.release('me', KENSHIRO_KIT.a5!, { x: 6, y: 0 }, a.host);
    run(a, 0.6);
    expect(a.hits.filter((h) => h.target === 'foe')).toHaveLength(1);
    expect(a.hits.filter((h) => h.target === 'foe2')).toHaveLength(1); // both enemies in the line
    expect(a.me.x).toBeGreaterThan(5.5);
    const p = KENSHIRO_KIT.a5!.payload;
    expect(p.knockbackMps).toBe(0);
    expect(p.heavy).toBe(false);
    expect(p.noFlinch).toBe(true); // no stagger or knock-down either
    expect(KENSHIRO_KIT.a5?.name).toBe('Iaido');
  });

  it('is balanced: the new dashes are lighter per target than the ultimate and the parry counter, on real cooldowns', () => {
    const slice = KENSHIRO_KIT.a1;
    const iaido = KENSHIRO_KIT.a5!;
    expect(slice.payload.damage * 1.6).toBeLessThan(KENSHIRO_KIT.a2.payload.damage * 1.3); // even the bonus is below the parry counter
    expect(iaido.payload.damage).toBeLessThan(slice.payload.damage); // a crowd charge is lighter per target
    expect(slice.cooldownS).toBeGreaterThanOrEqual(7);
    expect(iaido.cooldownS).toBeGreaterThanOrEqual(10);
    for (const def of [slice, iaido]) {
      expect(def.castS + def.recoveryS).toBeLessThanOrEqual(0.7); // quick, not free
      expect(def.staminaCost).toBeGreaterThanOrEqual(20);
    }
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

  it("a slower three-slash tap (high swing, rising mid diagonal, low sweep) that hits harder than other fighters' taps, and a slow overhead slice heavy", () => {
    const chain: string[] = [];
    let id: string | undefined = set.starters.tap;
    while (id && !chain.includes(id)) {
      chain.push(id);
      id = (set.moves.find((m) => m.id === id) as { next?: { tap?: string } } | undefined)?.next?.tap;
    }
    expect(chain).toEqual(['slash-1', 'slash-2', 'low-sweep']);
    for (const m of set.moves.filter((x) => chain.includes(x.id)))
      expect(states[m.animationState]).toMatch(/^kenshiro\./);
    expect(set.starters.heavy).toBe('overhead-cut');
    // Slower than a normal tap and stronger per blow.
    const taps = chain.map((id) => set.moves.find((m) => m.id === id)!);
    for (const t of taps) {
      expect(t.startupS, t.id).toBeGreaterThanOrEqual(0.2); // slower than every other fighter's taps (0.06 to 0.16 s)
      expect(t.damage, t.id).toBeGreaterThanOrEqual(30); // and stronger per blow than all but Titan's finishers
    }
    const heavy = set.moves.find((m) => m.id === 'overhead-cut')!;
    expect(heavy.startupS).toBeGreaterThanOrEqual(0.6); // slow
    expect(heavy.damage).toBeGreaterThanOrEqual(2 * taps[0]!.damage); // big
    expect(heavy.heavy).toBe(true);
    expect(states.HeavyAttack).toBe('kenshiro.overhead');
  });

  it('every attack is a slice, never a poke: no thrust or stab clip anywhere in his moveset or profile', () => {
    for (const m of set.moves) {
      expect(m.id).not.toMatch(/thrust|stab|poke/);
      expect(states[m.animationState] ?? '', m.id).toMatch(/^kenshiro\./);
      expect(states[m.animationState] ?? '', m.id).not.toMatch(/thrust|stab/);
    }
    expect(set.starters['tap-forward']).toBe('lunge-slash');
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
