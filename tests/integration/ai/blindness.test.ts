import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import { SceneManager } from '../../../src/core/scene';
import { TRAINING_YARD } from '../../../src/data/arenas/training-yard';
import { PlayerIntents } from '../../../src/input/intents';
import { initPhysics } from '../../../src/physics/physics-world';

const STEP = 1 / 60;

async function setup(player: string, opponent: string, at = { x: 12, y: 13 }, foeAt = { x: 15, y: 13 }) {
  const intents = new PlayerIntents();
  const scene = new FightArenaScene(
    { ...TRAINING_YARD, playerStart: at, dummyStart: foeAt },
    new Container(),
    intents,
    () => ({ width: 1280, height: 720 }),
    false,
    { player, opponent },
  );
  const scenes = new SceneManager();
  await scenes.switchTo(() => scene);
  const run = (s: number) => {
    for (let i = 0; i < Math.round(s / STEP); i++) {
      scenes.update(STEP);
      scenes.render(1, STEP);
    }
  };
  return { intents, scene, scenes, run };
}

/** Owner, 13/11/2026: blindness takes away all enemy tracking, for AI and players alike. */
describe('blindness', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('a blinded AI never turns to follow its target, keeps moving, and tracks it again once it can see', async () => {
    const { scene, scenes, run } = await setup('inferno', 'rampage');
    run(0.3);
    const ai = scene.dummyFighter;
    const me = scene.playerFighter;
    ai.combatant.blind(3);
    // The player circles round behind it while it is blind.
    const startAt = { x: ai.x, y: ai.y };
    let faced = 0;
    let samples = 0;
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2;
      me.placeAt({ x: ai.x + Math.cos(a) * 3, y: ai.y + Math.sin(a) * 3 });
      run(0.1);
      if (ai.combatant.canAct && !ai.combo.attack) {
        const tx = me.x - ai.x;
        const ty = me.y - ai.y;
        const dot = (tx * ai.aim.x + ty * ai.aim.y) / Math.hypot(tx, ty);
        if (dot > 0.95) faced++;
        samples++;
      }
    }
    expect(ai.combatant.blinded).toBe(true);
    expect(faced / Math.max(1, samples)).toBeLessThan(0.3); // not tracking the circling player
    expect(Math.hypot(ai.x - startAt.x, ai.y - startAt.y)).toBeGreaterThan(0.5); // never froze in place
    // Sight back: it turns to the player again.
    run(1.5);
    expect(ai.combatant.blinded).toBe(false);
    me.placeAt({ x: ai.x + 3, y: ai.y });
    run(0.5);
    const tx = me.x - ai.x;
    const ty = me.y - ai.y;
    expect((tx * ai.aim.x + ty * ai.aim.y) / Math.hypot(tx, ty)).toBeGreaterThan(0.7);
    scenes.clear();
  });

  it('a blinded player gets no lock-on and no ability aim help; the help returns with sight', async () => {
    const { intents, scene, scenes, run } = await setup('shroud', 'rampage', { x: 12, y: 13 }, { x: 12, y: 16 });
    run(0.3);
    const me = scene.playerFighter;
    const foe = scene.dummyFighter;
    (foe as unknown as { brain: unknown }).brain = {
      think: () => ({
        move: { x: 0, y: 0 },
        jump: false,
        dodge: false,
        guard: false,
        ability: null,
        heavy: false,
        melee: false,
        sprint: false,
      }),
    };
    me.faceToward(1, 0); // looking along +x; the enemy is off to the side (+y)
    me.combatant.blind(3);
    const def = me.caster!.def('a1');
    const aim = scene.abilities!.aimFor(me, def);
    expect(Math.abs(aim.y - me.y)).toBeLessThan(0.01); // straight ahead, not at the enemy
    // Walking sideways while blind, it faces where it walks, not the enemy.
    intents.setMove('t', { x: 0, y: -1 });
    run(0.4);
    intents.setMove('t', { x: 0, y: 0 });
    expect(me.aim.y).toBeLessThan(-0.7);
    // Bloodfade while blind: it darts straight ahead and finds no one.
    me.faceToward(1, 0);
    run(0.1);
    intents.pressAbility('a1');
    run(1.2);
    expect(foe.combatant.hp).toBe(foe.combatant.stats.maxHp);
    // Sight back: aim help returns.
    run(2);
    expect(me.combatant.blinded).toBe(false);
    const aim2 = scene.abilities!.aimFor(me, me.caster!.def('a2'));
    expect(Math.hypot(aim2.x - foe.x, aim2.y - foe.y)).toBeLessThan(0.01);
    scenes.clear();
  });
});
