import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import type { SummonSpec } from '../../../src/abilities/ability-def';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import type { FighterEntity } from '../../../src/app/scenes/fighter-entity';
import { loadCharacter } from '../../../src/characters/load';
import { SceneManager } from '../../../src/core/scene';
import { NECRO_KIT } from '../../../src/data/abilities/necro';
import { TRAINING_YARD } from '../../../src/data/arenas/training-yard';
import { PlayerIntents } from '../../../src/input/intents';
import { initPhysics } from '../../../src/physics/physics-world';

const STEP = 1 / 60;
const SPEC = NECRO_KIT.ult.delivery as unknown as SummonSpec;

type Summons = {
  list: FighterEntity[];
  spawn(owner: FighterEntity, spec: SummonSpec): number;
  room(owner: FighterEntity, spec: SummonSpec): number;
};

async function setup(at: { x: number; y: number }, dummyAt: { x: number; y: number }) {
  const intents = new PlayerIntents();
  const scene = new FightArenaScene(
    { ...TRAINING_YARD, playerStart: at, dummyStart: dummyAt },
    new Container(),
    intents,
    () => ({ width: 1280, height: 720 }),
    false,
    { player: 'necro' },
  );
  const scenes = new SceneManager();
  await scenes.switchTo(() => scene);
  const run = (seconds: number) => {
    for (let i = 0; i < Math.round(seconds / STEP); i++) {
      scenes.update(STEP);
      scenes.render(1, STEP);
    }
  };
  run(0.2);
  const summons = (scene as unknown as { summons: Summons }).summons;
  const alive = (owner: FighterEntity) => summons.list.filter((m) => m.summon?.owner === owner && !m.combatant.isKo);
  return { intents, scene, scenes, run, summons, alive };
}

/** Master plan Phase 1 B5: exactly four skeletons, frail, and they only ever hurt. */
describe('Necro skeletons (B5)', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('allows exactly four, raises only the free slots, and refuses a fifth before spending the ultimate', async () => {
    const { scene, scenes, summons, alive, run } = await setup({ x: 8, y: 13 }, { x: 18, y: 13 });
    const necro = scene.playerFighter;
    expect(SPEC.maxAlive).toBe(4);
    expect(summons.spawn(necro, SPEC)).toBe(4);
    expect(alive(necro)).toHaveLength(4);
    expect(summons.room(necro, SPEC)).toBe(0);
    expect(summons.spawn(necro, SPEC)).toBe(0); // a fifth is rejected, and nobody crumbles to make room
    expect(alive(necro)).toHaveLength(4);
    // Cast the ultimate with the meter full: refused, and the meter is not spent.
    necro.caster!.fillMeter();
    const meter = necro.caster!.meter;
    expect(scene.abilities!.tryCast(necro, 'ult')).toBe('limit');
    expect(necro.caster!.meter).toBe(meter);
    // A defeated skeleton frees exactly one slot.
    alive(necro)[0]!.combatant.expire();
    run(0.1);
    expect(summons.room(necro, SPEC)).toBe(1);
    expect(summons.spawn(necro, SPEC)).toBe(1); // asks for two, only one slot is free
    expect(alive(necro)).toHaveLength(4);
    scenes.clear();
  });

  it('are frail: a skeleton dies to a few hits', () => {
    const def = loadCharacter('skeleton-warrior').def;
    expect(def.stats.maxHp).toBeLessThanOrEqual(100);
    expect(def.capabilities.staggersTargets).toBe(false);
    expect(loadCharacter('necro').def.capabilities.staggersTargets).toBe(true); // everyone else still flinches their target
  });

  it('never stun, push or interrupt the fighter they hit, and their blows still hurt', async () => {
    const { scene, scenes, summons, run, intents } = await setup({ x: 10, y: 13 }, { x: 30, y: 13 });
    const necro = scene.playerFighter;
    // Four skeletons, raised by the enemy's side, stand on top of Necro and swing at him.
    const foe = scene.dummyFighter;
    for (let i = 0; i < 4; i++) summons.spawn(foe, { ...SPEC, count: 1, near: 'caster' } as SummonSpec);
    for (const m of summons.list)
      m.placeAt({ x: 10.8 + (summons.list.indexOf(m) % 2) * 0.3, y: 12.6 + summons.list.indexOf(m) * 0.25 });
    const hp = necro.combatant.hp;
    intents.pressAbility('a1'); // Necro starts a wind-up while they hit him
    const phases = new Set<string>();
    const states = new Set<string>();
    let moved = 0;
    for (let i = 0; i < 4 / STEP; i++) {
      run(STEP);
      states.add(necro.combatant.state);
      const ph = necro.caster!.cast?.phase;
      if (ph) phases.add(ph);
      moved = Math.max(moved, Math.hypot(necro.body!.linvel().x, necro.body!.linvel().y));
    }
    expect(necro.combatant.hp).toBeLessThan(hp); // they hurt...
    expect([...states].filter((s) => s !== 'free' && s !== 'guarding')).toEqual([]); // ...but never stun or knock down
    expect(phases.has('recovery')).toBe(true); // his wind-up was not interrupted: it released
    expect(moved).toBeLessThan(1.5); // and nothing shoved him across the floor
    scenes.clear();
  });

  it('register one hit per swing: no two blows from one skeleton closer than its swing', async () => {
    const { scene, scenes, summons, run } = await setup({ x: 10, y: 13 }, { x: 30, y: 13 });
    const necro = scene.playerFighter;
    summons.spawn(scene.dummyFighter, { ...SPEC, count: 1, near: 'caster' } as SummonSpec);
    summons.list[0]!.placeAt({ x: 10.8, y: 13 });
    scene.drainEvents();
    const hitTimes: number[] = [];
    for (let i = 0; i < 6 / STEP; i++) {
      run(STEP);
      for (const e of scene.drainEvents())
        if (e.target === necro.name && (e.kind === 'hit' || e.kind === 'crit')) hitTimes.push(i * STEP);
    }
    expect(hitTimes.length).toBeGreaterThan(2);
    for (let i = 1; i < hitTimes.length; i++)
      expect(hitTimes[i]! - hitTimes[i - 1]!, `hit ${i}`).toBeGreaterThanOrEqual(0.2);
    scenes.clear();
  });
});
