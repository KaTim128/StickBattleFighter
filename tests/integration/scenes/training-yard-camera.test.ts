import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { TrainingYardScene } from '../../../src/app/scenes/training-yard-scene';
import { DEFAULT_FRAMING, visibleSize } from '../../../src/camera/framing';
import { SceneManager } from '../../../src/core/scene';
import { TRAINING_YARD_DUMMY_START } from '../../../src/data/arenas/training-yard';
import { PlayerIntents } from '../../../src/input/intents';
import { initPhysics } from '../../../src/physics/physics-world';

const STEP = 1 / 60;
const VIEW = { width: 1280, height: 720 };

async function setup() {
  const stage = new Container();
  const intents = new PlayerIntents();
  const scene = new TrainingYardScene(stage, intents, () => VIEW);
  const scenes = new SceneManager();
  await scenes.switchTo(() => scene);
  const run = (seconds: number) => {
    for (let i = 0; i < Math.round(seconds / STEP); i++) {
      scenes.update(STEP);
      scenes.render(1, STEP);
    }
  };
  /** Step until a condition holds (max `limitS` seconds). */
  const runUntil = (done: () => boolean, limitS = 5) => {
    for (let i = 0; i < limitS / STEP && !done(); i++) run(STEP);
  };
  return { stage, intents, scene, scenes, run, runUntil };
}

/** Is a world point inside the current camera view? */
function onScreen(scene: TrainingYardScene, p: { x: number; y: number }): boolean {
  const cam = scene.cameraState!;
  const { w, h } = visibleSize(cam.shortSideM, VIEW.width, VIEW.height);
  return Math.abs(p.x - cam.x) <= w / 2 && Math.abs(p.y - cam.y) <= h / 2;
}

describe('Training yard camera (Phase 3)', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('frames the player and the dummy together, zooming out as they separate', async () => {
    const { intents, scene, run, scenes } = await setup();
    run(1);
    expect(scene.cameraState!.framed).toBe(1);
    const closeZoom = scene.cameraState!.shortSideM;
    expect(onScreen(scene, scene.player)).toBe(true);
    expect(onScreen(scene, scene.dummy)).toBe(true);

    intents.setMove('test', { x: -Math.SQRT1_2, y: -Math.SQRT1_2 }); // up-left, away from the dummy (clear of pillars)
    run(1.6);
    intents.setMove('test', { x: 0, y: 0 });
    run(1.5);
    expect(scene.cameraState!.shortSideM).toBeGreaterThan(closeZoom + 1);
    expect(scene.cameraState!.shortSideM).toBeLessThanOrEqual(DEFAULT_FRAMING.maxShortSideM + 1e-6);
    expect(onScreen(scene, scene.player)).toBe(true);
    expect(onScreen(scene, { x: scene.dummy.x, y: scene.dummy.y - 0.8 })).toBe(true);
    scenes.clear();
  });

  it('the dummy can be shoved and then settles; it never runs off on its own', async () => {
    const { intents, scene, run, runUntil, scenes } = await setup();
    // Line up level with the dummy (by position, not timing), then walk into it.
    intents.setMove('test', { x: 0, y: 1 });
    runUntil(() => scene.player.y >= TRAINING_YARD_DUMMY_START.y - 0.45);
    intents.setMove('test', { x: 0, y: 0 });
    run(0.4);
    expect(Math.abs(scene.player.y - TRAINING_YARD_DUMMY_START.y)).toBeLessThan(0.4);
    intents.setMove('test', { x: 1, y: 0 });
    run(2.5);
    expect(scene.dummy.x).toBeGreaterThan(TRAINING_YARD_DUMMY_START.x + 0.3); // pushed
    intents.setMove('test', { x: 0, y: 0 });
    run(1.5);
    expect(scene.dummy.speed).toBeLessThan(0.01);
    const settled = { ...scene.dummy };
    run(1);
    expect(scene.dummy.x).toBeCloseTo(settled.x, 4);
    scenes.clear();
  });

  it('an impact shakes and punches the camera, then it settles completely', async () => {
    const { scene, run, scenes } = await setup();
    run(0.5);
    scene.debugImpact(0.8);
    let maxOffset = 0;
    for (let i = 0; i < 20; i++) {
      run(STEP);
      maxOffset = Math.max(maxOffset, scene.cameraState!.shakeOffset);
    }
    expect(maxOffset).toBeGreaterThan(0.05);
    run(1.5);
    expect(scene.cameraState!.trauma).toBe(0);
    expect(scene.cameraState!.shakeOffset).toBe(0);
    expect(scene.cameraState!.zoom).toBeCloseTo(1, 3);
    scenes.clear();
  });

  it('unloads the dummy with everything else', async () => {
    const { stage, scene, scenes } = await setup();
    expect(scene.physics?.colliderCount).toBe(4 + 7 + 2); // walls + pillars + player + dummy
    scenes.clear();
    expect(stage.children).toHaveLength(0);
  });
});
