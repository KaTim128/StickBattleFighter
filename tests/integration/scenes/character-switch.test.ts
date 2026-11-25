import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import { SceneManager } from '../../../src/core/scene';
import { TRAINING_YARD } from '../../../src/data/arenas/training-yard';
import { PlayerIntents } from '../../../src/input/intents';
import { initPhysics } from '../../../src/physics/physics-world';

const STEP = 1 / 60;

describe('Open Zone character switch (O1)', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('switches the player fighter repeatedly in place: one player entity, new kit, old things disposed, dummy untouched', async () => {
    const intents = new PlayerIntents();
    const scene = new FightArenaScene(
      TRAINING_YARD,
      new Container(),
      intents,
      () => ({ width: 1280, height: 720 }),
      false,
      { player: 'inkmaster' },
    );
    const scenes = new SceneManager();
    await scenes.switchTo(() => scene);
    const run = (s: number) => {
      for (let i = 0; i < Math.round(s / STEP); i++) {
        scenes.update(STEP);
        scenes.render(1, STEP);
      }
    };
    run(0.3);
    // Inkmaster draws a serpent, then is switched away: what he drew goes with him.
    scene.playerFighter.combatant.stamina = 100;
    intents.pressAbility('a2');
    run(1.2);
    expect(scene.abilities!.world.ink.serpents.length).toBeGreaterThan(0);
    const dummy = scene.dummyFighter;
    const dummyHp = dummy.combatant.hp;
    const at = { x: scene.playerFighter.x, y: scene.playerFighter.y };
    const old = scene.playerFighter;
    const order = ['psion', 'inferno', 'rampage', 'shroud', 'necro'];
    for (const id of order) {
      expect(scene.replacePlayerFighter(id)).toBe(true);
      run(0.2);
      expect(scene.playerFighter.def.id).toBe(id);
      expect(scene.characters.player.def.id).toBe(id);
      const all = (scene as unknown as { fighters: { name: string }[] }).fighters;
      expect(all.filter((f) => f.name === 'player')).toHaveLength(1);
      expect(scene.playerFighter.caster?.def('a1').id).toBeTruthy();
      expect(scene.playerFighter.combatant.hp).toBe(scene.playerFighter.combatant.stats.maxHp);
    }
    expect(old.body).toBeNull(); // the first fighter's body is gone
    expect(scene.abilities!.world.ink.serpents).toHaveLength(0);
    expect(scene.dummyFighter).toBe(dummy);
    expect(scene.dummyFighter.combatant.hp).toBe(dummyHp);
    expect(Math.hypot(scene.playerFighter.x - at.x, scene.playerFighter.y - at.y)).toBeLessThan(1.5);
    expect(scene.tags).toBe(0); // not counted as a 3 vs 3 tag
    expect(scene.replacePlayerFighter('necro')).toBe(false); // already this fighter
    scenes.clear();
  });
});
