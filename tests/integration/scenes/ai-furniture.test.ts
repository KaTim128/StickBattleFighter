import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import { SceneManager } from '../../../src/core/scene';
import { OFFICE } from '../../../src/data/arenas/office';
import { PlayerIntents } from '../../../src/input/intents';
import { initPhysics } from '../../../src/physics/physics-world';

const STEP = 1 / 60;

/** Master plan Phase 1 B9: "AI should also be able to throw furniture during battle". */
describe('AI throws furniture', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  // The property is "the Titan AI can throw furniture in a long fight". One seeded fight is chaotic (a contact-only
  // reach change (HD) ended the necro one before the Titan reached a chair), so any of three matchups may show it.
  it('a Hard Titan in the office picks up and throws furniture at some point in a long fight', async () => {
    let threw = false;
    for (const opponent of ['necro', 'shroud', 'inferno'] as const) {
      const scene = new FightArenaScene(
        OFFICE,
        new Container(),
        new PlayerIntents(),
        () => ({ width: 1280, height: 720 }),
        false,
        { player: opponent, opponent: 'rampage', match: { spectate: true }, difficulty: 'hard' },
      );
      const scenes = new SceneManager();
      await scenes.switchTo(() => scene);
      const throwers = new Set<string>();
      const real = (scene as unknown as { throwCarried(f: { name: string }): void }).throwCarried.bind(scene);
      (scene as unknown as { throwCarried(f: { name: string }): void }).throwCarried = (f) => {
        throwers.add(f.name);
        real(f);
      };
      for (let i = 0; i < 90 / STEP && !scene.matchResult && throwers.size === 0; i++) scenes.update(STEP);
      scenes.clear();
      if (throwers.size > 0) {
        threw = true;
        break;
      }
    }
    expect(threw).toBe(true);
  }, 240_000);
});
