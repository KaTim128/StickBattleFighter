import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import { SceneManager } from '../../../src/core/scene';
import { TRAINING_YARD } from '../../../src/data/arenas/training-yard';
import { PlayerIntents } from '../../../src/input/intents';
import { initPhysics } from '../../../src/physics/physics-world';

const STEP = 1 / 60;

async function setup(at: { x: number; y: number }, dummyAt: { x: number; y: number }) {
  const intents = new PlayerIntents();
  const scene = new FightArenaScene(
    { ...TRAINING_YARD, playerStart: at, dummyStart: dummyAt },
    new Container(),
    intents,
    () => ({ width: 1280, height: 720 }),
    false,
    { player: 'chronos' },
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
  return { intents, scene, scenes, run };
}

/** Chronos's Time Stop (owner, 21/11/2026): everything stops, damage piles up unseen, and all of it lands when time resumes. */
describe('Time Stop', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('freezes the opponent and holds every blow he takes until time resumes, then all of it lands at once', async () => {
    const { intents, scene, scenes, run } = await setup({ x: 14, y: 13 }, { x: 15.2, y: 13 });
    scene.playerFighter.caster!.fillMeter();
    intents.pressAbility('ult');
    run(1.3); // cast; time is now stopped
    expect(scene.timeStopView.active).toBe(true);
    const hp = scene.dummy.hp;
    const at = { x: scene.dummyFighter.x, y: scene.dummyFighter.y };
    const cool = scene.dummyFighter.caster?.meter ?? 0;
    for (let i = 0; i < 3; i++) {
      intents.pressHeavy();
      run(0.9);
    }
    // Held: nothing has landed and nothing has moved.
    expect(scene.dummy.hp).toBe(hp);
    expect(scene.dummyFighter.x).toBeCloseTo(at.x, 2);
    expect(scene.dummyFighter.y).toBeCloseTo(at.y, 2);
    expect(scene.dummyFighter.caster?.meter ?? 0).toBe(cool);
    run(2);
    expect(scene.timeStopView.active).toBe(false);
    run(0.1);
    expect(scene.dummy.hp).toBeLessThan(hp - 30); // the accumulated blows landed
    scenes.clear();
  });

  it('time runs normally again afterwards: the dummy can be pushed and nothing stays frozen', async () => {
    const { intents, scene, scenes, run } = await setup({ x: 14, y: 13 }, { x: 15.2, y: 13 });
    scene.playerFighter.caster!.fillMeter();
    intents.pressAbility('ult');
    run(6);
    expect(scene.timeStopView.active).toBe(false);
    const hp = scene.dummy.hp;
    intents.pressHeavy();
    run(1.5);
    expect(scene.dummy.hp).toBeLessThan(hp); // blows land at once again
    scenes.clear();
  });
});
