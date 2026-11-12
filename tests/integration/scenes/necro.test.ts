import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import { SceneManager } from '../../../src/core/scene';
import { NECRO_KIT } from '../../../src/data/abilities/necro';
import type { ArenaLayout } from '../../../src/data/arenas/arena-layout';
import { OFFICE } from '../../../src/data/arenas/office';
import { TRAINING_YARD } from '../../../src/data/arenas/training-yard';
import { PlayerIntents } from '../../../src/input/intents';
import { initPhysics } from '../../../src/physics/physics-world';

const STEP = 1 / 60;
const K = NECRO_KIT;

async function setup(
  at: { x: number; y: number },
  dummyAt: { x: number; y: number },
  arena: ArenaLayout = TRAINING_YARD,
) {
  const intents = new PlayerIntents();
  const scene = new FightArenaScene(
    { ...arena, playerStart: at, dummyStart: dummyAt },
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
  const runUntil = (done: () => boolean, limitS = 4) => {
    for (let i = 0; i < limitS / STEP && !done(); i++) run(STEP);
  };
  run(0.2);
  scene.drainEvents();
  /** Face the dummy (soft lock picks it) and cast. */
  const cast = (slot: 'a1' | 'a2' | 'a3' | 'ult') => {
    intents.pressAbility(slot);
    run(STEP * 2);
  };
  return { intents, scene, scenes, run, runUntil, cast };
}

describe('Necro (owner, 12/11/2026): the death mage', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('is a little slower than Inferno and swings a 3-hit staff combo ending in a knockdown', async () => {
    const { intents, scene, scenes, run, runUntil } = await setup({ x: 15, y: 13 }, { x: 16.4, y: 13 });
    expect(scene.playerFighter.def.movement.maxSpeedMps).toBeLessThan(5 * 1.05);
    expect(Object.values(scene.playerFighter.def.moves).filter((m) => !m.aerial)).toHaveLength(3);
    const seen: string[] = [];
    for (let k = 0; k < 3; k++) {
      intents.pressMelee();
      runUntil(() => scene.player.attack !== null && !seen.includes(scene.player.attack), 1);
      if (scene.player.attack) seen.push(scene.player.attack);
      run(0.15);
    }
    expect(seen).toEqual(['staff-sweep', 'soul-thrust', 'grave-slam']);
    runUntil(() => scene.dummy.state === 'knockdown' || scene.dummy.state === 'gettingUp', 2);
    expect(['knockdown', 'gettingUp']).toContain(scene.dummy.state);
    scenes.clear();
  });

  it('Soul Drain: a projectile that hurts the target and gives Necro back half the damage', async () => {
    const { scene, scenes, runUntil, cast } = await setup({ x: 13, y: 13 }, { x: 18, y: 13 });
    scene.playerFighter.combatant.hp = 600;
    cast('a1');
    runUntil(() => scene.dummy.hp < 1000, 3);
    const dealt = 1000 - scene.dummy.hp;
    expect(dealt).toBeGreaterThan(0);
    expect(scene.player.hp).toBeGreaterThan(600);
    expect(scene.player.hp - 600).toBeCloseTo(K.a1.payload.damage * K.a1.payload.lifesteal!, 0);
    scenes.clear();
  });

  it('Death Eruption: bursts up under the target at range, hurting and trapping it in place', async () => {
    const { scene, scenes, run, runUntil, cast } = await setup({ x: 13, y: 13 }, { x: 18, y: 13 });
    cast('a2');
    run(K.a2.castS);
    const t = scene.abilities!.world.telegraphs[0]!;
    expect(Math.hypot(t.x - 18, t.y - 13)).toBeLessThan(0.8); // under the dummy, not around Necro
    runUntil(() => scene.dummy.hp < 1000, 2);
    expect(scene.dummy.hp).toBeLessThan(1000);
    expect(scene.dummy.state).toBe('stunned'); // trapped
    scenes.clear();
  });

  it('Undead Army: three skeleton warriors rise on his side, hunt the dummy and hurt it, never him, then crumble', async () => {
    const { scene, scenes, runUntil, cast } = await setup({ x: 14, y: 13 }, { x: 18, y: 13 });
    cast('a3');
    runUntil(() => scene.summonStates.length > 0, 2);
    expect(scene.summonStates).toHaveLength(3);
    expect(scene.summonStates.every((s) => s.team === 'player')).toBe(true);
    runUntil(() => scene.dummy.hp < 1000, 6);
    expect(scene.dummy.hp).toBeLessThan(1000);
    expect(scene.player.hp).toBe(scene.playerFighter.combatant.stats.maxHp); // their blows never hit him
    // Their time (game time) runs out: they crumble and are gone.
    runUntil(() => scene.summonStates.length === 0, 16);
    expect(scene.summonStates).toHaveLength(0);
    scenes.clear();
  });

  it('never more than four at once, and they never appear inside walls or furniture', async () => {
    // Against the office's walls and furniture.
    const { scene, scenes, run, runUntil, cast } = await setup({ x: 2.2, y: 4 }, { x: 25, y: 13 }, OFFICE);
    cast('a3');
    runUntil(() => scene.summonStates.length > 0, 2);
    scene.playerFighter.caster!.reset();
    scene.playerFighter.combatant.stamina = 100;
    run(1);
    cast('a3');
    run(1.5);
    const alive = scene.summonStates.filter((s) => !s.ko);
    expect(alive.length).toBeLessThanOrEqual(4);
    for (const s of alive) expect(scene.physics!.isFree({ x: s.x, y: s.y }, 0.2)).toBe(true);
    scenes.clear();
  });

  it("Death's Dominion: 8 s of power: two more skeletons rise and his magic hits 50% harder", async () => {
    const { scene, scenes, runUntil, cast } = await setup({ x: 13, y: 13 }, { x: 18, y: 13 });
    scene.playerFighter.caster!.fillMeter();
    cast('ult');
    runUntil(() => scene.playerFighter.buff !== null, 2);
    expect(scene.playerFighter.buff?.abilityDamageFactor).toBe(1.5);
    expect(scene.summonStates.length).toBe(2);
    // His magic now hits harder: the same Soul Drain hit takes far more off the dummy.
    const before = scene.dummy.hp;
    scene.abilities!.hitFighter('player', 'dummy', K.a1.payload, { x: 1, y: 0 });
    expect(before - scene.dummy.hp).toBeGreaterThanOrEqual(K.a1.payload.damage * 1.4);
    runUntil(() => scene.playerFighter.buff === null, 12);
    expect(scene.playerFighter.buff).toBeNull();
    scenes.clear();
  });
});
