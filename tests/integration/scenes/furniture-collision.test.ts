import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import { SceneManager } from '../../../src/core/scene';
import { OFFICE } from '../../../src/data/arenas/office';
import { PlayerIntents } from '../../../src/input/intents';
import { initPhysics } from '../../../src/physics/physics-world';

const STEP = 1 / 60;
/** Fighters may brush a surface; more than this inside it is clipping (master plan B3). */
const MAX_SINK_M = 0.03;

/**
 * Master plan Phase 1 B3: fighters cannot pass through furniture or solid objects. Before the fix a
 * 60 s watched fight left grounded fighters up to 0.32 m inside walls and planted furniture (fast
 * dashes and knocks, a heavy fighter shoving another against a wall). Awake furniture that is being
 * shoved is the solver's to move and is not counted.
 */
describe('fighters stay out of walls and furniture', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  for (const [a, b] of [
    ['inferno', 'rampage'],
    ['necro', 'shroud'],
    ['rampage', 'necro'],
    ['inferno', 'shroud'],
  ] as const) {
    it(`${a} vs ${b}: never more than ${MAX_SINK_M * 100} cm inside a solid on the ground`, async () => {
      const scene = new FightArenaScene(
        OFFICE,
        new Container(),
        new PlayerIntents(),
        () => ({ width: 1280, height: 720 }),
        false,
        { player: a, opponent: b, match: { spectate: true }, difficulty: 'normal' },
      );
      const scenes = new SceneManager();
      await scenes.switchTo(() => scene);
      let worst = 0;
      for (let i = 0; i < 60 / STEP && !scene.matchResult; i++) {
        scenes.update(STEP);
        for (const f of [scene.playerFighter, scene.dummyFighter]) {
          if (f.combatant.isKo || f.climb || f.hop.heightM > 0.05) continue; // on top of furniture is allowed
          worst = Math.max(
            worst,
            scene.physics!.solidOverlapM({ x: f.x, y: f.y }, f.def.body.footRadiusM, f.overFurniture),
          );
        }
      }
      expect(worst).toBeLessThanOrEqual(MAX_SINK_M);
      scenes.clear();
    }, 120_000);
  }
});
