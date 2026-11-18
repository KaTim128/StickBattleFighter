import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import { SceneManager } from '../../../src/core/scene';
import { TRAINING_YARD } from '../../../src/data/arenas/training-yard';
import { PlayerIntents } from '../../../src/input/intents';
import { initPhysics } from '../../../src/physics/physics-world';

const STEP = 1 / 60;

async function setup(player: string, at: { x: number; y: number }, dummyAt: { x: number; y: number }, useFifth = true) {
  const intents = new PlayerIntents();
  const scene = new FightArenaScene(
    { ...TRAINING_YARD, playerStart: at, dummyStart: dummyAt },
    new Container(),
    intents,
    () => ({ width: 1280, height: 720 }),
    false,
    { player, loadouts: { player: { useFifth } } },
  );
  const scenes = new SceneManager();
  await scenes.switchTo(() => scene);
  const run = (seconds: number) => {
    for (let i = 0; i < Math.round(seconds / STEP); i++) {
      scenes.update(STEP);
      scenes.render(1, STEP);
    }
  };
  run(0.2);
  return { intents, scene, scenes, run };
}

describe('fifth abilities in a fight (B13)', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('the loadout carries into the fight: the equipped four include the fifth, the benched one is the alternative', async () => {
    const a = await setup('rampage', { x: 10, y: 13 }, { x: 20, y: 13 });
    const kit = a.scene.playerFighter.def.abilities!;
    expect(kit.a3.id).toBe('bastionAnchor');
    expect(kit.a5?.id).toBe('crushingStrike');
    a.scenes.clear();
    const b = await setup('rampage', { x: 10, y: 13 }, { x: 20, y: 13 }, false);
    expect(b.scene.playerFighter.def.abilities!.a3.id).toBe('crushingStrike');
    b.scenes.clear();
  });

  it('Bastion Anchor: the pressed ability button braces Titan (slow, takes half damage) and shoves back anyone close', async () => {
    const { intents, scene, scenes, run } = await setup('rampage', { x: 14, y: 13 }, { x: 15.2, y: 13 });
    intents.pressAbility('a3');
    run(1.2);
    const b = scene.playerFighter.buff;
    expect(b).not.toBeNull();
    expect(b!.damageTakenFactor).toBeCloseTo(0.5, 6);
    expect(b!.speedFactor).toBeCloseTo(0.6, 6);
    expect(scene.dummy.x).toBeGreaterThan(15.6); // shoved back
    expect(1000 - scene.dummy.hp).toBeGreaterThan(0);
    run(5.5);
    expect(scene.playerFighter.buff).toBeNull();
    scenes.clear();
  });

  it('Soul Tether: drains life back to Necro and reels the target in to 3.5 m', async () => {
    const { intents, scene, scenes, run } = await setup('necro', { x: 8, y: 13 }, { x: 16, y: 13 });
    (scene.playerFighter.def.stats as { critChance: number }).critChance = 0;
    scene.playerFighter.combatant.hp = 500;
    intents.pressAbility('a4');
    run(2.6);
    expect(1000 - scene.dummy.hp).toBeGreaterThanOrEqual(45);
    expect(scene.playerFighter.combatant.hp).toBeGreaterThan(500 + 30); // 80% of the damage came back
    const gap = scene.dummy.x - scene.player.x;
    expect(gap).toBeLessThan(3.9);
    expect(gap).toBeGreaterThan(3.1);
    scenes.clear();
  });

  it('Umbral Feint: a short shadow buff, faster, harder to hurt, every cut bleeds', async () => {
    const { intents, scene, scenes, run } = await setup('shroud', { x: 12, y: 13 }, { x: 15, y: 13 });
    intents.pressAbility('a2');
    run(0.8);
    const b = scene.playerFighter.buff;
    expect(b).not.toBeNull();
    expect(b!.speedFactor).toBeCloseTo(1.3, 6);
    expect(b!.damageTakenFactor).toBeCloseTo(0.85, 6);
    expect(b!.meleeBleed).toBe(true);
    run(3.5);
    expect(scene.playerFighter.buff).toBeNull();
    scenes.clear();
  });
});
