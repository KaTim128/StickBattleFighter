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

  for (const id of ['inferno', 'rampage', 'necro', 'shroud']) {
    it(`${id}: closes in, punches, throws heavy attacks and uses its abilities`, async () => {
      const { scene, scenes, run } = await setup(id, TRAINING_YARD, { x: 10, y: 10 }, { x: 18, y: 10 });
      const seen = new Set<string>();
      const abilityIds = new Set(
        (['a1', 'a2', 'a3', 'a4', 'ult'] as const).map((s) => scene.dummyFighter.caster!.def(s).id),
      );
      const heavyId = scene.dummyFighter.def.starters.heavy;
      run(25, () => {
        const ab = scene.dummyFighter.caster?.cast?.def.id;
        if (ab) seen.add(`ability:${ab}`);
        const atk = scene.dummyFighter.combo.attack?.id;
        if (atk) seen.add(atk === heavyId ? 'heavy' : 'melee');
        // Keep the player alive so the fight goes on.
        if (scene.playerFighter.combatant.hp < 300) scene.playerFighter.combatant.hp = 1000;
      });
      const used = [...seen].filter((s) => s.startsWith('ability:') && abilityIds.has(s.slice(8)));
      expect(used.length, [...seen].join(', ')).toBeGreaterThanOrEqual(2);
      expect(seen.has('melee'), [...seen].join(', ')).toBe(true);
      expect(seen.has('heavy'), [...seen].join(', ')).toBe(true);
      scenes.clear();
    });
  }

  it('climbs onto furniture after a player standing on it', async () => {
    const room: ArenaLayout = { ...TRAINING_YARD, props: [{ kind: 'desk', x: 12, y: 10 }] };
    const { scene, scenes, run } = await setup('shroud', room, { x: 12, y: 10 }, { x: 16, y: 10 });
    // Put the player on the desk top.
    scene.playerFighter.hop = { heightM: 0.75, verticalSpeedMps: 0, floorM: 0.75 };
    let reached = false;
    run(8, () => {
      scene.playerFighter.combatant.hp = 1000;
      if ((scene.dummyFighter.hop.floorM ?? 0) > 0.7) reached = true;
    });
    expect(reached).toBe(true);
    scenes.clear();
  });

  it('the training dummy stays a training dummy (no AI)', async () => {
    const { scene, scenes, run } = await setup('training-dummy', TRAINING_YARD, { x: 10, y: 10 }, { x: 13, y: 10 });
    const x0 = scene.dummy.x;
    run(4);
    expect(scene.dummyFighter.brain).toBeNull();
    expect(Math.abs(scene.dummy.x - x0)).toBeLessThan(0.05);
    scenes.clear();
  });

  it('walks round a wall to reach the player instead of pushing against it (REQ-AI-5)', async () => {
    // A long wall between them, open at the bottom end.
    const room: ArenaLayout = { ...TRAINING_YARD, props: [], interiorWalls: [{ x0: 13.9, y0: 0, x1: 14.1, y1: 15 }] };
    const { scene, scenes, run } = await setup('rampage', room, { x: 11, y: 8 }, { x: 17, y: 8 });
    let reached = false;
    run(14, () => {
      scene.playerFighter.combatant.hp = 1000;
      if (Math.hypot(scene.dummy.x - 11, scene.dummy.y - 8) < 2) reached = true;
    });
    expect(reached).toBe(true);
    scenes.clear();
  });

  it('a harder opponent attacks more often than an easier one (REQ-AI-4)', async () => {
    const pressure = async (difficulty: string) => {
      const { scene, scenes, run } = await setup(
        'inferno',
        TRAINING_YARD,
        { x: 10, y: 10 },
        { x: 12, y: 10 },
        difficulty,
      );
      let busy = 0;
      run(20, () => {
        scene.playerFighter.combatant.hp = 1000;
        if (scene.dummyFighter.combo.attack || scene.dummyFighter.caster?.cast) busy++;
      });
      scenes.clear();
      return busy;
    };
    const easy = await pressure('easy');
    const hard = await pressure('hard');
    expect(hard).toBeGreaterThan(easy * 1.3);
  });
});
