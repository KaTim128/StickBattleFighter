import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import { SceneManager } from '../../../src/core/scene';
import { NECRO_KIT } from '../../../src/data/abilities/necro';
import type { ArenaLayout } from '../../../src/data/arenas/arena-layout';
import { TRAINING_YARD } from '../../../src/data/arenas/training-yard';
import { PlayerIntents } from '../../../src/input/intents';
import { initPhysics } from '../../../src/physics/physics-world';

const STEP = 1 / 60;
const K = NECRO_KIT;

async function setup(
  at: { x: number; y: number },
  dummyAt: { x: number; y: number },
  arena: ArenaLayout = TRAINING_YARD,
) {
  const intents = new PlayerIntents();
  const scene = new FightArenaScene(
    { ...arena, playerStart: at, dummyStart: dummyAt },
    new Container(),
    intents,
    () => ({ width: 1280, height: 720 }),
    false,
    { player: 'necro' },
  );
  const scenes = new SceneManager();
  await scenes.switchTo(() => scene);
  const run = (seconds: number) => {
    for (let i = 0; i < Math.round(seconds / STEP); i++) {
      scenes.update(STEP);
      scenes.render(1, STEP);
    }
  };
  const runUntil = (done: () => boolean, limitS = 4) => {
    for (let i = 0; i < limitS / STEP && !done(); i++) run(STEP);
  };
  run(0.2);
  scene.drainEvents();
  /** Face the dummy (soft lock picks it) and cast. */
  const cast = (slot: 'a1' | 'a2' | 'a3' | 'ult') => {
    intents.pressAbility(slot);
    run(STEP * 2);
  };
  return { intents, scene, scenes, run, runUntil, cast };
}

