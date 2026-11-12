import { Container } from 'pixi.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { FightArenaScene } from '../../../src/app/scenes/fight-arena-scene';
import { SceneManager } from '../../../src/core/scene';
import { NECRO_KIT } from '../../../src/data/abilities/necro';
import type { ArenaLayout } from '../../../src/data/arenas/arena-layout';
import { OFFICE } from '../../../src/data/arenas/office';
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

  // Teleport (owner, 12/11/2026, SUP-24): one press away from the opponent, two presses in close.
  const gapTo = (scene: { player: { x: number; y: number }; dummy: { x: number; y: number } }) =>
    Math.hypot(scene.player.x - scene.dummy.x, scene.player.y - scene.dummy.y);

  it('Teleport, single press: no aiming; he reappears about 7 m further from the opponent, facing it', async () => {
    const { intents, scene, scenes, run, runUntil } = await setup({ x: 12, y: 10 }, { x: 15, y: 10 });
    const stamina = scene.player.stamina;
    intents.pressAbility('a3');
    run(STEP * 2);
    expect(scene.pointAimState).toBeNull(); // never enters targeting
    expect(scene.playerFighter.caster!.cast?.def.id).toBe('teleport');
    runUntil(() => Math.hypot(scene.player.x - 12, scene.player.y - 10) > 1, 1);
    run(0.1);
    expect(scene.player.x).toBeLessThan(12 - 6); // straight back, away from it
    expect(Math.abs(scene.player.y - 10)).toBeLessThan(0.4);
    expect(gapTo(scene)).toBeGreaterThan(9);
    expect(scene.player.facing).toBe(1); // turned to face the opponent
    expect(stamina - scene.player.stamina).toBeGreaterThanOrEqual(K.a3.staminaCost - 1);
    expect(scene.playerFighter.caster!.cooldown('a3')).toBeGreaterThan(K.a3.cooldownS - 1);
    scenes.clear();
  });

  it('Teleport, double press: a quick rush that reforms him just in front of the opponent; one stamina cost, its own cooldown', async () => {
    const { intents, scene, scenes, run, runUntil } = await setup({ x: 6, y: 10 }, { x: 15, y: 12 });
    const stamina = scene.player.stamina;
    intents.pressAbility('a3');
    run(STEP * 4); // well inside the 0.3 s wind-up
    intents.pressAbility('a3');
    run(STEP * 2);
    expect(scene.playerFighter.caster!.cast?.def.id).toBe('teleportStrike');
    runUntil(() => gapTo(scene) < 3, 1);
    run(0.1);
    expect(gapTo(scene)).toBeLessThan(1.8); // right in front of it
    expect(gapTo(scene)).toBeGreaterThan(0.5); // but not on top of it
    expect(scene.player.x).toBeLessThan(15); // on his own side
    expect(scene.player.facing).toBe(1);
    expect(stamina - scene.player.stamina).toBeLessThan(K.a3.staminaCost + 1); // paid once
    const strike = K.a3.doubleTap!;
    expect(scene.playerFighter.caster!.cooldown('a3')).toBeGreaterThan(strike.cooldownS - 1);
    expect(strike.castS).toBeLessThan(K.a3.castS); // the rush is the quicker of the two
    expect(strike.vfx).not.toBe(K.a3.vfx); // and looks different
    expect(strike.sfx.release).not.toBe(K.a3.sfx.release);
    // On cooldown: pressing again does nothing.
    const at = { x: scene.player.x, y: scene.player.y };
    run(0.5);
    intents.pressAbility('a3');
    run(0.6);
    expect(Math.hypot(scene.player.x - at.x, scene.player.y - at.y)).toBeLessThan(0.3);
    scenes.clear();
  });

  it('Teleport retreat with his back to the arena edge turns aside: inside the arena and still further away', async () => {
    const { intents, scene, scenes, run, runUntil } = await setup({ x: 1.2, y: 10 }, { x: 3.5, y: 10 });
    const before = gapTo(scene);
    intents.pressAbility('a3');
    runUntil(() => Math.hypot(scene.player.x - 1.2, scene.player.y - 10) > 1, 1);
    run(0.2);
    expect(scene.player.x).toBeGreaterThan(0.3);
    expect(scene.player.x).toBeLessThan(TRAINING_YARD.widthM - 0.3);
    expect(scene.player.y).toBeGreaterThan(0.3);
    expect(scene.player.y).toBeLessThan(TRAINING_YARD.heightM - 0.3);
    expect(gapTo(scene)).toBeGreaterThan(before + 2);
    expect(scene.physics!.isFree({ x: scene.player.x, y: scene.player.y }, 0.25)).toBe(true);
    scenes.clear();
  });

  it('Teleport in the office: both directions land on clear floor, never in walls or furniture', async () => {
    const { intents, scene, scenes, run } = await setup({ x: 4, y: 4 }, { x: 12, y: 9 }, OFFICE);
    for (let n = 0; n < 2; n++) {
      // Away, then (after the cooldown) back in.
      intents.pressAbility('a3');
      if (n === 1) {
        run(STEP * 3);
        intents.pressAbility('a3');
      }
      run(0.8);
      expect(scene.physics!.isFree({ x: scene.player.x, y: scene.player.y }, 0.25)).toBe(true);
      expect(scene.player.x).toBeGreaterThan(0.3);
      expect(scene.player.y).toBeGreaterThan(0.3);
      expect(scene.player.x).toBeLessThan(OFFICE.widthM - 0.3);
      expect(scene.player.y).toBeLessThan(OFFICE.heightM - 0.3);
      run(K.a3.doubleTap!.cooldownS);
    }
    expect(gapTo(scene)).toBeLessThan(2.5);
    scenes.clear();
  });

  it('Ultimate Undead Army: four skeletons rise near the enemy and last 10 s (owner, SUP-24) unless destroyed first', async () => {
    const { scene, scenes, run, runUntil, cast } = await setup({ x: 8, y: 13 }, { x: 18, y: 13 });
    scene.playerFighter.caster!.fillMeter();
    cast('ult');
    runUntil(() => scene.summonStates.length > 0, 3);
    expect(scene.summonStates).toHaveLength(4);
    for (const s of scene.summonStates) {
      expect(Math.hypot(s.x - 18, s.y - 13)).toBeLessThan(3.6); // around the enemy, not Necro
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
