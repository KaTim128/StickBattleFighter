import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import { SceneManager } from '../../../src/core/scene';
import { OFFICE } from '../../../src/data/arenas/office';
import { TRAINING_YARD } from '../../../src/data/arenas/training-yard';
import { PlayerIntents } from '../../../src/input/intents';
import { initPhysics } from '../../../src/physics/physics-world';

const STEP = 1 / 60;

async function setup(spectate: boolean) {
  const scene = new FightArenaScene(
    { ...TRAINING_YARD, playerStart: { x: 10, y: 10 }, dummyStart: { x: 14, y: 10 } },
    new Container(),
    new PlayerIntents(),
    () => ({ width: 1280, height: 720 }),
    false,
    { player: 'shroud', opponent: 'necro', match: { spectate } },
  );
  const scenes = new SceneManager();
  await scenes.switchTo(() => scene);
  const results: string[] = [];
  scene.onMatchEnd = (w) => results.push(w);
  const runUntil = (done: () => boolean, limitS: number) => {
    for (let i = 0; i < limitS / STEP && !done(); i++) {
      scenes.update(STEP);
      scenes.render(1, STEP);
    }
  };
  return { scene, scenes, results, runUntil };
}

/** Tournament matches (owner, 13/11/2026): they end, and AI battles play themselves out. */
describe('match mode', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('an AI battle (spectator mode) fights to a decision and reports it once', async () => {
    const { scene, scenes, results, runUntil } = await setup(true);
    runUntil(() => results.length > 0, 170);
    expect(results).toHaveLength(1);
    expect(['player', 'opponent']).toContain(results[0]);
    expect(scene.player.hits + scene.dummyFighter.hits).toBeGreaterThan(3); // both sides really fought
    runUntil(() => false, 3);
    expect(results).toHaveLength(1); // never twice
    scenes.clear();
  }, 60_000); // a whole simulated battle: slow on a busy machine

  it('in a watched battle both fighters fight back in a Punch Clash (owner, 13/11/2026)', async () => {
    const { scene, scenes, runUntil } = await setup(true);
    runUntil(() => false, 4); // past the intro
    scene.startClash();
    runUntil(() => scene.clashes.lastResult !== null, 10);
    const r = scene.clashes.lastResult!;
    expect(r.powerA).toBeGreaterThan(10); // the left fighter mashed, with no player input
    expect(r.powerB).toBeGreaterThan(10);
    scenes.clear();
  });

  it('watched AI battles are close: the winner finishes with little health left on average (owner, 13/11/2026)', async () => {
    const left: number[] = [];
    for (const [a, b] of [
      ['inferno', 'rampage'],
      ['necro', 'shroud'],
      ['shroud', 'inferno'],
      ['rampage', 'shroud'],
    ] as const) {
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
      let done = false;
      scene.onMatchEnd = () => {
        done = true;
      };
      let t = 0;
      for (; t < 160 && !done; t += STEP) {
        scenes.update(STEP);
        scenes.render(1, STEP);
      }
      expect(done, `${a} v ${b} ends`).toBe(true);
      expect(t, `${a} v ${b} is a real fight`).toBeGreaterThan(20);
      const p = scene.playerFighter.combatant;
      const o = scene.dummyFighter.combatant;
      left.push(Math.max(p.hp / p.stats.maxHp, o.hp / o.stats.maxHp));
      scenes.clear();
    }
    const mean = left.reduce((x, y) => x + y, 0) / left.length;
    expect(mean).toBeLessThan(0.35);
  }, 180_000);

  it('a KO ends the match: the loser does not get back up', async () => {
    const { scene, scenes, results, runUntil } = await setup(false);
    runUntil(() => false, 4); // past the intro
    scene.dummyFighter.combatant.hp = 1;
    scene.dummyFighter.combatant.takeFall(5);
    runUntil(() => results.length > 0, 5);
    expect(results).toEqual(['player']);
    runUntil(() => false, 8);
    expect(scene.dummyFighter.combatant.isKo).toBe(true);
    scenes.clear();
  });

  it('skipping a watched battle settles it on health at once', async () => {
    const { scene, scenes, results, runUntil } = await setup(true);
    runUntil(() => false, 2);
    scene.dummyFighter.combatant.hp = 100;
    scene.endMatchNow();
    expect(results).toEqual(['player']);
    scenes.clear();
  });
});
