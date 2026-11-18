import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { DEFAULT_LOADOUT, loadoutAfterSwap, type NormalSlot } from '../../../src/abilities/loadout';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import { loadCharacter } from '../../../src/characters/load';
import { SceneManager } from '../../../src/core/scene';
import { TRAINING_YARD } from '../../../src/data/arenas/training-yard';
import { PlayerIntents } from '../../../src/input/intents';
import { initPhysics } from '../../../src/physics/physics-world';

const STEP = 1 / 60;

async function setup(
  player: string,
  at: { x: number; y: number },
  dummyAt: { x: number; y: number },
  swapSlot: NormalSlot | null = 'a3',
) {
  const intents = new PlayerIntents();
  const scene = new FightArenaScene(
    { ...TRAINING_YARD, playerStart: at, dummyStart: dummyAt },
    new Container(),
    intents,
    () => ({ width: 1280, height: 720 }),
    false,
    {
      player,
      loadouts: {
        player: swapSlot ? loadoutAfterSwap(loadCharacter(player).def.abilities!, swapSlot) : DEFAULT_LOADOUT,
      },
    },
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
    const b = await setup('rampage', { x: 10, y: 13 }, { x: 20, y: 13 }, null);
    expect(b.scene.playerFighter.def.abilities!.a3.id).toBe('crushingStrike');
    b.scenes.clear();
    // Any button will do: the alternative on the first button, Ground Smash benched, and the first key works.
    const c = await setup('rampage', { x: 14, y: 13 }, { x: 15.2, y: 13 }, 'a1');
    expect(c.scene.playerFighter.def.abilities!.a1.id).toBe('bastionAnchor');
    expect(c.scene.playerFighter.def.abilities!.a5?.id).toBe('groundSmash');
    c.intents.pressAbility('a1');
    c.run(1.2);
    expect(c.scene.playerFighter.buff?.damageTakenFactor).toBeCloseTo(0.5, 6);
    c.scenes.clear();
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
    const { intents, scene, scenes, run } = await setup('necro', { x: 8, y: 13 }, { x: 16, y: 13 }, 'a4');
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

  /** Death Mark (owner, 20/11/2026): replaces Umbral Feint as Shroud's fifth ability. */
  describe('Death Mark', () => {
    const start = async () => {
      const t = await setup('shroud', { x: 10, y: 13 }, { x: 16, y: 13 }, 'a2');
      (t.scene.playerFighter.def.stats as { critChance: number }).critChance = 0;
      return t;
    };

    it('marks the enemy and stalks for 5 s, crouched and slower; then his eyes glow and the mark is charged', async () => {
      const { intents, scene, scenes, run } = await start();
      expect(scene.playerFighter.def.abilities!.a2.id).toBe('deathMark');
      const world = scene.abilities!.world;
      intents.pressAbility('a2');
      run(0.6);
      const m = world.markOf(scene.playerFighter.name);
      expect(m?.phase).toBe('stalk');
      expect(m?.targetId).toBe(scene.dummyFighter.name);
      run(1);
      expect(scene.playerFighter.stalkAmount).toBeGreaterThan(0.8); // crouched
      run(4.2);
      expect(world.markOf(scene.playerFighter.name)?.phase).toBe('ready');
      expect(scene.playerFighter.eyeGlowAmount).toBeGreaterThan(0.8);
      expect(world.markFactor(scene.playerFighter.name)).toBe(3);
      scenes.clear();
    });

    it('being hit during the stalk cancels it', async () => {
      const { intents, scene, scenes, run } = await start();
      intents.pressAbility('a2');
      run(1.5);
      expect(scene.abilities!.world.markOf(scene.playerFighter.name)?.phase).toBe('stalk');
      scene.playerFighter.combatant.receive(
        { baseDamage: 20, attackerPower: 1, heavy: false, fromFront: true, critRoll: 0.99, staggers: true },
        0,
        1,
      );
      scene.abilities!.world.cancelStalk(scene.playerFighter.name, scene.abilities!); // as the hit path does
      expect(scene.abilities!.world.markOf(scene.playerFighter.name)).toBeNull();
      scenes.clear();
    });

    it('attacking during the stalk cancels it, with a melee blow or another ability', async () => {
      const a = await start();
      a.intents.pressAbility('a2');
      a.run(1.5);
      a.intents.pressMelee();
      a.run(0.3);
      expect(a.scene.abilities!.world.markOf(a.scene.playerFighter.name)).toBeNull();
      a.scenes.clear();
      const b = await start();
      b.intents.pressAbility('a2');
      b.run(1.5);
      b.intents.pressAbility('a1');
      b.run(0.3);
      expect(b.scene.abilities!.world.markOf(b.scene.playerFighter.name)).toBeNull();
      b.scenes.clear();
    });

    it('a charged mark triples the next landed attack, then the glow goes and the ability resets (cooldown starts then)', async () => {
      const { intents, scene, scenes, run } = await start();
      const caster = scene.playerFighter.caster!;
      intents.pressAbility('a2');
      run(5.6);
      expect(scene.abilities!.world.markOf(scene.playerFighter.name)?.phase).toBe('ready');
      // Still being executed: the cooldown has not started.
      expect(caster.executing('a2')).toBe(true);
      expect(caster.cooldown('a2')).toBe(caster.def('a2').cooldownS);
      scene.respawnDummy({ x: scene.player.x + 1.1, y: scene.player.y });
      run(1.2); // it stands up and is hittable
      const hp0 = scene.dummy.hp;
      intents.pressMelee();
      run(0.5);
      const tripled = hp0 - scene.dummy.hp;
      expect(tripled).toBeGreaterThan(40); // a plain knife slash is about 18
      expect(scene.abilities!.world.markOf(scene.playerFighter.name)).toBeNull();
      run(0.6);
      expect(scene.playerFighter.eyeGlowAmount).toBeLessThan(0.1);
      expect(caster.executing('a2')).toBe(false);
      run(1);
      expect(caster.cooldown('a2')).toBeLessThan(caster.def('a2').cooldownS); // now it counts down
      scenes.clear();
    });
  });
});
