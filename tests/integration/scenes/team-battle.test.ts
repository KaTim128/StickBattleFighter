import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import { SceneManager } from '../../../src/core/scene';
import { OFFICE } from '../../../src/data/arenas/office';
import { TRAINING_YARD } from '../../../src/data/arenas/training-yard';
import { PlayerIntents } from '../../../src/input/intents';
import { TEAM } from '../../../src/modes/team/team-battle';
import { initPhysics } from '../../../src/physics/physics-world';

const STEP = 1 / 60;

async function setup(spectate: boolean, arena = OFFICE) {
  const intents = new PlayerIntents();
  const scene = new FightArenaScene(arena, new Container(), intents, () => ({ width: 1280, height: 720 }), false, {
    player: 'inferno',
    opponent: 'rampage',
    match: { spectate },
    teams: { player: ['inferno', 'necro', 'shroud'], opponent: ['rampage', 'shroud', 'inferno'] },
    difficulty: 'normal',
  });
  const scenes = new SceneManager();
  await scenes.switchTo(() => scene);
  const results: string[] = [];
  scene.onMatchEnd = (w) => results.push(w);
  const run = (seconds: number, until: () => boolean = () => false) => {
    for (let i = 0; i < seconds / STEP && !until(); i++) {
      scenes.update(STEP);
      scenes.render(1, STEP);
    }
  };
  return { scene, scenes, intents, results, run };
}

/** 3 vs 3, tag team (owner, 13/11/2026). */
describe('3 vs 3 tag team', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('the player tags in the next teammate, who takes the same spot; the cooldown stops a second tag', async () => {
    const { scene, scenes, intents, run } = await setup(false, TRAINING_YARD);
    run(4); // past READY... FIGHT!
    const before = { id: scene.playerFighter.def.id, x: scene.playerFighter.x, y: scene.playerFighter.y };
    intents.pressTag();
    run(0.1);
    expect(scene.playerFighter.def.id).toBe('necro');
    expect(before.id).toBe('inferno');
    expect(Math.hypot(scene.playerFighter.x - before.x, scene.playerFighter.y - before.y)).toBeLessThan(0.3);
    expect(scene.teamHud?.player.map((m) => m.active)).toEqual([false, true, false]);
    intents.pressTag(); // too soon
    run(0.1);
    expect(scene.playerFighter.def.id).toBe('necro');
    run(TEAM.tagCooldownS);
    // Tagging needs a free moment (not stunned or mid-move): press until it happens, like a player.
    for (let i = 0; i < 20 && scene.playerFighter.def.id === 'necro'; i++) {
      intents.pressTag();
      run(0.1);
    }
    expect(scene.playerFighter.def.id).toBe('shroud');
    scenes.clear();
  });

  it('a resting fighter gets health back on the bench', async () => {
    const { scene, scenes, intents, run } = await setup(false, TRAINING_YARD);
    run(4);
    const inferno = scene.playerFighter;
    inferno.combatant.hp = inferno.combatant.stats.maxHp * 0.5;
    intents.pressTag();
    run(5);
    expect(inferno.combatant.hp / inferno.combatant.stats.maxHp).toBeGreaterThan(0.5 + TEAM.benchRegenPerS * 4);
    scenes.clear();
  });

  it('a KO brings in the next teammate; the match ends only when a whole team is down', async () => {
    const { scene, scenes, results, run } = await setup(false, TRAINING_YARD);
    run(4);
    for (let k = 0; k < 2; k++) {
      const f = scene.dummyFighter;
      f.combatant.hp = 1;
      f.combatant.takeFall(5);
      run(TEAM.koSwapDelayS + 0.5);
      expect(results).toEqual([]); // the next one came in
      expect(scene.dummyFighter).not.toBe(f);
    }
    scene.dummyFighter.combatant.hp = 1;
    scene.dummyFighter.combatant.takeFall(5);
    run(4, () => results.length > 0);
    expect(results).toEqual(['player']);
    expect(scene.teamHud?.opponent.every((m) => m.ko)).toBe(true);
    scenes.clear();
  });

  it('an AI-vs-AI 3 vs 3 plays out to a result, with fighters swapping in', async () => {
    const { scene, scenes, results, run } = await setup(true);
    run(300, () => results.length > 0);
    expect(results).toHaveLength(1);
    expect(scene.tags).toBeGreaterThan(0);
    const hud = scene.teamHud!;
    const loser = results[0] === 'player' ? hud.opponent : hud.player;
    expect(loser.every((m) => m.ko) || scene.matchResult?.by === 'time').toBe(true);
    scenes.clear();
  }, 120_000);
});
