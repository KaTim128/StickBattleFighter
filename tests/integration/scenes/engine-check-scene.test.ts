import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { EngineCheckScene } from '../../../src/app/scenes/engine-check-scene';
import { AssetLoader } from '../../../src/core/asset-loader';
import { SceneManager } from '../../../src/core/scene';
import { ENGINE_CHECK } from '../../../src/data/arenas/engine-check';
import { initPhysics } from '../../../src/physics/physics-world';

describe('EngineCheckScene lifecycle', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('loads and unloads repeatedly without leaving display objects or physics behind', async () => {
    const stage = new Container();
    const textures = new AssetLoader<unknown>(async () => ({}));
    const scenes = new SceneManager();
    const expectedColliders = 4 + ENGINE_CHECK.pillars.length + 1; // walls + pillars + crate

    for (let round = 0; round < 3; round++) {
      const scene = new EngineCheckScene(stage, textures, () => ({ width: 800, height: 600 }));
      await scenes.switchTo(() => scene);
      expect(stage.children).toHaveLength(1);
      expect(scene.physics?.colliderCount).toBe(expectedColliders);
      for (let i = 0; i < 30; i++) scenes.update(1 / 60);
      scenes.render(0.5, 1 / 60);
      expect(scene.state.physicsSteps).toBe(30);

      scenes.clear();
      expect(stage.children).toHaveLength(0);
      expect(scene.physics).toBeNull();
      expect(scene.view).toBeNull();
    }
  });

  it('keeps running when an optional texture is missing', async () => {
    const stage = new Container();
    const failures: string[] = [];
    const textures = new AssetLoader<unknown>(
      async () => {
        throw new Error('404');
      },
      (f) => failures.push(f.url),
    );
    const scene = new EngineCheckScene(stage, textures, () => ({ width: 800, height: 600 }), [
      'assets/does-not-exist.png',
    ]);
    const scenes = new SceneManager();
    expect(await scenes.switchTo(() => scene)).toBe(scene);
    expect(failures).toEqual(['assets/does-not-exist.png']);
    scenes.update(1 / 60);
    expect(scene.state.physicsSteps).toBe(1);
    scenes.clear();
  });
});
