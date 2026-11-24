import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import { SceneManager } from '../../../src/core/scene';
import { TRAINING_YARD } from '../../../src/data/arenas/training-yard';
import { PlayerIntents } from '../../../src/input/intents';
import { initPhysics } from '../../../src/physics/physics-world';

const STEP = 1 / 60;

/**
 * R0.2 regression: Crystal Prison was dead in the real game after 2a2034a removed `trap`,
 * `legTrapState` and `standable` from SceneAbilities, while the unit tests (which use a fake host) stayed green.
 * This drives the real FightArenaScene.
 */
describe('Crystal Prison in the real scene (R0.2)', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('a grounded foe in range is held in place after the crystals lock', async () => {
    const intents = new PlayerIntents();
    const scene = new FightArenaScene(
      { ...TRAINING_YARD, playerStart: { x: 14, y: 13 }, dummyStart: { x: 17, y: 13 } },
      new Container(),
      intents,
      () => ({ width: 1280, height: 720 }),
      false,
      { player: 'prismor' },
    );
    const scenes = new SceneManager();
    await scenes.switchTo(() => scene);
    const run = (s: number) => {
      for (let i = 0; i < Math.round(s / STEP); i++) {
        scenes.update(STEP);
        scenes.render(1, STEP);
      }
    };
    run(0.2);
    intents.pressAbility('a4');
    run(1.6);
    const foe = scene.dummyFighter;
    expect(scene.abilities!.world.prisons.length).toBe(1);
    expect(scene.abilities!.world.prisons[0]!.phase).toBe('held');
    expect(foe.combatant.trapLeftS).toBeGreaterThan(0);
    scenes.clear();
  });
});
