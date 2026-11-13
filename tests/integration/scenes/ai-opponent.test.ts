import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import { SceneManager } from '../../../src/core/scene';
import type { ArenaLayout } from '../../../src/data/arenas/arena-layout';
import { TRAINING_YARD } from '../../../src/data/arenas/training-yard';
import { PlayerIntents } from '../../../src/input/intents';
import { initPhysics } from '../../../src/physics/physics-world';

const STEP = 1 / 60;

async function setup(
  opponent: string,
  layout: ArenaLayout,
  at: { x: number; y: number },
  foe: { x: number; y: number },
  difficulty?: string,
) {
  const intents = new PlayerIntents();
  const scene = new FightArenaScene(
    { ...layout, playerStart: at, dummyStart: foe },
    new Container(),
    intents,
    () => ({ width: 1280, height: 720 }),
    false,
    { player: 'inferno', opponent, difficulty },
  );
  const scenes = new SceneManager();
  await scenes.switchTo(() => scene);
  const run = (seconds: number, each?: () => void) => {
    for (let i = 0; i < Math.round(seconds / STEP); i++) {
      scenes.update(STEP);
      scenes.render(1, STEP);
      each?.();
    }
  };
  return { intents, scene, scenes, run };
}

/** Owner, 13/11/2026: the AI opponent uses its abilities, heavy attacks and climbing. */
// Each test simulates seconds of real fighting: slow on a busy CI machine.
describe('fighter AI opponent', { timeout: 60_000 }, () => {
  beforeAll(async () => {
    await initPhysics();
  });

  // Owner, 13/11/2026: every fighter uses its WHOLE kit (all abilities, the ultimate, punches and
  // its heavy) at EVERY difficulty, and keeps its own personality.
  for (const difficulty of ['easy', 'normal', 'hard', 'expert']) {
    for (const id of ['inferno', 'rampage', 'necro', 'shroud']) {
      it(`${id} on ${difficulty}: the whole kit, basic attacks and the ultimate`, async () => {
        const { intents, scene, scenes, run } = await setup(
          id,
          TRAINING_YARD,
          { x: 10, y: 10 },
          { x: 18, y: 10 },
          difficulty,
        );
        const seen = new Set<string>();
        const heavyId = scene.dummyFighter.def.starters.heavy;
        const caster = scene.dummyFighter.caster!;
        let t = 0;
        run(45, () => {
          t += 1 / 60;
          const ab = caster.cast?.def.id;
          if (ab) seen.add(`ability:${ab}`);
          const atk = scene.dummyFighter.combo.attack?.id;
          if (atk) seen.add(atk === heavyId ? 'heavy' : 'melee');
          // Keep the fight going, and give it its ultimate now and then (the meter takes long to fill).
          if (scene.playerFighter.combatant.hp < 300) scene.playerFighter.combatant.hp = 1000;
          if (scene.dummyFighter.combatant.hp < 300)
            scene.dummyFighter.combatant.hp = scene.dummyFighter.combatant.stats.maxHp;
          if (Math.floor(t) % 15 === 14) caster.fillMeter();
          // The player fights back now and then (so openings, threats and lost health happen).
          if (Math.round(t * 60) % 70 === 0) intents.pressMelee();
        });
        const kit = (['a1', 'a2', 'a3', 'a4', 'ult'] as const).map((sl) => caster.def(sl).id);
        const missing = kit.filter((k) => !seen.has(`ability:${k}`));
        expect(missing, [...seen].join(', ')).toEqual([]);
        expect(seen.has('melee'), [...seen].join(', ')).toBe(true);
        expect(seen.has('heavy'), [...seen].join(', ')).toBe(true);
        scenes.clear();
      });
    }
  }

  it('each keeps its personality: Necro keeps his distance, Titan stays on top of you', async () => {
    // Share of the fight spent within 2.5 m of the player.
    const closeShare = async (id: string) => {
      const { scene, scenes, run } = await setup(id, TRAINING_YARD, { x: 10, y: 10 }, { x: 16, y: 10 }, 'expert');
      let close = 0;
      let n = 0;
      run(25, () => {
        scene.playerFighter.combatant.hp = 1000;
        scene.dummyFighter.combatant.hp = scene.dummyFighter.combatant.stats.maxHp;
        if (Math.hypot(scene.dummy.x - scene.player.x, scene.dummy.y - scene.player.y) < 2.5) close++;
        n++;
      });
      scenes.clear();
      return close / n;
    };
    const necro = await closeShare('necro');
    const titan = await closeShare('rampage');
    expect(necro).toBeLessThan(0.35); // the curse mage keeps away
    expect(titan).toBeGreaterThan(necro); // the brute fights closer (his smashes knock you away)
  });

  it('a harder opponent reads and defends incoming attacks far more often (REQ-AI-4)', async () => {
    const defences = async (difficulty: string) => {
      const { intents, scene, scenes, run } = await setup(
        'inferno',
        TRAINING_YARD,
        { x: 10, y: 10 },
        { x: 11.4, y: 10 },
        difficulty,
      );
      let n = 0;
      let t = 0;
      let was = false;
      run(25, () => {
        t++;
        scene.playerFighter.combatant.hp = 1000;
        scene.dummyFighter.combatant.hp = 1000;
        if (t % 40 === 0) intents.pressMelee();
        const state = scene.dummyFighter.combatant.state;
        const now = state === 'dodging' || state === 'guarding';
        if (now && !was) n++;
        was = now;
      });
      scenes.clear();
      return n;
    };
    const easy = await defences('easy');
    const expert = await defences('expert');
    expect(expert).toBeGreaterThan(easy);
  });
});
