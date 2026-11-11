import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import { SceneManager } from '../../../src/core/scene';
import type { ArenaLayout } from '../../../src/data/arenas/arena-layout';
import { OFFICE } from '../../../src/data/arenas/office';
import { TRAINING_YARD } from '../../../src/data/arenas/training-yard';
import { PlayerIntents } from '../../../src/input/intents';
import { initPhysics } from '../../../src/physics/physics-world';
import { OCCLUDED_ALPHA } from '../../../src/rendering/occlusion-fader';
import { iso } from '../../../src/rendering/projection';

const STEP = 1 / 60;

async function setup(playerAt: { x: number; y: number }, arena: ArenaLayout = TRAINING_YARD) {
  const intents = new PlayerIntents();
  // The dummy waits in open floor, so only what stands in front of the player fades.
  const scene = new FightArenaScene(
    { ...arena, playerStart: playerAt, dummyStart: { x: 19, y: 9 } },
    new Container(),
    intents,
    () => ({
      width: 1280,
      height: 720,
    }),
  );
  const scenes = new SceneManager();
  await scenes.switchTo(() => scene);
  const run = (seconds: number) => {
    for (let i = 0; i < Math.round(seconds / STEP); i++) {
      scenes.update(STEP);
      scenes.render(1, STEP);
    }
  };
  return { intents, scene, scenes, run };
}

describe('dynamic wall transparency (owner, 11/11/2026)', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('a pillar in front of a fighter fades smoothly to see-through; the other pillars stay solid', async () => {
    // Just behind the pillar at (8, 6) in the 2.5D view (TD-045): it is drawn in front of the player and covers them.
    const { scene, scenes, run } = await setup({ x: 7.6, y: 5.6 });
    const nodes = [...scene.arenaView!.props.values()];
    const at = iso(8, 6);
    const pillar = nodes.find((n) => Math.abs(n.x - at.x) < 0.01 && Math.abs(n.y - at.y) < 0.01)!;
    run(0.07);
    expect(pillar.alpha).toBeLessThan(1); // fading…
    expect(pillar.alpha).toBeGreaterThan(OCCLUDED_ALPHA); // …smoothly, not popping
    run(0.3);
    expect(pillar.alpha).toBeCloseTo(OCCLUDED_ALPHA, 5);
    expect(nodes.filter((n) => n !== pillar).every((n) => n.alpha === 1)).toBe(true);
    scenes.clear();
  });

  it('restores the pillar to full opacity once the fighter moves away', async () => {
    const { intents, scene, scenes, run } = await setup({ x: 7.6, y: 5.6 });
    run(0.4);
    expect(scene.occlusion!.fadedCount).toBe(1);
    intents.setMove('t', { x: 0, y: -1 });
    run(0.8);
    intents.setMove('t', { x: 0, y: 0 });
    run(0.4);
    expect(scene.occlusion!.fadedCount).toBe(0);
    scenes.clear();
  });

  it('a fighter standing in the office doorway sees through the wall section in front', async () => {
    const office = { ...OFFICE, doors: [] }; // doorway open
    const door = OFFICE.doors![0]!;
    const { scene, scenes, run } = await setup({ x: (door.x0 + door.x1) / 2, y: 6.4 }, office);
    run(0.4);
    const walls = scene.arenaView!.occluders;
    const seeThrough = walls.filter((w) => w.alpha < 0.5);
    expect(seeThrough.length).toBeGreaterThan(0);
    expect(seeThrough.length).toBeLessThan(walls.length / 2); // only the blocking sections
    scenes.clear();
  });

  it('nothing fades when nothing stands in front of the fighters', async () => {
    const { scene, scenes, run } = await setup({ x: 15, y: 10 });
    run(0.4);
    expect(scene.occlusion!.fadedCount).toBe(0);
    scenes.clear();
  });
});
