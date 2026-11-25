import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import { SceneManager } from '../../../src/core/scene';
import { TRAINING_YARD } from '../../../src/data/arenas/training-yard';
import { PlayerIntents } from '../../../src/input/intents';
import { initPhysics } from '../../../src/physics/physics-world';

const STEP = 1 / 60;

async function setup(player: string, at: { x: number; y: number }, dummyAt: { x: number; y: number }) {
  const intents = new PlayerIntents();
  const scene = new FightArenaScene(
    { ...TRAINING_YARD, playerStart: at, dummyStart: dummyAt },
    new Container(),
    intents,
    () => ({ width: 1280, height: 720 }),
    false,
    { player },
  );
  const scenes = new SceneManager();
  await scenes.switchTo(() => scene);
  const run = (s: number) => {
    for (let i = 0; i < Math.round(s / STEP); i++) {
      scenes.update(STEP);
      scenes.render(1, STEP);
    }
  };
  run(0.3);
  return { intents, scene, scenes, run };
}

describe('the improved kits of the five weakest fighters, in the real scene', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('Chronos Temporal Echo: the foe that ran off is hit and dragged back to where it was marked', async () => {
    const { intents, scene, scenes, run } = await setup('chronos', { x: 12, y: 13 }, { x: 16, y: 13 });
    const marked = { x: scene.dummyFighter.x, y: scene.dummyFighter.y };
    intents.pressAbility('a2');
    run(0.6);
    expect(scene.abilities!.world.echoes).toHaveLength(1);
    // It walks away from the mark.
    scene.dummyFighter.placeAt({ x: marked.x + 3.5, y: marked.y });
    run(2.6);
    expect(scene.dummy.hp).toBeLessThan(1000); // hit when the echo fired
    expect(Math.hypot(scene.dummyFighter.x - marked.x, scene.dummyFighter.y - marked.y)).toBeLessThan(2); // dragged back
    scenes.clear();
  });

  it('Reson Harmonic Shield: an enemy that hits through it takes part of the damage back', async () => {
    const { intents, scene, scenes, run } = await setup('reson', { x: 12, y: 13 }, { x: 13.1, y: 13 });
    intents.pressAbility('a3');
    run(0.8);
    expect(scene.playerFighter.combatant.barrierHp).toBeGreaterThan(0);
    const before = scene.dummy.hp;
    scene.dummyAttacks = true;
    run(3);
    expect(scene.playerFighter.combatant.barrierHp).toBeLessThan(90); // it soaked something
    expect(scene.dummy.hp).toBeLessThan(before); // and threw part of it back
    scenes.clear();
  });
});
