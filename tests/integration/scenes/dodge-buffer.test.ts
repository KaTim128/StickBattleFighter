import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import { SceneManager } from '../../../src/core/scene';
import { TRAINING_YARD } from '../../../src/data/arenas/training-yard';
import { PlayerIntents } from '../../../src/input/intents';
import { initPhysics } from '../../../src/physics/physics-world';

const STEP = 1 / 60;

describe('dodge buffer in a fight (B16)', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('a dodge pressed just before the cooldown ends still happens; one pressed long before does not', async () => {
    const intents = new PlayerIntents();
    const scene = new FightArenaScene(
      { ...TRAINING_YARD, playerStart: { x: 10, y: 13 }, dummyStart: { x: 30, y: 13 } },
      new Container(),
      intents,
      () => ({ width: 1280, height: 720 }),
      false,
      { player: 'inferno' },
    );
    const scenes = new SceneManager();
    await scenes.switchTo(() => scene);
    const c = scene.playerFighter.combatant;
    const step = () => {
      scenes.update(STEP);
      scenes.render(1, STEP);
    };
    for (let i = 0; i < 20; i++) step();
    intents.pressDodge();
    step();
    expect(c.dodgeChainLength).toBe(1);
    // Early press, far from ready: forgotten, no second dodge when the cooldown ends.
    intents.pressDodge();
    for (let i = 0; i < 400 && c.dodgeReadiness < 1; i++) step();
    expect(c.dodgeReadiness).toBe(1);
    step();
    expect(c.dodgeChainLength).toBe(1);
    // Rest, then dodge again and press again a few steps before it is ready: it fires by itself.
    for (let i = 0; i < 90; i++) step();
    intents.pressDodge();
    step();
    for (let i = 0; i < 400 && c.dodgeReadiness < 0.88; i++) step();
    intents.pressDodge();
    for (let i = 0; i < 40; i++) step();
    expect(c.dodgeChainLength).toBe(2);
    scenes.clear();
  });
});
