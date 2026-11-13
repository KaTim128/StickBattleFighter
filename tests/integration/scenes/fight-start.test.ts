import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import { SceneManager } from '../../../src/core/scene';
import { OFFICE } from '../../../src/data/arenas/office';
import { TRAINING_YARD } from '../../../src/data/arenas/training-yard';
import { PlayerIntents } from '../../../src/input/intents';
import { initPhysics } from '../../../src/physics/physics-world';

const STEP = 1 / 60;

/** Owner, 13/11/2026: before the fight the two stand a little apart, facing each other. */
describe('squaring up before the fight', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  for (const [name, arena] of [
    ['office', OFFICE],
    ['training yard', TRAINING_YARD],
  ] as const) {
    it(`${name}: a short distance apart and facing each other through READY... FIGHT!`, async () => {
      const scene = new FightArenaScene(
        arena,
        new Container(),
        new PlayerIntents(),
        () => ({ width: 1280, height: 720 }),
        false,
        {
          player: 'inferno',
          opponent: 'rampage',
        },
      );
      const scenes = new SceneManager();
      await scenes.switchTo(() => scene);
      scene.startIntro();
      const check = () => {
        const p = scene.playerFighter;
        const o = scene.dummyFighter;
        const d = Math.hypot(o.x - p.x, o.y - p.y);
        expect(d).toBeGreaterThan(2.5);
        expect(d).toBeLessThan(3.5);
        // Each faces the other.
        expect((p.aim.x * (o.x - p.x) + p.aim.y * (o.y - p.y)) / d).toBeGreaterThan(0.9);
        expect((o.aim.x * (p.x - o.x) + o.aim.y * (p.y - o.y)) / d).toBeGreaterThan(0.9);
      };
      check();
      for (let i = 0; i < 60; i++) {
        scenes.update(STEP);
        scenes.render(1, STEP);
      }
      check(); // still squared up through the countdown
      scenes.clear();
    });
  }
});
