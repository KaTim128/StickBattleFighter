import { Container } from 'pixi.js';
import { seededRandom } from '../combat/combatant';
import { SceneManager } from '../core/scene';
import type { ArenaLayout } from '../data/arenas/arena-layout';
import { PlayerIntents } from '../input/intents';
import { initPhysics } from '../physics/physics-world';
import { FightArenaScene } from './scenes/fight-arena-scene';

/**
 * A real fight with nothing drawn (T2): the same scene, AI and rules as a watched battle, run to
 * its result in time-budgeted chunks so the page stays responsive. Deterministic for a seed.
 * Used by the bracket's "Skip rest of stage" so skipped battles are fought, not dice rolls.
 */
export async function simulateFightHeadless(
  seed: number,
  a: string,
  b: string,
  arena: ArenaLayout,
  difficulty: string,
  budgetMs = 12,
): Promise<'a' | 'b'> {
  await initPhysics();
  const scene = new FightArenaScene(
    arena,
    new Container(),
    new PlayerIntents(),
    () => ({ width: 1280, height: 720 }),
    false,
    { player: a, opponent: b, match: { spectate: true }, difficulty },
  );
  (scene as unknown as { rng: () => number }).rng = seededRandom(seed);
  const scenes = new SceneManager();
  try {
    await scenes.switchTo(() => scene);
    while (!scene.fastForward(budgetMs)) await new Promise<void>((r) => setTimeout(r, 0));
    return scene.matchResult?.winner === 'player' ? 'a' : 'b';
  } finally {
    scenes.clear();
  }
}
