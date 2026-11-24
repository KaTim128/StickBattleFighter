import { describe, expect, it } from 'vitest';
import { type BrainView, FighterBrain, hitChance } from '../../../src/ai/fighter-brain';
import { BRAIN_DESIGNS } from '../../../src/data/ai/brains';
import { DIFFICULTIES } from '../../../src/data/ai/difficulty';

/** Batch 4 (spec §3): stat, health and opponent awareness, ability purpose, adaptation, and Time Stop play. */
function rng(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function view(over: {
  self?: Partial<BrainView['self']>;
  target?: Partial<NonNullable<BrainView['target']>> | null;
  timeS?: number;
  design?: string;
  difficulty?: keyof typeof DIFFICULTIES;
}): BrainView {
  const base: NonNullable<BrainView['target']> = {
    x: 4,
    y: 0,
    vx: 0,
    vy: 0,
    floorM: 0,
    hpFrac: 1,
    down: false,
    helpless: false,
    attacking: false,
    cursed: false,
    toxicity: 0,
  };
  return {
    timeS: over.timeS ?? 10,
    self: {
      x: 0,
      y: 0,
      floorM: 0,
      airborne: false,
      canAct: true,
      busy: false,
      hanging: false,
      hpFrac: 1,
      ...over.self,
    },
    target: over.target === null ? null : { ...base, ...over.target },
    meleeReachM: 1.3,
    canClimb: false,
    abilities: (['a1', 'a2', 'a3', 'a4', 'ult'] as const).map((slot) => ({ slot, ready: true })),
    profile: { aggression: 0.5, attackEveryS: 0.8, reactionS: 0.25 },
    design: BRAIN_DESIGNS[over.design ?? 'inferno-ai']!,
    difficulty: DIFFICULTIES[over.difficulty ?? 'hard'],
    route: null,
    random: rng(7),
  };
}

function run(brain: FighterBrain, v: BrainView, steps = 20) {
  let last = brain.think(v);
  for (let i = 1; i < steps; i++) last = brain.think({ ...v, timeS: v.timeS + i * 0.05 });
  return last;
}

describe('intelligent AI (Batch 4)', () => {
  it('A1: a fragile fighter starts the fight more cautiously than a sturdy one against the same foe', () => {
    const away = (maxHp: number) => {
      const b = new FighterBrain();
      const v = { ...view({ self: { maxHp }, target: { x: 3.4, maxHp: 1000 }, design: 'psion-ai' }), abilities: [] };
      const out = run(b, v, 12);
      return -out.move.x; // positive = backing off
    };
    expect(away(600)).toBeGreaterThan(away(1500));
  });

  it('A2/A5: it reads the phase of the fight from both health bars', () => {
    const phaseOf = (selfHp: number, foeHp: number, timeS = 30) => {
      const b = new FighterBrain();
      run(b, view({ timeS, self: { hpFrac: selfHp, maxHp: 1000 }, target: { hpFrac: foeHp, maxHp: 1000 } }), 6);
      return b.fightPhase;
    };
    expect(phaseOf(1, 1, 1)).toBe('opening');
    expect(phaseOf(0.9, 0.9)).toBe('even');
    expect(phaseOf(0.9, 0.3)).toBe('ahead');
    expect(phaseOf(0.5, 0.9)).toBe('behind');
    expect(phaseOf(0.15, 0.9)).toBe('critical');
  });

  it('Easy plays from its design alone and never reads the phase', () => {
    const b = new FighterBrain();
    run(b, view({ difficulty: 'easy', self: { hpFrac: 0.1, maxHp: 1000 }, target: { hpFrac: 1, maxHp: 1000 } }), 6);
    expect(b.fightPhase).toBe('even');
  });

  it('A4: an ability out of its range band or aimed at a quick mover is a poor bet; a helpless foe raises it', () => {
    const tac = { role: 'poke', minM: 2, maxM: 8, weight: 1 } as const;
    const still = { vx: 0, vy: 0, helpless: false };
    expect(hitChance(tac, 5, still)).toBeGreaterThan(hitChance(tac, 7.9, still));
    expect(hitChance(tac, 5, still)).toBeGreaterThan(hitChance(tac, 5, { vx: 8, vy: 0, helpless: false }));
    expect(hitChance(tac, 5, { ...still, helpless: true })).toBeGreaterThanOrEqual(hitChance(tac, 5, still));
    expect(hitChance(tac, 5, { ...still, frozen: true })).toBe(1);
  });

  it('A4: a planning opponent holds an ultimate that cannot reach (out of its band) instead of wasting it', () => {
    let casts = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const b = new FighterBrain();
      const v = { ...view({ target: { x: 20 } }), random: rng(seed) }; // far out of every band
      for (let i = 0; i < 40; i++) if (b.think({ ...v, timeS: 10 + i * 0.5 }).ability?.slot === 'ult') casts++;
    }
    expect(casts).toBe(0);
  });

  it('A3: it punishes a foe in the recovery of a blow it threw, not only a stunned one', () => {
    const swings = (recovering: boolean) => {
      let n = 0;
      for (let seed = 1; seed <= 25; seed++) {
        const b = new FighterBrain();
        const v = { ...view({ target: { x: 1.1, recovering } }), random: rng(seed) };
        for (let i = 0; i < 30; i++) {
          const o = b.think({ ...v, timeS: 10 + i * 0.1 });
          if (o.melee || o.heavy || o.ability) n++;
        }
      }
      return n;
    };
    expect(swings(true)).toBeGreaterThanOrEqual(swings(false));
  });

  it('CH2: against a foe frozen in Time Stop it attacks without retreating', () => {
    const b = new FighterBrain();
    const v = view({ design: 'chronos-ai', self: { hpFrac: 0.2, maxHp: 1000 }, target: { x: 2.4, frozen: true } });
    const out = run(b, v, 20);
    expect(out.move.x).toBeGreaterThanOrEqual(0); // never backs away from a frozen foe, even when hurt
  });

  it('hazard sense: Easy stands in a ring about to burst; Expert steps out of it, sprinting away from its centre', () => {
    const hazards = [{ kind: 'zone' as const, x: 0, y: 0, radiusM: 2.5, leftS: 0.5 }];
    const act = (difficulty: 'easy' | 'expert') => {
      const b = new FighterBrain();
      const v = { ...view({ self: {}, target: { x: 6, y: 0 }, difficulty }), hazards };
      v.self = { ...v.self, x: 0.4, y: 0 };
      return run(b, { ...v, abilities: [] }, 12);
    };
    const easy = act('easy');
    const expert = act('expert');
    expect(expert.sprint).toBe(true);
    expect(expert.move.x).toBeGreaterThan(0.8); // straight out of the ring (away from its centre)
    expect(expert.melee || expert.heavy).toBe(false);
    // Easy plays the same as with no hazard at all.
    const plain = run(
      new FighterBrain(),
      { ...view({ target: { x: 6, y: 0 }, difficulty: 'easy' }), self: { ...view({}).self, x: 0.4 }, abilities: [] },
      12,
    );
    expect(easy.move).toEqual(plain.move);
  });

  it('hazard sense: a smart tier will not walk into a mine on its way; Easy does', () => {
    const hazards = [{ kind: 'mine' as const, x: 1.5, y: 0, radiusM: 0.7, leftS: Number.POSITIVE_INFINITY }];
    const next = (difficulty: 'easy' | 'hard') => {
      const b = new FighterBrain();
      const v = { ...view({ target: { x: 9, y: 0 }, difficulty }), hazards, abilities: [] };
      return run(b, v, 12);
    };
    const plainEasy = run(
      new FighterBrain(),
      { ...view({ target: { x: 9, y: 0 }, difficulty: 'easy' }), abilities: [] },
      12,
    );
    expect(next('easy').move).toEqual(plainEasy.move); // Easy plays as if the mine were not there
    expect(Math.abs(next('hard').move.y)).toBeGreaterThan(0.5); // slides round the edge
  });

  it('ultimate patience: Expert holds an ultimate with no reason to fire; Easy fires it as soon as it is in range', () => {
    const fires = (difficulty: 'easy' | 'expert') => {
      let n = 0;
      for (let seed = 1; seed <= 25; seed++) {
        const v = {
          ...view({ target: { x: 3 }, difficulty, timeS: 5 }),
          random: rng(seed),
          abilities: [{ slot: 'ult' as const, ready: true }],
        };
        const b = new FighterBrain();
        for (let i = 0; i < 40; i++) if (b.think({ ...v, timeS: 5 + i * 0.5 }).ability?.slot === 'ult') n++;
      }
      return n;
    };
    expect(fires('easy')).toBeGreaterThan(0);
    expect(fires('expert')).toBe(0);
  });

  it('ultimate patience: Expert does fire it at a helpless foe', () => {
    let n = 0;
    for (let seed = 1; seed <= 25; seed++) {
      const v = {
        ...view({ target: { x: 3, helpless: true }, difficulty: 'expert', timeS: 5 }),
        random: rng(seed),
        abilities: [{ slot: 'ult' as const, ready: true }],
      };
      const b = new FighterBrain();
      for (let i = 0; i < 40; i++) if (b.think({ ...v, timeS: 5 + i * 0.5 }).ability?.slot === 'ult') n++;
    }
    expect(n).toBeGreaterThan(0);
  });

  it('cast awareness: Expert gives ground when the foe winds up a wide ability; Easy does not read it', () => {
    const backed = (difficulty: 'easy' | 'expert') => {
      let n = 0;
      for (let seed = 1; seed <= 30; seed++) {
        const v = {
          ...view({ target: { x: 2.2 }, difficulty, design: 'psion-ai' }),
          random: rng(seed),
          foeCast: { reachM: 4, ult: false },
          abilities: [],
        };
        const b = new FighterBrain();
        const o = run(b, v, 10);
        if (o.move.x < -0.3) n++;
      }
      return n;
    };
    expect(backed('expert')).toBeGreaterThan(backed('easy'));
  });
});
