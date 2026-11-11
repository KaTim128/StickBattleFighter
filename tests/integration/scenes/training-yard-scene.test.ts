import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import { SceneManager } from '../../../src/core/scene';
import { TRAINING_YARD } from '../../../src/data/arenas/training-yard';
import { GREYBOX_STICKMAN } from '../../../src/data/fighters/greybox-stickman';
import { PlayerIntents } from '../../../src/input/intents';
import { initPhysics } from '../../../src/physics/physics-world';

const STEP = 1 / 60;
const R = GREYBOX_STICKMAN.body.footRadiusM;
const MAX = GREYBOX_STICKMAN.movement.maxSpeedMps;

async function setup() {
  const stage = new Container();
  const intents = new PlayerIntents();
  const scene = new FightArenaScene(TRAINING_YARD, stage, intents, () => ({ width: 1280, height: 720 }));
  const scenes = new SceneManager();
  await scenes.switchTo(() => scene);
  const run = (seconds: number) => {
    for (let i = 0; i < Math.round(seconds / STEP); i++) {
      scenes.update(STEP);
      scenes.render(1, STEP);
    }
  };
  return { stage, intents, scene, scenes, run };
}

describe('TrainingYardScene: free top-down movement (Phase 2)', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('walks right at top speed and stops smoothly when released', async () => {
    const { intents, scene, run, scenes } = await setup();
    const x0 = scene.player.x;
    intents.setMove('test', { x: 1, y: 0 });
    run(1);
    expect(scene.player.speed).toBeCloseTo(MAX, 1);
    expect(scene.player.x - x0).toBeGreaterThan(MAX * 0.8);
    expect(scene.player.facing).toBe(1);
    intents.setMove('test', { x: 0, y: 0 });
    run(0.5);
    expect(scene.player.speed).toBeLessThan(0.01);
    scenes.clear();
  });

  it('moves front/back (up/down the screen) and diagonals at no more than top speed', async () => {
    const { intents, scene, run, scenes } = await setup();
    const y0 = scene.player.y;
    intents.setMove('test', { x: 0, y: -1 });
    run(0.5);
    expect(scene.player.y).toBeLessThan(y0 - 1);
    intents.setMove('test', { x: -Math.SQRT1_2, y: Math.SQRT1_2 });
    run(0.8);
    expect(scene.player.speed).toBeLessThanOrEqual(MAX + 1e-3);
    expect(scene.player.facing).toBe(-1);
    scenes.clear();
  });

  it('can never leave the arena, and slides along a wall when pushing into it at an angle', async () => {
    const { intents, scene, run, scenes } = await setup();
    intents.setMove('test', { x: 0, y: -1 });
    run(4); // walk into the top wall (pillars are off this column)
    expect(scene.player.y).toBeGreaterThanOrEqual(R - 0.02);
    const xBefore = scene.player.x;
    intents.setMove('test', { x: Math.SQRT1_2, y: -Math.SQRT1_2 }); // push up-right into the wall
    run(0.6);
    expect(scene.player.y).toBeGreaterThanOrEqual(R - 0.02);
    expect(scene.player.x - xBefore).toBeGreaterThan(1); // slides along instead of sticking
    intents.setMove('test', { x: 1, y: 0 });
    run(8); // all the way to the right wall
    expect(scene.player.x).toBeLessThanOrEqual(TRAINING_YARD.widthM - R + 0.02);
    scenes.clear();
  });

  it('pillars block movement', async () => {
    const { intents, scene, run, scenes } = await setup();
    // Start (15, 10) → walk up to y = 4.5, the pillar at (15, 4.5) sits in the way.
    intents.setMove('test', { x: 0, y: -1 });
    run(3);
    const pillar = TRAINING_YARD.props[1]!;
    expect(pillar).toEqual({ kind: 'pillar', x: 15, y: 4.5 });
    expect(scene.player.y).toBeGreaterThan(pillar.y + 0.64 / 2 + R - 0.03);
    scenes.clear();
  });

  it('hops (height with a shadow left on the floor), cannot double-jump, and lands', async () => {
    const { intents, scene, run, scenes } = await setup();
    intents.pressJump();
    run(0.1);
    expect(scene.player.airborne).toBe(true);
    expect(scene.player.heightM).toBeGreaterThan(0.1);
    intents.pressJump(); // mid-air: ignored
    run(0.6);
    expect(scene.player.airborne).toBe(false);
    expect(scene.player.jumps).toBe(1);
    scenes.clear();
  });

  it('the camera follows the player', async () => {
    const { intents, scene, run, scenes } = await setup();
    const cx = scene.camera!.x;
    intents.setMove('test', { x: 1, y: 0 });
    run(1.5);
    expect(scene.camera!.x).toBeGreaterThan(cx + 3);
    scenes.clear();
  });

  it('unloads cleanly', async () => {
    const { stage, scene, scenes } = await setup();
    expect(stage.children).toHaveLength(1);
    scenes.clear();
    expect(stage.children).toHaveLength(0);
    expect(scene.physics).toBeNull();
  });
});
