import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import { SceneManager } from '../../../src/core/scene';
import { HOUSE_FIGHT } from '../../../src/data/arenas/house-fight';
import { PlayerIntents } from '../../../src/input/intents';
import { initPhysics } from '../../../src/physics/physics-world';

/** House of Nightmare, Fight mode (H1 to H5): the ground floor as a fighting arena. */
describe('House of Nightmare Fight', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('is the ground floor: furniture as props, inner walls and doors, the stairs closed, nobody in a wall', async () => {
    expect(HOUSE_FIGHT.props.length).toBeGreaterThan(15);
    expect(HOUSE_FIGHT.doors!.length).toBeGreaterThanOrEqual(2);
    expect(HOUSE_FIGHT.interiorWalls!.length).toBeGreaterThan(5);
    const stairs = HOUSE_FIGHT.interiorWalls!.find((w) => w.x0 === 27.3 - 15 && w.y0 === 10.3 - 9);
    expect(stairs).toBeDefined(); // closed
    const scene = new FightArenaScene(
      HOUSE_FIGHT,
      new Container(),
      new PlayerIntents(),
      () => ({ width: 1280, height: 720 }),
      false,
      { player: 'inferno', opponent: 'necro', match: { spectate: true }, difficulty: 'hard' },
    );
    const scenes = new SceneManager();
    await scenes.switchTo(() => scene);
    for (let i = 0; i < 60 * 40 && !scene.matchResult; i++) {
      scenes.update(1 / 60);
      scenes.render(1, 1 / 60);
      for (const f of [scene.playerFighter, scene.dummyFighter]) {
        expect(f.x).toBeGreaterThan(0);
        expect(f.x).toBeLessThan(HOUSE_FIGHT.widthM);
        expect(f.y).toBeGreaterThan(0);
        expect(f.y).toBeLessThan(HOUSE_FIGHT.heightM);
        // Never inside the closed stairwell.
        const inStairs = f.x > 12.3 && f.x < 13.7 && f.y > 1.3 && f.y < 4.8;
        expect(inStairs).toBe(false);
      }
    }
    scenes.clear();
  }, 120_000);
});
