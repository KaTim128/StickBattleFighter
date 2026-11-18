import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import { SceneManager } from '../../../src/core/scene';
import { OFFICE } from '../../../src/data/arenas/office';
import { PlayerIntents } from '../../../src/input/intents';
import { initPhysics } from '../../../src/physics/physics-world';

const STEP = 1 / 60;

/** A fighter is never outside the map (owner, 19/11/2026: one ended up beyond the north wall in a tournament fight). */
describe('fighters stay inside the map', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  async function setup() {
    const scene = new FightArenaScene(
      OFFICE,
      new Container(),
      new PlayerIntents(),
      () => ({ width: 1280, height: 720 }),
      false,
      {
        player: 'shroud',
      },
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
    return { scene, scenes, run };
  }

  it.each([
    ['north', { x: 12, y: -3 }],
    ['south', { x: 12, y: OFFICE.heightM + 3 }],
    ['west', { x: -3, y: 6 }],
    ['east', { x: OFFICE.widthM + 3, y: 6 }],
    ['far past a corner', { x: OFFICE.widthM + 8, y: -8 }],
    ['not a number', { x: Number.NaN, y: Number.NaN }],
  ])('a fighter placed outside the %s edge is put back inside', async (_name, at) => {
    const { scene, scenes, run } = await setup();
    const f = scene.playerFighter;
    const r = f.def.body.footRadiusM;
    f.placeAt(at);
    run(0.1);
    expect(Number.isFinite(f.curr.x) && Number.isFinite(f.curr.y)).toBe(true);
    expect(f.curr.x).toBeGreaterThanOrEqual(r);
    expect(f.curr.x).toBeLessThanOrEqual(OFFICE.widthM - r);
    expect(f.curr.y).toBeGreaterThanOrEqual(r);
    expect(f.curr.y).toBeLessThanOrEqual(OFFICE.heightM - r);
    scenes.clear();
  });

  it('a fighter already inside is left exactly where it is', async () => {
    const { scene, scenes, run } = await setup();
    const f = scene.playerFighter;
    f.placeAt({ x: 9, y: 2.5 });
    run(0.05);
    expect(f.curr.x).toBeCloseTo(9, 1);
    expect(f.curr.y).toBeCloseTo(2.5, 1);
    scenes.clear();
  });
});
