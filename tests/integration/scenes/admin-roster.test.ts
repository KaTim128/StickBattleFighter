import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import { SceneManager } from '../../../src/core/scene';
import { TRAINING_YARD } from '../../../src/data/arenas/training-yard';
import { PlayerIntents } from '../../../src/input/intents';
import { initPhysics } from '../../../src/physics/physics-world';

/** The Admin Panel can start a fight as any character it lists, skeletons and the dummy included. */
describe('admin roster', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  for (const id of ['skeleton-warrior', 'training-dummy']) {
    it(`a fight can be played as ${id} against Inferno without errors`, async () => {
      const scene = new FightArenaScene(
        TRAINING_YARD,
        new Container(),
        new PlayerIntents(),
        () => ({ width: 1280, height: 720 }),
        false,
        { player: id, opponent: 'inferno' },
      );
      const scenes = new SceneManager();
      await scenes.switchTo(() => scene);
      for (let i = 0; i < 180; i++) {
        scenes.update(1 / 60);
        scenes.render(1, 1 / 60);
      }
      expect(scene.playerFighter.def.id).toBe(id);
      expect(Number.isFinite(scene.player.x)).toBe(true);
      scenes.clear();
    });
  }
});