describe('Necro (owner, 12/11/2026): the death mage', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('is a little slower than Inferno and swings a 3-hit staff combo ending in a knockdown', async () => {
    const { intents, scene, scenes, run, runUntil } = await setup({ x: 15, y: 13 }, { x: 16.4, y: 13 });
    expect(scene.playerFighter.def.movement.maxSpeedMps).toBeLessThan(5 * 1.05);
    // Three combo moves on the ground, plus the Heavy Attack (owner, 12/11/2026).
    expect(
      Object.values(scene.playerFighter.def.moves).filter((m) => !m.aerial && m.animationState !== 'HeavyAttack'),
    ).toHaveLength(3);
    const seen: string[] = [];
    for (let k = 0; k < 3; k++) {
      intents.pressMelee();
      runUntil(() => scene.player.attack !== null && !seen.includes(scene.player.attack), 1);
      if (scene.player.attack) seen.push(scene.player.attack);
      run(0.15);
    }
    expect(seen).toEqual(['staff-sweep', 'soul-thrust', 'grave-slam']);
    runUntil(() => scene.dummy.state === 'knockdown' || scene.dummy.state === 'gettingUp', 2);
    expect(['knockdown', 'gettingUp']).toContain(scene.dummy.state);
    scenes.clear();
  });

  it('Soul Drain: a projectile that hurts the target, gives Necro back half the damage and blinds it', async () => {
    const { scene, scenes, runUntil, cast } = await setup({ x: 13, y: 13 }, { x: 18, y: 13 });
    scene.playerFighter.combatant.hp = 600;
    cast('a1');
    runUntil(() => scene.dummy.hp < 1000, 3);
    const dealt = 1000 - scene.dummy.hp;
    expect(dealt).toBeGreaterThan(0);
    expect(scene.player.hp).toBeGreaterThan(600);
    expect(scene.player.hp - 600).toBeCloseTo(K.a1.payload.damage * K.a1.payload.lifesteal!, 0);
    expect(scene.dummyFighter.combatant.blinded).toBe(true); // blinded for 3 s
    scenes.clear();
  });

  it('Death Eruption: bursts up under the target at range, hurting and trapping it in place', async () => {
    const { scene, scenes, run, runUntil, cast } = await setup({ x: 13, y: 13 }, { x: 18, y: 13 });
    cast('a2');
    run(K.a2.castS);
    const t = scene.abilities!.world.telegraphs[0]!;
    expect(Math.hypot(t.x - 18, t.y - 13)).toBeLessThan(0.8); // under the dummy, not around Necro
    runUntil(() => scene.dummy.hp < 1000, 2);
    expect(scene.dummy.hp).toBeLessThan(1000);
    expect(scene.dummy.state).toBe('stunned'); // trapped
    scenes.clear();
  });

  it('Soul Drain blinds for 3 s: a blinded fighter cannot find its target or attack, then sees again', async () => {
    const { scene, scenes, run, runUntil, cast } = await setup({ x: 13, y: 13 }, { x: 18, y: 13 });
    cast('a1');
    runUntil(() => scene.dummyFighter.combatant.blinded, 3);
    scene.dummyAttacks = true;
    scene.playerFighter.placeAt({ x: 16.9, y: 13 }); // right in its jab's reach
    const hp = scene.player.hp;
    run(2.4);
    expect(scene.player.hp).toBe(hp); // it never swung at him while blind
    runUntil(() => !scene.dummyFighter.combatant.blinded, 2);
    expect(scene.dummyFighter.combatant.blinded).toBe(false);
    scenes.clear();
  });

  // Curse of Decay (owner, 12/11/2026, SUP-25): replaced Teleport on F.
  it('Curse of Decay: a bolt that, on a hit, cuts the target damage by 30% and its defence by 20% for 6 s', async () => {
    const { scene, scenes, run, runUntil, cast } = await setup({ x: 13, y: 13 }, { x: 18, y: 13 });
    expect(scene.pointAimState).toBeNull();
    cast('a3');
    runUntil(() => scene.dummyFighter.combatant.decayLeftS > 0, 3);
    const foe = scene.dummyFighter.combatant;
    expect(foe.decayLeftS).toBeGreaterThan(5.5);
    expect(foe.attackFactor).toBeCloseTo(0.7, 6);
    expect(foe.defenceFactor).toBeCloseTo(0.8, 6);
    expect(scene.playerFighter.caster!.cooldown('a3')).toBeGreaterThan(K.a3.cooldownS - 2);
    // Its blows on Necro land 30% lighter.
    scene.dummyAttacks = true;
    scene.playerFighter.placeAt({ x: 16.9, y: 13 });
    const hp = scene.player.hp;
    runUntil(() => scene.player.hp < hp, 3);
    const cursedBlow = hp - scene.player.hp;
    // The curse runs out: the rot flakes away (its own effect and sound), and it is back to normal.
    scene.dummyAttacks = false;
    scene.abilities!.recentFx.length = 0;
    runUntil(() => foe.decayLeftS === 0, 7);
    run(STEP * 2);
    expect(scene.abilities!.recentFx.some((e) => e.vfx === 'decay-fade' && e.sfx === 'decay-fade')).toBe(true);
    expect(foe.attackFactor).toBe(1);
    expect(foe.defenceFactor).toBe(1);
    scene.playerFighter.combatant.hp = 1000;
    scene.dummyAttacks = true;
    const hp2 = scene.player.hp;
    runUntil(() => scene.player.hp < hp2, 3);
    const normalBlow = hp2 - scene.player.hp;
    expect(cursedBlow).toBeLessThan(normalBlow);
    expect(cursedBlow / normalBlow).toBeCloseTo(0.7, 1);
    scenes.clear();
  });

  it('Curse of Decay: a miss does nothing to anyone', async () => {
    const { scene, scenes, run, cast } = await setup({ x: 13, y: 13 }, { x: 13, y: 3 });
    scene.playerFighter.faceToward(1, 0);
    cast('a3'); // nobody in front: it flies off and misses
    run(2);
    expect(scene.dummyFighter.combatant.decayLeftS).toBe(0);
    expect(scene.dummyFighter.combatant.attackFactor).toBe(1);
    scenes.clear();
  });

  it('Ultimate Undead Army: four skeletons rise in front of the enemy, a little way off, and last 10 s (owner, SUP-24) unless destroyed first', async () => {
    const { scene, scenes, run, runUntil, cast } = await setup({ x: 8, y: 13 }, { x: 18, y: 13 });
    scene.dummyFighter.faceToward(-1, 0); // the enemy looks toward Necro
    scene.playerFighter.caster!.fillMeter();
    cast('ult');
    runUntil(() => scene.summonStates.length > 0, 3);
    expect(scene.summonStates).toHaveLength(4);
    for (const s of scene.summonStates) {
      // In front of it (owner, 13/11/2026): on the side it faces, never behind or round it...
      expect(s.x).toBeLessThan(18 - 1);
      // ...and further off than before (1.4-3.2 m): 1.8-3.7 m away.
      const d = Math.hypot(s.x - 18, s.y - 13);
      expect(d).toBeGreaterThan(1.8);
      expect(d).toBeLessThan(3.7);
      expect(s.team).toBe('player');
      expect(scene.physics!.isFree({ x: s.x, y: s.y }, 0.2)).toBe(true);
    }
    for (const s of scene.summonStates) expect(s.leftS).toBeGreaterThan(9);
    scene.respawnDummy({ x: 28, y: 18 }); // out of the way, so they are not fighting
    // Destroyed early: one falls and crumbles away.
    const victim = scene.summonStates[0]!.name;
    const f = (
      scene as unknown as { summons: { list: { name: string; combatant: { expire(): void } }[] } }
    ).summons.list.find((m) => m.name === victim)!;
    f.combatant.expire();
    runUntil(() => scene.summonStates.length === 3, 3);
    expect(scene.summonStates).toHaveLength(3);
    // Time's up at 10 s: the rest crumble on their own.
    run(10.5);
    expect(scene.summonStates.every((s) => s.ko)).toBe(true);
    run(4); // and crumble away
    expect(scene.summonStates).toHaveLength(0);
    scenes.clear();
  });
});
