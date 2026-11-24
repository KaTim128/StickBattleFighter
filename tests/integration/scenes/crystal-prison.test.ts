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

describe('Shard Blade in the real scene (PR1-PR3)', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('five taps chain slash, slash, cross, thrust and the crystal piercing punch; K swings the crystal hammer', async () => {
    const intents = new PlayerIntents();
    const scene = new FightArenaScene(
      { ...TRAINING_YARD, playerStart: { x: 18.15, y: 13 }, dummyStart: { x: 19, y: 13 } },
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
    intents.pressAbility('a1');
    run(0.8);
    // Tap every 0.2 s, like a player mashing; record each new move as it starts.
    const seen: string[] = [];
    for (let i = 0; i < 150; i++) {
      if (i % 12 === 0 && i < 100) intents.pressMelee();
      run(STEP);
      const a = scene.player.attack;
      if (a && seen[seen.length - 1] !== a) seen.push(a);
    }
    expect(seen).toEqual(['shard-slash-r', 'shard-slash-l', 'shard-cross', 'shard-thrust', 'shard-finale']);
    run(1.5);
    intents.pressHeavy();
    run(0.3);
    expect(scene.player.attack).toBe('shard-hammer');
    scenes.clear();
  });
});
