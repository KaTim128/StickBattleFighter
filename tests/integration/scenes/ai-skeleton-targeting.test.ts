import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import type { SummonSpec } from '../../../src/abilities/ability-def';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import type { FighterEntity } from '../../../src/app/scenes/fighter-entity';
import { SceneManager } from '../../../src/core/scene';
import { NECRO_KIT } from '../../../src/data/abilities/necro';
import { TRAINING_YARD } from '../../../src/data/arenas/training-yard';
import { PlayerIntents } from '../../../src/input/intents';
import { initPhysics } from '../../../src/physics/physics-world';

const STEP = 1 / 60;
const SPEC = NECRO_KIT.ult.delivery as unknown as SummonSpec;

type Summons = { list: FighterEntity[]; spawn(owner: FighterEntity, spec: SummonSpec): number };

async function setup() {
  const scene = new FightArenaScene(
    { ...TRAINING_YARD, playerStart: { x: 6, y: 13 }, dummyStart: { x: 22, y: 13 } },
    new Container(),
    new PlayerIntents(),
    () => ({ width: 1280, height: 720 }),
    false,
    { player: 'necro', opponent: 'rampage', difficulty: 'hard' },
  );
  const scenes = new SceneManager();
  await scenes.switchTo(() => scene);
  const run = (seconds: number, each?: () => void) => {
    for (let i = 0; i < Math.round(seconds / STEP); i++) {
      scenes.update(STEP);
      each?.();
    }
  };
  run(0.3);
  return { scene, scenes, run, summons: (scene as unknown as { summons: Summons }).summons };
}

/** Master plan Phase 1 B10: the opponent AI hits the skeletons first, the summoner, or both, by situation. */
describe('AI against Necro and his skeletons', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('with skeletons on top of it and Necro far away, it goes for the skeletons first', async () => {
    const { scene, scenes, run, summons } = await setup();
    const necro = scene.playerFighter;
    const ai = scene.dummyFighter;
    summons.spawn(necro, SPEC);
    summons.spawn(necro, SPEC);
    for (const [i, m] of summons.list.entries()) m.placeAt({ x: 20.4 - i * 0.5, y: 12.4 + i * 0.5 });
    const names = new Set(summons.list.map((m) => m.name));
    let wentForMinion = false;
    run(4, () => {
      if (ai.aiTargetId && names.has(ai.aiTargetId)) wentForMinion = true;
    });
    expect(wentForMinion).toBe(true);
    expect(summons.list.some((m) => m.combatant.isKo)).toBe(true); // and it actually hurt them
    expect(necro.combatant.hp).toBe(necro.combatant.stats.maxHp); // Necro was nowhere near
    scenes.clear();
  });

  it('with Necro close to it, it goes for Necro, not the skeletons', async () => {
    const { scene, scenes, run, summons } = await setup();
    const necro = scene.playerFighter;
    const ai = scene.dummyFighter;
    necro.placeAt({ x: 21, y: 13 }); // inside its reach
    summons.spawn(necro, SPEC);
    for (const [i, m] of summons.list.entries()) m.placeAt({ x: 19.5 - i, y: 14 });
    run(0.6);
    expect(ai.aiTargetId).toBe(necro.name);
    scenes.clear();
  });
});
