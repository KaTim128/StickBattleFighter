import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import { SceneManager } from '../../../src/core/scene';
import { COLOSSEUM, COLOSSEUM_RADIUS_M } from '../../../src/data/arenas/colosseum';
import { PlayerIntents } from '../../../src/input/intents';
import { initPhysics } from '../../../src/physics/physics-world';

const STEP = 1 / 60;

describe('Colosseum in the real scene', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('keeps a fighter inside the round wall however it is walked, and draws without errors', async () => {
    const intents = new PlayerIntents();
    const scene = new FightArenaScene(
      COLOSSEUM,
      new Container(),
      intents,
      () => ({ width: 1280, height: 720 }),
      false,
      {
        player: 'rampage',
      },
    );
    const scenes = new SceneManager();
    await scenes.switchTo(() => scene);
    const c = COLOSSEUM.widthM / 2;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      intents.setMove('test', { x: Math.cos(a), y: Math.sin(a) });
      for (let i = 0; i < 60 * 14; i++) {
        scenes.update(STEP);
        scenes.render(1, STEP);
      }
      const p = scene.playerFighter;
      expect(Math.hypot(p.x - c, p.y - c)).toBeLessThan(COLOSSEUM_RADIUS_M);
    }
    scenes.clear();
  }, 120_000);
});
